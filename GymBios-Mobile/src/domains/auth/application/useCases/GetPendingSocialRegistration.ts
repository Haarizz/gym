import type { Result } from '@/core/types';
import type { PendingSocialRegistration } from '../../domain/entities/PendingSocialRegistration';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';

/**
 * Reads the persisted pending-social-registration handle from storage —
 * mirrors GetPendingRegistration's role for the OTP flow. The social
 * sign-in screens never re-call /google or /apple to "recover" a token on
 * app restart (each of those endpoints mints a fresh token every call, by
 * design — see MobileSocialAuthService); this locally-stored handle is the
 * only way the username-collection screen survives a reload.
 */
export class GetPendingSocialRegistration {
  constructor(private readonly authRepository: AuthRepository) {}

  execute(): Promise<Result<PendingSocialRegistration | null, string>> {
    return this.authRepository.getStoredPendingSocialRegistration();
  }
}
