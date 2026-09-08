export const StorageKeys = {
  accessToken: 'gymbios.access_token',
  refreshToken: 'gymbios.refresh_token',
  currentUser: 'gymbios.current_user',
  pendingRole: 'gymbios.pending_role',
  activeTenant: 'gymbios.active_tenant',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
