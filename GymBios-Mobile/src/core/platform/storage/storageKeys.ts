export const StorageKeys = {
  accessToken: 'gymbios.access_token',
  refreshToken: 'gymbios.refresh_token',
  currentUser: 'gymbios.current_user',
  pendingRole: 'gymbios.pending_role',
  /**
   * The opaque email-verification handle for a registration that hasn't been
   * OTP-verified yet. Deliberately a separate key from accessToken/refreshToken
   * — it is never a session credential and must never be sent as a Bearer
   * token; it's only ever read by AuthRepositoryImpl's verify/resend/status
   * calls, which send it as the X-Registration-Token header.
   */
  pendingRegistration: 'gymbios.pending_registration',
  /**
   * @deprecated Was a single device-wide key, so a stale tenant left behind by
   * a previously logged-in account on this device would get inherited by
   * whichever account logs in next. Superseded by {@link activeTenantKey},
   * scoped per user id. Kept only as a legacy key to clean up on restore.
   */
  activeTenant: 'gymbios.active_tenant',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

/** Per-user active-tenant key — see the deprecation note on `StorageKeys.activeTenant`. */
export function activeTenantKey(userId: string): string {
  return `gymbios.active_tenant.${userId}`;
}
