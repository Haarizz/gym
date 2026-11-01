import { apiClient } from '@/core/network/apiClient';

import type { PushTokenRepository } from '../application/PushTokenRepository';
import type { PushTokenRegistration } from '../domain/types';

const PATH = '/mobile/member/push-tokens';

// Wire format is snake_case (spring.jackson.property-naming-strategy=SNAKE_CASE on the backend).
function toDTO(r: PushTokenRegistration) {
  return { expo_push_token: r.expoPushToken, platform: r.platform };
}

// Overrides the active gym's X-Tenant-ID for this one request.
function tenantHeaders(tenantSlug: string | null) {
  return tenantSlug ? { 'X-Tenant-ID': tenantSlug } : undefined;
}

export const apiPushTokenRepository: PushTokenRepository = {
  async register(registration, tenantSlug) {
    await apiClient.put(PATH, toDTO(registration), {
      headers: tenantHeaders(tenantSlug),
      skipGlobalErrorToast: true,
    });
  },
  async unregister(registration, tenantSlug) {
    await apiClient.delete(PATH, {
      data: toDTO(registration),
      headers: tenantHeaders(tenantSlug),
      skipGlobalErrorToast: true,
    });
  },
};
