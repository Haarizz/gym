import type { DevicePushTokenProvider } from './DevicePushTokenProvider';
import type { PushTokenRepository } from './PushTokenRepository';

// Sign-out must not hang on a slow network just to unregister the device.
const UNREGISTER_TIMEOUT_MS = 3000;

export class PushNotificationsService {
  constructor(
    private readonly repository: PushTokenRepository,
    private readonly device: DevicePushTokenProvider,
  ) {}

  /** Registers this device for the signed-in member in the active gym. No-op if push is unavailable. */
  async registerCurrentDevice(): Promise<void> {
    const registration = await this.device.getToken({ askPermission: true });
    if (registration) {
      await this.repository.register(registration);
    }
  }

  /** Best-effort: stops pushes to this device for the member signing out. Never throws. */
  async unregisterCurrentDevice(): Promise<void> {
    try {
      const registration = await this.device.getToken({ askPermission: false });
      if (!registration) return;
      await Promise.race([
        this.repository.unregister(registration),
        new Promise((resolve) => setTimeout(resolve, UNREGISTER_TIMEOUT_MS)),
      ]);
    } catch {
      // Ignore — the backend also drops tokens Expo reports as unregistered.
    }
  }
}
