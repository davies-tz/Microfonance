import express from 'express';
import path from 'path';
import * as dotenv from 'dotenv';
import { getDb } from './src/db/index.js';
import * as schema from './src/db/schema.js';
import { seedDatabaseIfEmpty } from './src/db/seed.js';
import { eq, desc, sql, and, or, inArray } from 'drizzle-orm';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

// JWT Secret & Security
// Fails closed in production: refuses to start rather than sign tokens with a
// secret an attacker could read straight out of this source file.
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable must be set in production.');
  }
  console.warn('[SECURITY WARNING] JWT_SECRET is not set. Using an insecure development-only fallback. Set JWT_SECRET in your .env file.');
  return 'insecure-dev-only-secret-do-not-use-in-production';
})();

// Shared secret used to verify inbound mobile money provider webhooks.
const MOMO_WEBHOOK_SECRET = process.env.MOMO_WEBHOOK_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('MOMO_WEBHOOK_SECRET environment variable must be set in production.');
  }
  console.warn('[SECURITY WARNING] MOMO_WEBHOOK_SECRET is not set. Using an insecure development-only fallback. Set MOMO_WEBHOOK_SECRET in your .env file.');
  return 'insecure-dev-only-momo-secret-do-not-use-in-production';
})();

// ==================== RATE LIMITING & OTP STORAGE ====================
// Backed by the database (loginAttempts / passwordResetOtps tables), not an
// in-memory Map - a Map only lives inside one process/instance, which breaks
// on serverless platforms (e.g. Vercel) where concurrent requests can land
// on entirely separate instances with no shared memory. The database is the
// only state that's actually visible to every request.

async function getLoginAttempt(db: any, rateLimitKey: string) {
  const [row] = await db.select().from(schema.loginAttempts).where(eq(schema.loginAttempts.rateLimitKey, rateLimitKey));
  if (!row) return null;

  // A lock that has expired, or an unlocked attempt window older than 15
  // minutes, is stale - treat it as if it never existed.
  const now = Date.now();
  const isExpiredLock = row.lockedUntil && row.lockedUntil.getTime() <= now;
  const isStaleWindow = !row.lockedUntil && now - row.firstAttempt.getTime() > 15 * 60 * 1000;
  if (isExpiredLock || isStaleWindow) {
    await db.delete(schema.loginAttempts).where(eq(schema.loginAttempts.rateLimitKey, rateLimitKey));
    return null;
  }
  return row;
}

async function recordFailedLogin(db: any, rateLimitKey: string, existing: any): Promise<{ count: number; lockedUntil: Date | null }> {
  const newCount = (existing?.count || 0) + 1;
  const lockedUntil = newCount >= 8 ? new Date(Date.now() + 15 * 60 * 1000) : null;
  if (existing) {
    await db.update(schema.loginAttempts).set({ count: newCount, lockedUntil }).where(eq(schema.loginAttempts.rateLimitKey, rateLimitKey));
  } else {
    await db.insert(schema.loginAttempts).values({ rateLimitKey, count: newCount, firstAttempt: new Date(), lockedUntil });
  }
  return { count: newCount, lockedUntil };
}

async function clearLoginAttempts(db: any, rateLimitKey: string) {
  await db.delete(schema.loginAttempts).where(eq(schema.loginAttempts.rateLimitKey, rateLimitKey));
}

async function setPasswordResetOtp(db: any, identifier: string, otp: string, expiresAt: Date) {
  const existing = await db.select().from(schema.passwordResetOtps).where(eq(schema.passwordResetOtps.identifier, identifier));
  if (existing.length > 0) {
    await db.update(schema.passwordResetOtps).set({ otp, expiresAt }).where(eq(schema.passwordResetOtps.identifier, identifier));
  } else {
    await db.insert(schema.passwordResetOtps).values({ identifier, otp, expiresAt });
  }
}

async function getPasswordResetOtp(db: any, identifier: string) {
  const [row] = await db.select().from(schema.passwordResetOtps).where(eq(schema.passwordResetOtps.identifier, identifier));
  return row || null;
}

async function clearPasswordResetOtp(db: any, identifier: string) {
  await db.delete(schema.passwordResetOtps).where(eq(schema.passwordResetOtps.identifier, identifier));
}

// Helper: Round currency to nearest Tanzanian Shilling (TZS has no cents in daily operations)
function roundCurrency(val: number): number {
  return Math.round(val);
}

// ==================== AUTHENTICATION / AUTHORIZATION MIDDLEWARE ====================

// Decodes and verifies the Bearer token on a request, if present. Returns null
// (never throws) when the token is missing, malformed, or expired.
function getRequesterFromToken(req: any): any | null {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
}

// Requires a valid Bearer token. On success, attaches the decoded payload as
// req.user. Every mutating route below must use this - a missing token must
// never silently fall through to an "assume authorized" default.
async function requireAuth(req: any, res: any, next: any) {
  const requester = getRequesterFromToken(req);
  if (!requester?.id) {
    return res.status(401).json({ error: 'Authentication required. Please sign in again.' });
  }
  try {
    const [user] = await getDb().db.select().from(schema.users).where(eq(schema.users.id, requester.id));
    if (!user?.isActive) {
      return res.status(401).json({ error: 'This account is unavailable. Please contact your administrator.' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Could not verify staff session:', error);
    res.status(503).json({ error: 'Unable to verify your session. Try again shortly.' });
  }
}

// Must be used after requireAuth. Rejects the request unless req.user.role is
// one of the allowed roles.
function requireRole(...allowedRoles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHENTICATED' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: this action requires one of the following roles: ${allowedRoles.join(', ')}.`,
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }
    next();
  };
}

const demoMode = process.env.IMARA_DEMO_MODE === 'true';
let demoInitialization: Promise<void> | undefined;

function initDb() {
  if (!demoMode) return;
  demoInitialization ??= seedDatabaseIfEmpty().catch((error) => {
    demoInitialization = undefined;
    throw error;
  });
  return demoInitialization;
}

// ==================== AUTHENTICATION ROUTES ====================

// Helper to determine destination tab based on user commercial role
function getRoleRedirectTab(role: string): string {
  switch (role) {
    case 'FIELD_OFFICER':
    case 'LOAN_OFFICER':
    case 'COLLECTION_OFFICER':
    case 'CREDIT_OFFICER':
      return 'offline_sync'; // Field operations workspace
    case 'BRANCH_MANAGER':
      return 'dashboard'; // Branch executive dashboard
    case 'ACCOUNTANT':
    case 'CASHIER':
      return 'accounting'; // Accounting & General Ledger workspace
    case 'AUDITOR':
      return 'audit'; // Compliance & Audit trail workspace
    case 'HEAD_OFFICE_MANAGER':
    case 'ADMIN':
    case 'SUPER_ADMIN':
    default:
      return 'dashboard'; // Administration executive dashboard
  }
}

// Login: Authenticate with Username or Email and Password
app.post('/api/auth/login', async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { identifier, password, rememberMe } = req.body;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const cleanPassword = String(password).trim();
    const rateLimitKey = `${clientIp}_${cleanIdentifier}`;

    // Query user by email OR username (case-insensitive)
    const allUsers = await db.select().from(schema.users);
    let user = allUsers.find(
      (u) =>
        (u.email && u.email.toLowerCase() === cleanIdentifier) ||
        (u.username && u.username.toLowerCase() === cleanIdentifier)
    );

    // Aliases support so any known demo handle or prefix resolves directly
    if (!user) {
      if (cleanIdentifier === 'amina.manager' || cleanIdentifier === 'amina' || cleanIdentifier === 'amina.ho') {
        user = allUsers.find((u) => u.username === 'amina.manager' || u.username === 'amina.ho');
      } else if (cleanIdentifier === 'baraka.field' || cleanIdentifier === 'baraka' || cleanIdentifier === 'baraka.bm') {
        user = allUsers.find((u) => u.username === 'baraka.field' || u.username === 'baraka.bm');
      } else if (cleanIdentifier === 'daudi.accountant' || cleanIdentifier === 'daudi' || cleanIdentifier === 'daudi.lo') {
        user = allUsers.find((u) => u.username === 'daudi.accountant' || u.username === 'daudi.lo');
      } else if (cleanIdentifier === 'neema.auditor' || cleanIdentifier === 'neema' || cleanIdentifier === 'neema.aud') {
        user = allUsers.find((u) => u.username === 'neema.auditor' || u.username === 'neema.aud');
      } else if (cleanIdentifier === 'admin' || cleanIdentifier === 'superadmin' || cleanIdentifier === 'administrator') {
        user = allUsers.find((u) => u.username === 'admin' || u.username === 'superadmin' || u.role === 'SUPER_ADMIN');
      }
    }

    // Password verification: bcrypt hash comparison only. Seeded demo accounts
    // receive their initial password from the explicit demo seed, so the demo
    // credentials still work - there is no separate bypass for any account.
    let passwordMatches = false;
    if (user && user.passwordHash) {
      try {
        passwordMatches = bcrypt.compareSync(cleanPassword, user.passwordHash);
      } catch {
        passwordMatches = false;
      }
    }

    // Rate Limiting Check only applies to failing requests
    const now = Date.now();
    const attempt = await getLoginAttempt(db, rateLimitKey);

    if (!user || !passwordMatches) {
      if (attempt && attempt.lockedUntil && attempt.lockedUntil.getTime() > now) {
        const waitMinutes = Math.ceil((attempt.lockedUntil.getTime() - now) / 60000);
        return res.status(429).json({
          error: `Account temporarily locked due to excessive failed attempts. Please retry in ${waitMinutes} minute(s).`,
          code: 'RATE_LIMITED',
        });
      }

      // Record failed attempt for rate limiting
      const { count: newCount } = await recordFailedLogin(db, rateLimitKey, attempt);

      // Log failed authentication in audit log
      try {
        await db.insert(schema.auditLogs).values({
          id: `log-auth-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          userId: 'ANONYMOUS',
          userName: cleanIdentifier,
          userRole: 'UNAUTHENTICATED',
          action: 'AUTH_LOGIN_FAILED',
          entityName: 'USER_AUTH',
          entityId: cleanIdentifier,
          ipAddress: String(clientIp),
          details: `Failed sign-in attempt for identifier: ${cleanIdentifier}. Consecutive failure: ${newCount}`,
        });
      } catch (logErr) {
        console.warn('Audit log write error:', logErr);
      }

      return res.status(401).json({
        error: 'Invalid username/email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Clear any previous failed attempts upon successful password
    await clearLoginAttempts(db, rateLimitKey);

    // Check if account is disabled or suspended
    if (!user.isActive) {
      return res.status(403).json({
        error: 'Account is inactive or suspended. Please contact your system administrator.',
        code: 'ACCOUNT_DISABLED',
      });
    }

    // Update lastLoginAt
    await db.update(schema.users).set({
      lastLoginAt: new Date(),
      failedLoginAttempts: 0,
    }).where(eq(schema.users.id, user.id));

    // Sign JWT Token (30 days if rememberMe, otherwise 8 hours)
    const expiresIn = rememberMe ? '30d' : '8h';
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      branchId: user.branchId,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn });

    // Determine target workspace based on commercial role
    const redirectTab = getRoleRedirectTab(user.role);

    // Audit log successful authentication
    try {
      await db.insert(schema.auditLogs).values({
        id: `log-auth-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        action: 'AUTH_LOGIN_SUCCESS',
        entityName: 'USER_AUTH',
        entityId: user.id,
        ipAddress: String(clientIp),
        details: `Successful authenticated sign-in as ${user.role} (${user.email}). Redirecting to ${redirectTab}.`,
      });
    } catch (logErr) {
      console.warn('Audit log write error:', logErr);
    }

    // Sanitized user object without password hash
    const sanitizedUser = {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: '+255 754 100 201',
      role: user.role,
      branchId: user.branchId || 'br-kariakoo',
      status: user.isActive ? 'ACTIVE' : 'INACTIVE',
      preferredLanguage: user.preferredLanguage || 'en',
    };

    res.json({
      token,
      user: sanitizedUser,
      redirectTab,
      expiresIn,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal authentication server error', details: err.message });
  }
});

// Verify Current Session / Token
app.get('/api/auth/me', async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Session token has expired or is invalid', code: 'SESSION_EXPIRED' });
    }

    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, decoded.id));
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User no longer active', code: 'USER_NOT_FOUND' });
    }

    const sanitizedUser = {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: '+255 754 100 201',
      role: user.role,
      branchId: user.branchId || 'br-kariakoo',
      status: user.isActive ? 'ACTIVE' : 'INACTIVE',
      preferredLanguage: user.preferredLanguage || 'en',
    };

    res.json({
      user: sanitizedUser,
      redirectTab: getRoleRedirectTab(user.role),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Logout Endpoint
app.post('/api/auth/logout', requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    await getDb().db.insert(schema.auditLogs).values({
      id: `log-auth-${crypto.randomUUID()}`,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: 'AUTH_LOGOUT',
      entityName: 'USER_AUTH',
      entityId: user.id,
      ipAddress: req.ip,
      details: 'Signed out from the staff workspace.',
    });
    res.sendStatus(204);
  } catch (error) {
    console.error('Unable to write sign-out audit event:', error);
    res.status(503).json({ error: 'The sign-out event could not be written.' });
  }
});

// Forgot Password OTP Generation
app.post('/api/auth/forgot-password', async (req, res) => {
  if (!demoMode) return res.status(404).json({ error: 'This feature is unavailable.' });
  try {
    await initDb();
    const { db } = getDb();
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ error: 'Email or username is required' });
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const allUsers = await db.select().from(schema.users);
    const user = allUsers.find(
      (u) =>
        (u.email && u.email.toLowerCase() === cleanIdentifier) ||
        (u.username && u.username.toLowerCase() === cleanIdentifier)
    );

    // Generate a secure 6-digit verification code
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins validity

    await setPasswordResetOtp(db, cleanIdentifier, otp, expiresAt);

    if (user) {
      await db.insert(schema.auditLogs).values({
        id: `log-pwd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        action: 'PASSWORD_RESET_REQUESTED',
        entityName: 'USER_AUTH',
        entityId: user.id,
        ipAddress: req.ip || '127.0.0.1',
        details: `Password reset OTP generated for account ${cleanIdentifier}. Channel: SMS/Email dispatch.`,
      });
    }

    // Return friendly generic response (with demonstration OTP for testing ease)
    res.json({
      success: true,
      message: 'If an account matches your entry, a 6-digit password reset OTP has been dispatched.',
      demoOtp: otp, // For rapid testing & evaluation
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset Password with OTP
app.post('/api/auth/reset-password', async (req, res) => {
  if (!demoMode) return res.status(404).json({ error: 'This feature is unavailable.' });
  try {
    await initDb();
    const { db } = getDb();
    const { identifier, otp, newPassword } = req.body;

    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({ error: 'Identifier, OTP, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const stored = await getPasswordResetOtp(db, cleanIdentifier);

    if (!stored || stored.expiresAt.getTime() < Date.now() || stored.otp !== String(otp).trim()) {
      return res.status(400).json({ error: 'Invalid or expired OTP verification code' });
    }

    const allUsers = await db.select().from(schema.users);
    const user = allUsers.find(
      (u) =>
        (u.email && u.email.toLowerCase() === cleanIdentifier) ||
        (u.username && u.username.toLowerCase() === cleanIdentifier)
    );

    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    await db.update(schema.users).set({
      passwordHash: newHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
    }).where(eq(schema.users.id, user.id));

    await clearPasswordResetOtp(db, cleanIdentifier);

    await db.insert(schema.auditLogs).values({
      id: `log-pwd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: 'PASSWORD_RESET_COMPLETED',
      entityName: 'USER_AUTH',
      entityId: user.id,
      ipAddress: req.ip || '127.0.0.1',
      details: `Password was successfully updated via verified OTP for account ${cleanIdentifier}.`,
    });

    res.json({ success: true, message: 'Password has been updated successfully. You can now sign in.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Demo accounts endpoint for testing different commercial roles
app.get('/api/auth/demo-users', (req, res) => {
  if (!demoMode) return res.sendStatus(404);
  res.json([
    {
      role: 'LOAN_OFFICER',
      roleLabel: 'Field Officer (Loan Officer)',
      username: 'daudi.lo',
      email: 'daudi.kibona@tusonge-mfi.co.tz',
      name: 'Daudi Kibona',
      targetWorkspace: 'Field Operations & Sync',
      branch: 'Kariakoo Main',
      password: 'Imara@2025',
    },
    {
      role: 'BRANCH_MANAGER',
      roleLabel: 'Branch Manager',
      username: 'baraka.bm',
      email: 'baraka.mkumbo@tusonge-mfi.co.tz',
      name: 'Baraka Mkumbo',
      targetWorkspace: 'Branch Executive Dashboard',
      branch: 'Kariakoo Main',
      password: 'Imara@2025',
    },
    {
      role: 'ACCOUNTANT',
      roleLabel: 'Chief Accountant',
      username: 'juma.acc',
      email: 'juma.mussa@tusonge-mfi.co.tz',
      name: 'Juma Mussa',
      targetWorkspace: 'General Ledger & COA',
      branch: 'Kariakoo Main',
      password: 'Imara@2025',
    },
    {
      role: 'HEAD_OFFICE_MANAGER',
      roleLabel: 'Managing Director / Admin',
      username: 'amina.ho',
      email: 'amina.mwamba@tusonge-mfi.co.tz',
      name: 'Amina Mwamba',
      targetWorkspace: 'Institutional Control Center',
      branch: 'Head Office',
      password: 'Imara@2025',
    },
  ]);
});

// ==================== HIERARCHICAL STAFF & USER MANAGEMENT API ====================

// List all staff members
app.get('/api/staff', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const branchFilter = req.query.branchId as string;

    let query = db.select().from(schema.users);
    const allUsers = await query;

    const filtered = branchFilter && branchFilter !== 'ALL'
      ? allUsers.filter((u) => u.branchId === branchFilter)
      : allUsers;

    const sanitized = filtered.map((u) => ({
      id: u.id,
      username: u.username || u.email.split('@')[0],
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: '+255 754 100 201',
      role: u.role,
      branchId: u.branchId || 'br-kariakoo',
      status: u.isActive ? 'ACTIVE' : 'INACTIVE',
      preferredLanguage: u.preferredLanguage || 'en',
      lastLoginAt: u.lastLoginAt,
    }));

    res.json(sanitized);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new employee account (Privileged - Manager & Super Admin ONLY)
app.post('/api/staff', requireAuth, requireRole('SUPER_ADMIN', 'HEAD_OFFICE_MANAGER', 'BRANCH_MANAGER'), async (req: any, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const requester = req.user;
    const requesterRole = requester.role;

    const { username, email, firstName, lastName, role, branchId, phone, initialPassword } = req.body;

    if (!email || !firstName || !lastName || !role) {
      return res.status(400).json({ error: 'First name, last name, email, and role are required.' });
    }

    const validRoles = [
      'SUPER_ADMIN',
      'HEAD_OFFICE_MANAGER',
      'MANAGER',
      'BRANCH_MANAGER',
      'FIELD_OFFICER',
      'LOAN_OFFICER',
      'ACCOUNTANT',
      'AUDITOR',
      'CUSTOMER',
    ];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    if (typeof branchId !== 'string' || !branchId) {
      return res.status(400).json({ error: 'Select an active branch before creating an employee.' });
    }
    const [branch] = await db.select({ id: schema.branches.id }).from(schema.branches)
      .where(and(eq(schema.branches.id, branchId), eq(schema.branches.isActive, true)));
    if (!branch) {
      return res.status(400).json({ error: 'The selected branch does not exist or is inactive.' });
    }

    const newUserId = `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const cleanUsername = (username || `${firstName.toLowerCase()}.${lastName.toLowerCase()}`).trim();
    const passwordHash = bcrypt.hashSync(initialPassword || 'Imara@2025', 10);

    await db.insert(schema.users).values({
      id: newUserId,
      username: cleanUsername,
      email: email.trim().toLowerCase(),
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role,
      branchId: branch.id,
      preferredLanguage: 'en',
      isActive: true,
      failedLoginAttempts: 0,
    });

    // Audit log account creation
    await db.insert(schema.auditLogs).values({
      id: `log-staff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requesterRole,
      action: 'EMPLOYEE_ACCOUNT_CREATED',
      entityName: 'USERS',
      entityId: newUserId,
      ipAddress: req.ip || '127.0.0.1',
      details: `Created new employee account: ${firstName} ${lastName} (${cleanUsername}) with role ${role} assigned to branch ${branch.id}.`,
    });

    const newEmployee = {
      id: newUserId,
      username: cleanUsername,
      firstName,
      lastName,
      email,
      phone: phone || '+255 754 000 000',
      role,
      branchId: branch.id,
      status: 'ACTIVE',
      preferredLanguage: 'en',
    };

    res.status(201).json(newEmployee);
  } catch (err: any) {
    console.error('Staff creation error:', err.cause?.code || err.code);
    res.status(500).json({ error: 'Could not create the employee account. Please try again.' });
  }
});

// Update employee account
app.put('/api/staff/:id', requireAuth, requireRole('SUPER_ADMIN', 'HEAD_OFFICE_MANAGER', 'BRANCH_MANAGER'), async (req: any, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const requester = req.user;
    const { id } = req.params;
    const { firstName, lastName, role, branchId, status } = req.body;

    const [existing] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    if (!existing) {
      return res.status(404).json({ error: 'Employee account not found.' });
    }

    const updates: any = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (role) updates.role = role;
    if (branchId) updates.branchId = branchId;
    if (status !== undefined) updates.isActive = status === 'ACTIVE';

    await db.update(schema.users).set(updates).where(eq(schema.users.id, id));

    // Audit log
    await db.insert(schema.auditLogs).values({
      id: `log-staff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requester.role,
      action: 'EMPLOYEE_ACCOUNT_UPDATED',
      entityName: 'USERS',
      entityId: id,
      ipAddress: req.ip || '127.0.0.1',
      details: `Updated employee profile for ${id}: ${JSON.stringify(updates)}`,
    });

    res.json({ success: true, message: 'Employee updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle employee active / inactive status (Deactivate / Reactivate)
app.post('/api/staff/:id/toggle-status', requireAuth, requireRole('SUPER_ADMIN', 'HEAD_OFFICE_MANAGER', 'BRANCH_MANAGER'), async (req: any, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const requester = req.user;
    const { id } = req.params;

    const [existing] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    if (!existing) {
      return res.status(404).json({ error: 'Employee account not found.' });
    }

    const newActiveState = !existing.isActive;
    await db.update(schema.users).set({ isActive: newActiveState }).where(eq(schema.users.id, id));

    // Audit log
    await db.insert(schema.auditLogs).values({
      id: `log-staff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requester.role,
      action: newActiveState ? 'EMPLOYEE_ACTIVATED' : 'EMPLOYEE_DEACTIVATED',
      entityName: 'USERS',
      entityId: id,
      ipAddress: req.ip || '127.0.0.1',
      details: `Employee ${existing.firstName} ${existing.lastName} was ${newActiveState ? 'activated' : 'deactivated/suspended'}.`,
    });

    res.json({
      success: true,
      isActive: newActiveState,
      status: newActiveState ? 'ACTIVE' : 'INACTIVE',
      message: `Employee account is now ${newActiveState ? 'ACTIVE' : 'INACTIVE'}.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset employee password / access
app.post('/api/staff/:id/reset-access', requireAuth, requireRole('SUPER_ADMIN', 'HEAD_OFFICE_MANAGER', 'BRANCH_MANAGER'), async (req: any, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const requester = req.user;
    const { id } = req.params;

    const [existing] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    if (!existing) {
      return res.status(404).json({ error: 'Employee account not found.' });
    }

    const defaultPassword = 'Imara@' + new Date().getFullYear();
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);

    await db.update(schema.users).set({
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
    }).where(eq(schema.users.id, id));

    // Audit log
    await db.insert(schema.auditLogs).values({
      id: `log-staff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requester.role,
      action: 'EMPLOYEE_ACCESS_RESET',
      entityName: 'USERS',
      entityId: id,
      ipAddress: req.ip || '127.0.0.1',
      details: `Manager reset credentials and cleared lockouts for employee ${existing.username} (${existing.email}).`,
    });

    res.json({
      success: true,
      message: `Access credentials reset. Temporary password is: ${defaultPassword}`,
      temporaryPassword: defaultPassword,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== OPERATIONAL API ROUTES ====================

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await initDb();
    await getDb().db.select({ id: schema.branches.id }).from(schema.branches).limit(1);
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Database readiness check failed:', error);
    res.status(503).json({ status: 'unavailable', database: 'not_ready' });
  }
});

// Dashboard Summary & KPI Metrics
app.get('/api/summary', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();

    // Portfolio metrics
    const allLoans = await db.select().from(schema.loans);
    const activeLoans = allLoans.filter((l) => l.status === 'ACTIVE' || l.status === 'DELINQUENT' || l.status === 'IN_ARREARS');
    const grossPortfolio = activeLoans.reduce((sum, l) => sum + (l.outstandingPrincipal || 0), 0);
    const totalDisbursed = allLoans.reduce((sum, l) => sum + (l.principalAmount || 0), 0);
    
    // Delinquency / PAR calculations
    const par30Loans = activeLoans.filter((l) => l.daysInArrears > 30);
    const par30Amount = par30Loans.reduce((sum, l) => sum + l.outstandingPrincipal, 0);
    const par30Ratio = grossPortfolio > 0 ? (par30Amount / grossPortfolio) * 100 : 0;

    const par90Loans = activeLoans.filter((l) => l.daysInArrears > 90);
    const par90Amount = par90Loans.reduce((sum, l) => sum + l.outstandingPrincipal, 0);
    const par90Ratio = grossPortfolio > 0 ? (par90Amount / grossPortfolio) * 100 : 0;

    // Savings summary
    const allSavings = await db.select().from(schema.savingsAccounts);
    const totalSavings = allSavings.reduce((sum, s) => sum + s.balance, 0);

    // Customer count
    const allCustomers = await db.select().from(schema.customers);

    // Mobile Money Float from COA
    const coaList = await db.select().from(schema.chartOfAccounts);
    const mpesaAcc = coaList.find((c) => c.code === '1020');
    const airtelAcc = coaList.find((c) => c.code === '1030');
    const tigoAcc = coaList.find((c) => c.code === '1040');
    const bankAcc = coaList.find((c) => c.code === '1050');
    const cashAcc = coaList.find((c) => c.code === '1010');

    // Recent 10 repayments
    const recentRepayments = await db.select().from(schema.repayments).orderBy(desc(schema.repayments.createdAt)).limit(8);

    res.json({
      activeBorrowers: activeLoans.length,
      totalCustomers: allCustomers.length,
      grossPortfolio: roundCurrency(grossPortfolio),
      totalDisbursed: roundCurrency(totalDisbursed),
      totalSavings: roundCurrency(totalSavings),
      par30Amount: roundCurrency(par30Amount),
      par30Ratio: Number(par30Ratio.toFixed(2)),
      par90Amount: roundCurrency(par90Amount),
      par90Ratio: Number(par90Ratio.toFixed(2)),
      liquidity: {
        cashInVault: cashAcc?.balance || 0,
        mpesaFloat: mpesaAcc?.balance || 0,
        airtelFloat: airtelAcc?.balance || 0,
        tigoFloat: tigoAcc?.balance || 0,
        crdbBank: bankAcc?.balance || 0,
        totalLiquid: (cashAcc?.balance || 0) + (mpesaAcc?.balance || 0) + (airtelAcc?.balance || 0) + (tigoAcc?.balance || 0) + (bankAcc?.balance || 0),
      },
      recentRepayments,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Branches
app.get('/api/branches', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const branchList = await db.select().from(schema.branches);
    res.json(branchList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/branches', requireAuth, requireRole('SUPER_ADMIN'), async (req: any, res) => {
  const fields = ['code', 'name', 'region', 'address', 'phone'] as const;
  const readField = (field: typeof fields[number]) => {
    const value = req.body?.[field];
    return typeof value === 'string' ? value.trim() : '';
  };
  const code = readField('code').toUpperCase();
  const name = readField('name');
  const region = readField('region');
  const address = readField('address');
  const phone = readField('phone');

  if (!/^[A-Z0-9][A-Z0-9_-]{0,19}$/.test(code) || !name || !region || !address ||
    name.length > 120 || region.length > 80 || address.length > 240 ||
    !/^\+?[0-9 ()-]{7,30}$/.test(phone) || phone.replace(/\D/g, '').length < 7) {
    return res.status(400).json({ error: 'Provide a valid branch code, name, region, address, and phone number.' });
  }

  try {
    const { db } = getDb();
    const branch = await db.transaction(async (tx) => {
      const [created] = await tx.insert(schema.branches).values({
        id: crypto.randomUUID(), code, name, region, address, phone,
      }).onConflictDoNothing({ target: schema.branches.code }).returning();
      if (!created) return null;

      const user = req.user;
      await tx.insert(schema.auditLogs).values({
        id: crypto.randomUUID(),
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        action: 'BRANCH_CREATED',
        entityName: 'BRANCH',
        entityId: created.id,
        ipAddress: req.ip,
        details: `Created branch ${created.code} (${created.name}).`,
      });
      return created;
    });
    if (!branch) return res.status(409).json({ error: 'That branch code is already in use.' });
    res.status(201).json(branch);
  } catch (error) {
    console.error('Branch creation failed:', error);
    res.status(500).json({ error: 'Could not create the branch. Please try again.' });
  }
});

// Customers
app.get('/api/customers', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const customerList = await db.select().from(schema.customers).orderBy(desc(schema.customers.createdAt));
    res.json(customerList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', requireAuth, async (req: any, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const body = req.body;
    const requester = req.user;

    const id = `cust-${Date.now()}`;
    const customerNumber = `CUST-2024-${Math.floor(1000 + Math.random() * 9000)}`;

    const newCust = {
      id,
      customerNumber,
      firstName: body.firstName,
      lastName: body.lastName,
      nationalIdNida: body.nationalIdNida,
      phoneNumber: body.phoneNumber,
      email: body.email || null,
      dateOfBirth: body.dateOfBirth || '1990-01-01',
      gender: body.gender || 'FEMALE',
      residentialAddress: body.residentialAddress,
      businessType: body.businessType,
      monthlyIncome: Number(body.monthlyIncome) || 1000000,
      branchId: body.branchId || 'br-kariakoo',
      kycTier: Number(body.kycTier) || 2,
      crbStatus: body.crbStatus || 'GOOD',
      crbScore: Number(body.crbScore) || 710,
      latitude: body.latitude ? Number(body.latitude) : null,
      longitude: body.longitude ? Number(body.longitude) : null,
      documentUrl: body.documentUrl || null,
    };

    await db.insert(schema.customers).values(newCust);

    // Auto-create default voluntary savings account for new member
    const savId = `sav-${Date.now()}`;
    const accNum = `SAV-TZS-${Math.floor(10000 + Math.random() * 90000)}`;
    await db.insert(schema.savingsAccounts).values({
      id: savId,
      accountNumber: accNum,
      customerId: id,
      productType: 'VOLUNTARY',
      balance: 0,
      lockedAmount: 0,
      status: 'ACTIVE',
    });

    // Record audit log
    await db.insert(schema.auditLogs).values({
      id: `log-${Date.now()}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requester.role,
      action: 'CUSTOMER_ONBOARDING',
      entityName: 'CUSTOMER',
      entityId: id,
      ipAddress: req.ip || '127.0.0.1',
      details: `Onboarded customer ${body.firstName} ${body.lastName} (NIDA: ${body.nationalIdNida}).`,
    });

    res.status(201).json(newCust);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Groups
app.get('/api/groups', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const groupsList = await db.select().from(schema.groups);
    const members = await db.select().from(schema.groupMembers);

    const result = groupsList.map((g) => {
      const groupMembersList = members.filter((m) => m.groupId === g.id);
      return {
        ...g,
        memberCount: groupMembersList.length,
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/groups', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const body = req.body;
    const id = `grp-${Date.now()}`;
    const groupNumber = `GRP-${Math.floor(100 + Math.random() * 900)}`;

    const newGroup = {
      id,
      groupNumber,
      name: body.name,
      meetingDay: body.meetingDay,
      meetingFrequency: body.meetingFrequency || 'WEEKLY',
      meetingLocation: body.meetingLocation,
      branchId: body.branchId || 'br-kariakoo',
      officerId: body.officerId || 'usr-co-1',
      isActive: true,
    };

    await db.insert(schema.groups).values(newGroup);
    res.status(201).json(newGroup);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Loan Products
app.get('/api/products', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const products = await db.select().from(schema.loanProducts);
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Loan Applications
app.get('/api/applications', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const apps = await db.select().from(schema.loanApplications).orderBy(desc(schema.loanApplications.createdAt));
    res.json(apps);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/applications', requireAuth, async (req: any, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const body = req.body;
    const requester = req.user;

    const id = `app-${Date.now()}`;
    const applicationNumber = `APP-2024-${Math.floor(1000 + Math.random() * 9000)}`;

    // Quick Debt Service-to-Income (DSTI) estimation
    const customer = await db.select().from(schema.customers).where(eq(schema.customers.id, body.customerId));
    const monthlyIncome = customer[0]?.monthlyIncome || 1500000;
    const requested = Number(body.requestedAmount);
    const tenure = Number(body.tenureMonths) || 12;
    const approxMonthlyPayment = requested / tenure + (requested * 0.18) / 12;
    const assessedDsti = Number((approxMonthlyPayment / monthlyIncome).toFixed(2));

    const newApp = {
      id,
      applicationNumber,
      customerId: body.customerId,
      productId: body.productId,
      groupId: body.groupId || null,
      requestedAmount: requested,
      approvedAmount: null,
      tenureMonths: tenure,
      purpose: body.purpose,
      status: 'PENDING_REVIEW',
      assessedDsti,
      creditScore: customer[0]?.crbScore || 700,
      officerRecommendation: body.officerRecommendation || 'Field assessment conducted. Verified identity and business premises.',
      submittedBy: requester.id,
      reviewedBy: null,
      rejectionReason: null,
    };

    await db.insert(schema.loanApplications).values(newApp);

    await db.insert(schema.auditLogs).values({
      id: `log-${Date.now()}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requester.role,
      action: 'LOAN_APPLICATION_SUBMIT',
      entityName: 'LOAN_APPLICATION',
      entityId: id,
      ipAddress: req.ip || '127.0.0.1',
      details: `Submitted loan application for TZS ${requested.toLocaleString()} by customer ${body.customerId}.`,
    });

    res.status(201).json(newApp);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Per BR-APPR-01: Branch Managers may approve up to this amount; anything
// larger must be escalated to a Head Office Manager / Super Admin, who have
// no cap here.
const BRANCH_MANAGER_APPROVAL_LIMIT = 1_000_000;

// Review Loan Application (Approve or Reject)
app.patch('/api/applications/:id/review', requireAuth, requireRole('BRANCH_MANAGER', 'HEAD_OFFICE_MANAGER', 'SUPER_ADMIN'), async (req: any, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const result = await db.transaction(async (db) => {
      const { id } = req.params;
      const { action, approvedAmount, rejectionReason } = req.body; // action: 'APPROVE' | 'REJECT'
      const requester = req.user;
      if (!['APPROVE', 'REJECT'].includes(action) ||
        (action === 'APPROVE' && parseMoney(approvedAmount) === null)) {
        return { status: 400, body: { error: 'Choose a valid decision and approval amount.' } };
      }

      const [appRecord] = await db.select().from(schema.loanApplications).where(eq(schema.loanApplications.id, id)).for('update');
      if (!appRecord) {
        return { status: 404, body: { error: 'Loan application not found' } };
      }

      const terminalStatuses = ['APPROVED', 'REJECTED', 'DISBURSED'];
      if (terminalStatuses.includes(appRecord.status)) {
        return { status: 409, body: {
          error: `This application has already been reviewed (status: ${appRecord.status}) and cannot be reviewed again.`,
          code: 'ALREADY_REVIEWED',
        } };
      }

      // Maker-checker (BR-APPR-01): the person who submitted the application
      // (the "maker") can never be the one who approves or rejects it (the
      // "checker"), regardless of their role.
      if (appRecord.submittedBy && appRecord.submittedBy === requester.id) {
        return { status: 403, body: {
          error: 'Maker-checker violation: you submitted this application and cannot review your own submission. Escalate to another authorized reviewer.',
          code: 'SELF_APPROVAL_FORBIDDEN',
        } };
      }

      // Tiered approval limit (BR-APPR-01): Branch Managers may only approve
      // up to BRANCH_MANAGER_APPROVAL_LIMIT; larger amounts require Head
      // Office / Super Admin sign-off.
      if (action === 'APPROVE' && requester.role === 'BRANCH_MANAGER' && Number(approvedAmount) > BRANCH_MANAGER_APPROVAL_LIMIT) {
        return { status: 403, body: {
          error: `Branch Managers may approve loans up to TZS ${BRANCH_MANAGER_APPROVAL_LIMIT.toLocaleString()}. This amount (TZS ${Number(approvedAmount).toLocaleString()}) must be escalated to a Head Office Manager.`,
          code: 'APPROVAL_LIMIT_EXCEEDED',
        } };
      }

      // Reviewer identity always comes from the verified token, never the
      // request body - otherwise a caller could approve as anyone they liked.
      if (action === 'APPROVE') {
        await db.update(schema.loanApplications).set({
          status: 'APPROVED',
          approvedAmount: Number(approvedAmount),
          reviewedBy: requester.id,
        }).where(eq(schema.loanApplications.id, id));
      } else {
        await db.update(schema.loanApplications).set({
          status: 'REJECTED',
          rejectionReason: rejectionReason || 'Failed credit policy affordability threshold',
          reviewedBy: requester.id,
        }).where(eq(schema.loanApplications.id, id));
      }

      await db.insert(schema.auditLogs).values({
        id: `log-review-${Date.now()}`,
        userId: requester.id,
        userName: `${requester.firstName} ${requester.lastName}`,
        userRole: requester.role,
        action: action === 'APPROVE' ? 'LOAN_APPLICATION_APPROVED' : 'LOAN_APPLICATION_REJECTED',
        entityName: 'LOAN_APPLICATION',
        entityId: id,
        ipAddress: req.ip || '127.0.0.1',
        details: action === 'APPROVE'
          ? `Approved application ${id} for TZS ${Number(approvedAmount).toLocaleString()}.`
          : `Rejected application ${id}. Reason: ${rejectionReason || 'Failed credit policy affordability threshold'}`,
      });

      const updated = await db.select().from(schema.loanApplications).where(eq(schema.loanApplications.id, id));
      return { status: 200, body: updated[0] };
    });
    res.status(result.status).json(result.body);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Disburse Loan (creates active loan, schedule of installments, updates application, generates double entry)
app.post('/api/loans/disburse', requireAuth, requireRole('BRANCH_MANAGER', 'HEAD_OFFICE_MANAGER', 'SUPER_ADMIN', 'ACCOUNTANT', 'CASHIER'), async (req: any, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const result = await db.transaction(async (db) => {
      const { applicationId, disbursementDate, channel } = req.body;
      const requester = req.user;

      const [appRecord] = await db.select().from(schema.loanApplications).where(eq(schema.loanApplications.id, applicationId)).for('update');
      if (!appRecord) {
        return { status: 404, body: { error: 'Application not found' } };
      }
      if (appRecord.status !== 'APPROVED') {
        return { status: 400, body: { error: 'Only APPROVED applications can be disbursed' } };
      }

      const [product] = await db.select().from(schema.loanProducts).where(eq(schema.loanProducts.id, appRecord.productId));
      const [borrower] = await db.select().from(schema.customers).where(eq(schema.customers.id, appRecord.customerId));
      if (!borrower || !product) {
        return { status: 409, body: { error: 'The application is missing its customer or product.' } };
      }
      const principal = appRecord.approvedAmount || appRecord.requestedAmount;
      const tenureMonths = appRecord.tenureMonths;
      const annualRate = product.annualInterestRate;

      const loanId = `loan-${Date.now()}`;
      const loanAccountNumber = `LN-${Math.floor(10000 + Math.random() * 90000)}`;

      const startDate = disbursementDate || new Date().toISOString().split('T')[0];
      const maturity = new Date(startDate);
      maturity.setMonth(maturity.getMonth() + tenureMonths);
      const maturityDate = maturity.toISOString().split('T')[0];

      // Create Loan record
      const newLoan = {
        id: loanId,
        loanAccountNumber,
        applicationId: appRecord.id,
        customerId: appRecord.customerId,
        productId: product.id,
        branchId: borrower.branchId,
        groupId: appRecord.groupId || null,
        principalAmount: principal,
        outstandingPrincipal: principal,
        interestRate: annualRate,
        tenureMonths,
        disbursementDate: startDate,
        maturityDate,
        status: 'ACTIVE',
        interestMethod: product.interestMethod,
        repaymentFrequency: product.repaymentFrequency,
        daysInArrears: 0,
        accruedInterest: 0,
        unpaidFees: 0,
        unpaidPenalties: 0,
        totalPaid: 0,
      };

      await db.insert(schema.loans).values(newLoan);

      // Update application status to DISBURSED
      await db.update(schema.loanApplications).set({ status: 'DISBURSED' }).where(eq(schema.loanApplications.id, applicationId));

      // Generate installments
      const installments = [];
      const monthlyPrincipal = roundCurrency(principal / tenureMonths);
      const monthlyRate = (annualRate / 100) / 12;

      for (let i = 1; i <= tenureMonths; i++) {
        const instDueDate = new Date(startDate);
        instDueDate.setMonth(instDueDate.getMonth() + i);
        const dueDateStr = instDueDate.toISOString().split('T')[0];

        let instPrincipal = monthlyPrincipal;
        if (i === tenureMonths) {
          // adjust last month for rounding
          instPrincipal = principal - (monthlyPrincipal * (tenureMonths - 1));
        }

        let instInterest = 0;
        if (product.interestMethod === 'FLAT') {
          instInterest = roundCurrency((principal * (annualRate / 100) * (tenureMonths / 12)) / tenureMonths);
        } else {
          // Reducing balance interest for current month
          const remainingPrincipal = principal - ((i - 1) * monthlyPrincipal);
          instInterest = roundCurrency(remainingPrincipal * monthlyRate);
        }

        const totalDue = instPrincipal + instInterest;

        installments.push({
          id: `inst-${loanId}-${i}`,
          loanId,
          installmentNumber: i,
          dueDate: dueDateStr,
          principalDue: instPrincipal,
          interestDue: instInterest,
          feesDue: 0,
          totalDue,
          principalPaid: 0,
          interestPaid: 0,
          feesPaid: 0,
          penaltiesPaid: 0,
          status: 'PENDING',
          paidAt: null,
        });
      }

      if (installments.length > 0) {
        await db.insert(schema.loanInstallments).values(installments);
      }

      // Double-Entry Accounting Posting:
      // DR: 1200 Gross Loan Portfolio (Asset increase)
      // CR: 1020 M-Pesa Settlement / 1010 Cash in Vault (Asset decrease)
      const journalId = `jnl-${Date.now()}`;
      const disburseAccount = channel === 'CASH' ? '1010' : '1020';
      const disburseAccountName = channel === 'CASH' ? 'Cash in Vault' : 'M-Pesa Settlement Float';

      await db.insert(schema.journalEntries).values({
        id: journalId,
        entryNumber: `JNL-DISB-${Math.floor(1000 + Math.random() * 9000)}`,
        transactionDate: startDate,
        narration: `Disbursement of Loan ${loanAccountNumber} to customer ${appRecord.customerId}`,
        referenceType: 'DISBURSEMENT',
        referenceId: loanId,
        totalDebit: principal,
        totalCredit: principal,
        postedBy: requester.id,
      });

      await db.insert(schema.journalLines).values([
        {
          id: `line-${journalId}-1`,
          journalId,
          accountCode: '1200',
          accountName: 'Gross Loan Portfolio',
          entryType: 'DEBIT',
          amount: principal,
        },
        {
          id: `line-${journalId}-2`,
          journalId,
          accountCode: disburseAccount,
          accountName: disburseAccountName,
          entryType: 'CREDIT',
          amount: principal,
        },
      ]);

      // Update Chart of Account balances
      await db.update(schema.chartOfAccounts).set({
        balance: sql`${schema.chartOfAccounts.balance} + ${principal}`,
      }).where(eq(schema.chartOfAccounts.code, '1200'));

      await db.update(schema.chartOfAccounts).set({
        balance: sql`${schema.chartOfAccounts.balance} - ${principal}`,
      }).where(eq(schema.chartOfAccounts.code, disburseAccount));

      // Audit Log
      await db.insert(schema.auditLogs).values({
        id: `log-${Date.now()}`,
        userId: requester.id,
        userName: `${requester.firstName} ${requester.lastName}`,
        userRole: requester.role,
        action: 'LOAN_DISBURSED',
        entityName: 'LOAN',
        entityId: loanId,
        ipAddress: req.ip || '127.0.0.1',
        details: `Successfully disbursed TZS ${principal.toLocaleString()} for Loan ${loanAccountNumber} via ${disburseAccountName}.`,
      });

      return { status: 201, body: { loan: newLoan, installmentsCount: installments.length } };
    });
    res.status(result.status).json(result.body);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Loans list
app.get('/api/loans', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const loansList = await db.select().from(schema.loans).orderBy(desc(schema.loans.createdAt));
    res.json(loansList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Loan Installments
app.get('/api/loans/:id/installments', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const insts = await db.select().from(schema.loanInstallments).where(eq(schema.loanInstallments.loanId, req.params.id));
    res.json(insts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function parseMoney(input: unknown): number | null {
  if (typeof input !== 'number' && typeof input !== 'string') return null;
  const amount = Number(input);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

const settlementAccounts: Record<string, string> = {
  CASH: '1010', MPESA: '1020', MOBILE_MONEY: '1020',
  AIRTEL_MONEY: '1030', TIGO_PESA: '1040', BANK_TRANSFER: '1050',
};

type Database = ReturnType<typeof getDb>['db'];
type DatabaseTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];

async function postRepayment(
  db: DatabaseTransaction,
  { loanId, amount, paymentMethod = 'MPESA', referenceNumber }: {
    loanId: string; amount: unknown; paymentMethod?: string; referenceNumber?: string;
  },
  requester: { id: string; firstName: string; lastName: string; role: string },
  ipAddress: string,
) {
  const receivedBy = `${requester.firstName} ${requester.lastName}`;
  const settlement = Object.hasOwn(settlementAccounts, paymentMethod) ? settlementAccounts[paymentMethod] : undefined;
  if (!settlement) return { status: 400, body: { error: 'Unsupported payment method.' } };
  if (typeof loanId !== 'string' || !loanId || (referenceNumber !== undefined &&
    (typeof referenceNumber !== 'string' || referenceNumber.length > 150))) {
    return { status: 400, body: { error: 'Invalid loan or payment reference.' } };
  }
  const paymentAmount = parseMoney(amount);

  if (paymentAmount === null) {
    return { status: 400, body: { error: 'Valid payment amount is required' } };
  }

  const [loan] = await db.select().from(schema.loans).where(eq(schema.loans.id, loanId)).for('update');
  if (!loan) {
    return { status: 404, body: { error: 'Loan not found' } };
  }

  if (referenceNumber) {
    const [previous] = await db.select().from(schema.repayments).where(and(
      eq(schema.repayments.loanId, loanId),
      eq(schema.repayments.referenceNumber, referenceNumber)
    ));
    if (previous) {
      if (previous.amount !== paymentAmount || previous.paymentMethod !== paymentMethod) {
        return { status: 409, body: { error: 'This reference already belongs to a different payment.' } };
      }
      return { status: 200, body: previous };
    }
  }

  if (loan.status === 'CLOSED') {
    return { status: 400, body: { error: 'This loan is closed.' } };
  }

  let remaining = paymentAmount;

  // 1. Penalties
  const penaltiesAllocated = Math.min(remaining, loan.unpaidPenalties || 0);
  remaining -= penaltiesAllocated;

  // 2. Fees
  const feesAllocated = Math.min(remaining, loan.unpaidFees || 0);
  remaining -= feesAllocated;

  // 3. Accrued Interest
  const interestAllocated = Math.min(remaining, loan.accruedInterest > 0 ? loan.accruedInterest : roundCurrency(loan.outstandingPrincipal * (loan.interestRate / 100 / 12)));
  remaining -= interestAllocated;

  // 4. Principal
  const principalAllocated = Math.min(remaining, loan.outstandingPrincipal);
  remaining -= principalAllocated;

  if (roundCurrency(remaining) > 0) {
    return { status: 400, body: { error: 'Payment exceeds the outstanding amount.' } };
  }

  const receiptNumber = `RCP-${new Date().getFullYear()}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  const paymentDate = new Date().toISOString().split('T')[0];

  const repaymentRecord = {
    id: `rep-${crypto.randomUUID()}`,
    receiptNumber,
    loanId,
    amount: paymentAmount,
    paymentDate,
    paymentMethod,
    referenceNumber: referenceNumber || `TXN-${Math.floor(1000000 + Math.random() * 9000000)}`,
    principalAllocated,
    interestAllocated,
    feesAllocated,
    penaltiesAllocated,
    receivedBy: receivedBy || 'Field Officer',
    isReversed: false,
    reversalReason: null,
  };

  await db.insert(schema.repayments).values(repaymentRecord);

  // Update loan record
  const newOutstanding = Math.max(0, loan.outstandingPrincipal - principalAllocated);
  const newStatus = newOutstanding === 0 ? 'CLOSED' : (loan.daysInArrears > 0 ? 'ACTIVE' : loan.status);

  await db.update(schema.loans).set({
    outstandingPrincipal: newOutstanding,
    unpaidPenalties: Math.max(0, (loan.unpaidPenalties || 0) - penaltiesAllocated),
    unpaidFees: Math.max(0, (loan.unpaidFees || 0) - feesAllocated),
    accruedInterest: Math.max(0, (loan.accruedInterest || 0) - interestAllocated),
    totalPaid: sql`${schema.loans.totalPaid} + ${paymentAmount}`,
    status: newStatus,
    daysInArrears: newOutstanding === 0 ? 0 : loan.daysInArrears,
  }).where(eq(schema.loans.id, loanId));

  // Double-Entry Journal Entry
  // DR: 1020 M-Pesa / 1010 Cash (Total Amount received)
  // CR: 1200 Gross Loan Portfolio (Principal reduction)
  // CR: 4010 Interest on Loans (Interest income)
  // CR: 4020 Loan Fees (if any)
  // CR: 4030 Penalties (if any)
  const journalId = `jnl-${crypto.randomUUID()}`;
  const debitAccount = settlement;
  const debitAccountName = paymentMethod === 'CASH' ? 'Cash in Vault' : `${paymentMethod} Settlement Account`;

  await db.insert(schema.journalEntries).values({
    id: journalId,
    entryNumber: `JNL-REP-${receiptNumber}`,
    transactionDate: paymentDate,
    narration: `Repayment for Loan ${loan.loanAccountNumber} (Receipt ${receiptNumber})`,
    referenceType: 'REPAYMENT',
    referenceId: repaymentRecord.id,
    totalDebit: paymentAmount,
    totalCredit: paymentAmount,
    postedBy: requester.id,
  });

  const lines = [
    {
      id: `line-${journalId}-dr`,
      journalId,
      accountCode: debitAccount,
      accountName: debitAccountName,
      entryType: 'DEBIT',
      amount: paymentAmount,
    },
  ];

  if (principalAllocated > 0) {
    lines.push({
      id: `line-${journalId}-cr-prin`,
      journalId,
      accountCode: '1200',
      accountName: 'Gross Loan Portfolio',
      entryType: 'CREDIT',
      amount: principalAllocated,
    });
    await db.update(schema.chartOfAccounts).set({
      balance: sql`${schema.chartOfAccounts.balance} - ${principalAllocated}`,
    }).where(eq(schema.chartOfAccounts.code, '1200'));
  }

  if (interestAllocated > 0) {
    lines.push({
      id: `line-${journalId}-cr-int`,
      journalId,
      accountCode: '4010',
      accountName: 'Interest on Loans',
      entryType: 'CREDIT',
      amount: interestAllocated,
    });
    await db.update(schema.chartOfAccounts).set({
      balance: sql`${schema.chartOfAccounts.balance} + ${interestAllocated}`,
    }).where(eq(schema.chartOfAccounts.code, '4010'));
  }

  if (penaltiesAllocated > 0) {
    lines.push({
      id: `line-${journalId}-cr-pen`,
      journalId,
      accountCode: '4030',
      accountName: 'Late Payment Penalties',
      entryType: 'CREDIT',
      amount: penaltiesAllocated,
    });
    await db.update(schema.chartOfAccounts).set({
      balance: sql`${schema.chartOfAccounts.balance} + ${penaltiesAllocated}`,
    }).where(eq(schema.chartOfAccounts.code, '4030'));
  }

  if (feesAllocated > 0) {
    lines.push({
      id: `line-${journalId}-cr-fee`,
      journalId,
      accountCode: '4020',
      accountName: 'Loan Processing Fees',
      entryType: 'CREDIT',
      amount: feesAllocated,
    });
    await db.update(schema.chartOfAccounts).set({
      balance: sql`${schema.chartOfAccounts.balance} + ${feesAllocated}`,
    }).where(eq(schema.chartOfAccounts.code, '4020'));
  }

  // Debit Account update
  await db.update(schema.chartOfAccounts).set({
    balance: sql`${schema.chartOfAccounts.balance} + ${paymentAmount}`,
  }).where(eq(schema.chartOfAccounts.code, debitAccount));

  await db.insert(schema.journalLines).values(lines);

  // Audit Log
  await db.insert(schema.auditLogs).values({
    id: `log-${crypto.randomUUID()}`,
    userId: requester.id,
    userName: receivedBy,
    userRole: requester.role,
    action: 'REPAYMENT_POSTED',
    entityName: 'REPAYMENT',
    entityId: repaymentRecord.id,
    ipAddress: ipAddress,
    details: `Collected TZS ${paymentAmount.toLocaleString()} (Principal: ${principalAllocated}, Interest: ${interestAllocated}) for ${loan.loanAccountNumber}.`,
  });

  return { status: 201, body: repaymentRecord };
}

app.post('/api/repayments', requireAuth, async (req: any, res) => {
  try {
    const { db } = getDb();
    const result = await db.transaction((tx) => postRepayment(tx, req.body, req.user, req.ip));
    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Could not post repayment:', error);
    res.status(500).json({ error: 'Could not post the repayment. Check its reference before retrying.' });
  }
});

app.get('/api/repayments', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const list = await db.select().from(schema.repayments).orderBy(desc(schema.repayments.createdAt)).limit(50);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Savings Accounts & Transactions
app.get('/api/savings', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const accounts = await db.select().from(schema.savingsAccounts);
    res.json(accounts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/savings/transaction', requireAuth, async (req: any, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const result = await db.transaction(async (db) => {
      const { accountId, transactionType, amount, channel, narration } = req.body;
      const txAmount = parseMoney(amount);
      if (txAmount === null || !['DEPOSIT', 'WITHDRAWAL'].includes(transactionType)) {
        return { status: 400, body: { error: 'A positive amount and a valid transaction type are required' } };
      }

      // Withdrawals move money out of the institution - restrict to roles that
      // handle cash/till operations, unlike deposits which any staff can record.
      if (transactionType === 'WITHDRAWAL') {
        const withdrawalRoles = ['CASHIER', 'BRANCH_MANAGER', 'ACCOUNTANT', 'HEAD_OFFICE_MANAGER', 'SUPER_ADMIN'];
        if (!withdrawalRoles.includes(req.user.role)) {
          return { status: 403, body: {
            error: `Forbidden: savings withdrawals require one of the following roles: ${withdrawalRoles.join(', ')}.`,
            code: 'INSUFFICIENT_PERMISSIONS',
          } };
        }
      }

      const [account] = await db.select().from(schema.savingsAccounts).where(eq(schema.savingsAccounts.id, accountId)).for('update');
      if (!account) {
        return { status: 404, body: { error: 'Savings account not found' } };
      }

      let newBalance = account.balance;
      if (transactionType === 'DEPOSIT') {
        newBalance += txAmount;
      } else if (transactionType === 'WITHDRAWAL') {
        const available = account.balance - account.lockedAmount;
        if (txAmount > available) {
          return { status: 400, body: { error: `Insufficient withdrawable balance. Available: TZS ${available.toLocaleString()} (Locked: TZS ${account.lockedAmount.toLocaleString()})` } };
        }
        newBalance -= txAmount;
      }

      const method = channel || 'CASH';
      const settlementCode = Object.hasOwn(settlementAccounts, method) ? settlementAccounts[method] : undefined;
      if (!settlementCode) return { status: 400, body: { error: 'Unsupported savings payment channel.' } };

      const liabilityCode = account.productType === 'COMPULSORY' || account.productType === 'COMPULSORY_COLLATERAL' ? '2020' : '2010';
      const ledgerAccounts = await db.select().from(schema.chartOfAccounts)
        .where(inArray(schema.chartOfAccounts.code, [settlementCode, liabilityCode]));
      if (ledgerAccounts.length !== 2) {
        return { status: 409, body: { error: 'The required settlement and savings accounts are missing from the ledger.' } };
      }
      const isDeposit = transactionType === 'DEPOSIT';

      const txId = `sav-tx-${crypto.randomUUID()}`;
      const txRecord = {
        id: txId,
        accountId,
        transactionType,
        amount: txAmount,
        balanceAfter: newBalance,
        narration: narration || `Member ${transactionType.toLowerCase()} via ${channel || 'Cash'}`,
        channel: channel || 'CASH',
        reference: `SAV-REF-${Math.floor(100000 + Math.random() * 900000)}`,
      };

      await db.insert(schema.savingsTransactions).values(txRecord);
      await db.update(schema.savingsAccounts).set({ balance: newBalance }).where(eq(schema.savingsAccounts.id, accountId));

      const journalId = `jnl-${txId}`;
      await db.insert(schema.journalEntries).values({
        id: journalId,
        entryNumber: `JNL-${txId}`,
        transactionDate: new Date().toISOString().split('T')[0],
        narration: txRecord.narration,
        referenceType: 'SAVINGS',
        referenceId: txId,
        totalDebit: txAmount,
        totalCredit: txAmount,
        postedBy: req.user.id,
      });
      await db.insert(schema.journalLines).values(ledgerAccounts.map((ledgerAccount) => ({
        id: `${journalId}-${ledgerAccount.code}`,
        journalId,
        accountCode: ledgerAccount.code,
        accountName: ledgerAccount.name,
        entryType: (ledgerAccount.code === settlementCode) === isDeposit ? 'DEBIT' : 'CREDIT',
        amount: txAmount,
      })));
      const delta = isDeposit ? txAmount : -txAmount;
      await db.update(schema.chartOfAccounts).set({ balance: sql`${schema.chartOfAccounts.balance} + ${delta}` })
        .where(inArray(schema.chartOfAccounts.code, [settlementCode, liabilityCode]));

      return { status: 201, body: txRecord };
    });
    res.status(result.status).json(result.body);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Accounting: Chart of Accounts
app.get('/api/accounting/coa', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const coa = await db.select().from(schema.chartOfAccounts).orderBy(schema.chartOfAccounts.code);
    res.json(coa);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Accounting: Trial Balance
app.get('/api/accounting/trial-balance', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const coa = await db.select().from(schema.chartOfAccounts).orderBy(schema.chartOfAccounts.code);

    let totalDebit = 0;
    let totalCredit = 0;

    const rows = coa.map((account) => {
      let debit = 0;
      let credit = 0;
      if (account.normalBalance === 'DEBIT') {
        debit = account.balance;
        totalDebit += debit;
      } else {
        credit = account.balance;
        totalCredit += credit;
      }
      return {
        code: account.code,
        name: account.name,
        type: account.type,
        debit,
        credit,
      };
    });

    res.json({
      asOf: new Date().toISOString(),
      rows,
      totalDebit: roundCurrency(totalDebit),
      totalCredit: roundCurrency(totalCredit),
      isBalanced: Math.abs(totalDebit - totalCredit) < 1,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Accounting: Journal Entries
app.get('/api/accounting/journal', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const entries = await db.select().from(schema.journalEntries).orderBy(desc(schema.journalEntries.createdAt)).limit(30);
    const lines = await db.select().from(schema.journalLines);

    const fullEntries = entries.map((e) => {
      const entryLines = lines.filter((l) => l.journalId === e.id);
      return {
        ...e,
        lines: entryLines,
      };
    });

    res.json(fullEntries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Accounting: Post Manual Journal Voucher
app.post('/api/accounting/journal', requireAuth, requireRole('ACCOUNTANT', 'BRANCH_MANAGER', 'HEAD_OFFICE_MANAGER', 'SUPER_ADMIN'), async (req: any, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const result = await db.transaction(async (db) => {
      const { entryNumber, narration, lines } = req.body;
      const requester = req.user;

      if (!Array.isArray(lines) || lines.length < 2 || lines.some((line) =>
        !line || !['DEBIT', 'CREDIT'].includes(line.entryType) || parseMoney(line.amount) === null
      )) {
        return { status: 400, body: { error: 'At least two balanced journal lines are required' } };
      }

      const totalDebit = lines
        .filter((l: any) => l.entryType === 'DEBIT')
        .reduce((sum: number, l: any) => sum + Number(l.amount), 0);
      const totalCredit = lines
        .filter((l: any) => l.entryType === 'CREDIT')
        .reduce((sum: number, l: any) => sum + Number(l.amount), 0);

      if (roundCurrency(totalDebit) !== roundCurrency(totalCredit)) {
        return { status: 400, body: {
          error: `Double-entry invariant violated: Total Debits (${totalDebit}) must equal Total Credits (${totalCredit})`,
        } };
      }

      const accountCodes = [...new Set<string>(lines.map((line) => line.accountCode).filter((code) => typeof code === 'string'))];
      if (lines.some((line) => typeof line.accountCode !== 'string') || accountCodes.length === 0) {
        return { status: 400, body: { error: 'Every line must reference a ledger account.' } };
      }
      const accounts = await db.select().from(schema.chartOfAccounts).where(inArray(schema.chartOfAccounts.code, accountCodes));
      if (accounts.length !== accountCodes.length) {
        return { status: 400, body: { error: 'Every line must reference an existing ledger account.' } };
      }

      const journalId = `jnl-${crypto.randomUUID()}`;
      const transactionDate = new Date().toISOString().split('T')[0];

      const newEntry = {
        id: journalId,
        entryNumber: entryNumber || `JV-MAN-${Math.floor(100000 + Math.random() * 900000)}`,
        transactionDate,
        narration: narration || 'Manual Journal Adjustment',
        referenceType: 'ADJUSTMENT',
        referenceId: journalId,
        totalDebit,
        totalCredit,
        postedBy: requester.id,
      };

      await db.insert(schema.journalEntries).values(newEntry);

      const journalLineRecords = lines.map((l: any, idx: number) => ({
        id: `line-${journalId}-${idx}`,
        journalId,
        accountCode: l.accountCode,
        accountName: l.accountName || 'Account',
        entryType: l.entryType,
        amount: Number(l.amount),
      }));

      await db.insert(schema.journalLines).values(journalLineRecords);

      // Update account balances
      for (const line of lines) {
        const amt = Number(line.amount);
        const isDebit = line.entryType === 'DEBIT';
        // Assets & Expenses increase on Debit, decrease on Credit
        // Liabilities, Equity, Revenues increase on Credit, decrease on Debit
        const [acc] = await db
          .select()
          .from(schema.chartOfAccounts)
          .where(eq(schema.chartOfAccounts.code, line.accountCode));

        if (acc) {
          let delta = 0;
          if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
            delta = isDebit ? amt : -amt;
          } else {
            delta = isDebit ? -amt : amt;
          }
          await db
            .update(schema.chartOfAccounts)
            .set({ balance: sql`${schema.chartOfAccounts.balance} + ${delta}` })
            .where(eq(schema.chartOfAccounts.code, line.accountCode));
        }
      }

      // Audit Log
      await db.insert(schema.auditLogs).values({
        id: `log-${crypto.randomUUID()}`,
        userId: requester.id,
        userName: `${requester.firstName} ${requester.lastName}`,
        userRole: requester.role,
        action: 'MANUAL_JOURNAL_POSTED',
        entityName: 'JOURNAL_ENTRY',
        entityId: journalId,
        ipAddress: req.ip || '127.0.0.1',
        details: `Posted manual journal voucher ${newEntry.entryNumber} totaling TZS ${totalDebit.toLocaleString()}. Narration: ${narration}`,
      });

      return { status: 201, body: { ...newEntry, lines: journalLineRecords } };
    });
    res.status(result.status).json(result.body);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

async function recordMobileMoney(
  input: { provider: string; providerTxId: string; accountReference: string; phoneNumber: string; amount: number },
  signature: string,
  requester: { id: string; firstName: string; lastName: string; role: string },
  ipAddress: string,
) {
  const { db } = getDb();
  return db.transaction(async (tx) => {
    const { provider, providerTxId, accountReference, phoneNumber, amount } = input;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${providerTxId}))`);
    const [previous] = await tx.select().from(schema.mobileMoneyTransactions)
      .where(eq(schema.mobileMoneyTransactions.providerTxId, providerTxId));
    if (previous) {
      if (previous.amount !== amount || previous.accountReference !== accountReference || previous.provider !== provider) {
        return { status: 409, body: { error: 'Provider reference conflicts with an existing payment.' } };
      }
      return { status: 200, body: { status: 'DUPLICATE_IGNORED', receiptNumber: previous.receiptNumber } };
    }

    const [loan] = await tx.select({ id: schema.loans.id }).from(schema.loans)
      .where(eq(schema.loans.loanAccountNumber, accountReference));
    const posting = loan
      ? await postRepayment(tx, { loanId: loan.id, amount, paymentMethod: provider, referenceNumber: `MOMO-${providerTxId}` }, requester, ipAddress)
      : null;
    const receiptNumber = posting && 'receiptNumber' in posting.body ? posting.body.receiptNumber : null;
    const processingStatus = receiptNumber ? 'COMPLETED' : 'REQUIRES_REVIEW';
    await tx.insert(schema.mobileMoneyTransactions).values({
      id: `mno-tx-${crypto.randomUUID()}`, provider, providerTxId, accountReference, phoneNumber, amount,
      hmacSignature: signature, processingStatus, receiptNumber,
    });
    return { status: 200, body: {
      status: processingStatus,
      providerTxId,
      receiptNumber,
      message: receiptNumber ? 'Payment posted to the ledger.' : 'Payment recorded for reconciliation.',
    } };
  });
}

app.post('/api/mobile-money/webhook', async (req, res) => {
  const { provider, providerTxId, accountReference, phoneNumber } = req.body;
  const amount = parseMoney(req.body.amount);
  if (!amount || !['MPESA', 'AIRTEL_MONEY', 'TIGO_PESA'].includes(provider) ||
    typeof providerTxId !== 'string' || !providerTxId || typeof accountReference !== 'string' ||
    !accountReference || typeof phoneNumber !== 'string') {
    return res.status(400).json({ error: 'A valid provider, payment reference, account and amount are required.' });
  }
  const signature = crypto.createHmac('sha256', MOMO_WEBHOOK_SECRET)
    .update(`${provider}:${providerTxId}:${accountReference}:${amount}`).digest('hex');
  const supplied = String(req.headers['x-webhook-signature'] || '');
  if (!/^[0-9a-f]{64}$/i.test(supplied) || !crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(supplied, 'hex'))) {
    return res.status(401).json({ error: 'Invalid or missing webhook signature.' });
  }
  try {
    const result = await recordMobileMoney({ provider, providerTxId, accountReference, phoneNumber, amount }, signature,
      { id: 'mobile-money', firstName: 'Mobile Money', lastName: 'Gateway', role: 'SYSTEM' }, req.ip);
    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Mobile money callback failed:', error);
    res.status(500).json({ error: 'Unable to record callback.' });
  }
});

app.post('/api/mobile-money/simulate', requireAuth, async (req: any, res) => {
  if (!demoMode) return res.sendStatus(404);
  const { provider, accountReference, phoneNumber } = req.body;
  const amount = parseMoney(req.body.amount);
  if (!amount || !['MPESA', 'AIRTEL_MONEY', 'TIGO_PESA'].includes(provider) ||
    typeof accountReference !== 'string' || !accountReference || typeof phoneNumber !== 'string') {
    return res.status(400).json({ error: 'A valid provider, account and amount are required.' });
  }
  try {
    const result = await recordMobileMoney({
      provider, providerTxId: `DEMO-${crypto.randomUUID()}`, accountReference, phoneNumber, amount,
    }, 'demo', req.user, req.ip);
    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Mobile money simulation failed:', error);
    res.status(500).json({ error: 'Unable to simulate payment.' });
  }
});

app.get('/api/mobile-money/transactions', requireAuth, async (_req, res) => {
  try {
    const transactions = await getDb().db.select().from(schema.mobileMoneyTransactions)
      .orderBy(desc(schema.mobileMoneyTransactions.receivedAt)).limit(100);
    res.json(transactions.map(({ hmacSignature, ...item }) => ({ ...item, signatureVerified: hmacSignature !== 'demo' })));
  } catch {
    res.status(503).json({ error: 'Unable to load mobile money transactions.' });
  }
});

app.get('/api/audit-logs', requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const logs = await db.select().from(schema.auditLogs).orderBy(desc(schema.auditLogs.timestamp)).limit(50);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Offline Sync Batch Endpoint
app.post('/api/offline-sync', requireAuth, async (req: any, res) => {
  const { deviceId, queue } = req.body;
  if (!Array.isArray(queue) || queue.length > 100) {
    return res.status(400).json({ error: 'Supply an array of at most 100 queued operations.' });
  }
  const { db } = getDb();
  const results = [];
  for (const item of queue) {
    const localId = item?.localId ?? item?.id;
    if (typeof localId !== 'string' || !localId || item?.operationType !== 'COLLECTION_PAYMENT' || !item.payload?.loanId) {
      results.push({ localId, status: 'FAILED', error: 'Only valid collection payments can be synced.' });
      continue;
    }
    try {
      const result = await db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${localId}))`);
        const [existing] = await tx.select().from(schema.offlineSyncRecords).where(eq(schema.offlineSyncRecords.localId, localId));
        if (existing) return { localId, status: 'ALREADY_SYNCED' };

        const { loanId, amount, paymentMethod, channelRef } = item.payload;
        const posted = await postRepayment(tx, {
          loanId, amount, paymentMethod: paymentMethod || 'CASH',
          referenceNumber: channelRef || `OFFLINE-${localId}`,
        }, req.user, req.ip);
        if ('error' in posted.body) return { localId, status: 'FAILED', error: posted.body.error };

        await tx.insert(schema.offlineSyncRecords).values({
          id: `sync-${crypto.randomUUID()}`,
          localId, deviceId: deviceId || 'field-device', operationType: item.operationType,
          payloadJson: JSON.stringify(item.payload),
          clientTimestamp: item.clientTimestamp || new Date().toISOString(),
          syncStatus: 'SYNCED', syncedAt: new Date(), retryCount: 0,
        });
        return { localId, status: 'SUCCESS' };
      });
      results.push(result);
    } catch (error) {
      console.error('Offline payment could not be posted:', error);
      results.push({ localId, status: 'FAILED', error: 'Unable to post the collection payment.' });
    }
  }
  res.json({ syncedCount: results.filter((row) => row.status === 'SUCCESS').length, results });
});

// Vite Middleware for Development / Static serving for Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.IMARA_DISABLE_HMR === 'true' ? false : undefined },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
  app.listen(PORT, host, () => {
    console.log(`Mastermind Microfinance running on http://${host}:${PORT}`);
  });
}

// Only actually start a listening server (and wire up Vite/static serving)
// outside Vercel. Vercel sets VERCEL=1 in every function's environment and
// invokes the exported Express app per-request itself (via api/index.ts) -
// it never runs this file directly, and serves the built frontend as static
// output rather than through Express. Every other context (local dev,
// Docker, a plain VPS) should always start normally.
if (!process.env.VERCEL) {
  startServer();
}

export { app };
