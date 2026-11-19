/**
 * Core MFI Application State & Action Dispatcher
 * Controls authentication context, Cloud SQL PostgreSQL persistence,
 * bilingual i18n, offline-first queue, and double-entry transaction dispatching.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  AuditLog,
  Branch,
  ChartOfAccount,
  Customer,
  JournalEntry,
  LendingGroup,
  Loan,
  LoanApplication,
  LoanProduct,
  OfflineSyncRecord,
  Payment,
  ProviderWebhookTransaction,
  SavingsAccount,
  SavingsTransaction,
  User,
} from '../types';
import { INITIAL_USERS } from '../services/mockDb';
import { Language } from '../lib/i18n';
import { generateRepaymentSchedule } from '../engines/scheduleEngine';
import { roundCurrency } from '../engines/interestEngine';

export interface SummaryMetrics {
  activeBorrowers: number;
  totalCustomers: number;
  grossPortfolio: number;
  totalDisbursed: number;
  totalSavings: number;
  par30Amount: number;
  par30Ratio: number;
  par90Amount: number;
  par90Ratio: number;
  liquidity: {
    cashInVault: number;
    mpesaFloat: number;
    airtelFloat: number;
    tigoFloat: number;
    crdbBank: number;
    totalLiquid: number;
  };
  recentRepayments: any[];
}

function toPayment(row: any, loan: Pick<Loan, 'loanAccountNumber' | 'branchId' | 'customerName'> | undefined): Payment {
  return {
    id: row.id,
    receiptNumber: row.receiptNumber,
    loanId: row.loanId,
    loanAccountNumber: loan?.loanAccountNumber ?? row.loanId,
    branchId: loan?.branchId ?? '',
    customerName: loan?.customerName ?? '',
    amount: row.amount,
    paymentMethod: ['CASH', 'BANK_TRANSFER', 'SAVINGS_OFFSET'].includes(row.paymentMethod)
      ? row.paymentMethod : 'MOBILE_MONEY',
    channelReference: row.referenceNumber,
    idempotencyKey: row.referenceNumber ?? row.id,
    paymentDate: row.paymentDate,
    receivedBy: row.receivedBy,
    isReversed: row.isReversed,
    reversalReason: row.reversalReason ?? undefined,
    allocations: [],
    principalAllocated: row.principalAllocated,
    interestAllocated: row.interestAllocated,
    feesAllocated: row.feesAllocated,
    penaltiesAllocated: row.penaltiesAllocated,
  };
}

interface MfiContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  authToken: string | null;
  isAuthLoading: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string; redirectTab?: string }>;
  logout: () => Promise<void>;
  users: User[];
  currentBranchId: string;
  setCurrentBranchId: (branchId: string) => void;
  branches: Branch[];
  createBranch: (branch: Pick<Branch, 'code' | 'name' | 'region' | 'phone'> & { address: string }) => Promise<Branch>;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  offlineQueue: OfflineSyncRecord[];
  language: Language;
  setLanguage: (lang: Language) => void;
  summaryMetrics: SummaryMetrics | null;
  refreshSummary: () => Promise<void>;

  // Data Collections
  customers: Customer[];
  groups: LendingGroup[];
  loanProducts: LoanProduct[];
  applications: LoanApplication[];
  loans: Loan[];
  payments: Payment[];
  savingsAccounts: SavingsAccount[];
  savingsTransactions: SavingsTransaction[];
  chartOfAccounts: ChartOfAccount[];
  journals: JournalEntry[];
  auditLogs: AuditLog[];
  providerTransactions: ProviderWebhookTransaction[];

  // Core Actions
  createCustomer: (customerData: Partial<Customer>) => Promise<Customer | null>;
  refreshWorkspace: () => Promise<void>;
  requestMemberRemoval: (id: string, reason: string) => Promise<void>;
  reviewMemberRequest: (id: string, decision: 'APPROVED' | 'REJECTED') => Promise<void>;
  verifyKycDocument: (customerId: string, docId: string, status: 'VERIFIED' | 'REJECTED', reason?: string) => void;
  createLendingGroup: (groupData: Partial<LendingGroup>) => Promise<LendingGroup>;
  createLoanApplication: (appData: Partial<LoanApplication>) => Promise<LoanApplication>;
  assessLoanApplication: (appId: string, assessmentData: any) => Promise<void>;
  approveLoanApplication: (appId: string, level: 'BRANCH_MANAGER' | 'REGIONAL_MANAGER' | 'HEAD_OFFICE', decision: 'APPROVED' | 'REJECTED', comments: string) => Promise<void>;
  disburseLoan: (appId: string, paymentMethod: any) => Promise<Loan>;
  processRepayment: (loanId: string, amount: number, method: any, channelRef: string) => Promise<Payment>;
  processSavingsDeposit: (accountId: string, amount: number, method: any, reference: string) => Promise<void>;
  processSavingsWithdrawal: (accountId: string, amount: number, method: any, reference: string) => Promise<void>;
  postManualJournalEntry: (narration: string, lines: Array<{ accountId: string; entryType: 'DEBIT' | 'CREDIT'; amount: number }>) => Promise<JournalEntry>;
  simulateMobileMoneyWebhook: (provider: 'MPESA' | 'AIRTEL_MONEY' | 'TIGO_PESA', loanNumber: string, amount: number, phone: string) => Promise<{ success: boolean; message: string; receipt?: string }>;
  syncOfflineQueue: () => Promise<number>;
  addOfflineRecord: (record: Omit<OfflineSyncRecord, 'id' | 'syncStatus'>) => void;
}

const MfiContext = createContext<MfiContextType | undefined>(undefined);

export const MfiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('imara_auth_token');
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('imara_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const users = currentUser ? [currentUser] : [];
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Safe operational fallback
  const activeUser: User = currentUser || INITIAL_USERS[0];

  const [currentBranchId, setCurrentBranchId] = useState<string>('ALL');
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<OfflineSyncRecord[]>([]);
  const [summaryMetrics, setSummaryMetrics] = useState<SummaryMetrics | null>(null);

  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('mfi_language') as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('mfi_language', lang);
  };

  // Verify active JWT token on initial load
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('imara_auth_token');
      if (!storedToken) {
        setIsAuthLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
          localStorage.setItem('imara_user', JSON.stringify(data.user));
          if (data.user.preferredLanguage) {
            setLanguage(data.user.preferredLanguage as Language);
          }
        } else {
          localStorage.removeItem('imara_auth_token');
          localStorage.removeItem('imara_user');
          setCurrentUser(null);
          setAuthToken(null);
        }
      } catch {
        // keep local state if network temporarily unreachable
      } finally {
        setIsAuthLoading(false);
      }
    };
    verifySession();
  }, []);

  const login = async (identifier: string, password: string, rememberMe: boolean = false) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, rememberMe }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Invalid credentials' };
      }
      setAuthToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem('imara_auth_token', data.token);
      localStorage.setItem('imara_user', JSON.stringify(data.user));
      if (data.user.preferredLanguage) {
        setLanguage(data.user.preferredLanguage as Language);
      }
      return { success: true, redirectTab: data.redirectTab };
    } catch {
      return {
        success: false,
        error: 'Unable to connect to the authentication server. Please check your network connection.',
      };
    }
  };

  const logout = async () => {
    try {
      if (currentUser) {
        await fetch('/api/auth/logout', { method: 'POST', headers: authHeaders() });
      }
    } catch (err) {
      console.warn('Logout notification error:', err);
    } finally {
      setAuthToken(null);
      setCurrentUser(null);
      setBranches([]);
      setCustomers([]);
      setGroups([]);
      setLoanProducts([]);
      setApplications([]);
      setLoans([]);
      setPayments([]);
      setSavingsAccounts([]);
      setSavingsTransactions([]);
      setChartOfAccounts([]);
      setJournals([]);
      setAuditLogs([]);
      setProviderTransactions([]);
      setOfflineQueue([]);
      setSummaryMetrics(null);
      setCurrentBranchId('ALL');
      localStorage.removeItem('imara_auth_token');
      localStorage.removeItem('imara_user');
    }
  };

  // Builds request headers with a Bearer token, reading it fresh from
  // localStorage each call (not the authToken state) so a long-lived closure
  // from an earlier render never sends a stale/missing token.
  const authHeaders = (extra: Record<string, string> = {}): Record<string, string> => {
    const token = localStorage.getItem('imara_auth_token');
    return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
  };

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const postToServer = async (url: string, payload: unknown) => {
    if (!isOnline) throw new Error('Reconnect to save this change.');
    const response = await fetch(url, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
      throw new Error(data?.error || 'The server could not save this change.');
    }
    return data;
  };

  const createBranch: MfiContextType['createBranch'] = async (details) => {
    const branch: Branch = await postToServer('/api/branches', details);
    setBranches((previous) => [...previous, branch]);
    return branch;
  };

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [groups, setGroups] = useState<LendingGroup[]>([]);
  const [loanProducts, setLoanProducts] = useState<LoanProduct[]>([]);
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([]);
  const [savingsTransactions, setSavingsTransactions] = useState<SavingsTransaction[]>([]);
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [providerTransactions, setProviderTransactions] = useState<ProviderWebhookTransaction[]>([]);

  // Fetch Summary from Cloud SQL
  const refreshSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/summary', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSummaryMetrics(data);
      }
    } catch {
      // offline fallback
    }
  }, []);

  // Initial Load from Cloud SQL Backend
  const loadCloudSqlData = useCallback(async () => {
    const headers = authHeaders();
    const readResponse = async (response: Response) => {
      const data = await response.json();
      if (headers.Authorization !== authHeaders().Authorization) {
        throw new Error('The staff session changed while loading the workspace.');
      }
      return data;
    };
    if (!headers.Authorization) return;
    try {
      const [
        summaryRes,
        branchesRes,
        customersRes,
        groupsRes,
        productsRes,
        appsRes,
        loansRes,
        repaymentsRes,
        savingsRes,
        coaRes,
        journalsRes,
        auditRes,
      ] = await Promise.all([
        fetch('/api/summary', { headers }),
        fetch('/api/branches', { headers }),
        fetch('/api/customers', { headers }),
        fetch('/api/groups', { headers }),
        fetch('/api/products', { headers }),
        fetch('/api/applications', { headers }),
        fetch('/api/loans', { headers }),
        fetch('/api/repayments', { headers }),
        fetch('/api/savings', { headers }),
        fetch('/api/accounting/coa', { headers }),
        fetch('/api/accounting/journal', { headers }),
        fetch('/api/audit-logs', { headers }),
      ]);

      const mobileMoney = await fetch('/api/mobile-money/transactions', { headers }).catch(() => null);
      if (mobileMoney?.ok) {
        const rows = await readResponse(mobileMoney);
        setProviderTransactions(rows);
      }
      const customerRows = customersRes.ok ? await readResponse(customersRes) : [];
      const productRows = productsRes.ok ? await readResponse(productsRes) : [];
      const loanRows = loansRes.ok ? await readResponse(loansRes) : [];
      const customersById = new Map<string, any>(customerRows.map((customer: any) => [customer.id, customer]));
      const productsById = new Map<string, any>(productRows.map((product: any) => [product.id, product]));
      const customerName = (id: string) => {
        const customer = customersById.get(id);
        return customer ? `${customer.firstName} ${customer.lastName}` : '';
      };

      if (summaryRes.ok) setSummaryMetrics(await readResponse(summaryRes));
      if (branchesRes.ok) {
        const data = await readResponse(branchesRes);
        setBranches(data);
      }
      if (customersRes.ok) {
        const data = customerRows;
        const mappedCustomers: Customer[] = data.map((c: any) => ({
          id: c.id,
          customerNumber: c.customerNumber,
          branchId: c.branchId,
          firstName: c.firstName,
          middleName: '',
          lastName: c.lastName,
          dateOfBirth: c.dateOfBirth,
          gender: c.gender,
          phonePrimary: c.phoneNumber,
          email: c.email,
          nationalIdNumber: c.nationalIdNida,
          status: 'ACTIVE',
          businessType: c.businessType,
          monthlyRevenue: c.monthlyIncome,
          monthlyExpenses: roundCurrency(c.monthlyIncome * 0.4),
          groupId: undefined,
          documents: c.documentUrl
            ? [
                {
                  id: `doc-${c.id}`,
                  documentType: 'NIDA_ID_CARD',
                  fileUrl: c.documentUrl,
                  documentNumber: c.nationalIdNida,
                  verificationStatus: 'VERIFIED',
                  uploadedAt: c.createdAt,
                },
              ]
            : [],
          createdAt: c.createdAt,
        }));
        setCustomers(mappedCustomers);
      }
      if (groupsRes.ok) {
        const data = await readResponse(groupsRes);
        const mappedGroups: LendingGroup[] = data.map((g: any) => ({
          id: g.id,
          groupNumber: g.groupNumber,
          branchId: g.branchId,
          name: g.name,
          leaderCustomerId: '',
          loanOfficerId: g.officerId || 'usr-co-1',
          meetingFrequency: g.meetingFrequency,
          meetingDayOfWeek: 2,
          meetingLocation: g.meetingLocation,
          status: g.isActive ? 'ACTIVE' : 'DISSOLVED',
          memberIds: [],
          createdAt: g.createdAt,
        }));
        setGroups(mappedGroups);
      }
      if (productsRes.ok) {
        const data = productRows;
        const mappedProds: LoanProduct[] = data.map((p: any) => ({
          id: p.id,
          code: p.code,
          name: p.nameEn,
          interestMethod: p.interestMethod,
          annualNominalRate: p.annualInterestRate,
          minPrincipal: p.minAmount,
          maxPrincipal: p.maxAmount,
          minTermInstallments: p.minTenureMonths,
          maxTermInstallments: p.maxTenureMonths,
          repaymentFrequency: p.repaymentFrequency,
          gracePeriodType: 'NONE',
          gracePeriodInstallments: p.gracePeriodDays ? Math.ceil(p.gracePeriodDays / 30) : 0,
          processingFeePercent: p.originationFeeRate * 100,
          compulsorySavingsPercent: p.compulsorySavingsRate * 100,
          isActive: p.isActive,
        }));
        setLoanProducts(mappedProds);
      }
      if (appsRes.ok) {
        const data = await readResponse(appsRes);
        const mappedApps: LoanApplication[] = data.map((a: any) => ({
          id: a.id,
          applicationNumber: a.applicationNumber,
          branchId: customersById.get(a.customerId)?.branchId || '',
          customerId: a.customerId,
          customerName: customerName(a.customerId),
          groupId: a.groupId || undefined,
          productId: a.productId,
          productName: productsById.get(a.productId)?.nameEn || '',
          appliedPrincipal: a.requestedAmount,
          approvedPrincipal: a.approvedAmount || undefined,
          termInstallments: a.tenureMonths,
          purpose: a.purpose,
          status: a.status === 'PENDING_REVIEW' ? 'SUBMITTED' : a.status,
          // The maker (submitter) - used to block self-approval in the UI.
          loanOfficerId: a.submittedBy || 'usr-co-1',
          approvals: [],
          createdAt: a.createdAt,
          updatedAt: a.createdAt,
        }));
        setApplications(mappedApps);
      }
      if (loansRes.ok) {
        const data = loanRows;
        const mappedLoans: Loan[] = data.map((l: any) => ({
          id: l.id,
          loanAccountNumber: l.loanAccountNumber,
          applicationId: l.applicationId,
          customerId: l.customerId,
          customerName: customerName(l.customerId),
          customerPhone: customersById.get(l.customerId)?.phoneNumber || '',
          branchId: l.branchId,
          productId: l.productId,
          productName: productsById.get(l.productId)?.nameEn || '',
          groupId: l.groupId,
          disbursedPrincipal: l.principalAmount,
          outstandingPrincipal: l.outstandingPrincipal,
          outstandingInterest: l.accruedInterest || 0,
          outstandingFees: l.unpaidFees || 0,
          outstandingPenalties: l.unpaidPenalties || 0,
          totalOutstanding: l.outstandingPrincipal + (l.accruedInterest || 0) + (l.unpaidFees || 0) + (l.unpaidPenalties || 0),
          daysInArrears: l.daysInArrears || 0,
          status: l.status === 'DELINQUENT' ? 'IN_ARREARS' : l.status,
          disbursedAt: l.disbursementDate,
          disbursedBy: 'Branch Manager',
          maturityDate: l.maturityDate,
          installments: [],
        }));
        setLoans(mappedLoans);
      }
      if (repaymentsRes.ok) {
        const rows = await readResponse(repaymentsRes);
        const loansById = new Map<string, any>(loanRows.map((loan: any) => [loan.id, loan]));
        setPayments(rows.map((row: any) => {
          const loan = loansById.get(row.loanId);
          return toPayment(row, loan && { ...loan, customerName: customerName(loan.customerId) });
        }));
      }
      if (savingsRes.ok) {
        const data = await readResponse(savingsRes);
        const mappedSavings: SavingsAccount[] = data.map((s: any) => ({
          id: s.id,
          accountNumber: s.accountNumber,
          customerId: s.customerId,
          customerName: customerName(s.customerId),
          branchId: customersById.get(s.customerId)?.branchId || '',
          productType: s.productType,
          balance: s.balance,
          lockedAmount: s.lockedAmount,
          status: s.status,
          openedAt: s.createdAt,
        }));
        setSavingsAccounts(mappedSavings);
      }
      if (coaRes.ok) {
        const data = await readResponse(coaRes);
        const mappedCoa: ChartOfAccount[] = data.map((c: any) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          type: c.type,
          normalBalance: c.normalBalance,
          balance: c.balance,
          description: c.description || '',
        }));
        setChartOfAccounts(mappedCoa);
      }
      if (journalsRes.ok) {
        const data = await readResponse(journalsRes);
        const mappedJournals: JournalEntry[] = data.map((j: any) => ({
          id: j.id,
          entryNumber: j.entryNumber,
          branchId: 'br-kariakoo',
          transactionDate: j.transactionDate,
          narration: j.narration,
          referenceType: j.referenceType,
          referenceId: j.referenceId || '',
          postedBy: j.postedBy,
          lines: (j.lines || []).map((l: any) => ({
            id: l.id,
            accountId: l.accountCode,
            accountCode: l.accountCode,
            accountName: l.accountName,
            entryType: l.entryType,
            amount: l.amount,
          })),
          totalDebit: j.totalDebit,
          totalCredit: j.totalCredit,
          createdAt: j.createdAt,
        }));
        setJournals(mappedJournals);
      }
      if (auditRes.ok) {
        const data = await readResponse(auditRes);
        const mappedLogs: AuditLog[] = data.map((a: any) => ({
          id: a.id,
          userId: a.userId,
          userName: a.userName,
          userRole: a.userRole,
          action: a.action,
          entityName: a.entityName,
          entityId: a.entityId,
          beforeState: null,
          afterState: null,
          ipAddress: a.ipAddress,
          timestamp: a.timestamp,
        }));
        setAuditLogs(mappedLogs);
      }
    } catch (err) {
      console.warn('Could not load account data:', err);
    }
  }, []);

  useEffect(() => {
    if (!authToken) return;
    void loadCloudSqlData();
  }, [authToken, loadCloudSqlData]);

  const createCustomer = async (customerData: Partial<Customer>): Promise<Customer | null> => {
    const id = `cust-${Date.now()}`;
    const customerNumber = `CUST-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newCust: Customer = {
      id,
      customerNumber,
      branchId: customerData.branchId || activeUser.branchId,
      firstName: customerData.firstName || '',
      middleName: customerData.middleName || '',
      lastName: customerData.lastName || '',
      dateOfBirth: customerData.dateOfBirth || '1990-01-01',
      gender: customerData.gender || 'FEMALE',
      phonePrimary: customerData.phonePrimary || '+255 700 000 000',
      email: customerData.email,
      nationalIdNumber: customerData.nationalIdNumber,
      status: 'ACTIVE',
      businessType: customerData.businessType || 'General Merchandise',
      monthlyRevenue: customerData.monthlyRevenue || 1000000,
      monthlyExpenses: customerData.monthlyExpenses || 500000,
      groupId: customerData.groupId,
      documents: customerData.documents || [],
      createdAt: new Date().toISOString(),
    };

    const saved = await postToServer('/api/customers', {
      firstName: newCust.firstName,
      lastName: newCust.lastName,
      nationalIdNida: newCust.nationalIdNumber || `NIDA-${Date.now()}`,
      phoneNumber: newCust.phonePrimary,
      email: newCust.email,
      dateOfBirth: newCust.dateOfBirth,
      gender: newCust.gender,
      residentialAddress: 'Tanzania Residential Area',
      businessType: newCust.businessType,
      monthlyIncome: newCust.monthlyRevenue,
      branchId: newCust.branchId,
      userId: activeUser.id,
      userName: `${activeUser.firstName} ${activeUser.lastName}`,
    });
    if (saved.state === 'PENDING') return null;
    const customer = { ...newCust, id: saved.id, customerNumber: saved.customerNumber };
    setCustomers((previous) => [customer, ...previous]);
    void loadCloudSqlData();
    return customer;
  };

  const verifyKycDocument = (customerId: string, docId: string, status: 'VERIFIED' | 'REJECTED', reason?: string) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== customerId) return c;
        const updatedDocs = c.documents.map((d) => {
          if (d.id !== docId) return d;
          return {
            ...d,
            verificationStatus: status,
            verifiedBy: `${activeUser.firstName} ${activeUser.lastName}`,
            verifiedAt: new Date().toISOString(),
            rejectionReason: reason,
          };
        });
        return {
          ...c,
          documents: updatedDocs,
          status: updatedDocs.some((d) => d.verificationStatus === 'VERIFIED') ? 'ACTIVE' : c.status,
        };
      })
    );
  };

  const createLendingGroup = async (groupData: Partial<LendingGroup>): Promise<LendingGroup> => {
    const newGroup: LendingGroup = {
      id: `grp-${Date.now()}`,
      groupNumber: `GRP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      branchId: groupData.branchId || activeUser.branchId,
      name: groupData.name || 'New Solidarity Group',
      leaderCustomerId: groupData.leaderCustomerId || '',
      loanOfficerId: groupData.loanOfficerId || activeUser.id,
      meetingFrequency: groupData.meetingFrequency || 'WEEKLY',
      meetingDayOfWeek: groupData.meetingDayOfWeek || 2,
      meetingLocation: groupData.meetingLocation || 'Branch Hall',
      status: 'ACTIVE',
      memberIds: groupData.memberIds || [],
      createdAt: new Date().toISOString(),
    };

    const saved = await postToServer('/api/groups', {
      name: newGroup.name,
      meetingDay: 'Tuesday',
      meetingFrequency: newGroup.meetingFrequency,
      meetingLocation: newGroup.meetingLocation,
      branchId: newGroup.branchId,
      officerId: activeUser.id,
    });
    const group = { ...newGroup, id: saved.id, groupNumber: saved.groupNumber };
    setGroups((previous) => [group, ...previous]);
    void loadCloudSqlData();
    return group;
  };

  const createLoanApplication = async (appData: Partial<LoanApplication>): Promise<LoanApplication> => {
    const cust = customers.find((c) => c.id === appData.customerId);
    const prod = loanProducts.find((p) => p.id === appData.productId);

    const newApp: LoanApplication = {
      id: `app-${Date.now()}`,
      applicationNumber: `APP-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      branchId: appData.branchId || activeUser.branchId,
      customerId: appData.customerId || '',
      customerName: cust ? `${cust.firstName} ${cust.lastName}` : 'Customer',
      groupId: appData.groupId || cust?.groupId,
      productId: appData.productId || loanProducts[0]?.id,
      productName: prod ? prod.name : 'Standard Micro Loan',
      appliedPrincipal: appData.appliedPrincipal || 1000000,
      termInstallments: appData.termInstallments || 6,
      purpose: appData.purpose || 'Working capital investment',
      status: 'SUBMITTED',
      loanOfficerId: activeUser.id,
      approvals: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await postToServer('/api/applications', {
      customerId: newApp.customerId,
      productId: newApp.productId,
      groupId: newApp.groupId,
      requestedAmount: newApp.appliedPrincipal,
      tenureMonths: newApp.termInstallments,
      purpose: newApp.purpose,
      userId: activeUser.id,
      userName: `${activeUser.firstName} ${activeUser.lastName}`,
    });
    const application = { ...newApp, id: saved.id, applicationNumber: saved.applicationNumber };
    setApplications((previous) => [application, ...previous]);
    void loadCloudSqlData();
    return application;
  };

  const assessLoanApplication = async (appId: string, assessmentData: any) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        return {
          ...app,
          status: 'ASSESSED' as const,
          assessment: {
            id: `ass-${Date.now()}`,
            assessorId: activeUser.id,
            assessorName: `${activeUser.firstName} ${activeUser.lastName}`,
            assessedAt: new Date().toISOString(),
            ...assessmentData,
          },
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const approveLoanApplication = async (
    appId: string,
    level: 'BRANCH_MANAGER' | 'REGIONAL_MANAGER' | 'HEAD_OFFICE',
    decision: 'APPROVED' | 'REJECTED',
    comments: string
  ) => {
    const app = applications.find((a) => a.id === appId);
    if (!app) throw new Error('Application not found');

    // The server enforces maker-checker (a submitter cannot review their own
    // application) and the branch approval tier limit - both can reject this
    // call, so we must wait for its response before updating local state.
    // Applying the change optimistically first would show "Approved" in the
    // UI even when the backend refused it.
    if (!isOnline) throw new Error('Reconnect to review this application.');
    {
      const res = await fetch(`/api/applications/${appId}/review`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          action: decision === 'APPROVED' ? 'APPROVE' : 'REJECT',
          approvedAmount: app.appliedPrincipal,
          rejectionReason: comments,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to review application');
      }
    }

    setApplications((prev) =>
      prev.map((a) => {
        if (a.id !== appId) return a;
        const newApproval = {
          id: `appr-${Date.now()}`,
          approverId: activeUser.id,
          approverName: `${activeUser.firstName} ${activeUser.lastName}`,
          level,
          decision,
          approvedAmount: a.appliedPrincipal,
          comments,
          approvedAt: new Date().toISOString(),
        };
        const nextStatus = decision === 'APPROVED' ? 'READY_FOR_DISBURSEMENT' : 'REJECTED';
        return {
          ...a,
          status: nextStatus as LoanApplication['status'],
          approvedPrincipal: decision === 'APPROVED' ? a.appliedPrincipal : undefined,
          approvals: [...a.approvals, newApproval],
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const disburseLoan = async (appId: string, paymentMethod: any): Promise<Loan> => {
    const app = applications.find((a) => a.id === appId);
    if (!app) throw new Error('Application not found');
    const prod = loanProducts.find((p) => p.id === app.productId) || loanProducts[0];
    const principal = app.approvedPrincipal || app.appliedPrincipal;
    const processingFee = roundCurrency(principal * (prod.processingFeePercent / 100));

    const installments = generateRepaymentSchedule({
      loanId: `ln-${Date.now()}`,
      disbursedPrincipal: principal,
      annualNominalRate: prod.annualNominalRate,
      interestMethod: prod.interestMethod,
      repaymentFrequency: prod.repaymentFrequency,
      termInstallments: app.termInstallments,
      startDate: new Date().toISOString().split('T')[0],
      gracePeriodType: prod.gracePeriodType,
      gracePeriodInstallments: prod.gracePeriodInstallments,
      processingFee,
    });

    const totalInterest = installments.reduce((acc, i) => acc + i.interestDue, 0);
    const loanAccountNumber = `LN-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const newLoan: Loan = {
      id: `ln-${Date.now()}`,
      loanAccountNumber,
      applicationId: app.id,
      customerId: app.customerId,
      customerName: app.customerName,
      customerPhone: '+255 712 000 111',
      branchId: app.branchId,
      productId: prod.id,
      productName: prod.name,
      groupId: app.groupId,
      disbursedPrincipal: principal,
      outstandingPrincipal: principal,
      outstandingInterest: totalInterest,
      outstandingFees: 0,
      outstandingPenalties: 0,
      totalOutstanding: principal + totalInterest,
      daysInArrears: 0,
      status: 'ACTIVE',
      disbursedAt: new Date().toISOString(),
      disbursedBy: `${activeUser.firstName} ${activeUser.lastName}`,
      maturityDate: installments[installments.length - 1]?.dueDate || new Date().toISOString().split('T')[0],
      installments,
    };

    const saved = await postToServer('/api/loans/disburse', {
      applicationId: app.id,
      disbursementDate: new Date().toISOString().split('T')[0],
      channel: paymentMethod === 'CASH' ? 'CASH' : 'MPESA',
      officerId: activeUser.id,
    });
    const loan = { ...newLoan, id: saved.loan.id, loanAccountNumber: saved.loan.loanAccountNumber };
    setLoans((previous) => [loan, ...previous]);
    setApplications((previous) => previous.map((item) => item.id === appId ? { ...item, status: 'DISBURSED' } : item));
    void loadCloudSqlData();
    return loan;
  };

  const processRepayment = async (loanId: string, amount: number, method: any, channelRef: string): Promise<Payment> => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) throw new Error('Loan not found');

      const saved = await postToServer('/api/repayments', {
      loanId: loan.id,
      amount,
      paymentMethod: method === 'MOBILE_MONEY' ? 'MPESA' : method,
      referenceNumber: channelRef,
      receivedBy: `${activeUser.firstName} ${activeUser.lastName}`,
    });
    const payment = toPayment(saved, loan);
    setPayments((previous) => [payment, ...previous.filter((item) => item.id !== payment.id)]);
    void loadCloudSqlData();
    return payment;
  };

  const postSavingsTransaction = async (
    accountId: string, amount: number, method: SavingsTransaction['paymentMethod'],
    transactionType: 'DEPOSIT' | 'WITHDRAWAL',
  ) => {
    const account = savingsAccounts.find((item) => item.id === accountId);
    if (!account) throw new Error('Savings account not found');
    const saved = await postToServer('/api/savings/transaction', {
      accountId, amount, channel: method, transactionType,
    });
    setSavingsAccounts((previous) => previous.map((item) => item.id === accountId
      ? { ...item, balance: saved.balanceAfter } : item));
    setSavingsTransactions((previous) => [{
      id: saved.id, savingsAccountId: accountId, accountNumber: account.accountNumber,
      customerName: account.customerName, transactionType, amount: saved.amount,
      balanceBefore: roundCurrency(saved.balanceAfter + (transactionType === 'DEPOSIT' ? -saved.amount : saved.amount)),
      balanceAfter: saved.balanceAfter, paymentMethod: method, reference: saved.reference,
      postedBy: `${activeUser.firstName} ${activeUser.lastName}`, createdAt: new Date().toISOString(),
    }, ...previous]);
    void refreshSummary();
  };

  const processSavingsDeposit = (accountId: string, amount: number, method: SavingsTransaction['paymentMethod']) =>
    postSavingsTransaction(accountId, amount, method, 'DEPOSIT');

  const processSavingsWithdrawal = (accountId: string, amount: number, method: SavingsTransaction['paymentMethod']) =>
    postSavingsTransaction(accountId, amount, method, 'WITHDRAWAL');

  const simulateMobileMoneyWebhook = async (
    provider: 'MPESA' | 'AIRTEL_MONEY' | 'TIGO_PESA',
    loanNumber: string,
    amount: number,
    phone: string
  ): Promise<{ success: boolean; message: string; receipt?: string }> => {
    const data = await postToServer('/api/mobile-money/simulate', {
      provider, accountReference: loanNumber, phoneNumber: phone, amount,
    });
    void loadCloudSqlData();
    return { success: data.status === 'COMPLETED', message: data.message, receipt: data.receiptNumber };

  };

  const postManualJournalEntry = async (
    narration: string,
    lines: Array<{ accountId: string; entryType: 'DEBIT' | 'CREDIT'; amount: number }>
  ): Promise<JournalEntry> => {
    const totalDr = roundCurrency(lines.filter((l) => l.entryType === 'DEBIT').reduce((s, l) => s + l.amount, 0));
    const totalCr = roundCurrency(lines.filter((l) => l.entryType === 'CREDIT').reduce((s, l) => s + l.amount, 0));

    if (Math.abs(totalDr - totalCr) > 0.01) {
      throw new Error(
        `Double-entry invariant violated: Total Debits (TZS ${totalDr.toLocaleString()}) must exactly equal Total Credits (TZS ${totalCr.toLocaleString()}).`
      );
    }

    const entryNumber = `JV-MAN-${Math.floor(100000 + Math.random() * 900000)}`;
    const journalLines = lines.map((l, idx) => {
      const coa = chartOfAccounts.find((c) => c.id === l.accountId || c.code === l.accountId);
      return {
        id: `jl-man-${Date.now()}-${idx}`,
        accountId: coa?.id || l.accountId,
        accountCode: coa?.code || l.accountId,
        accountName: coa?.name || 'Account',
        entryType: l.entryType,
        amount: roundCurrency(l.amount),
      };
    });

    const newJournal: JournalEntry = {
      id: `jv-${Date.now()}`,
      entryNumber,
      branchId: currentBranchId === 'ALL' ? branches[0]?.id || 'br-kariakoo' : currentBranchId,
      transactionDate: new Date().toISOString().split('T')[0],
      narration,
      referenceType: 'MANUAL',
      referenceId: entryNumber,
      postedBy: `${activeUser.firstName} ${activeUser.lastName}`,
      lines: journalLines,
      totalDebit: totalDr,
      totalCredit: totalCr,
      createdAt: new Date().toISOString(),
    };

    const saved = await postToServer('/api/accounting/journal', {
      entryNumber,
      narration,
      lines: journalLines,
    });
    void loadCloudSqlData();
    return { ...newJournal, id: saved.id, entryNumber: saved.entryNumber };
  };

  const addOfflineRecord = (
    record: Partial<OfflineSyncRecord> & {
      operationType: OfflineSyncRecord['operationType'];
      payload: any;
    }
  ) => {
    const newRecord: OfflineSyncRecord = {
      id: record.id || `sync-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      deviceId: record.deviceId || 'field-tablet-kariakoo',
      userId: record.userId || activeUser.id,
      userName: record.userName || `${activeUser.firstName} ${activeUser.lastName}`,
      operationType: record.operationType,
      idempotencyKey: record.idempotencyKey || `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      payload: record.payload,
      clientTimestamp: record.clientTimestamp || new Date().toISOString(),
      syncStatus: 'PENDING',
    };
    setOfflineQueue((prev) => [...prev, newRecord]);
  };

  const syncOfflineQueue = async () => {
    const queue = offlineQueue.filter((item) => item.syncStatus !== 'SYNCED' && item.userId === currentUser?.id);
    if (queue.length === 0) return 0;
    const data = await postToServer('/api/offline-sync', { deviceId: queue[0].deviceId, queue });
    const results = new Map<string, { status: string; error?: string }>(
      data.results.map((result: any) => [result.localId, result]),
    );
    setOfflineQueue((previous) => previous.map((item) => {
      const result = results.get(item.id);
      if (!result) return item;
      if (result.status === 'SUCCESS' || result.status === 'ALREADY_SYNCED') {
        return { ...item, syncStatus: 'SYNCED', syncedAt: new Date().toISOString() };
      }
      return { ...item, syncStatus: 'CONFLICT', conflictReason: result.error };
    }));
    void loadCloudSqlData();
    return data.syncedCount as number;
  };

  return (
    <MfiContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        authToken,
        isAuthLoading,
        login,
        logout,
        users,
        currentBranchId,
        setCurrentBranchId,
        branches,
        createBranch,
        isOnline,
        setIsOnline,
        offlineQueue,
        language,
        setLanguage,
        summaryMetrics,
        refreshSummary,
        customers,
        groups,
        loanProducts,
        applications,
        loans,
        payments,
        savingsAccounts,
        savingsTransactions,
        chartOfAccounts,
        journals,
        auditLogs,
        providerTransactions,
        createCustomer,
        refreshWorkspace: loadCloudSqlData,
        requestMemberRemoval: async (id, reason) => { await postToServer(`/api/customers/${encodeURIComponent(id)}/removal-request`, { reason }); },
        reviewMemberRequest: async (id, decision) => {
          await postToServer(`/api/member-requests/${encodeURIComponent(id)}/review`, { decision });
          await loadCloudSqlData();
        },
        verifyKycDocument,
        createLendingGroup,
        createLoanApplication,
        assessLoanApplication,
        approveLoanApplication,
        disburseLoan,
        processRepayment,
        processSavingsDeposit,
        processSavingsWithdrawal,
        postManualJournalEntry,
        simulateMobileMoneyWebhook,
        syncOfflineQueue,
        addOfflineRecord,
      }}
    >
      {children}
    </MfiContext.Provider>
  );
};

export const useMfi = () => {
  const context = useContext(MfiContext);
  if (!context) {
    throw new Error('useMfi must be used within an MfiProvider');
  }
  return context;
};
