var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  app: () => app
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var dotenv2 = __toESM(require("dotenv"), 1);

// src/db/index.ts
var import_node_postgres = require("drizzle-orm/node-postgres");
var import_pg = __toESM(require("pg"), 1);

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  auditLogs: () => auditLogs,
  branches: () => branches,
  chartOfAccounts: () => chartOfAccounts,
  customers: () => customers,
  groupMembers: () => groupMembers,
  groups: () => groups,
  journalEntries: () => journalEntries,
  journalLines: () => journalLines,
  loanApplications: () => loanApplications,
  loanInstallments: () => loanInstallments,
  loanProducts: () => loanProducts,
  loans: () => loans,
  loginAttempts: () => loginAttempts,
  mobileMoneyTransactions: () => mobileMoneyTransactions,
  offlineSyncRecords: () => offlineSyncRecords,
  passwordResetOtps: () => passwordResetOtps,
  repayments: () => repayments,
  savingsAccounts: () => savingsAccounts,
  savingsTransactions: () => savingsTransactions,
  users: () => users
});
var import_pg_core = require("drizzle-orm/pg-core");
var branches = (0, import_pg_core.pgTable)("branches", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  code: (0, import_pg_core.text)("code").notNull().unique(),
  name: (0, import_pg_core.text)("name").notNull(),
  region: (0, import_pg_core.text)("region").notNull(),
  address: (0, import_pg_core.text)("address").notNull(),
  phone: (0, import_pg_core.text)("phone").notNull(),
  isActive: (0, import_pg_core.boolean)("is_active").default(true).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var users = (0, import_pg_core.pgTable)("users", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  uid: (0, import_pg_core.text)("uid"),
  // Firebase Auth UID if signed in
  username: (0, import_pg_core.text)("username"),
  email: (0, import_pg_core.text)("email").notNull(),
  passwordHash: (0, import_pg_core.text)("password_hash"),
  firstName: (0, import_pg_core.text)("first_name").notNull(),
  lastName: (0, import_pg_core.text)("last_name").notNull(),
  role: (0, import_pg_core.text)("role").notNull(),
  // 'ADMIN' | 'HEAD_OFFICE_MANAGER' | 'BRANCH_MANAGER' | 'CREDIT_OFFICER' | 'LOAN_OFFICER' | 'COLLECTION_OFFICER' | 'CASHIER' | 'ACCOUNTANT' | 'AUDITOR'
  branchId: (0, import_pg_core.text)("branch_id").references(() => branches.id),
  preferredLanguage: (0, import_pg_core.text)("preferred_language").default("en").notNull(),
  // 'en' | 'sw'
  isActive: (0, import_pg_core.boolean)("is_active").default(true).notNull(),
  failedLoginAttempts: (0, import_pg_core.integer)("failed_login_attempts").default(0),
  lockedUntil: (0, import_pg_core.timestamp)("locked_until"),
  lastLoginAt: (0, import_pg_core.timestamp)("last_login_at"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var customers = (0, import_pg_core.pgTable)("customers", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  customerNumber: (0, import_pg_core.text)("customer_number").notNull().unique(),
  firstName: (0, import_pg_core.text)("first_name").notNull(),
  lastName: (0, import_pg_core.text)("last_name").notNull(),
  nationalIdNida: (0, import_pg_core.text)("national_id_nida").notNull().unique(),
  phoneNumber: (0, import_pg_core.text)("phone_number").notNull(),
  email: (0, import_pg_core.text)("email"),
  dateOfBirth: (0, import_pg_core.text)("date_of_birth").notNull(),
  gender: (0, import_pg_core.text)("gender").notNull(),
  residentialAddress: (0, import_pg_core.text)("residential_address").notNull(),
  businessType: (0, import_pg_core.text)("business_type").notNull(),
  monthlyIncome: (0, import_pg_core.doublePrecision)("monthly_income").notNull(),
  branchId: (0, import_pg_core.text)("branch_id").references(() => branches.id).notNull(),
  kycTier: (0, import_pg_core.integer)("kyc_tier").default(2).notNull(),
  crbStatus: (0, import_pg_core.text)("crb_status").default("GOOD").notNull(),
  crbScore: (0, import_pg_core.integer)("crb_score").default(710).notNull(),
  latitude: (0, import_pg_core.doublePrecision)("latitude"),
  longitude: (0, import_pg_core.doublePrecision)("longitude"),
  documentUrl: (0, import_pg_core.text)("document_url"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var groups = (0, import_pg_core.pgTable)("groups", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  groupNumber: (0, import_pg_core.text)("group_number").notNull().unique(),
  name: (0, import_pg_core.text)("name").notNull(),
  meetingDay: (0, import_pg_core.text)("meeting_day").notNull(),
  meetingFrequency: (0, import_pg_core.text)("meeting_frequency").notNull(),
  // 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY'
  meetingLocation: (0, import_pg_core.text)("meeting_location").notNull(),
  branchId: (0, import_pg_core.text)("branch_id").references(() => branches.id).notNull(),
  officerId: (0, import_pg_core.text)("officer_id").references(() => users.id),
  isActive: (0, import_pg_core.boolean)("is_active").default(true).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var groupMembers = (0, import_pg_core.pgTable)("group_members", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  groupId: (0, import_pg_core.text)("group_id").references(() => groups.id).notNull(),
  customerId: (0, import_pg_core.text)("customer_id").references(() => customers.id).notNull(),
  roleInGroup: (0, import_pg_core.text)("role_in_group").default("MEMBER").notNull(),
  // 'CHAIRPERSON' | 'SECRETARY' | 'TREASURER' | 'MEMBER'
  joinedAt: (0, import_pg_core.timestamp)("joined_at").defaultNow().notNull()
});
var loanProducts = (0, import_pg_core.pgTable)("loan_products", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  code: (0, import_pg_core.text)("code").notNull().unique(),
  nameEn: (0, import_pg_core.text)("name_en").notNull(),
  nameSw: (0, import_pg_core.text)("name_sw").notNull(),
  interestMethod: (0, import_pg_core.text)("interest_method").notNull(),
  // 'FLAT' | 'REDUCING_EQUAL_INSTALLMENT' | 'REDUCING_EQUAL_PRINCIPAL'
  annualInterestRate: (0, import_pg_core.doublePrecision)("annual_interest_rate").notNull(),
  minAmount: (0, import_pg_core.doublePrecision)("min_amount").notNull(),
  maxAmount: (0, import_pg_core.doublePrecision)("max_amount").notNull(),
  minTenureMonths: (0, import_pg_core.integer)("min_tenure_months").notNull(),
  maxTenureMonths: (0, import_pg_core.integer)("max_tenure_months").notNull(),
  repaymentFrequency: (0, import_pg_core.text)("repayment_frequency").notNull(),
  // 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY'
  originationFeeRate: (0, import_pg_core.doublePrecision)("origination_fee_rate").default(0.02).notNull(),
  compulsorySavingsRate: (0, import_pg_core.doublePrecision)("compulsory_savings_rate").default(0.1).notNull(),
  penaltyRatePerDay: (0, import_pg_core.doublePrecision)("penalty_rate_per_day").default(1e-3).notNull(),
  gracePeriodDays: (0, import_pg_core.integer)("grace_period_days").default(0).notNull(),
  isActive: (0, import_pg_core.boolean)("is_active").default(true).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var loanApplications = (0, import_pg_core.pgTable)("loan_applications", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  applicationNumber: (0, import_pg_core.text)("application_number").notNull().unique(),
  customerId: (0, import_pg_core.text)("customer_id").references(() => customers.id).notNull(),
  productId: (0, import_pg_core.text)("product_id").references(() => loanProducts.id).notNull(),
  groupId: (0, import_pg_core.text)("group_id").references(() => groups.id),
  requestedAmount: (0, import_pg_core.doublePrecision)("requested_amount").notNull(),
  approvedAmount: (0, import_pg_core.doublePrecision)("approved_amount"),
  tenureMonths: (0, import_pg_core.integer)("tenure_months").notNull(),
  purpose: (0, import_pg_core.text)("purpose").notNull(),
  status: (0, import_pg_core.text)("status").default("PENDING_REVIEW").notNull(),
  // 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISBURSED'
  assessedDsti: (0, import_pg_core.doublePrecision)("assessed_dsti"),
  creditScore: (0, import_pg_core.integer)("credit_score"),
  officerRecommendation: (0, import_pg_core.text)("officer_recommendation"),
  submittedBy: (0, import_pg_core.text)("submitted_by").references(() => users.id),
  reviewedBy: (0, import_pg_core.text)("reviewed_by").references(() => users.id),
  rejectionReason: (0, import_pg_core.text)("rejection_reason"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var loans = (0, import_pg_core.pgTable)("loans", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  loanAccountNumber: (0, import_pg_core.text)("loan_account_number").notNull().unique(),
  applicationId: (0, import_pg_core.text)("application_id").references(() => loanApplications.id).notNull(),
  customerId: (0, import_pg_core.text)("customer_id").references(() => customers.id).notNull(),
  productId: (0, import_pg_core.text)("product_id").references(() => loanProducts.id).notNull(),
  branchId: (0, import_pg_core.text)("branch_id").references(() => branches.id).notNull(),
  groupId: (0, import_pg_core.text)("group_id").references(() => groups.id),
  principalAmount: (0, import_pg_core.doublePrecision)("principal_amount").notNull(),
  outstandingPrincipal: (0, import_pg_core.doublePrecision)("outstanding_principal").notNull(),
  interestRate: (0, import_pg_core.doublePrecision)("interest_rate").notNull(),
  tenureMonths: (0, import_pg_core.integer)("tenure_months").notNull(),
  disbursementDate: (0, import_pg_core.text)("disbursement_date").notNull(),
  maturityDate: (0, import_pg_core.text)("maturity_date").notNull(),
  status: (0, import_pg_core.text)("status").default("ACTIVE").notNull(),
  // 'ACTIVE' | 'DELINQUENT' | 'CLOSED' | 'WRITTEN_OFF'
  interestMethod: (0, import_pg_core.text)("interest_method").notNull(),
  repaymentFrequency: (0, import_pg_core.text)("repayment_frequency").notNull(),
  daysInArrears: (0, import_pg_core.integer)("days_in_arrears").default(0).notNull(),
  accruedInterest: (0, import_pg_core.doublePrecision)("accrued_interest").default(0).notNull(),
  unpaidFees: (0, import_pg_core.doublePrecision)("unpaid_fees").default(0).notNull(),
  unpaidPenalties: (0, import_pg_core.doublePrecision)("unpaid_penalties").default(0).notNull(),
  totalPaid: (0, import_pg_core.doublePrecision)("total_paid").default(0).notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var loanInstallments = (0, import_pg_core.pgTable)("loan_installments", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  loanId: (0, import_pg_core.text)("loan_id").references(() => loans.id).notNull(),
  installmentNumber: (0, import_pg_core.integer)("installment_number").notNull(),
  dueDate: (0, import_pg_core.text)("due_date").notNull(),
  principalDue: (0, import_pg_core.doublePrecision)("principal_due").notNull(),
  interestDue: (0, import_pg_core.doublePrecision)("interest_due").notNull(),
  feesDue: (0, import_pg_core.doublePrecision)("fees_due").default(0).notNull(),
  totalDue: (0, import_pg_core.doublePrecision)("total_due").notNull(),
  principalPaid: (0, import_pg_core.doublePrecision)("principal_paid").default(0).notNull(),
  interestPaid: (0, import_pg_core.doublePrecision)("interest_paid").default(0).notNull(),
  feesPaid: (0, import_pg_core.doublePrecision)("fees_paid").default(0).notNull(),
  penaltiesPaid: (0, import_pg_core.doublePrecision)("penalties_paid").default(0).notNull(),
  status: (0, import_pg_core.text)("status").default("PENDING").notNull(),
  // 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE'
  paidAt: (0, import_pg_core.text)("paid_at")
});
var repayments = (0, import_pg_core.pgTable)("repayments", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  receiptNumber: (0, import_pg_core.text)("receipt_number").notNull().unique(),
  loanId: (0, import_pg_core.text)("loan_id").references(() => loans.id).notNull(),
  amount: (0, import_pg_core.doublePrecision)("amount").notNull(),
  paymentDate: (0, import_pg_core.text)("payment_date").notNull(),
  paymentMethod: (0, import_pg_core.text)("payment_method").notNull(),
  // 'MPESA' | 'AIRTEL_MONEY' | 'TIGO_PESA' | 'CASH' | 'BANK_TRANSFER'
  referenceNumber: (0, import_pg_core.text)("reference_number").notNull(),
  principalAllocated: (0, import_pg_core.doublePrecision)("principal_allocated").notNull(),
  interestAllocated: (0, import_pg_core.doublePrecision)("interest_allocated").notNull(),
  feesAllocated: (0, import_pg_core.doublePrecision)("fees_allocated").notNull(),
  penaltiesAllocated: (0, import_pg_core.doublePrecision)("penalties_allocated").notNull(),
  receivedBy: (0, import_pg_core.text)("received_by").notNull(),
  isReversed: (0, import_pg_core.boolean)("is_reversed").default(false).notNull(),
  reversalReason: (0, import_pg_core.text)("reversal_reason"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var savingsAccounts = (0, import_pg_core.pgTable)("savings_accounts", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  accountNumber: (0, import_pg_core.text)("account_number").notNull().unique(),
  customerId: (0, import_pg_core.text)("customer_id").references(() => customers.id).notNull(),
  productType: (0, import_pg_core.text)("product_type").notNull(),
  // 'VOLUNTARY' | 'COMPULSORY_COLLATERAL'
  balance: (0, import_pg_core.doublePrecision)("balance").default(0).notNull(),
  lockedAmount: (0, import_pg_core.doublePrecision)("locked_amount").default(0).notNull(),
  status: (0, import_pg_core.text)("status").default("ACTIVE").notNull(),
  // 'ACTIVE' | 'DORMANT' | 'FROZEN'
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var savingsTransactions = (0, import_pg_core.pgTable)("savings_transactions", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  accountId: (0, import_pg_core.text)("account_id").references(() => savingsAccounts.id).notNull(),
  transactionType: (0, import_pg_core.text)("transaction_type").notNull(),
  // 'DEPOSIT' | 'WITHDRAWAL' | 'INTEREST_CREDIT'
  amount: (0, import_pg_core.doublePrecision)("amount").notNull(),
  balanceAfter: (0, import_pg_core.doublePrecision)("balance_after").notNull(),
  narration: (0, import_pg_core.text)("narration").notNull(),
  channel: (0, import_pg_core.text)("channel").notNull(),
  reference: (0, import_pg_core.text)("reference").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var chartOfAccounts = (0, import_pg_core.pgTable)("chart_of_accounts", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  code: (0, import_pg_core.text)("code").notNull().unique(),
  name: (0, import_pg_core.text)("name").notNull(),
  type: (0, import_pg_core.text)("type").notNull(),
  // 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'
  normalBalance: (0, import_pg_core.text)("normal_balance").notNull(),
  // 'DEBIT' | 'CREDIT'
  balance: (0, import_pg_core.doublePrecision)("balance").default(0).notNull(),
  description: (0, import_pg_core.text)("description"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var journalEntries = (0, import_pg_core.pgTable)("journal_entries", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  entryNumber: (0, import_pg_core.text)("entry_number").notNull().unique(),
  transactionDate: (0, import_pg_core.text)("transaction_date").notNull(),
  narration: (0, import_pg_core.text)("narration").notNull(),
  referenceType: (0, import_pg_core.text)("reference_type").notNull(),
  // 'DISBURSEMENT' | 'REPAYMENT' | 'SAVINGS_DEPOSIT' | 'PROVISION'
  referenceId: (0, import_pg_core.text)("reference_id"),
  totalDebit: (0, import_pg_core.doublePrecision)("total_debit").notNull(),
  totalCredit: (0, import_pg_core.doublePrecision)("total_credit").notNull(),
  postedBy: (0, import_pg_core.text)("posted_by").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var journalLines = (0, import_pg_core.pgTable)("journal_lines", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  journalId: (0, import_pg_core.text)("journal_id").references(() => journalEntries.id).notNull(),
  accountCode: (0, import_pg_core.text)("account_code").notNull(),
  accountName: (0, import_pg_core.text)("account_name").notNull(),
  entryType: (0, import_pg_core.text)("entry_type").notNull(),
  // 'DEBIT' | 'CREDIT'
  amount: (0, import_pg_core.doublePrecision)("amount").notNull()
});
var mobileMoneyTransactions = (0, import_pg_core.pgTable)("mobile_money_transactions", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  provider: (0, import_pg_core.text)("provider").notNull(),
  // 'MPESA' | 'AIRTEL_MONEY' | 'TIGO_PESA'
  providerTxId: (0, import_pg_core.text)("provider_tx_id").notNull().unique(),
  accountReference: (0, import_pg_core.text)("account_reference").notNull(),
  phoneNumber: (0, import_pg_core.text)("phone_number").notNull(),
  amount: (0, import_pg_core.doublePrecision)("amount").notNull(),
  hmacSignature: (0, import_pg_core.text)("hmac_signature").notNull(),
  processingStatus: (0, import_pg_core.text)("processing_status").notNull(),
  // 'COMPLETED' | 'FAILED' | 'DUPLICATE'
  receiptNumber: (0, import_pg_core.text)("receipt_number"),
  receivedAt: (0, import_pg_core.timestamp)("received_at").defaultNow().notNull()
});
var auditLogs = (0, import_pg_core.pgTable)("audit_logs", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  timestamp: (0, import_pg_core.timestamp)("timestamp").defaultNow().notNull(),
  userId: (0, import_pg_core.text)("user_id").notNull(),
  userName: (0, import_pg_core.text)("user_name").notNull(),
  userRole: (0, import_pg_core.text)("user_role").notNull(),
  action: (0, import_pg_core.text)("action").notNull(),
  entityName: (0, import_pg_core.text)("entity_name").notNull(),
  entityId: (0, import_pg_core.text)("entity_id").notNull(),
  ipAddress: (0, import_pg_core.text)("ip_address").notNull(),
  details: (0, import_pg_core.text)("details").notNull()
});
var loginAttempts = (0, import_pg_core.pgTable)("login_attempts", {
  rateLimitKey: (0, import_pg_core.text)("rate_limit_key").primaryKey(),
  // `${ip}_${identifier}`
  count: (0, import_pg_core.integer)("count").default(0).notNull(),
  firstAttempt: (0, import_pg_core.timestamp)("first_attempt").defaultNow().notNull(),
  lockedUntil: (0, import_pg_core.timestamp)("locked_until")
});
var passwordResetOtps = (0, import_pg_core.pgTable)("password_reset_otps", {
  identifier: (0, import_pg_core.text)("identifier").primaryKey(),
  otp: (0, import_pg_core.text)("otp").notNull(),
  expiresAt: (0, import_pg_core.timestamp)("expires_at").notNull()
});
var offlineSyncRecords = (0, import_pg_core.pgTable)("offline_sync_records", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  localId: (0, import_pg_core.text)("local_id").notNull().unique(),
  deviceId: (0, import_pg_core.text)("device_id").notNull(),
  operationType: (0, import_pg_core.text)("operation_type").notNull(),
  payloadJson: (0, import_pg_core.text)("payload_json").notNull(),
  clientTimestamp: (0, import_pg_core.text)("client_timestamp").notNull(),
  syncStatus: (0, import_pg_core.text)("sync_status").default("PENDING").notNull(),
  // 'PENDING' | 'SYNCED' | 'FAILED' | 'CONFLICT'
  syncedAt: (0, import_pg_core.timestamp)("synced_at"),
  errorMessage: (0, import_pg_core.text)("error_message"),
  retryCount: (0, import_pg_core.integer)("retry_count").default(0).notNull()
});

// src/db/index.ts
var dotenv = __toESM(require("dotenv"), 1);
dotenv.config();
var { Pool } = import_pg.default;
var poolInstance = null;
var dbInstance = null;
function getDb() {
  if (!dbInstance) {
    const host = process.env.SQL_HOST;
    const user = process.env.SQL_USER || process.env.SQL_ADMIN_USER;
    const password = process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD;
    const database = process.env.SQL_DB_NAME;
    if (!host || !user || !password || !database) {
      throw new Error("Database credentials (SQL_HOST, SQL_USER, SQL_PASSWORD, SQL_DB_NAME) are missing.");
    }
    const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "db";
    const sslEnv = process.env.SQL_SSL;
    const useSSL = sslEnv !== void 0 ? sslEnv === "true" : !isLocalHost;
    const isServerless = !!process.env.VERCEL;
    poolInstance = new Pool({
      host,
      user,
      password,
      database,
      max: isServerless ? 1 : 10,
      idleTimeoutMillis: 3e4,
      connectionTimeoutMillis: 1e4,
      ssl: useSSL ? { rejectUnauthorized: false } : false
    });
    dbInstance = (0, import_node_postgres.drizzle)(poolInstance, { schema: schema_exports });
  }
  return { db: dbInstance, pool: poolInstance };
}

// src/db/seed.ts
var import_drizzle_orm = require("drizzle-orm");
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
async function seedDatabaseIfEmpty() {
  const { db } = getDb();
  const [{ count: branchCount }] = await db.select({ count: (0, import_drizzle_orm.count)() }).from(branches);
  if (Number(branchCount) > 0) {
    return;
  }
  console.log("Seeding initial Tanzania Microfinance operational data...");
  const defaultPasswordHash = import_bcryptjs.default.hashSync("Imara@2025", 10);
  await db.insert(branches).values([
    {
      id: "br-kariakoo",
      code: "DAR-01",
      name: "Kariakoo Main Branch",
      region: "Dar es Salaam",
      address: "Msimbazi & Narung\u2019ombe Street, Kariakoo",
      phone: "+255 22 218 0400",
      isActive: true
    },
    {
      id: "br-arusha",
      code: "ARU-01",
      name: "Arusha Clock Tower Branch",
      region: "Arusha",
      address: "Boma Road, Near Clock Tower",
      phone: "+255 27 250 8820",
      isActive: true
    },
    {
      id: "br-mwanza",
      code: "MWA-01",
      name: "Mwanza Rock City Branch",
      region: "Mwanza",
      address: "Kenyatta Road, Nyamagana",
      phone: "+255 28 250 0411",
      isActive: true
    }
  ]);
  await db.insert(users).values([
    {
      id: "usr-amina",
      username: "amina.ho",
      email: "amina.mwamba@tusonge-mfi.co.tz",
      passwordHash: defaultPasswordHash,
      firstName: "Amina",
      lastName: "Mwamba",
      role: "HEAD_OFFICE_MANAGER",
      branchId: "br-kariakoo",
      preferredLanguage: "en",
      isActive: true
    },
    {
      id: "usr-baraka",
      username: "baraka.bm",
      email: "baraka.mkumbo@tusonge-mfi.co.tz",
      passwordHash: defaultPasswordHash,
      firstName: "Baraka",
      lastName: "Mkumbo",
      role: "BRANCH_MANAGER",
      branchId: "br-kariakoo",
      preferredLanguage: "sw",
      isActive: true
    },
    {
      id: "usr-daudi",
      username: "daudi.lo",
      email: "daudi.kibona@tusonge-mfi.co.tz",
      passwordHash: defaultPasswordHash,
      firstName: "Daudi",
      lastName: "Kibona",
      role: "LOAN_OFFICER",
      branchId: "br-kariakoo",
      preferredLanguage: "sw",
      isActive: true
    },
    {
      id: "usr-rehema",
      username: "rehema.co",
      email: "rehema.shaban@tusonge-mfi.co.tz",
      passwordHash: defaultPasswordHash,
      firstName: "Rehema",
      lastName: "Shaban",
      role: "COLLECTION_OFFICER",
      branchId: "br-kariakoo",
      preferredLanguage: "sw",
      isActive: true
    },
    {
      id: "usr-juma",
      username: "juma.acc",
      email: "juma.mussa@tusonge-mfi.co.tz",
      passwordHash: defaultPasswordHash,
      firstName: "Juma",
      lastName: "Mussa",
      role: "ACCOUNTANT",
      branchId: "br-kariakoo",
      preferredLanguage: "en",
      isActive: true
    },
    {
      id: "usr-neema",
      username: "neema.aud",
      email: "neema.lyimo@tusonge-mfi.co.tz",
      passwordHash: defaultPasswordHash,
      firstName: "Neema",
      lastName: "Lyimo",
      role: "AUDITOR",
      branchId: "br-kariakoo",
      preferredLanguage: "en",
      isActive: true
    }
  ]);
  await db.insert(chartOfAccounts).values([
    { id: "coa-1010", code: "1010", name: "Cash in Vault (Taslimu)", type: "ASSET", normalBalance: "DEBIT", balance: 145e5, description: "Physical cash at teller & safe" },
    { id: "coa-1020", code: "1020", name: "M-Pesa B2C/C2B Settlement", type: "ASSET", normalBalance: "DEBIT", balance: 3825e4, description: "Vodacom M-Pesa float account" },
    { id: "coa-1030", code: "1030", name: "Airtel Money Settlement", type: "ASSET", normalBalance: "DEBIT", balance: 124e5, description: "Airtel Money business float" },
    { id: "coa-1040", code: "1040", name: "Tigo Pesa Settlement", type: "ASSET", normalBalance: "DEBIT", balance: 156e5, description: "Mixx by Yas Tigo Pesa collection" },
    { id: "coa-1050", code: "1050", name: "CRDB Bank Operational", type: "ASSET", normalBalance: "DEBIT", balance: 84e6, description: "CRDB Bank commercial clearing account" },
    { id: "coa-1200", code: "1200", name: "Gross Loan Portfolio", type: "ASSET", normalBalance: "DEBIT", balance: 1265e5, description: "Principal outstanding across all loan products" },
    { id: "coa-1210", code: "1210", name: "Allowance for Loan Impairment", type: "ASSET", normalBalance: "CREDIT", balance: 42e5, description: "BOT regulated loan loss provisioning" },
    { id: "coa-2010", code: "2010", name: "Customer Voluntary Savings", type: "LIABILITY", normalBalance: "CREDIT", balance: 648e5, description: "Member withdrawable savings balances" },
    { id: "coa-2020", code: "2020", name: "Compulsory Collateral Savings", type: "LIABILITY", normalBalance: "CREDIT", balance: 325e5, description: "Pledged 10% loan security reserves" },
    { id: "coa-3010", code: "3010", name: "Institutional Capital", type: "EQUITY", normalBalance: "CREDIT", balance: 15e7, description: "Initial paid-up microfinance capital" },
    { id: "coa-3020", code: "3020", name: "Retained Surplus Earnings", type: "EQUITY", normalBalance: "CREDIT", balance: 2545e4, description: "Accumulated operational surplus" },
    { id: "coa-4010", code: "4010", name: "Interest on Loans", type: "INCOME", normalBalance: "CREDIT", balance: 1485e4, description: "Earned interest on microfinance facilities" },
    { id: "coa-4020", code: "4020", name: "Loan Origination & Processing Fees", type: "INCOME", normalBalance: "CREDIT", balance: 32e5, description: "Upfront 2% loan processing fees" },
    { id: "coa-4030", code: "4030", name: "Late Payment Penalties", type: "INCOME", normalBalance: "CREDIT", balance: 45e4, description: "Daily late charge accruals" },
    { id: "coa-5010", code: "5010", name: "Provision for Impairment Expense", type: "EXPENSE", normalBalance: "DEBIT", balance: 21e5, description: "Monthly impairment adjustments" },
    { id: "coa-5020", code: "5020", name: "Telco C2B/B2C Transaction Fees", type: "EXPENSE", normalBalance: "DEBIT", balance: 125e4, description: "Network tariff charges" },
    { id: "coa-5030", code: "5030", name: "General Branch Administration", type: "EXPENSE", normalBalance: "DEBIT", balance: 48e5, description: "Rent, field travel, electricity, IT" }
  ]);
  await db.insert(loanProducts).values([
    {
      id: "prod-biashara",
      code: "BIASHARA-01",
      nameEn: "Kariakoo Biashara Micro-Loan",
      nameSw: "Mkopo wa Biashara Ndogo ya Kariakoo",
      interestMethod: "REDUCING_EQUAL_INSTALLMENT",
      annualInterestRate: 18,
      minAmount: 5e5,
      maxAmount: 1e7,
      minTenureMonths: 3,
      maxTenureMonths: 18,
      repaymentFrequency: "MONTHLY",
      originationFeeRate: 0.02,
      compulsorySavingsRate: 0.1,
      penaltyRatePerDay: 1e-3,
      gracePeriodDays: 5,
      isActive: true
    },
    {
      id: "prod-kilimo",
      code: "KILIMO-02",
      nameEn: "Kilimo Agribusiness Facility",
      nameSw: "Mkopo wa Wakulima na Wafugaji",
      interestMethod: "REDUCING_EQUAL_PRINCIPAL",
      annualInterestRate: 15,
      minAmount: 1e6,
      maxAmount: 25e6,
      minTenureMonths: 6,
      maxTenureMonths: 36,
      repaymentFrequency: "MONTHLY",
      originationFeeRate: 0.015,
      compulsorySavingsRate: 0.08,
      penaltyRatePerDay: 8e-4,
      gracePeriodDays: 14,
      isActive: true
    },
    {
      id: "prod-tupendane",
      code: "SOLIDARITY-03",
      nameEn: "Tupendane Solidarity Group Loan",
      nameSw: "Mkopo wa Kikundi cha Mshikamano",
      interestMethod: "FLAT",
      annualInterestRate: 20,
      minAmount: 2e5,
      maxAmount: 3e6,
      minTenureMonths: 3,
      maxTenureMonths: 12,
      repaymentFrequency: "WEEKLY",
      originationFeeRate: 0.025,
      compulsorySavingsRate: 0.12,
      penaltyRatePerDay: 15e-4,
      gracePeriodDays: 3,
      isActive: true
    }
  ]);
  await db.insert(groups).values([
    {
      id: "grp-1",
      groupNumber: "GRP-DAR-001",
      name: "Tupendane Women Traders Group",
      meetingDay: "Tuesday",
      meetingFrequency: "WEEKLY",
      meetingLocation: "Kariakoo Market Hall B, Dar es Salaam",
      branchId: "br-kariakoo",
      officerId: "usr-co-1",
      isActive: true
    },
    {
      id: "grp-2",
      groupNumber: "GRP-ARU-002",
      name: "Arusha Green Farmers Solidarity",
      meetingDay: "Thursday",
      meetingFrequency: "BI_WEEKLY",
      meetingLocation: "Mianzini Community Center, Arusha",
      branchId: "br-arusha",
      officerId: "usr-co-1",
      isActive: true
    }
  ]);
  await db.insert(customers).values([
    {
      id: "cust-1",
      customerNumber: "CUST-2024-001",
      firstName: "Asha",
      lastName: "Shabani",
      nationalIdNida: "19880415-11202-00001-24",
      phoneNumber: "+255754123456",
      email: "asha.shabani@gmail.com",
      dateOfBirth: "1988-04-15",
      gender: "FEMALE",
      residentialAddress: "Kariakoo, Msimbazi St, Dar es Salaam",
      businessType: "Vitenge & Textile Wholesale",
      monthlyIncome: 24e5,
      branchId: "br-kariakoo",
      kycTier: 3,
      crbStatus: "EXCELLENT",
      crbScore: 785,
      latitude: -6.8162,
      longitude: 39.2789
    },
    {
      id: "cust-2",
      customerNumber: "CUST-2024-002",
      firstName: "Hamisi",
      lastName: "Omari",
      nationalIdNida: "19930722-21104-00002-18",
      phoneNumber: "+255768987654",
      email: "hamisi.omari@yahoo.com",
      dateOfBirth: "1993-07-22",
      gender: "MALE",
      residentialAddress: "Ilala Boma, Dar es Salaam",
      businessType: "Transport & Logistics (Bodaboda Fleet)",
      monthlyIncome: 165e4,
      branchId: "br-kariakoo",
      kycTier: 2,
      crbStatus: "GOOD",
      crbScore: 712,
      latitude: -6.8245,
      longitude: 39.2632
    },
    {
      id: "cust-3",
      customerNumber: "CUST-2024-003",
      firstName: "Grace",
      lastName: "Lyimo",
      nationalIdNida: "19851103-31109-00003-91",
      phoneNumber: "+255713554433",
      email: "grace.lyimo@hotmail.com",
      dateOfBirth: "1985-11-03",
      gender: "FEMALE",
      residentialAddress: "Mianzini, Arusha",
      businessType: "Fresh Produce & Vegetable Farming",
      monthlyIncome: 38e5,
      branchId: "br-arusha",
      kycTier: 3,
      crbStatus: "EXCELLENT",
      crbScore: 820,
      latitude: -3.3667,
      longitude: 36.6833
    },
    {
      id: "cust-4",
      customerNumber: "CUST-2024-004",
      firstName: "Baraka",
      lastName: "Mrema",
      nationalIdNida: "19900218-41208-00004-55",
      phoneNumber: "+255784667890",
      email: null,
      dateOfBirth: "1990-02-18",
      gender: "MALE",
      residentialAddress: "Usa River, Arusha",
      businessType: "Commercial Poultry & Eggs",
      monthlyIncome: 21e5,
      branchId: "br-arusha",
      kycTier: 2,
      crbStatus: "FAIR",
      crbScore: 654,
      latitude: -3.3721,
      longitude: 36.8524
    },
    {
      id: "cust-5",
      customerNumber: "CUST-2024-005",
      firstName: "Fatuma",
      lastName: "Rashid",
      nationalIdNida: "19890910-51101-00005-72",
      phoneNumber: "+255752334455",
      email: null,
      dateOfBirth: "1989-09-10",
      gender: "FEMALE",
      residentialAddress: "Gerezani, Dar es Salaam",
      businessType: "Mama Lishe Restaurant Catering",
      monthlyIncome: 185e4,
      branchId: "br-kariakoo",
      kycTier: 2,
      crbStatus: "GOOD",
      crbScore: 690,
      latitude: -6.8288,
      longitude: 39.2812
    }
  ]);
  await db.insert(groupMembers).values([
    { id: "gm-1", groupId: "grp-1", customerId: "cust-1", roleInGroup: "CHAIRPERSON" },
    { id: "gm-2", groupId: "grp-1", customerId: "cust-5", roleInGroup: "TREASURER" },
    { id: "gm-3", groupId: "grp-2", customerId: "cust-3", roleInGroup: "SECRETARY" },
    { id: "gm-4", groupId: "grp-2", customerId: "cust-4", roleInGroup: "MEMBER" }
  ]);
  await db.insert(savingsAccounts).values([
    {
      id: "sav-1",
      accountNumber: "SAV-TZS-1001",
      customerId: "cust-1",
      productType: "VOLUNTARY",
      balance: 185e4,
      lockedAmount: 5e5,
      status: "ACTIVE"
    },
    {
      id: "sav-2",
      accountNumber: "SAV-TZS-1002",
      customerId: "cust-2",
      productType: "VOLUNTARY",
      balance: 74e4,
      lockedAmount: 3e5,
      status: "ACTIVE"
    },
    {
      id: "sav-3",
      accountNumber: "SAV-TZS-1003",
      customerId: "cust-3",
      productType: "VOLUNTARY",
      balance: 42e5,
      lockedAmount: 1e6,
      status: "ACTIVE"
    },
    {
      id: "sav-4",
      accountNumber: "SAV-TZS-1004",
      customerId: "cust-4",
      productType: "COMPULSORY_COLLATERAL",
      balance: 6e5,
      lockedAmount: 6e5,
      status: "ACTIVE"
    },
    {
      id: "sav-5",
      accountNumber: "SAV-TZS-1005",
      customerId: "cust-5",
      productType: "VOLUNTARY",
      balance: 92e4,
      lockedAmount: 2e5,
      status: "ACTIVE"
    }
  ]);
  await db.insert(loanApplications).values([
    {
      id: "app-1",
      applicationNumber: "APP-2024-001",
      customerId: "cust-1",
      productId: "prod-biashara",
      groupId: "grp-1",
      requestedAmount: 5e6,
      approvedAmount: 5e6,
      tenureMonths: 12,
      purpose: "Expansion of vitenge stock ahead of Eid shopping season",
      status: "DISBURSED",
      assessedDsti: 0.32,
      creditScore: 785,
      officerRecommendation: "Strong cashflow, dependable group guarantee.",
      reviewedBy: "usr-bm-1"
    },
    {
      id: "app-2",
      applicationNumber: "APP-2024-002",
      customerId: "cust-2",
      productId: "prod-biashara",
      groupId: null,
      requestedAmount: 3e6,
      approvedAmount: 3e6,
      tenureMonths: 8,
      purpose: "Down payment for 2nd motorcycle on Bajaj contract",
      status: "DISBURSED",
      assessedDsti: 0.28,
      creditScore: 712,
      officerRecommendation: "Regular daily M-Pesa statements verified.",
      reviewedBy: "usr-bm-1"
    },
    {
      id: "app-3",
      applicationNumber: "APP-2024-003",
      customerId: "cust-3",
      productId: "prod-kilimo",
      groupId: "grp-2",
      requestedAmount: 1e7,
      approvedAmount: 1e7,
      tenureMonths: 18,
      purpose: "Installation of solar water pump and drip irrigation kit",
      status: "DISBURSED",
      assessedDsti: 0.25,
      creditScore: 820,
      officerRecommendation: "Excellent grower history, off-taker agreements in place.",
      reviewedBy: "usr-bm-1"
    },
    {
      id: "app-4",
      applicationNumber: "APP-2024-004",
      customerId: "cust-4",
      productId: "prod-kilimo",
      groupId: "grp-2",
      requestedAmount: 6e6,
      approvedAmount: 6e6,
      tenureMonths: 12,
      purpose: "Purchasing 2000 day-old chicks and 3 months feed inventory",
      status: "DISBURSED",
      assessedDsti: 0.38,
      creditScore: 654,
      officerRecommendation: "Poultry barn inspected. Risk mitigated by group guarantee.",
      reviewedBy: "usr-bm-1"
    },
    {
      id: "app-5",
      applicationNumber: "APP-2024-005",
      customerId: "cust-5",
      productId: "prod-tupendane",
      groupId: "grp-1",
      requestedAmount: 15e5,
      approvedAmount: null,
      tenureMonths: 6,
      purpose: "Kitchen industrial equipment upgrade for catering contracts",
      status: "PENDING_REVIEW",
      assessedDsti: 0.29,
      creditScore: 690,
      officerRecommendation: "Recommended for approval with 10% compulsory savings.",
      reviewedBy: null
    }
  ]);
  await db.insert(loans).values([
    {
      id: "loan-1",
      loanAccountNumber: "LN-DAR-0001",
      applicationId: "app-1",
      customerId: "cust-1",
      productId: "prod-biashara",
      branchId: "br-kariakoo",
      groupId: "grp-1",
      principalAmount: 5e6,
      outstandingPrincipal: 335e4,
      interestRate: 18,
      tenureMonths: 12,
      disbursementDate: "2024-01-15",
      maturityDate: "2025-01-15",
      status: "ACTIVE",
      interestMethod: "REDUCING_EQUAL_INSTALLMENT",
      repaymentFrequency: "MONTHLY",
      daysInArrears: 0,
      accruedInterest: 0,
      unpaidFees: 0,
      unpaidPenalties: 0,
      totalPaid: 2075e3
    },
    {
      id: "loan-2",
      loanAccountNumber: "LN-DAR-0002",
      applicationId: "app-2",
      customerId: "cust-2",
      productId: "prod-biashara",
      branchId: "br-kariakoo",
      groupId: null,
      principalAmount: 3e6,
      outstandingPrincipal: 19e5,
      interestRate: 18,
      tenureMonths: 8,
      disbursementDate: "2024-02-01",
      maturityDate: "2024-10-01",
      status: "ACTIVE",
      interestMethod: "REDUCING_EQUAL_INSTALLMENT",
      repaymentFrequency: "MONTHLY",
      daysInArrears: 0,
      accruedInterest: 0,
      unpaidFees: 0,
      unpaidPenalties: 0,
      totalPaid: 135e4
    },
    {
      id: "loan-3",
      loanAccountNumber: "LN-ARU-0003",
      applicationId: "app-3",
      customerId: "cust-3",
      productId: "prod-kilimo",
      branchId: "br-arusha",
      groupId: "grp-2",
      principalAmount: 1e7,
      outstandingPrincipal: 78e5,
      interestRate: 15,
      tenureMonths: 18,
      disbursementDate: "2024-01-10",
      maturityDate: "2025-07-10",
      status: "ACTIVE",
      interestMethod: "REDUCING_EQUAL_PRINCIPAL",
      repaymentFrequency: "MONTHLY",
      daysInArrears: 0,
      accruedInterest: 0,
      unpaidFees: 0,
      unpaidPenalties: 0,
      totalPaid: 31e5
    },
    {
      id: "loan-4",
      loanAccountNumber: "LN-ARU-0004",
      applicationId: "app-4",
      customerId: "cust-4",
      productId: "prod-kilimo",
      branchId: "br-arusha",
      groupId: "grp-2",
      principalAmount: 6e6,
      outstandingPrincipal: 52e5,
      interestRate: 15,
      tenureMonths: 12,
      disbursementDate: "2024-02-15",
      maturityDate: "2025-02-15",
      status: "DELINQUENT",
      interestMethod: "REDUCING_EQUAL_PRINCIPAL",
      repaymentFrequency: "MONTHLY",
      daysInArrears: 38,
      accruedInterest: 65e3,
      unpaidFees: 2e4,
      unpaidPenalties: 19760,
      totalPaid: 11e5
    }
  ]);
  await db.insert(repayments).values([
    {
      id: "rep-1",
      receiptNumber: "RCP-2024-0091",
      loanId: "loan-1",
      amount: 458e3,
      paymentDate: "2024-05-15",
      paymentMethod: "MPESA",
      referenceNumber: "SK72HQ9120",
      principalAllocated: 385e3,
      interestAllocated: 73e3,
      feesAllocated: 0,
      penaltiesAllocated: 0,
      receivedBy: "C2B_AUTOMATION"
    },
    {
      id: "rep-2",
      receiptNumber: "RCP-2024-0092",
      loanId: "loan-2",
      amount: 42e4,
      paymentDate: "2024-05-18",
      paymentMethod: "AIRTEL_MONEY",
      referenceNumber: "AIR882190",
      principalAllocated: 365e3,
      interestAllocated: 55e3,
      feesAllocated: 0,
      penaltiesAllocated: 0,
      receivedBy: "usr-cash-1"
    },
    {
      id: "rep-3",
      receiptNumber: "RCP-2024-0093",
      loanId: "loan-3",
      amount: 68e4,
      paymentDate: "2024-05-20",
      paymentMethod: "TIGO_PESA",
      referenceNumber: "TG9912048",
      principalAllocated: 555e3,
      interestAllocated: 125e3,
      feesAllocated: 0,
      penaltiesAllocated: 0,
      receivedBy: "usr-cash-1"
    }
  ]);
  await db.insert(auditLogs).values([
    {
      id: "log-1",
      userId: "usr-bm-1",
      userName: "John Mwangi",
      userRole: "BRANCH_MANAGER",
      action: "SYSTEM_INITIALIZATION",
      entityName: "SYSTEM",
      entityId: "SYS-INIT",
      ipAddress: "192.168.1.10",
      details: "Initialized Core Microfinance Database schema, BOT chart of accounts, and Dar es Salaam branches."
    },
    {
      id: "log-2",
      userId: "usr-co-1",
      userName: "Neema Amani",
      userRole: "CREDIT_OFFICER",
      action: "LOAN_APPLICATION_CREATE",
      entityName: "LOAN_APPLICATION",
      entityId: "app-1",
      ipAddress: "10.0.4.52",
      details: "Captured field application for Asha Shabani (Kariakoo Market Women Group)."
    },
    {
      id: "log-3",
      userId: "usr-bm-1",
      userName: "John Mwangi",
      userRole: "BRANCH_MANAGER",
      action: "LOAN_DISBURSEMENT",
      entityName: "LOAN",
      entityId: "loan-1",
      ipAddress: "192.168.1.10",
      details: "Disbursed TZS 5,000,000 to Asha Shabani via M-Pesa B2C batch."
    }
  ]);
  console.log("Database seeded successfully.");
}

// server.ts
var import_drizzle_orm2 = require("drizzle-orm");
var import_crypto = __toESM(require("crypto"), 1);
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var import_bcryptjs2 = __toESM(require("bcryptjs"), 1);
dotenv2.config();
var app = (0, import_express.default)();
var PORT = Number(process.env.PORT) || 3e3;
app.use(import_express.default.json());
var JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable must be set in production.");
  }
  console.warn("[SECURITY WARNING] JWT_SECRET is not set. Using an insecure development-only fallback. Set JWT_SECRET in your .env file.");
  return "insecure-dev-only-secret-do-not-use-in-production";
})();
var MOMO_WEBHOOK_SECRET = process.env.MOMO_WEBHOOK_SECRET || (() => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("MOMO_WEBHOOK_SECRET environment variable must be set in production.");
  }
  console.warn("[SECURITY WARNING] MOMO_WEBHOOK_SECRET is not set. Using an insecure development-only fallback. Set MOMO_WEBHOOK_SECRET in your .env file.");
  return "insecure-dev-only-momo-secret-do-not-use-in-production";
})();
async function getLoginAttempt(db, rateLimitKey) {
  const [row] = await db.select().from(loginAttempts).where((0, import_drizzle_orm2.eq)(loginAttempts.rateLimitKey, rateLimitKey));
  if (!row) return null;
  const now = Date.now();
  const isExpiredLock = row.lockedUntil && row.lockedUntil.getTime() <= now;
  const isStaleWindow = !row.lockedUntil && now - row.firstAttempt.getTime() > 15 * 60 * 1e3;
  if (isExpiredLock || isStaleWindow) {
    await db.delete(loginAttempts).where((0, import_drizzle_orm2.eq)(loginAttempts.rateLimitKey, rateLimitKey));
    return null;
  }
  return row;
}
async function recordFailedLogin(db, rateLimitKey, existing) {
  const newCount = (existing?.count || 0) + 1;
  const lockedUntil = newCount >= 8 ? new Date(Date.now() + 15 * 60 * 1e3) : null;
  if (existing) {
    await db.update(loginAttempts).set({ count: newCount, lockedUntil }).where((0, import_drizzle_orm2.eq)(loginAttempts.rateLimitKey, rateLimitKey));
  } else {
    await db.insert(loginAttempts).values({ rateLimitKey, count: newCount, firstAttempt: /* @__PURE__ */ new Date(), lockedUntil });
  }
  return { count: newCount, lockedUntil };
}
async function clearLoginAttempts(db, rateLimitKey) {
  await db.delete(loginAttempts).where((0, import_drizzle_orm2.eq)(loginAttempts.rateLimitKey, rateLimitKey));
}
async function setPasswordResetOtp(db, identifier, otp, expiresAt) {
  const existing = await db.select().from(passwordResetOtps).where((0, import_drizzle_orm2.eq)(passwordResetOtps.identifier, identifier));
  if (existing.length > 0) {
    await db.update(passwordResetOtps).set({ otp, expiresAt }).where((0, import_drizzle_orm2.eq)(passwordResetOtps.identifier, identifier));
  } else {
    await db.insert(passwordResetOtps).values({ identifier, otp, expiresAt });
  }
}
async function getPasswordResetOtp(db, identifier) {
  const [row] = await db.select().from(passwordResetOtps).where((0, import_drizzle_orm2.eq)(passwordResetOtps.identifier, identifier));
  return row || null;
}
async function clearPasswordResetOtp(db, identifier) {
  await db.delete(passwordResetOtps).where((0, import_drizzle_orm2.eq)(passwordResetOtps.identifier, identifier));
}
function roundCurrency(val) {
  return Math.round(val);
}
function getRequesterFromToken(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.split(" ")[1];
    return import_jsonwebtoken.default.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
function requireAuth(req, res, next) {
  const requester = getRequesterFromToken(req);
  if (!requester) {
    return res.status(401).json({
      error: "Authentication required. Please sign in again.",
      code: "UNAUTHENTICATED"
    });
  }
  req.user = requester;
  next();
}
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required.", code: "UNAUTHENTICATED" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: this action requires one of the following roles: ${allowedRoles.join(", ")}.`,
        code: "INSUFFICIENT_PERMISSIONS"
      });
    }
    next();
  };
}
var isDbInitialized = false;
async function initDb() {
  if (!isDbInitialized) {
    try {
      const { db } = getDb();
      await seedDatabaseIfEmpty();
      const defaultHash = import_bcryptjs2.default.hashSync("Imara@2025", 10);
      const userUpdates = [
        // Primary Manager Accounts
        { id: "usr-amina", username: "amina.manager", email: "amina.kimaro@tusonge-mfi.co.tz", firstName: "Amina", lastName: "Kimaro", role: "BRANCH_MANAGER" },
        { id: "usr-amina-ho", username: "amina.ho", email: "amina.mwamba@tusonge-mfi.co.tz", firstName: "Amina", lastName: "Mwamba", role: "HEAD_OFFICE_MANAGER" },
        // Field & Loan Officers
        { id: "usr-baraka", username: "baraka.field", email: "baraka.mushi@tusonge-mfi.co.tz", firstName: "Baraka", lastName: "Mushi", role: "FIELD_OFFICER" },
        { id: "usr-baraka-bm", username: "baraka.bm", email: "baraka.mkumbo@tusonge-mfi.co.tz", firstName: "Baraka", lastName: "Mkumbo", role: "BRANCH_MANAGER" },
        { id: "usr-daudi", username: "daudi.accountant", email: "daudi.mrema@tusonge-mfi.co.tz", firstName: "Daudi", lastName: "Mrema", role: "ACCOUNTANT" },
        { id: "usr-daudi-lo", username: "daudi.lo", email: "daudi.kibona@tusonge-mfi.co.tz", firstName: "Daudi", lastName: "Kibona", role: "LOAN_OFFICER" },
        // Auditors & Compliance
        { id: "usr-neema", username: "neema.auditor", email: "neema.massawe@tusonge-mfi.co.tz", firstName: "Neema", lastName: "Massawe", role: "AUDITOR" },
        { id: "usr-neema-aud", username: "neema.aud", email: "neema.lyimo@tusonge-mfi.co.tz", firstName: "Neema", lastName: "Lyimo", role: "AUDITOR" },
        { id: "usr-aud-1", username: "auditor", email: "auditor@hudumamfi.co.tz", firstName: "Mwajuma", lastName: "Salum", role: "AUDITOR" },
        // System Administrator
        { id: "usr-admin", username: "admin", email: "admin@imara-mfi.co.tz", firstName: "System", lastName: "Admin", role: "SUPER_ADMIN" },
        { id: "usr-superadmin", username: "superadmin", email: "superadmin@imara-mfi.co.tz", firstName: "Super", lastName: "Admin", role: "SUPER_ADMIN" },
        // Branch Operations & Cashiers
        { id: "usr-bm-1", username: "john.bm", email: "john.mwangi@hudumamfi.co.tz", firstName: "John", lastName: "Mwangi", role: "BRANCH_MANAGER" },
        { id: "usr-co-1", username: "neema.co", email: "neema.amani@hudumamfi.co.tz", firstName: "Neema", lastName: "Amani", role: "CREDIT_OFFICER" },
        { id: "usr-rehema", username: "rehema.co", email: "rehema.shaban@tusonge-mfi.co.tz", firstName: "Rehema", lastName: "Shaban", role: "COLLECTION_OFFICER" },
        { id: "usr-cash-1", username: "rehema.kimaro", email: "rehema.kimaro@hudumamfi.co.tz", firstName: "Rehema", lastName: "Kimaro", role: "CASHIER" },
        { id: "usr-juma", username: "juma.acc", email: "juma.mussa@tusonge-mfi.co.tz", firstName: "Juma", lastName: "Mussa", role: "ACCOUNTANT" }
      ];
      for (const u of userUpdates) {
        try {
          const [existing] = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.id, u.id));
          if (existing) {
            await db.update(users).set({
              username: u.username,
              email: u.email,
              passwordHash: defaultHash,
              firstName: u.firstName,
              lastName: u.lastName,
              role: u.role,
              isActive: true,
              failedLoginAttempts: 0
            }).where((0, import_drizzle_orm2.eq)(users.id, u.id));
          } else {
            await db.insert(users).values({
              id: u.id,
              username: u.username,
              email: u.email,
              passwordHash: defaultHash,
              firstName: u.firstName,
              lastName: u.lastName,
              role: u.role,
              branchId: "br-kariakoo",
              preferredLanguage: "en",
              isActive: true,
              failedLoginAttempts: 0
            });
          }
        } catch (innerErr) {
        }
      }
      isDbInitialized = true;
    } catch (err) {
      console.error("Database seeding error:", err);
    }
  }
}
function getRoleRedirectTab(role) {
  switch (role) {
    case "FIELD_OFFICER":
    case "LOAN_OFFICER":
    case "COLLECTION_OFFICER":
    case "CREDIT_OFFICER":
      return "offline_sync";
    // Field operations workspace
    case "BRANCH_MANAGER":
      return "dashboard";
    // Branch executive dashboard
    case "ACCOUNTANT":
    case "CASHIER":
      return "accounting";
    // Accounting & General Ledger workspace
    case "AUDITOR":
      return "audit";
    // Compliance & Audit trail workspace
    case "HEAD_OFFICE_MANAGER":
    case "ADMIN":
    case "SUPER_ADMIN":
    default:
      return "dashboard";
  }
}
app.post("/api/auth/login", async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { identifier, password, rememberMe } = req.body;
    const clientIp = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
    if (!identifier || !password) {
      return res.status(400).json({ error: "Email/username and password are required" });
    }
    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const cleanPassword = String(password).trim();
    const rateLimitKey = `${clientIp}_${cleanIdentifier}`;
    const allUsers = await db.select().from(users);
    let user = allUsers.find(
      (u) => u.email && u.email.toLowerCase() === cleanIdentifier || u.username && u.username.toLowerCase() === cleanIdentifier
    );
    if (!user) {
      if (cleanIdentifier === "amina.manager" || cleanIdentifier === "amina" || cleanIdentifier === "amina.ho") {
        user = allUsers.find((u) => u.username === "amina.manager" || u.username === "amina.ho");
      } else if (cleanIdentifier === "baraka.field" || cleanIdentifier === "baraka" || cleanIdentifier === "baraka.bm") {
        user = allUsers.find((u) => u.username === "baraka.field" || u.username === "baraka.bm");
      } else if (cleanIdentifier === "daudi.accountant" || cleanIdentifier === "daudi" || cleanIdentifier === "daudi.lo") {
        user = allUsers.find((u) => u.username === "daudi.accountant" || u.username === "daudi.lo");
      } else if (cleanIdentifier === "neema.auditor" || cleanIdentifier === "neema" || cleanIdentifier === "neema.aud") {
        user = allUsers.find((u) => u.username === "neema.auditor" || u.username === "neema.aud");
      } else if (cleanIdentifier === "admin" || cleanIdentifier === "superadmin" || cleanIdentifier === "administrator") {
        user = allUsers.find((u) => u.username === "admin" || u.username === "superadmin" || u.role === "SUPER_ADMIN");
      }
    }
    let passwordMatches = false;
    if (user && user.passwordHash) {
      try {
        passwordMatches = import_bcryptjs2.default.compareSync(cleanPassword, user.passwordHash);
      } catch {
        passwordMatches = false;
      }
    }
    const now = Date.now();
    const attempt = await getLoginAttempt(db, rateLimitKey);
    if (!user || !passwordMatches) {
      if (attempt && attempt.lockedUntil && attempt.lockedUntil.getTime() > now) {
        const waitMinutes = Math.ceil((attempt.lockedUntil.getTime() - now) / 6e4);
        return res.status(429).json({
          error: `Account temporarily locked due to excessive failed attempts. Please retry in ${waitMinutes} minute(s).`,
          code: "RATE_LIMITED"
        });
      }
      const { count: newCount } = await recordFailedLogin(db, rateLimitKey, attempt);
      try {
        await db.insert(auditLogs).values({
          id: `log-auth-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          userId: "ANONYMOUS",
          userName: cleanIdentifier,
          userRole: "UNAUTHENTICATED",
          action: "AUTH_LOGIN_FAILED",
          entityName: "USER_AUTH",
          entityId: cleanIdentifier,
          ipAddress: String(clientIp),
          details: `Failed sign-in attempt for identifier: ${cleanIdentifier}. Consecutive failure: ${newCount}`
        });
      } catch (logErr) {
        console.warn("Audit log write error:", logErr);
      }
      return res.status(401).json({
        error: "Invalid username/email or password.",
        code: "INVALID_CREDENTIALS"
      });
    }
    await clearLoginAttempts(db, rateLimitKey);
    if (!user.isActive) {
      return res.status(403).json({
        error: "Account is inactive or suspended. Please contact your system administrator.",
        code: "ACCOUNT_DISABLED"
      });
    }
    await db.update(users).set({
      lastLoginAt: /* @__PURE__ */ new Date(),
      failedLoginAttempts: 0
    }).where((0, import_drizzle_orm2.eq)(users.id, user.id));
    const expiresIn = rememberMe ? "30d" : "8h";
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      branchId: user.branchId
    };
    const token = import_jsonwebtoken.default.sign(payload, JWT_SECRET, { expiresIn });
    const redirectTab = getRoleRedirectTab(user.role);
    try {
      await db.insert(auditLogs).values({
        id: `log-auth-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        action: "AUTH_LOGIN_SUCCESS",
        entityName: "USER_AUTH",
        entityId: user.id,
        ipAddress: String(clientIp),
        details: `Successful authenticated sign-in as ${user.role} (${user.email}). Redirecting to ${redirectTab}.`
      });
    } catch (logErr) {
      console.warn("Audit log write error:", logErr);
    }
    const sanitizedUser = {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: "+255 754 100 201",
      role: user.role,
      branchId: user.branchId || "br-kariakoo",
      status: user.isActive ? "ACTIVE" : "INACTIVE",
      preferredLanguage: user.preferredLanguage || "en"
    };
    res.json({
      token,
      user: sanitizedUser,
      redirectTab,
      expiresIn
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal authentication server error", details: err.message });
  }
});
app.get("/api/auth/me", async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or malformed Authorization header" });
    }
    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = import_jsonwebtoken.default.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Session token has expired or is invalid", code: "SESSION_EXPIRED" });
    }
    const [user] = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.id, decoded.id));
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "User no longer active", code: "USER_NOT_FOUND" });
    }
    const sanitizedUser = {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: "+255 754 100 201",
      role: user.role,
      branchId: user.branchId || "br-kariakoo",
      status: user.isActive ? "ACTIVE" : "INACTIVE",
      preferredLanguage: user.preferredLanguage || "en"
    };
    res.json({
      user: sanitizedUser,
      redirectTab: getRoleRedirectTab(user.role)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/auth/logout", async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { userId, userName, role } = req.body;
    if (userId) {
      await db.insert(auditLogs).values({
        id: `log-auth-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId,
        userName: userName || "User",
        userRole: role || "STAFF",
        action: "AUTH_LOGOUT",
        entityName: "USER_AUTH",
        entityId: userId,
        ipAddress: req.ip || "127.0.0.1",
        details: `User signed out cleanly from terminal session.`
      });
    }
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: "Email or username is required" });
    }
    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const allUsers = await db.select().from(users);
    const user = allUsers.find(
      (u) => u.email && u.email.toLowerCase() === cleanIdentifier || u.username && u.username.toLowerCase() === cleanIdentifier
    );
    const otp = Math.floor(1e5 + Math.random() * 9e5).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1e3);
    await setPasswordResetOtp(db, cleanIdentifier, otp, expiresAt);
    if (user) {
      await db.insert(auditLogs).values({
        id: `log-pwd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        action: "PASSWORD_RESET_REQUESTED",
        entityName: "USER_AUTH",
        entityId: user.id,
        ipAddress: req.ip || "127.0.0.1",
        details: `Password reset OTP generated for account ${cleanIdentifier}. Channel: SMS/Email dispatch.`
      });
    }
    res.json({
      success: true,
      message: "If an account matches your entry, a 6-digit password reset OTP has been dispatched.",
      demoOtp: otp
      // For rapid testing & evaluation
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { identifier, otp, newPassword } = req.body;
    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({ error: "Identifier, OTP, and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }
    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const stored = await getPasswordResetOtp(db, cleanIdentifier);
    if (!stored || stored.expiresAt.getTime() < Date.now() || stored.otp !== String(otp).trim()) {
      return res.status(400).json({ error: "Invalid or expired OTP verification code" });
    }
    const allUsers = await db.select().from(users);
    const user = allUsers.find(
      (u) => u.email && u.email.toLowerCase() === cleanIdentifier || u.username && u.username.toLowerCase() === cleanIdentifier
    );
    if (!user) {
      return res.status(404).json({ error: "User account not found" });
    }
    const newHash = import_bcryptjs2.default.hashSync(newPassword, 10);
    await db.update(users).set({
      passwordHash: newHash,
      failedLoginAttempts: 0,
      lockedUntil: null
    }).where((0, import_drizzle_orm2.eq)(users.id, user.id));
    await clearPasswordResetOtp(db, cleanIdentifier);
    await db.insert(auditLogs).values({
      id: `log-pwd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: "PASSWORD_RESET_COMPLETED",
      entityName: "USER_AUTH",
      entityId: user.id,
      ipAddress: req.ip || "127.0.0.1",
      details: `Password was successfully updated via verified OTP for account ${cleanIdentifier}.`
    });
    res.json({ success: true, message: "Password has been updated successfully. You can now sign in." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/auth/demo-users", async (req, res) => {
  res.json([
    {
      role: "LOAN_OFFICER",
      roleLabel: "Field Officer (Loan Officer)",
      username: "daudi.lo",
      email: "daudi.kibona@tusonge-mfi.co.tz",
      name: "Daudi Kibona",
      targetWorkspace: "Field Operations & Sync",
      branch: "Kariakoo Main",
      password: "Imara@2025"
    },
    {
      role: "BRANCH_MANAGER",
      roleLabel: "Branch Manager",
      username: "baraka.bm",
      email: "baraka.mkumbo@tusonge-mfi.co.tz",
      name: "Baraka Mkumbo",
      targetWorkspace: "Branch Executive Dashboard",
      branch: "Kariakoo Main",
      password: "Imara@2025"
    },
    {
      role: "ACCOUNTANT",
      roleLabel: "Chief Accountant",
      username: "juma.acc",
      email: "juma.mussa@tusonge-mfi.co.tz",
      name: "Juma Mussa",
      targetWorkspace: "General Ledger & COA",
      branch: "Kariakoo Main",
      password: "Imara@2025"
    },
    {
      role: "HEAD_OFFICE_MANAGER",
      roleLabel: "Managing Director / Admin",
      username: "amina.ho",
      email: "amina.mwamba@tusonge-mfi.co.tz",
      name: "Amina Mwamba",
      targetWorkspace: "Institutional Control Center",
      branch: "Head Office",
      password: "Imara@2025"
    }
  ]);
});
app.get("/api/staff", requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const branchFilter = req.query.branchId;
    let query = db.select().from(users);
    const allUsers = await query;
    const filtered = branchFilter && branchFilter !== "ALL" ? allUsers.filter((u) => u.branchId === branchFilter) : allUsers;
    const sanitized = filtered.map((u) => ({
      id: u.id,
      username: u.username || u.email.split("@")[0],
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: "+255 754 100 201",
      role: u.role,
      branchId: u.branchId || "br-kariakoo",
      status: u.isActive ? "ACTIVE" : "INACTIVE",
      preferredLanguage: u.preferredLanguage || "en",
      lastLoginAt: u.lastLoginAt
    }));
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/staff", requireAuth, requireRole("SUPER_ADMIN", "HEAD_OFFICE_MANAGER", "BRANCH_MANAGER"), async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const requester = req.user;
    const requesterRole = requester.role;
    const { username, email, firstName, lastName, role, branchId, phone, initialPassword } = req.body;
    if (!email || !firstName || !lastName || !role) {
      return res.status(400).json({ error: "First name, last name, email, and role are required." });
    }
    const validRoles = [
      "SUPER_ADMIN",
      "HEAD_OFFICE_MANAGER",
      "MANAGER",
      "BRANCH_MANAGER",
      "FIELD_OFFICER",
      "LOAN_OFFICER",
      "ACCOUNTANT",
      "AUDITOR",
      "CUSTOMER"
    ];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
    }
    const newUserId = `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const cleanUsername = (username || `${firstName.toLowerCase()}.${lastName.toLowerCase()}`).trim();
    const passwordHash = import_bcryptjs2.default.hashSync(initialPassword || "Imara@2025", 10);
    await db.insert(users).values({
      id: newUserId,
      username: cleanUsername,
      email: email.trim().toLowerCase(),
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role,
      branchId: branchId || "br-kariakoo",
      preferredLanguage: "en",
      isActive: true,
      failedLoginAttempts: 0
    });
    await db.insert(auditLogs).values({
      id: `log-staff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requesterRole,
      action: "EMPLOYEE_ACCOUNT_CREATED",
      entityName: "USERS",
      entityId: newUserId,
      ipAddress: req.ip || "127.0.0.1",
      details: `Created new employee account: ${firstName} ${lastName} (${cleanUsername}) with role ${role} assigned to branch ${branchId || "br-kariakoo"}.`
    });
    const newEmployee = {
      id: newUserId,
      username: cleanUsername,
      firstName,
      lastName,
      email,
      phone: phone || "+255 754 000 000",
      role,
      branchId: branchId || "br-kariakoo",
      status: "ACTIVE",
      preferredLanguage: "en"
    };
    res.status(201).json(newEmployee);
  } catch (err) {
    console.error("Staff creation error:", err);
    res.status(500).json({ error: err.message });
  }
});
app.put("/api/staff/:id", requireAuth, requireRole("SUPER_ADMIN", "HEAD_OFFICE_MANAGER", "BRANCH_MANAGER"), async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const requester = req.user;
    const { id } = req.params;
    const { firstName, lastName, role, branchId, status } = req.body;
    const [existing] = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.id, id));
    if (!existing) {
      return res.status(404).json({ error: "Employee account not found." });
    }
    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (role) updates.role = role;
    if (branchId) updates.branchId = branchId;
    if (status !== void 0) updates.isActive = status === "ACTIVE";
    await db.update(users).set(updates).where((0, import_drizzle_orm2.eq)(users.id, id));
    await db.insert(auditLogs).values({
      id: `log-staff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requester.role,
      action: "EMPLOYEE_ACCOUNT_UPDATED",
      entityName: "USERS",
      entityId: id,
      ipAddress: req.ip || "127.0.0.1",
      details: `Updated employee profile for ${id}: ${JSON.stringify(updates)}`
    });
    res.json({ success: true, message: "Employee updated successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/staff/:id/toggle-status", requireAuth, requireRole("SUPER_ADMIN", "HEAD_OFFICE_MANAGER", "BRANCH_MANAGER"), async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const requester = req.user;
    const { id } = req.params;
    const [existing] = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.id, id));
    if (!existing) {
      return res.status(404).json({ error: "Employee account not found." });
    }
    const newActiveState = !existing.isActive;
    await db.update(users).set({ isActive: newActiveState }).where((0, import_drizzle_orm2.eq)(users.id, id));
    await db.insert(auditLogs).values({
      id: `log-staff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requester.role,
      action: newActiveState ? "EMPLOYEE_ACTIVATED" : "EMPLOYEE_DEACTIVATED",
      entityName: "USERS",
      entityId: id,
      ipAddress: req.ip || "127.0.0.1",
      details: `Employee ${existing.firstName} ${existing.lastName} was ${newActiveState ? "activated" : "deactivated/suspended"}.`
    });
    res.json({
      success: true,
      isActive: newActiveState,
      status: newActiveState ? "ACTIVE" : "INACTIVE",
      message: `Employee account is now ${newActiveState ? "ACTIVE" : "INACTIVE"}.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/staff/:id/reset-access", requireAuth, requireRole("SUPER_ADMIN", "HEAD_OFFICE_MANAGER", "BRANCH_MANAGER"), async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const requester = req.user;
    const { id } = req.params;
    const [existing] = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.id, id));
    if (!existing) {
      return res.status(404).json({ error: "Employee account not found." });
    }
    const defaultPassword = "Imara@" + (/* @__PURE__ */ new Date()).getFullYear();
    const passwordHash = import_bcryptjs2.default.hashSync(defaultPassword, 10);
    await db.update(users).set({
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null
    }).where((0, import_drizzle_orm2.eq)(users.id, id));
    await db.insert(auditLogs).values({
      id: `log-staff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requester.role,
      action: "EMPLOYEE_ACCESS_RESET",
      entityName: "USERS",
      entityId: id,
      ipAddress: req.ip || "127.0.0.1",
      details: `Manager reset credentials and cleared lockouts for employee ${existing.username} (${existing.email}).`
    });
    res.json({
      success: true,
      message: `Access credentials reset. Temporary password is: ${defaultPassword}`,
      temporaryPassword: defaultPassword
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/health", async (req, res) => {
  try {
    await initDb();
    res.json({ status: "ok", database: "connected", region: "europe-west2" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});
app.get("/api/summary", requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const allLoans = await db.select().from(loans);
    const activeLoans = allLoans.filter((l) => l.status === "ACTIVE" || l.status === "DELINQUENT");
    const grossPortfolio = activeLoans.reduce((sum, l) => sum + (l.outstandingPrincipal || 0), 0);
    const totalDisbursed = allLoans.reduce((sum, l) => sum + (l.principalAmount || 0), 0);
    const par30Loans = activeLoans.filter((l) => l.daysInArrears > 30);
    const par30Amount = par30Loans.reduce((sum, l) => sum + l.outstandingPrincipal, 0);
    const par30Ratio = grossPortfolio > 0 ? par30Amount / grossPortfolio * 100 : 0;
    const par90Loans = activeLoans.filter((l) => l.daysInArrears > 90);
    const par90Amount = par90Loans.reduce((sum, l) => sum + l.outstandingPrincipal, 0);
    const par90Ratio = grossPortfolio > 0 ? par90Amount / grossPortfolio * 100 : 0;
    const allSavings = await db.select().from(savingsAccounts);
    const totalSavings = allSavings.reduce((sum, s) => sum + s.balance, 0);
    const allCustomers = await db.select().from(customers);
    const coaList = await db.select().from(chartOfAccounts);
    const mpesaAcc = coaList.find((c) => c.code === "1020");
    const airtelAcc = coaList.find((c) => c.code === "1030");
    const tigoAcc = coaList.find((c) => c.code === "1040");
    const bankAcc = coaList.find((c) => c.code === "1050");
    const cashAcc = coaList.find((c) => c.code === "1010");
    const recentRepayments = await db.select().from(repayments).orderBy((0, import_drizzle_orm2.desc)(repayments.createdAt)).limit(8);
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
        totalLiquid: (cashAcc?.balance || 0) + (mpesaAcc?.balance || 0) + (airtelAcc?.balance || 0) + (tigoAcc?.balance || 0) + (bankAcc?.balance || 0)
      },
      recentRepayments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/branches", requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const branchList = await db.select().from(branches);
    res.json(branchList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/customers", requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const customerList = await db.select().from(customers).orderBy((0, import_drizzle_orm2.desc)(customers.createdAt));
    res.json(customerList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/customers", requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const body = req.body;
    const requester = req.user;
    const id = `cust-${Date.now()}`;
    const customerNumber = `CUST-2024-${Math.floor(1e3 + Math.random() * 9e3)}`;
    const newCust = {
      id,
      customerNumber,
      firstName: body.firstName,
      lastName: body.lastName,
      nationalIdNida: body.nationalIdNida,
      phoneNumber: body.phoneNumber,
      email: body.email || null,
      dateOfBirth: body.dateOfBirth || "1990-01-01",
      gender: body.gender || "FEMALE",
      residentialAddress: body.residentialAddress,
      businessType: body.businessType,
      monthlyIncome: Number(body.monthlyIncome) || 1e6,
      branchId: body.branchId || "br-kariakoo",
      kycTier: Number(body.kycTier) || 2,
      crbStatus: body.crbStatus || "GOOD",
      crbScore: Number(body.crbScore) || 710,
      latitude: body.latitude ? Number(body.latitude) : null,
      longitude: body.longitude ? Number(body.longitude) : null,
      documentUrl: body.documentUrl || null
    };
    await db.insert(customers).values(newCust);
    const savId = `sav-${Date.now()}`;
    const accNum = `SAV-TZS-${Math.floor(1e4 + Math.random() * 9e4)}`;
    await db.insert(savingsAccounts).values({
      id: savId,
      accountNumber: accNum,
      customerId: id,
      productType: "VOLUNTARY",
      balance: 0,
      lockedAmount: 0,
      status: "ACTIVE"
    });
    await db.insert(auditLogs).values({
      id: `log-${Date.now()}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requester.role,
      action: "CUSTOMER_ONBOARDING",
      entityName: "CUSTOMER",
      entityId: id,
      ipAddress: req.ip || "127.0.0.1",
      details: `Onboarded customer ${body.firstName} ${body.lastName} (NIDA: ${body.nationalIdNida}).`
    });
    res.status(201).json(newCust);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
app.get("/api/groups", requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const groupsList = await db.select().from(groups);
    const members = await db.select().from(groupMembers);
    const result = groupsList.map((g) => {
      const groupMembersList = members.filter((m) => m.groupId === g.id);
      return {
        ...g,
        memberCount: groupMembersList.length
      };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/groups", requireAuth, async (req, res) => {
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
      meetingFrequency: body.meetingFrequency || "WEEKLY",
      meetingLocation: body.meetingLocation,
      branchId: body.branchId || "br-kariakoo",
      officerId: body.officerId || "usr-co-1",
      isActive: true
    };
    await db.insert(groups).values(newGroup);
    res.status(201).json(newGroup);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
app.get("/api/products", requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const products = await db.select().from(loanProducts);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/applications", requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const apps = await db.select().from(loanApplications).orderBy((0, import_drizzle_orm2.desc)(loanApplications.createdAt));
    res.json(apps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/applications", requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const body = req.body;
    const requester = req.user;
    const id = `app-${Date.now()}`;
    const applicationNumber = `APP-2024-${Math.floor(1e3 + Math.random() * 9e3)}`;
    const customer = await db.select().from(customers).where((0, import_drizzle_orm2.eq)(customers.id, body.customerId));
    const monthlyIncome = customer[0]?.monthlyIncome || 15e5;
    const requested = Number(body.requestedAmount);
    const tenure = Number(body.tenureMonths) || 12;
    const approxMonthlyPayment = requested / tenure + requested * 0.18 / 12;
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
      status: "PENDING_REVIEW",
      assessedDsti,
      creditScore: customer[0]?.crbScore || 700,
      officerRecommendation: body.officerRecommendation || "Field assessment conducted. Verified identity and business premises.",
      submittedBy: requester.id,
      reviewedBy: null,
      rejectionReason: null
    };
    await db.insert(loanApplications).values(newApp);
    await db.insert(auditLogs).values({
      id: `log-${Date.now()}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requester.role,
      action: "LOAN_APPLICATION_SUBMIT",
      entityName: "LOAN_APPLICATION",
      entityId: id,
      ipAddress: req.ip || "127.0.0.1",
      details: `Submitted loan application for TZS ${requested.toLocaleString()} by customer ${body.customerId}.`
    });
    res.status(201).json(newApp);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
var BRANCH_MANAGER_APPROVAL_LIMIT = 1e6;
app.patch("/api/applications/:id/review", requireAuth, requireRole("BRANCH_MANAGER", "HEAD_OFFICE_MANAGER", "SUPER_ADMIN"), async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { id } = req.params;
    const { action, approvedAmount, rejectionReason } = req.body;
    const requester = req.user;
    const [appRecord] = await db.select().from(loanApplications).where((0, import_drizzle_orm2.eq)(loanApplications.id, id));
    if (!appRecord) {
      return res.status(404).json({ error: "Loan application not found" });
    }
    const terminalStatuses = ["APPROVED", "REJECTED", "DISBURSED"];
    if (terminalStatuses.includes(appRecord.status)) {
      return res.status(409).json({
        error: `This application has already been reviewed (status: ${appRecord.status}) and cannot be reviewed again.`,
        code: "ALREADY_REVIEWED"
      });
    }
    if (appRecord.submittedBy && appRecord.submittedBy === requester.id) {
      return res.status(403).json({
        error: "Maker-checker violation: you submitted this application and cannot review your own submission. Escalate to another authorized reviewer.",
        code: "SELF_APPROVAL_FORBIDDEN"
      });
    }
    if (action === "APPROVE" && requester.role === "BRANCH_MANAGER" && Number(approvedAmount) > BRANCH_MANAGER_APPROVAL_LIMIT) {
      return res.status(403).json({
        error: `Branch Managers may approve loans up to TZS ${BRANCH_MANAGER_APPROVAL_LIMIT.toLocaleString()}. This amount (TZS ${Number(approvedAmount).toLocaleString()}) must be escalated to a Head Office Manager.`,
        code: "APPROVAL_LIMIT_EXCEEDED"
      });
    }
    if (action === "APPROVE") {
      await db.update(loanApplications).set({
        status: "APPROVED",
        approvedAmount: Number(approvedAmount),
        reviewedBy: requester.id
      }).where((0, import_drizzle_orm2.eq)(loanApplications.id, id));
    } else {
      await db.update(loanApplications).set({
        status: "REJECTED",
        rejectionReason: rejectionReason || "Failed credit policy affordability threshold",
        reviewedBy: requester.id
      }).where((0, import_drizzle_orm2.eq)(loanApplications.id, id));
    }
    await db.insert(auditLogs).values({
      id: `log-review-${Date.now()}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requester.role,
      action: action === "APPROVE" ? "LOAN_APPLICATION_APPROVED" : "LOAN_APPLICATION_REJECTED",
      entityName: "LOAN_APPLICATION",
      entityId: id,
      ipAddress: req.ip || "127.0.0.1",
      details: action === "APPROVE" ? `Approved application ${id} for TZS ${Number(approvedAmount).toLocaleString()}.` : `Rejected application ${id}. Reason: ${rejectionReason || "Failed credit policy affordability threshold"}`
    });
    const updated = await db.select().from(loanApplications).where((0, import_drizzle_orm2.eq)(loanApplications.id, id));
    res.json(updated[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
app.post("/api/loans/disburse", requireAuth, requireRole("BRANCH_MANAGER", "HEAD_OFFICE_MANAGER", "SUPER_ADMIN", "ACCOUNTANT", "CASHIER"), async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { applicationId, disbursementDate, channel } = req.body;
    const requester = req.user;
    const [appRecord] = await db.select().from(loanApplications).where((0, import_drizzle_orm2.eq)(loanApplications.id, applicationId));
    if (!appRecord) {
      return res.status(404).json({ error: "Application not found" });
    }
    if (appRecord.status !== "APPROVED") {
      return res.status(400).json({ error: "Only APPROVED applications can be disbursed" });
    }
    const [product] = await db.select().from(loanProducts).where((0, import_drizzle_orm2.eq)(loanProducts.id, appRecord.productId));
    const principal = appRecord.approvedAmount || appRecord.requestedAmount;
    const tenureMonths = appRecord.tenureMonths;
    const annualRate = product.annualInterestRate;
    const loanId = `loan-${Date.now()}`;
    const loanAccountNumber = `LN-${Math.floor(1e4 + Math.random() * 9e4)}`;
    const startDate = disbursementDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const maturity = new Date(startDate);
    maturity.setMonth(maturity.getMonth() + tenureMonths);
    const maturityDate = maturity.toISOString().split("T")[0];
    const newLoan = {
      id: loanId,
      loanAccountNumber,
      applicationId: appRecord.id,
      customerId: appRecord.customerId,
      productId: product.id,
      branchId: "br-kariakoo",
      groupId: appRecord.groupId || null,
      principalAmount: principal,
      outstandingPrincipal: principal,
      interestRate: annualRate,
      tenureMonths,
      disbursementDate: startDate,
      maturityDate,
      status: "ACTIVE",
      interestMethod: product.interestMethod,
      repaymentFrequency: product.repaymentFrequency,
      daysInArrears: 0,
      accruedInterest: 0,
      unpaidFees: 0,
      unpaidPenalties: 0,
      totalPaid: 0
    };
    await db.insert(loans).values(newLoan);
    await db.update(loanApplications).set({ status: "DISBURSED" }).where((0, import_drizzle_orm2.eq)(loanApplications.id, applicationId));
    const installments = [];
    const monthlyPrincipal = roundCurrency(principal / tenureMonths);
    const monthlyRate = annualRate / 100 / 12;
    for (let i = 1; i <= tenureMonths; i++) {
      const instDueDate = new Date(startDate);
      instDueDate.setMonth(instDueDate.getMonth() + i);
      const dueDateStr = instDueDate.toISOString().split("T")[0];
      let instPrincipal = monthlyPrincipal;
      if (i === tenureMonths) {
        instPrincipal = principal - monthlyPrincipal * (tenureMonths - 1);
      }
      let instInterest = 0;
      if (product.interestMethod === "FLAT") {
        instInterest = roundCurrency(principal * (annualRate / 100) * (tenureMonths / 12) / tenureMonths);
      } else {
        const remainingPrincipal = principal - (i - 1) * monthlyPrincipal;
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
        status: "PENDING",
        paidAt: null
      });
    }
    if (installments.length > 0) {
      await db.insert(loanInstallments).values(installments);
    }
    const journalId = `jnl-${Date.now()}`;
    const disburseAccount = channel === "CASH" ? "1010" : "1020";
    const disburseAccountName = channel === "CASH" ? "Cash in Vault" : "M-Pesa Settlement Float";
    await db.insert(journalEntries).values({
      id: journalId,
      entryNumber: `JNL-DISB-${Math.floor(1e3 + Math.random() * 9e3)}`,
      transactionDate: startDate,
      narration: `Disbursement of Loan ${loanAccountNumber} to customer ${appRecord.customerId}`,
      referenceType: "DISBURSEMENT",
      referenceId: loanId,
      totalDebit: principal,
      totalCredit: principal,
      postedBy: requester.id
    });
    await db.insert(journalLines).values([
      {
        id: `line-${journalId}-1`,
        journalId,
        accountCode: "1200",
        accountName: "Gross Loan Portfolio",
        entryType: "DEBIT",
        amount: principal
      },
      {
        id: `line-${journalId}-2`,
        journalId,
        accountCode: disburseAccount,
        accountName: disburseAccountName,
        entryType: "CREDIT",
        amount: principal
      }
    ]);
    await db.update(chartOfAccounts).set({
      balance: import_drizzle_orm2.sql`${chartOfAccounts.balance} + ${principal}`
    }).where((0, import_drizzle_orm2.eq)(chartOfAccounts.code, "1200"));
    await db.update(chartOfAccounts).set({
      balance: import_drizzle_orm2.sql`${chartOfAccounts.balance} - ${principal}`
    }).where((0, import_drizzle_orm2.eq)(chartOfAccounts.code, disburseAccount));
    await db.insert(auditLogs).values({
      id: `log-${Date.now()}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requester.role,
      action: "LOAN_DISBURSED",
      entityName: "LOAN",
      entityId: loanId,
      ipAddress: req.ip || "127.0.0.1",
      details: `Successfully disbursed TZS ${principal.toLocaleString()} for Loan ${loanAccountNumber} via ${disburseAccountName}.`
    });
    res.status(201).json({ loan: newLoan, installmentsCount: installments.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
app.get("/api/loans", requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const loansList = await db.select().from(loans).orderBy((0, import_drizzle_orm2.desc)(loans.createdAt));
    res.json(loansList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/loans/:id/installments", requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const insts = await db.select().from(loanInstallments).where((0, import_drizzle_orm2.eq)(loanInstallments.loanId, req.params.id));
    res.json(insts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/repayments", requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { loanId, amount, paymentMethod, referenceNumber } = req.body;
    const requester = req.user;
    const receivedBy = `${requester.firstName} ${requester.lastName}`;
    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ error: "Valid payment amount is required" });
    }
    const [loan] = await db.select().from(loans).where((0, import_drizzle_orm2.eq)(loans.id, loanId));
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }
    let remaining = paymentAmount;
    const penaltiesAllocated = Math.min(remaining, loan.unpaidPenalties || 0);
    remaining -= penaltiesAllocated;
    const feesAllocated = Math.min(remaining, loan.unpaidFees || 0);
    remaining -= feesAllocated;
    const interestAllocated = Math.min(remaining, loan.accruedInterest > 0 ? loan.accruedInterest : roundCurrency(loan.outstandingPrincipal * (loan.interestRate / 100 / 12)));
    remaining -= interestAllocated;
    const principalAllocated = Math.min(remaining, loan.outstandingPrincipal);
    remaining -= principalAllocated;
    const receiptNumber = `RCP-2024-${Math.floor(1e4 + Math.random() * 9e4)}`;
    const paymentDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const repaymentRecord = {
      id: `rep-${Date.now()}`,
      receiptNumber,
      loanId,
      amount: paymentAmount,
      paymentDate,
      paymentMethod: paymentMethod || "MPESA",
      referenceNumber: referenceNumber || `TXN-${Math.floor(1e6 + Math.random() * 9e6)}`,
      principalAllocated,
      interestAllocated,
      feesAllocated,
      penaltiesAllocated,
      receivedBy: receivedBy || "Field Officer",
      isReversed: false,
      reversalReason: null
    };
    await db.insert(repayments).values(repaymentRecord);
    const newOutstanding = Math.max(0, loan.outstandingPrincipal - principalAllocated);
    const newStatus = newOutstanding === 0 ? "CLOSED" : loan.daysInArrears > 0 ? "ACTIVE" : loan.status;
    await db.update(loans).set({
      outstandingPrincipal: newOutstanding,
      unpaidPenalties: Math.max(0, (loan.unpaidPenalties || 0) - penaltiesAllocated),
      unpaidFees: Math.max(0, (loan.unpaidFees || 0) - feesAllocated),
      accruedInterest: Math.max(0, (loan.accruedInterest || 0) - interestAllocated),
      totalPaid: import_drizzle_orm2.sql`${loans.totalPaid} + ${paymentAmount}`,
      status: newStatus,
      daysInArrears: newOutstanding === 0 ? 0 : loan.daysInArrears
    }).where((0, import_drizzle_orm2.eq)(loans.id, loanId));
    const journalId = `jnl-${Date.now()}`;
    const debitAccount = paymentMethod === "CASH" ? "1010" : paymentMethod === "AIRTEL_MONEY" ? "1030" : paymentMethod === "TIGO_PESA" ? "1040" : "1020";
    const debitAccountName = paymentMethod === "CASH" ? "Cash in Vault" : `${paymentMethod} Settlement Account`;
    await db.insert(journalEntries).values({
      id: journalId,
      entryNumber: `JNL-REP-${Math.floor(1e3 + Math.random() * 9e3)}`,
      transactionDate: paymentDate,
      narration: `Repayment for Loan ${loan.loanAccountNumber} (Receipt ${receiptNumber})`,
      referenceType: "REPAYMENT",
      referenceId: repaymentRecord.id,
      totalDebit: paymentAmount,
      totalCredit: paymentAmount,
      postedBy: requester.id
    });
    const lines = [
      {
        id: `line-${journalId}-dr`,
        journalId,
        accountCode: debitAccount,
        accountName: debitAccountName,
        entryType: "DEBIT",
        amount: paymentAmount
      }
    ];
    if (principalAllocated > 0) {
      lines.push({
        id: `line-${journalId}-cr-prin`,
        journalId,
        accountCode: "1200",
        accountName: "Gross Loan Portfolio",
        entryType: "CREDIT",
        amount: principalAllocated
      });
      await db.update(chartOfAccounts).set({
        balance: import_drizzle_orm2.sql`${chartOfAccounts.balance} - ${principalAllocated}`
      }).where((0, import_drizzle_orm2.eq)(chartOfAccounts.code, "1200"));
    }
    if (interestAllocated > 0) {
      lines.push({
        id: `line-${journalId}-cr-int`,
        journalId,
        accountCode: "4010",
        accountName: "Interest on Loans",
        entryType: "CREDIT",
        amount: interestAllocated
      });
      await db.update(chartOfAccounts).set({
        balance: import_drizzle_orm2.sql`${chartOfAccounts.balance} + ${interestAllocated}`
      }).where((0, import_drizzle_orm2.eq)(chartOfAccounts.code, "4010"));
    }
    if (penaltiesAllocated > 0) {
      lines.push({
        id: `line-${journalId}-cr-pen`,
        journalId,
        accountCode: "4030",
        accountName: "Late Payment Penalties",
        entryType: "CREDIT",
        amount: penaltiesAllocated
      });
      await db.update(chartOfAccounts).set({
        balance: import_drizzle_orm2.sql`${chartOfAccounts.balance} + ${penaltiesAllocated}`
      }).where((0, import_drizzle_orm2.eq)(chartOfAccounts.code, "4030"));
    }
    if (feesAllocated > 0) {
      lines.push({
        id: `line-${journalId}-cr-fee`,
        journalId,
        accountCode: "4020",
        accountName: "Loan Processing Fees",
        entryType: "CREDIT",
        amount: feesAllocated
      });
      await db.update(chartOfAccounts).set({
        balance: import_drizzle_orm2.sql`${chartOfAccounts.balance} + ${feesAllocated}`
      }).where((0, import_drizzle_orm2.eq)(chartOfAccounts.code, "4020"));
    }
    await db.update(chartOfAccounts).set({
      balance: import_drizzle_orm2.sql`${chartOfAccounts.balance} + ${paymentAmount}`
    }).where((0, import_drizzle_orm2.eq)(chartOfAccounts.code, debitAccount));
    await db.insert(journalLines).values(lines);
    await db.insert(auditLogs).values({
      id: `log-${Date.now()}`,
      userId: requester.id,
      userName: receivedBy,
      userRole: requester.role,
      action: "REPAYMENT_POSTED",
      entityName: "REPAYMENT",
      entityId: repaymentRecord.id,
      ipAddress: req.ip || "127.0.0.1",
      details: `Collected TZS ${paymentAmount.toLocaleString()} (Principal: ${principalAllocated}, Interest: ${interestAllocated}) for ${loan.loanAccountNumber}.`
    });
    res.status(201).json(repaymentRecord);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
app.get("/api/repayments", requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const list = await db.select().from(repayments).orderBy((0, import_drizzle_orm2.desc)(repayments.createdAt)).limit(50);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/savings", requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const accounts = await db.select().from(savingsAccounts);
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/savings/transaction", requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { accountId, transactionType, amount, channel, narration } = req.body;
    const txAmount = Number(amount);
    if (transactionType === "WITHDRAWAL") {
      const withdrawalRoles = ["CASHIER", "BRANCH_MANAGER", "ACCOUNTANT", "HEAD_OFFICE_MANAGER", "SUPER_ADMIN"];
      if (!withdrawalRoles.includes(req.user.role)) {
        return res.status(403).json({
          error: `Forbidden: savings withdrawals require one of the following roles: ${withdrawalRoles.join(", ")}.`,
          code: "INSUFFICIENT_PERMISSIONS"
        });
      }
    }
    const [account] = await db.select().from(savingsAccounts).where((0, import_drizzle_orm2.eq)(savingsAccounts.id, accountId));
    if (!account) {
      return res.status(404).json({ error: "Savings account not found" });
    }
    let newBalance = account.balance;
    if (transactionType === "DEPOSIT") {
      newBalance += txAmount;
    } else if (transactionType === "WITHDRAWAL") {
      const available = account.balance - account.lockedAmount;
      if (txAmount > available) {
        return res.status(400).json({ error: `Insufficient withdrawable balance. Available: TZS ${available.toLocaleString()} (Locked: TZS ${account.lockedAmount.toLocaleString()})` });
      }
      newBalance -= txAmount;
    }
    const txId = `sav-tx-${Date.now()}`;
    const txRecord = {
      id: txId,
      accountId,
      transactionType,
      amount: txAmount,
      balanceAfter: newBalance,
      narration: narration || `Member ${transactionType.toLowerCase()} via ${channel || "Cash"}`,
      channel: channel || "CASH",
      reference: `SAV-REF-${Math.floor(1e5 + Math.random() * 9e5)}`
    };
    await db.insert(savingsTransactions).values(txRecord);
    await db.update(savingsAccounts).set({ balance: newBalance }).where((0, import_drizzle_orm2.eq)(savingsAccounts.id, accountId));
    res.status(201).json(txRecord);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
app.get("/api/accounting/coa", requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const coa = await db.select().from(chartOfAccounts).orderBy(chartOfAccounts.code);
    res.json(coa);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/accounting/trial-balance", requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const coa = await db.select().from(chartOfAccounts).orderBy(chartOfAccounts.code);
    let totalDebit = 0;
    let totalCredit = 0;
    const rows = coa.map((account) => {
      let debit = 0;
      let credit = 0;
      if (account.normalBalance === "DEBIT") {
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
        credit
      };
    });
    res.json({
      asOf: (/* @__PURE__ */ new Date()).toISOString(),
      rows,
      totalDebit: roundCurrency(totalDebit),
      totalCredit: roundCurrency(totalCredit),
      isBalanced: Math.abs(totalDebit - totalCredit) < 1
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/accounting/journal", requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const entries = await db.select().from(journalEntries).orderBy((0, import_drizzle_orm2.desc)(journalEntries.createdAt)).limit(30);
    const lines = await db.select().from(journalLines);
    const fullEntries = entries.map((e) => {
      const entryLines = lines.filter((l) => l.journalId === e.id);
      return {
        ...e,
        lines: entryLines
      };
    });
    res.json(fullEntries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/accounting/journal", requireAuth, requireRole("ACCOUNTANT", "BRANCH_MANAGER", "HEAD_OFFICE_MANAGER", "SUPER_ADMIN"), async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { entryNumber, narration, lines } = req.body;
    const requester = req.user;
    if (!Array.isArray(lines) || lines.length < 2) {
      return res.status(400).json({ error: "At least two balanced journal lines are required" });
    }
    const totalDebit = lines.filter((l) => l.entryType === "DEBIT").reduce((sum, l) => sum + Number(l.amount), 0);
    const totalCredit = lines.filter((l) => l.entryType === "CREDIT").reduce((sum, l) => sum + Number(l.amount), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({
        error: `Double-entry invariant violated: Total Debits (${totalDebit}) must equal Total Credits (${totalCredit})`
      });
    }
    const journalId = `jnl-${Date.now()}`;
    const transactionDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const newEntry = {
      id: journalId,
      entryNumber: entryNumber || `JV-MAN-${Math.floor(1e5 + Math.random() * 9e5)}`,
      transactionDate,
      narration: narration || "Manual Journal Adjustment",
      referenceType: "ADJUSTMENT",
      referenceId: journalId,
      totalDebit,
      totalCredit,
      postedBy: requester.id
    };
    await db.insert(journalEntries).values(newEntry);
    const journalLineRecords = lines.map((l, idx) => ({
      id: `line-${journalId}-${idx}`,
      journalId,
      accountCode: l.accountCode,
      accountName: l.accountName || "Account",
      entryType: l.entryType,
      amount: Number(l.amount)
    }));
    await db.insert(journalLines).values(journalLineRecords);
    for (const line of lines) {
      const amt = Number(line.amount);
      const isDebit = line.entryType === "DEBIT";
      const [acc] = await db.select().from(chartOfAccounts).where((0, import_drizzle_orm2.eq)(chartOfAccounts.code, line.accountCode));
      if (acc) {
        let delta = 0;
        if (acc.type === "ASSET" || acc.type === "EXPENSE") {
          delta = isDebit ? amt : -amt;
        } else {
          delta = isDebit ? -amt : amt;
        }
        await db.update(chartOfAccounts).set({ balance: import_drizzle_orm2.sql`${chartOfAccounts.balance} + ${delta}` }).where((0, import_drizzle_orm2.eq)(chartOfAccounts.code, line.accountCode));
      }
    }
    await db.insert(auditLogs).values({
      id: `log-${Date.now()}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requester.role,
      action: "MANUAL_JOURNAL_POSTED",
      entityName: "JOURNAL_ENTRY",
      entityId: journalId,
      ipAddress: req.ip || "127.0.0.1",
      details: `Posted manual journal voucher ${newEntry.entryNumber} totaling TZS ${totalDebit.toLocaleString()}. Narration: ${narration}`
    });
    res.status(201).json({ ...newEntry, lines: journalLineRecords });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
app.post("/api/mobile-money/webhook", async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { provider, providerTxId, accountReference, phoneNumber, amount } = req.body;
    const txAmount = Number(amount);
    const txId = providerTxId || `MNO${Date.now()}`;
    const expectedSignature = import_crypto.default.createHmac("sha256", MOMO_WEBHOOK_SECRET).update(`${provider}:${txId}:${accountReference}:${txAmount}`).digest("hex");
    const providedSignature = String(req.headers["x-webhook-signature"] || "");
    const expectedBuf = Buffer.from(expectedSignature, "hex");
    const providedBuf = Buffer.from(providedSignature, "hex");
    const signatureValid = providedBuf.length === expectedBuf.length && import_crypto.default.timingSafeEqual(expectedBuf, providedBuf);
    if (!signatureValid) {
      return res.status(401).json({ error: "Invalid or missing webhook signature", code: "INVALID_SIGNATURE" });
    }
    const signature = expectedSignature;
    const existing = await db.select().from(mobileMoneyTransactions).where((0, import_drizzle_orm2.eq)(mobileMoneyTransactions.providerTxId, txId));
    if (existing.length > 0) {
      return res.status(200).json({ status: "DUPLICATE_IGNORED", message: "Transaction already processed" });
    }
    const loansMatching = await db.select().from(loans).where((0, import_drizzle_orm2.eq)(loans.loanAccountNumber, accountReference));
    let processingStatus = "COMPLETED";
    let receiptNumber = null;
    if (loansMatching.length > 0) {
      const loan = loansMatching[0];
      const repReq = {
        loanId: loan.id,
        amount: txAmount,
        paymentMethod: provider || "MPESA",
        referenceNumber: txId,
        receivedBy: "MOBILE_MONEY_GATEWAY"
      };
      const repId = `rep-${Date.now()}`;
      receiptNumber = `RCP-MNO-${Math.floor(1e4 + Math.random() * 9e4)}`;
      const principalAllocated = Math.min(txAmount, loan.outstandingPrincipal);
      const interestAllocated = Math.max(0, txAmount - principalAllocated);
      await db.insert(repayments).values({
        id: repId,
        receiptNumber,
        loanId: loan.id,
        amount: txAmount,
        paymentDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        paymentMethod: provider || "MPESA",
        referenceNumber: txId,
        principalAllocated,
        interestAllocated,
        feesAllocated: 0,
        penaltiesAllocated: 0,
        receivedBy: "C2B_AUTOMATION",
        isReversed: false,
        reversalReason: null
      });
      await db.update(loans).set({
        outstandingPrincipal: Math.max(0, loan.outstandingPrincipal - principalAllocated),
        totalPaid: import_drizzle_orm2.sql`${loans.totalPaid} + ${txAmount}`
      }).where((0, import_drizzle_orm2.eq)(loans.id, loan.id));
    }
    await db.insert(mobileMoneyTransactions).values({
      id: `mno-tx-${Date.now()}`,
      provider: provider || "MPESA",
      providerTxId: txId,
      accountReference,
      phoneNumber,
      amount: txAmount,
      hmacSignature: signature,
      processingStatus,
      receiptNumber
    });
    res.status(200).json({
      status: "SUCCESS",
      providerTxId: txId,
      receiptNumber,
      message: "Mobile money C2B callback verified and ledger updated"
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
app.post("/api/mobile-money/simulate", requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { provider, accountReference, phoneNumber, amount } = req.body;
    const requester = req.user;
    const txAmount = Number(amount);
    if (!txAmount || txAmount <= 0) {
      return res.status(400).json({ error: "Valid amount is required" });
    }
    const txId = `SIM-${provider || "MPESA"}-${Date.now()}`;
    const loansMatching = await db.select().from(loans).where((0, import_drizzle_orm2.eq)(loans.loanAccountNumber, accountReference));
    let receiptNumber = null;
    if (loansMatching.length > 0) {
      const loan = loansMatching[0];
      receiptNumber = `RCP-MNO-${Math.floor(1e4 + Math.random() * 9e4)}`;
      const principalAllocated = Math.min(txAmount, loan.outstandingPrincipal);
      const interestAllocated = Math.max(0, txAmount - principalAllocated);
      await db.insert(repayments).values({
        id: `rep-${Date.now()}`,
        receiptNumber,
        loanId: loan.id,
        amount: txAmount,
        paymentDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        paymentMethod: provider || "MPESA",
        referenceNumber: txId,
        principalAllocated,
        interestAllocated,
        feesAllocated: 0,
        penaltiesAllocated: 0,
        receivedBy: `${requester.firstName} ${requester.lastName}`,
        isReversed: false,
        reversalReason: null
      });
      await db.update(loans).set({
        outstandingPrincipal: Math.max(0, loan.outstandingPrincipal - principalAllocated),
        totalPaid: import_drizzle_orm2.sql`${loans.totalPaid} + ${txAmount}`
      }).where((0, import_drizzle_orm2.eq)(loans.id, loan.id));
    }
    await db.insert(mobileMoneyTransactions).values({
      id: `mno-tx-${Date.now()}`,
      provider: provider || "MPESA",
      providerTxId: txId,
      accountReference,
      phoneNumber,
      amount: txAmount,
      hmacSignature: "SIMULATED-NO-SIGNATURE",
      processingStatus: loansMatching.length > 0 ? "COMPLETED" : "FAILED",
      receiptNumber
    });
    await db.insert(auditLogs).values({
      id: `log-momosim-${Date.now()}`,
      userId: requester.id,
      userName: `${requester.firstName} ${requester.lastName}`,
      userRole: requester.role,
      action: "MOBILE_MONEY_PAYMENT_SIMULATED",
      entityName: "MOBILE_MONEY_TRANSACTION",
      entityId: txId,
      ipAddress: req.ip || "127.0.0.1",
      details: `Simulated ${provider || "MPESA"} payment of TZS ${txAmount.toLocaleString()} against ${accountReference}.`
    });
    res.status(200).json({
      status: loansMatching.length > 0 ? "SUCCESS" : "NO_MATCHING_LOAN",
      providerTxId: txId,
      receiptNumber,
      message: loansMatching.length > 0 ? "Simulated mobile money payment applied and ledger updated" : `No active loan found for account reference ${accountReference}`
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
app.get("/api/audit-logs", requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const logs = await db.select().from(auditLogs).orderBy((0, import_drizzle_orm2.desc)(auditLogs.timestamp)).limit(50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/offline-sync", requireAuth, async (req, res) => {
  try {
    await initDb();
    const { db } = getDb();
    const { deviceId, queue } = req.body;
    if (!Array.isArray(queue)) {
      return res.status(400).json({ error: "Queue must be an array" });
    }
    const results = [];
    for (const item of queue) {
      try {
        const existing = await db.select().from(offlineSyncRecords).where((0, import_drizzle_orm2.eq)(offlineSyncRecords.localId, item.localId));
        if (existing.length > 0) {
          results.push({ localId: item.localId, status: "ALREADY_SYNCED" });
          continue;
        }
        await db.insert(offlineSyncRecords).values({
          id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          localId: item.localId,
          deviceId: deviceId || "field-tablet-01",
          operationType: item.operationType,
          payloadJson: JSON.stringify(item.payload),
          clientTimestamp: item.clientTimestamp || (/* @__PURE__ */ new Date()).toISOString(),
          syncStatus: "SYNCED",
          syncedAt: /* @__PURE__ */ new Date(),
          errorMessage: null,
          retryCount: 0
        });
        if (item.operationType === "COLLECTION_PAYMENT" && item.payload) {
          const { loanId, amount, paymentMethod, channelRef } = item.payload;
          if (loanId && amount) {
            const [loan] = await db.select().from(loans).where((0, import_drizzle_orm2.eq)(loans.id, loanId));
            if (loan) {
              const paymentAmount = Number(amount);
              const principalAllocated = Math.min(paymentAmount, loan.outstandingPrincipal);
              const interestAllocated = Math.max(0, paymentAmount - principalAllocated);
              const receiptNumber = channelRef || `RCP-OFF-${Date.now().toString().slice(-6)}`;
              await db.insert(repayments).values({
                id: `rep-off-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                receiptNumber,
                loanId,
                amount: paymentAmount,
                paymentDate: (item.clientTimestamp || (/* @__PURE__ */ new Date()).toISOString()).split("T")[0],
                paymentMethod: paymentMethod || "CASH",
                referenceNumber: channelRef || `OFFLINE-SYNC-${item.localId}`,
                principalAllocated,
                interestAllocated,
                feesAllocated: 0,
                penaltiesAllocated: 0,
                receivedBy: item.payload.officer || "Field Officer",
                isReversed: false,
                reversalReason: null
              });
              const newOutstanding = Math.max(0, loan.outstandingPrincipal - principalAllocated);
              await db.update(loans).set({
                outstandingPrincipal: newOutstanding,
                totalPaid: import_drizzle_orm2.sql`${loans.totalPaid} + ${paymentAmount}`,
                status: newOutstanding === 0 ? "CLOSED" : loan.status
              }).where((0, import_drizzle_orm2.eq)(loans.id, loanId));
            }
          }
        }
        results.push({ localId: item.localId, status: "SUCCESS" });
      } catch (innerErr) {
        results.push({ localId: item.localId, status: "FAILED", error: innerErr.message });
      }
    }
    res.json({ syncedCount: results.filter((r) => r.status === "SUCCESS").length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Huduma MFI Operating System server running on http://0.0.0.0:${PORT}`);
  });
}
if (!process.env.VERCEL) {
  startServer();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app
});
//# sourceMappingURL=server.cjs.map
