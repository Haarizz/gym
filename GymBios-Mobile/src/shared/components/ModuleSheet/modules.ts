// shared/components/ModuleSheet/modules.ts

import type { ModuleSection } from './types';

export const moduleSections: ModuleSection[] = [
  {
    id: 'management',
    title: 'Management',
    items: [
      {
        id: 'members',
        title: 'Members',
        subtitle: 'View members',
        icon: 'user',
        route: '/members',
      },
      {
        id: 'membership-plans',
        title: 'Membership Plans',
        subtitle: 'Manage plans',
        icon: 'credit-card',
        route: '/membership-plans',
      },
    ],
  },
  {
    id: 'finance',
    title: 'Finance',
    items: [
      {
        id: 'billing',
        title: 'Billing',
        subtitle: 'Receipts & Payments',
        icon: 'credit-card',
        route: '/billing',
      },
    ],
  },
  {
    id: 'operations',
    title: 'Operations',
    items: [
      {
        id: 'attendance',
        title: 'Attendance',
        subtitle: 'Track member & staff attendance',
        icon: 'clipboard',
        route: '/attendance',
      },
      {
        id: 'check-in',
        title: 'Check-in',
        subtitle: 'Track member & staff Check-in',
        icon: 'clipboard',
        route: '/check-in',
      },
      {
        id: 'training-streams',
        title: 'Training Streams',
        subtitle: 'Manage live and on-demand fitness content',
        icon: 'video',
        route: '/training-streams',
      },
      {
        id: 'facilities',
        title: 'Facilities',
        subtitle: 'Manage your gym physical facilities',
        icon: 'box',
        route: '/facilities',
      },
    ],
  },
];
