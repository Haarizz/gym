export const PERMISSION_ACTIONS = ['View', 'Create', 'Edit', 'Delete', 'Export', 'Approve'];

/** On-screen names for modules whose permission key (saved by the backend) reads differently. */
const MODULE_LABELS: Record<string, string> = {
  'Membership Plans': 'Subscriptions',
};

export function moduleLabel(moduleName: string): string {
  return MODULE_LABELS[moduleName] ?? moduleName;
}

export const ROLE_MODULES = [
  'Dashboard', 'Members', 'Member Connect', 'Community', 'Attendance', 
  'Billing', 'Payments', 'Membership Plans', 'Trainers', 'Staff', 
  'Payroll', 'Reports', 'Assets', 'Sales Purchases', 'Financials', 
  'Gymos', 'Bios', 'Settings', 'Administration'
];
