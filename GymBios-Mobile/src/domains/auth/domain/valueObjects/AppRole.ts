import type { Result } from '@/core/types';

export const APP_ROLES = ['admin', 'member', 'trainer', 'staff'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export class AppRoleValue {
  readonly value: AppRole;

  private constructor(value: AppRole) {
    this.value = value;
  }

  static create(raw: string): Result<AppRoleValue, string> {
    if (!APP_ROLES.includes(raw as AppRole)) {
      return { success: false, error: 'Invalid application role' };
    }

    return { success: true, value: new AppRoleValue(raw as AppRole) };
  }
}

export function isAppRole(value: string): value is AppRole {
  return APP_ROLES.includes(value as AppRole);
}

export const ROLE_HOME_ROUTES: Record<AppRole, string> = {
  admin: '/(admin)',
  member: '/(member)',
  trainer: '/(trainer)',
  staff: '/(staff)',
};

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'GymBios Admin',
  member: 'GymBios Member',
  trainer: 'GymBios Trainer',
  staff: 'GymBios Staff',
};
