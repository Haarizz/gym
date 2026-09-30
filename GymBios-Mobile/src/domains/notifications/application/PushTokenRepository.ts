import type { PushTokenRegistration } from '../domain/types';

export interface PushTokenRepository {
  register(registration: PushTokenRegistration): Promise<void>;
  unregister(registration: PushTokenRegistration): Promise<void>;
}
