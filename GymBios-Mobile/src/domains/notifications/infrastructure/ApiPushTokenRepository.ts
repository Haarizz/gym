import { apiClient } from '@/core/network/apiClient';

import type { PushTokenRepository } from '../application/PushTokenRepository';
import type { PushTokenRegistration } from '../domain/types';


// Wire format is snake_case (spring.jackson.property-naming-strategy=SNAKE_CASE on the backend).
function toDTO(r: PushTokenRegistration) {
  return { expo_push_token: r.expoPushToken, platform: r.platform };
}

// Overrides the active gym's X-Tenant-ID for this one request.
function tenantHeaders(tenantSlug: string | null) {
  return tenantSlug ? { 'X-Tenant-ID': tenantSlug } : undefined;
}

/** Same body for both apps; only the path differs (members vs staff and trainers). */
function createApiPushTokenRepository(path: string): PushTokenRepository {
  return {
    async register(registration, tenantSlug) {
      await apiClient.put(path, toDTO(registration), {
        headers: tenantHeaders(tenantSlug),
        skipGlobalErrorToast: true,
      });
    },
    async unregister(registration, tenantSlug) {
      await apiClient.delete(path, {
        data: toDTO(registration),
        headers: tenantHeaders(tenantSlug),
        skipGlobalErrorToast: true,
      });
    },
  };
}

export const apiPushTokenRepository = createApiPushTokenRepository('/mobile/member/push-tokens');
/** Staff and trainer devices, for chat messages from members. */
export const apiStaffPushTokenRepository = createApiPushTokenRepository('/mobile/staff/push-tokens');
