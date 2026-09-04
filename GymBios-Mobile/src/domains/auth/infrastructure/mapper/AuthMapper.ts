import { Session } from '../../domain/entities/Session';
import { User } from '../../domain/entities/User';
import type { AppRole, AppRoleValue } from '../../domain/valueObjects/AppRole';
import { isAppRole } from '../../domain/valueObjects/AppRole';
import type { Password } from '../../domain/valueObjects/Password';
import type { Username } from '../../domain/valueObjects/Username';
import type { LoginRequestApiModel, LoginResponseApiModel, StoredSessionApiModel } from '../api/AuthApiModels';

const SPRING_ROLE_MAP: Record<string, AppRole> = {
  ROLE_ADMIN: 'admin',
  ADMIN: 'admin',
  MANAGER: 'admin',
  ROLE_MEMBER: 'member',
  MEMBER: 'member',
  USER: 'member',
  ROLE_STAFF: 'staff',
  STAFF: 'staff',
  ACCOUNTANT: 'staff',
  HR: 'staff',
  RECEPTIONIST: 'staff',
  ROLE_TRAINER: 'trainer',
  TRAINER: 'trainer',
};

const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  admin: ['dashboard:read', 'staff:read', 'deals:read', 'analytics:read'],
  member: ['home:read', 'bookings:read', 'centers:read', 'membership:read', 'profile:read'],
  trainer: ['home:read', 'schedule:read', 'performance:read', 'ledger:read', 'profile:read'],
  staff: ['home:read', 'performance:read', 'schedule:read', 'ledger:read', 'profile:read'],
};

const ROLE_DISPLAY_NAMES: Record<AppRole, string> = {
  admin: 'GymBios Admin',
  member: 'GymBios Member',
  trainer: 'GymBios Trainer',
  staff: 'GymBios Staff',
};

export function mapSpringRoleToAppRole(roles: string[] | undefined, fallbackRole?: AppRole): AppRole {
  if (roles && Array.isArray(roles)) {
    // If a fallbackRole is provided and the user possesses a backend role that maps to it, prioritize it
    if (fallbackRole) {
      const hasFallback = roles.some((roleStr) => SPRING_ROLE_MAP[roleStr.toUpperCase()] === fallbackRole);
      if (hasFallback) {
        return fallbackRole;
      }
    }

    // Otherwise, return the first mapped role we find
    for (const roleStr of roles) {
      const mapped = SPRING_ROLE_MAP[roleStr.toUpperCase()];
      if (mapped) {
        return mapped;
      }
    }
  }

  // Custom role: fallback to the role they are trying to log into, but we will validate it heavily based on permissions later
  if (fallbackRole && isAppRole(fallbackRole)) {
    return fallbackRole;
  }

  return 'member';
}

export function mapLoginResponseToSession(
  response: LoginResponseApiModel,
  selectedRole?: AppRole,
): Session {
  const appRole = mapSpringRoleToAppRole(response.roles, selectedRole);

  const isCustomRole = !response.roles?.some(r => SPRING_ROLE_MAP[r.toUpperCase()]);

  // For mapped roles, ensure they don't cross boundaries
  if (!isCustomRole && selectedRole && appRole !== selectedRole) {
    throw new Error(`Access denied. Your role cannot access the ${selectedRole} section.`);
  }

  // For custom roles, enforce strict permission boundaries based on the section they want to access
  if (isCustomRole && selectedRole) {
    const perms = response.permissions || [];
    
    if (selectedRole === 'admin' && !perms.includes('ADMINISTRATION_VIEW') && !perms.includes('SETTINGS_VIEW')) {
      throw new Error(`Access denied. Your custom role does not have admin privileges.`);
    }
    if ((selectedRole === 'staff' || selectedRole === 'trainer') && !response.staff_name) {
      throw new Error(`Access denied. You are not registered as a staff member.`);
    }
  }

  const permissions = ROLE_PERMISSIONS[appRole];
  // 24-hour client session expiration window
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return Session.create({
    accessToken: response.token,
    refreshToken: response.token,
    expiresAt,
    appRole,
    permissions,
    profileCompleted: response.profileCompleted ?? response.profile_completed ?? true,
    user: User.create({
      id: String(response.userId ?? response.user_id),
      username: response.username,
      email: `${response.username}@gymbios.local`,
      fullName: ROLE_DISPLAY_NAMES[appRole] ?? response.username,
      appRole,
      permissions,
      branchId: response.branchId ?? response.branch_id,
      profileCompleted: response.profileCompleted ?? response.profile_completed ?? true,
    }),
  });
}

export function mapCredentialsToLoginRequest(
  username: Username,
  password: Password,
): LoginRequestApiModel {
  return {
    username: username.value,
    password: password.value,
  };
}

export function mapSessionToStored(session: Session): StoredSessionApiModel {
  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt.toISOString(),
    appRole: session.appRole,
    permissions: [...session.permissions],
    user: {
      id: session.user.id,
      username: session.user.username,
      email: session.user.email,
      full_name: session.user.fullName,
      role: session.user.appRole,
      permissions: [...session.user.permissions],
      branchId: session.user.branchId,
      profileCompleted: session.user.profileCompleted,
    },
    branchId: session.user.branchId,
    profileCompleted: session.profileCompleted,
  };
}

export function mapStoredToSession(stored: StoredSessionApiModel): Session {
  const appRole = isAppRole(stored.appRole) ? stored.appRole : stored.user.role;

  return Session.create({
    accessToken: stored.accessToken,
    refreshToken: stored.refreshToken,
    expiresAt: new Date(stored.expiresAt),
    appRole,
    permissions: stored.permissions ?? stored.user.permissions ?? [],
    profileCompleted: stored.profileCompleted ?? stored.user.profileCompleted ?? true,
    user: User.create({
      id: stored.user.id,
      username: stored.user.username ?? stored.user.email,
      email: stored.user.email,
      fullName: stored.user.full_name,
      appRole,
      permissions: stored.user.permissions ?? stored.permissions ?? [],
      branchId: stored.branchId ?? stored.user.branchId,
      profileCompleted: stored.user.profileCompleted ?? stored.profileCompleted ?? true,
    }),
  });
}
