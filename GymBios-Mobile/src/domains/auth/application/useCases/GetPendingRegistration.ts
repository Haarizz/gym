import type { Result } from '@/core/types';
import type { PendingRegistration } from '../../domain/entities/PendingRegistration';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';

/**
 * Reads the persisted pending-registration handle from storage. This is the
 * recovery path for the Email Verification screen when route params are
 * missing or lost — e.g. the screen reloaded (Fast Refresh in dev, or the app
 * being relaunched) — since navigation params are ephemeral and don't survive
 * that, while AuthRepositoryImpl already persists this handle to SecureStore
 * the moment registration succeeds.
 */
export class GetPendingRegistration {
  constructor(private readonly authRepository: AuthRepository) {}

  execute(): Promise<Result<PendingRegistration | null, string>> {
    return this.authRepository.getStoredPendingRegistration();
  }
}
