import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { count, sql } from 'drizzle-orm';
import { getDb } from './index.ts';
import { users } from './schema.ts';

async function provisionAdministrator() {
  const username = (process.env.IMARA_ADMIN_USERNAME || '').trim().toLowerCase();
  const email = (process.env.IMARA_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.IMARA_ADMIN_PASSWORD || '';
  if (process.env.IMARA_DEMO_MODE === 'true') throw new Error('Use a dedicated database with demo mode disabled.');
  if (!/^[a-z0-9._-]{3,30}$/.test(username) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 14 || Buffer.byteLength(password) > 72) {
    throw new Error('Set IMARA_ADMIN_USERNAME, IMARA_ADMIN_EMAIL and IMARA_ADMIN_PASSWORD (14–72 UTF-8 bytes).');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const { db, pool } = getDb();
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(693281054)`);
      const [{ count: existingUsers }] = await tx.select({ count: count() }).from(users);
      if (existingUsers) throw new Error('This command is only for a database without staff accounts.');
      await tx.insert(users).values({
        id: randomUUID(), username, email, passwordHash,
        firstName: 'System', lastName: 'Administrator', role: 'SUPER_ADMIN',
      });
    });
    console.log('Initial administrator created.');
  } finally {
    await pool.end();
  }
}

provisionAdministrator().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Administrator setup failed.');
  process.exitCode = 1;
});
