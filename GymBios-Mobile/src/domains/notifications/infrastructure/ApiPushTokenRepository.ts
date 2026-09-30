import { apiClient } from '@/core/network/apiClient';

import type { PushTokenRepository } from '../application/PushTokenRepository';
import type { PushTokenRegistration } from '../domain/types';

const PATH = '/mobile/member/push-tokens';

// Wire format is snake_case (spring.jackson.property-naming-strategy=SNAKE_CASE on the backend).
function toDTO(r: PushTokenRegistration) {
  return { expo_push_token: r.expoPushToken, platform: r.platform };
}

export const apiPushTokenRepository: PushTokenRepository = {
  async register(registration) {
    await apiClient.put(PATH, toDTO(registration), { skipGlobalErrorToast: true });
  },
  async unregister(registration) {
    await apiClient.delete(PATH, { data: toDTO(registration), skipGlobalErrorToast: true });
  },
};
