import type { PushTokenRegistration } from '../domain/types';

/**
 * Device tokens are kept per gym (each gym's own database), so every call names the
 * gym it is for; null means the gym the app is working in now.
 */
export interface PushTokenRepository {
  register(registration: PushTokenRegistration, tenantSlug: string | null): Promise<void>;
  unregister(registration: PushTokenRegistration, tenantSlug: string | null): Promise<void>;
}
