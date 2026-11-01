import type { DevicePushTokenProvider } from './DevicePushTokenProvider';
import type { PushTokenRepository } from './PushTokenRepository';

// Sign-out must not hang on a slow network just to unregister the device.
const UNREGISTER_TIMEOUT_MS = 3000;

export class PushNotificationsService {
  constructor(
    private readonly repository: PushTokenRepository,
    private readonly device: DevicePushTokenProvider,
  ) {}

  /**
   * Registers this device for the signed-in member at each of these gyms, so a gym's
   * notifications arrive whichever gym the app is showing. No-op if push is
   * unavailable. One gym failing doesn't stop the others.
   */
  async registerCurrentDevice(tenantSlugs: string[]): Promise<void> {
    if (tenantSlugs.length === 0) return;
    const registration = await this.device.getToken({ askPermission: true });
    if (!registration) return;
    await Promise.allSettled(tenantSlugs.map((tenant) => this.repository.register(registration, tenant)));
  }

  /**
   * Best-effort: stops pushes to this device for the member signing out, at every gym
   * it was registered with (the active gym when none are named). Never throws.
   */
  async unregisterCurrentDevice(tenantSlugs: string[] = []): Promise<void> {
    try {
      const registration = await this.device.getToken({ askPermission: false });
      if (!registration) return;
      const tenants: (string | null)[] = tenantSlugs.length > 0 ? tenantSlugs : [null];
      await Promise.race([
        Promise.allSettled(tenants.map((tenant) => this.repository.unregister(registration, tenant))),
        new Promise((resolve) => setTimeout(resolve, UNREGISTER_TIMEOUT_MS)),
      ]);
    } catch {
      // Ignore — the backend also drops tokens Expo reports as unregistered.
    }
  }
}
