import type { PushTokenRegistration } from '../domain/types';

export interface DevicePushTokenProvider {
  /**
   * This device's push token, or null if push isn't available (simulator, web,
   * permission denied). Only prompts for permission when askPermission is true.
   */
  getToken(options: { askPermission: boolean }): Promise<PushTokenRegistration | null>;
}
