import { i18n } from '@/core/i18n';
import type { Result } from '@/core/types';
import type { SocialAuthOutcome } from '../../domain/entities/SocialAuthOutcome';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';

export class AuthenticateWithGoogle {
  constructor(private readonly authRepository: AuthRepository) {}

  execute(idToken: string): Promise<Result<SocialAuthOutcome, string>> {
    if (!idToken) {
      return Promise.resolve({ success: false, error: i18n.t('auth.errors.googleCredential') });
    }
    return this.authRepository.authenticateWithGoogle(idToken);
  }
}
