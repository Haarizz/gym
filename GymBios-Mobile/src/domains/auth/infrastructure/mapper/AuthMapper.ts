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
  ROLE_MEMBER: 'member',
  MEMBER: 'member',
  ROLE_STAFF: 'staff',
  STAFF: 'staff',
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
    for (const roleStr of roles) {
      const mapped = SPRING_ROLE_MAP[roleStr.toUpperCase()];
      if (mapped) {
        return mapped;
      }
    }
  }

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
  const permissions = ROLE_PERMISSIONS[appRole];
  // 24-hour client session expiration window
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return Session.create({
    accessToken: response.token,
    refreshToken: response.token,
    expiresAt,
    appRole,
    permissions,
    user: User.create({
      id: String(response.userId),
      username: response.username,
      email: `${response.username}@gymbios.local`,
      fullName: ROLE_DISPLAY_NAMES[appRole] ?? response.username,
      appRole,
      permissions,
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
    },
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
    user: User.create({
      id: stored.user.id,
      username: stored.user.username ?? stored.user.email,
      email: stored.user.email,
      fullName: stored.user.full_name,
      appRole,
      permissions: stored.user.permissions ?? stored.permissions ?? [],
    }),
  });
}
