import { i18n } from '@/core/i18n';

export const PERMISSION_ACTIONS = ['View', 'Create', 'Edit', 'Delete', 'Export', 'Approve'];

/** On-screen names for modules whose permission key (saved by the backend) reads differently. */
const MODULE_LABELS: Record<string, string> = {
  'Membership Plans': 'Subscriptions',
};

export function moduleLabel(moduleName: string): string {
  return MODULE_LABELS[moduleName] ?? moduleName;
}

const MODULE_KEY_MAP: Record<string, string> = {
  Dashboard: 'dashboard',
  Members: 'members',
  'Member Connect': 'memberConnect',
  Community: 'community',
  Attendance: 'attendance',
  Billing: 'billing',
  Payments: 'payments',
  'Membership Plans': 'membershipPlans',
  Trainers: 'trainers',
  Staff: 'staff',
  Payroll: 'payroll',
  Reports: 'reports',
  Assets: 'assets',
  'Sales Purchases': 'salesPurchases',
  Financials: 'financials',
  Gymos: 'gymos',
  Bios: 'bios',
  Settings: 'settings',
  Administration: 'administration',
};

export function getLocalizedModuleName(moduleName: string, t?: any): string {
  const key = MODULE_KEY_MAP[moduleName];
  if (key) {
    const fullKey = `roles.modules.${key}`;
    if (t) return t(fullKey, { defaultValue: moduleLabel(moduleName) });
    return i18n.t(fullKey as any, { defaultValue: moduleLabel(moduleName) }) as string;
  }
  return moduleLabel(moduleName);
}

export function getLocalizedActionName(action: string, t?: any): string {
  const key = action.toLowerCase();
  const fullKey = `roles.actions.${key}`;
  if (t) return t(fullKey, { defaultValue: action });
  return i18n.t(fullKey as any, { defaultValue: action }) as string;
}

export const ROLE_MODULES = [
  'Dashboard', 'Members', 'Member Connect', 'Community', 'Attendance', 
  'Billing', 'Payments', 'Membership Plans', 'Trainers', 'Staff', 
  'Payroll', 'Reports', 'Assets', 'Sales Purchases', 'Financials', 
  'Gymos', 'Bios', 'Settings', 'Administration'
];
