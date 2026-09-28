import type { Result } from '@/core/types';
import type { SocialAuthOutcome } from '../../domain/entities/SocialAuthOutcome';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';

export class AuthenticateWithGoogle {
  constructor(private readonly authRepository: AuthRepository) {}

  execute(idToken: string): Promise<Result<SocialAuthOutcome, string>> {
    if (!idToken) {
      return Promise.resolve({ success: false, error: 'Google did not return a valid credential.' });
    }
    return this.authRepository.authenticateWithGoogle(idToken);
  }
}
