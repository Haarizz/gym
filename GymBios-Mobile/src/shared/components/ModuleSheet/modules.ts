// shared/components/ModuleSheet/modules.ts

import type { ModuleSection } from './types';

export const moduleSections: ModuleSection[] = [
  {
    id: 'management',
    title: 'Management',
    items: [
      {
        id: 'staff',
        title: 'Staff',
        subtitle: 'Manage employees',
        icon: 'users',
        route: '/staff',
      },
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
];