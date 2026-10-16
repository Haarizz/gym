import type { AppRole } from '@/domains/auth/domain/valueObjects/AppRole';
import { BrandColors } from '@/core/theme';
import { i18n } from '@/core/i18n';

export interface RoleLoginConfig {
  role: AppRole;
  title: string;
  subtitle: string;
  accentColor: string;
  headerTitle: string;
  headerSubtitle: string;
}

export function getRoleLoginConfig(role: AppRole, t?: (key: any, options?: any) => any): RoleLoginConfig {
  const translate = t ?? ((k: string, opt?: any) => i18n.t(k, opt));
  switch (role) {
    case 'admin':
      return {
        role: 'admin',
        title: translate('auth.roles.admin.signInTitle'),
        subtitle: translate('auth.roles.admin.signInSubtitle'),
        accentColor: BrandColors.teal,
        headerTitle: translate('auth.roles.admin.title'),
        headerSubtitle: translate('auth.roles.admin.headerSubtitle'),
      };
    case 'member':
      return {
        role: 'member',
        title: translate('auth.roles.member.signInTitle'),
        subtitle: translate('auth.roles.member.signInSubtitle'),
        accentColor: BrandColors.memberGold,
        headerTitle: translate('auth.roles.member.title'),
        headerSubtitle: translate('auth.roles.member.headerSubtitle'),
      };
    case 'trainer':
      return {
        role: 'trainer',
        title: translate('auth.roles.trainer.signInTitle'),
        subtitle: translate('auth.roles.trainer.signInSubtitle'),
        accentColor: BrandColors.trainerAmber,
        headerTitle: translate('auth.roles.trainer.title'),
        headerSubtitle: translate('auth.roles.trainer.headerSubtitle'),
      };
    case 'staff':
      return {
        role: 'staff',
        title: translate('auth.roles.staff.signInTitle'),
        subtitle: translate('auth.roles.staff.signInSubtitle'),
        accentColor: BrandColors.teal,
        headerTitle: translate('auth.roles.staff.title'),
        headerSubtitle: translate('auth.roles.staff.headerSubtitle'),
      };
  }
}

export const ROLE_LOGIN_CONFIG: Record<AppRole, RoleLoginConfig> = {
  get admin() {
    return getRoleLoginConfig('admin');
  },
  get member() {
    return getRoleLoginConfig('member');
  },
  get trainer() {
    return getRoleLoginConfig('trainer');
  },
  get staff() {
    return getRoleLoginConfig('staff');
  },
};

export interface RoleModeCardConfig {
  role: AppRole;
  title: string;
  description: string;
  accentColor: string;
  iconName: 'trending-up' | 'activity' | 'users' | 'briefcase';
  borderColor: string;
}

export function getRoleModeCards(t?: (key: any, options?: any) => any): RoleModeCardConfig[] {
  const translate = t ?? ((k: string, opt?: any) => i18n.t(k, opt));
  return [
    {
      role: 'admin',
      title: translate('auth.roles.admin.title'),
      description: translate('auth.roles.admin.desc'),
      accentColor: BrandColors.teal,
      iconName: 'trending-up',
      borderColor: BrandColors.teal,
    },
    {
      role: 'trainer',
      title: translate('auth.roles.trainer.title'),
      description: translate('auth.roles.trainer.desc'),
      accentColor: BrandColors.trainerAmber,
      iconName: 'users',
      borderColor: BrandColors.trainerAmber,
    },
    {
      role: 'staff',
      title: translate('auth.roles.staff.title'),
      description: translate('auth.roles.staff.desc'),
      accentColor: BrandColors.tealDark,
      iconName: 'briefcase',
      borderColor: BrandColors.teal,
    },
  ];
}

export const ROLE_MODE_CARDS: RoleModeCardConfig[] = [
  {
    role: 'admin',
    title: 'GymBios Admin',
    description:
      'Command center for owners and managers. Track performance, manage staff, and analyze business metrics.',
    accentColor: BrandColors.teal,
    iconName: 'trending-up',
    borderColor: BrandColors.teal,
  },
  {
    role: 'trainer',
    title: 'GymBios Trainer',
    description:
      'Manage your schedule, track performance, connect with members, and view earnings.',
    accentColor: BrandColors.trainerAmber,
    iconName: 'users',
    borderColor: BrandColors.trainerAmber,
  },
  {
    role: 'staff',
    title: 'GymBios Staff',
    description:
      'Front desk operations. Manage leads, handle sales, track performance, and schedule tasks.',
    accentColor: BrandColors.tealDark,
    iconName: 'briefcase',
    borderColor: BrandColors.teal,
  },
];
