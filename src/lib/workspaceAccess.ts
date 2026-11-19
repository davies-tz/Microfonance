const portfolio = ['dashboard', 'customers', 'groups', 'products', 'origination', 'servicing', 'payments', 'savings', 'reports'] as const;
const finance = ['servicing', 'payments', 'savings', 'accounting', 'mobile_money', 'reports'] as const;
const lending = ['customers', 'groups', 'products', 'origination', 'servicing', 'offline_sync'] as const;

const roleTabs: Record<string, readonly string[]> = {
  SUPER_ADMIN: [...portfolio, ...finance, 'offline_sync', 'staff', 'audit'],
  HEAD_OFFICE_MANAGER: [...portfolio, ...finance, 'offline_sync', 'audit'],
  MANAGER: portfolio,
  BRANCH_MANAGER: ['customers'],
  FIELD_OFFICER: lending,
  CREDIT_OFFICER: lending,
  LOAN_OFFICER: lending,
  COLLECTION_OFFICER: ['customers', 'servicing', 'payments', 'offline_sync'],
  ACCOUNTANT: finance,
  CASHIER: ['servicing', 'payments', 'savings', 'accounting'],
  AUDITOR: ['audit', 'reports', 'accounting', 'servicing', 'payments', 'savings'],
};

export function canAccessTab(role: string | undefined, tab: string): boolean {
  return !!role && Object.hasOwn(roleTabs, role) && roleTabs[role].includes(tab);
}

export function firstAllowedTab(role: string): string | undefined {
  return Object.hasOwn(roleTabs, role) ? roleTabs[role][0] : undefined;
}

export const memberRequestRoles = ['BRANCH_MANAGER', 'MANAGER', 'FIELD_OFFICER', 'CREDIT_OFFICER', 'LOAN_OFFICER'];
