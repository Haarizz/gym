// shared/components/ModuleSheet/modules.ts

import type { ModuleItem } from './types';

export const topLevelModules: ModuleItem[] = [
  {
    id: 'community',
    title: 'Community',
    icon: 'heart',
    children: [
      {
        id: 'members',
        title: 'Members',
        icon: 'users',
        route: '/members',
      },
      {
        id: 'billing',
        title: 'Billing',
        icon: 'file-text',
        route: '/billing',
      },
      {
        id: 'membership-plans',
        title: 'Membership Plans',
        icon: 'credit-card',
        route: '/membership-plans',
      },
      {
        id: 'attendance',
        title: 'Attendance',
        icon: 'user-check',
        route: '/attendance',
      },
      {
        id: 'check-in',
        title: 'Check In',
        icon: 'log-in',
        route: '/check-in',
      },
      {
        id: 'training-streams',
        title: 'Training Streams',
        icon: 'video',
        route: '/training-streams',
      },
      {
        id: 'community-hub',
        title: 'Community Hub',
        icon: 'users',
        route: '/community',
      },
    ],
  },
  {
    id: 'member-connect',
    title: 'Member Connect',
    icon: 'user-plus',
    route: '/member-connect',
  },
  {
    id: 'sales-purchases',
    title: 'Sales & Purchases',
    icon: 'shopping-cart',
    route: '/sales-purchases',
  },
  {
    id: 'financials',
    title: 'Financials',
    icon: 'briefcase',
    route: '/financials',
  },
  {
    id: 'payroll-employees',
    title: 'Payroll & Employees',
    icon: 'users',
    route: '/payroll-employees',
  },
  {
    id: 'gymos',
    title: 'GymOS',
    icon: 'settings',
    children: [
      {
        id: 'facilities',
        title: 'Facilities',
        icon: 'box',
        route: '/facilities',
      },
    ],
  },
  {
    id: 'bios',
    title: 'BIOS',
    icon: 'cpu',
    route: '/bios',
  },
];
