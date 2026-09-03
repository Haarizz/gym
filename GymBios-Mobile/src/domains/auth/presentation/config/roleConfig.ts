import type { AppRole } from '@/domains/auth/domain/valueObjects/AppRole';
import { BrandColors } from '@/core/theme';

export interface RoleLoginConfig {
  role: AppRole;
  title: string;
  subtitle: string;
  accentColor: string;
  headerTitle: string;
  headerSubtitle: string;
}

export const ROLE_LOGIN_CONFIG: Record<AppRole, RoleLoginConfig> = {
  admin: {
    role: 'admin',
    title: 'Admin Sign In',
    subtitle: 'Sign in to the GymBios command center.',
    accentColor: BrandColors.teal,
    headerTitle: 'GymBios Admin',
    headerSubtitle: 'Command Center',
  },
  member: {
    role: 'member',
    title: 'Member Sign In',
    subtitle: 'Access your fitness journey and membership.',
    accentColor: BrandColors.memberGold,
    headerTitle: 'GymBios Member',
    headerSubtitle: 'Your Fitness Journey',
  },
  trainer: {
    role: 'trainer',
    title: 'Trainer Sign In',
    subtitle: 'Manage your schedule, members, and earnings.',
    accentColor: BrandColors.trainerAmber,
    headerTitle: 'GymBios Trainer',
    headerSubtitle: 'Coach Portal',
  },
  staff: {
    role: 'staff',
    title: 'Staff Sign In',
    subtitle: 'Front desk operations and member support.',
    accentColor: BrandColors.teal,
    headerTitle: 'GymBios Staff',
    headerSubtitle: 'Front Desk',
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
