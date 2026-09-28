import type { Result } from '@/core/types';
import type { SocialAuthOutcome } from '../../domain/entities/SocialAuthOutcome';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';

export interface AuthenticateWithAppleDto {
  identityToken: string;
  /** Apple's client-submitted, unverified name — advisory pre-fill only, never an identity input. */
  fullNameHint: string | null;
}

export class AuthenticateWithApple {
  constructor(private readonly authRepository: AuthRepository) {}

  execute(input: AuthenticateWithAppleDto): Promise<Result<SocialAuthOutcome, string>> {
    if (!input.identityToken) {
      return Promise.resolve({ success: false, error: 'Apple did not return a valid credential.' });
    }
    return this.authRepository.authenticateWithApple(input.identityToken, input.fullNameHint);
  }
}
