import { i18n } from '@/core/i18n';
import type { Result } from '@/core/types';
import type { Session } from '../../domain/entities/Session';
import type { SocialProvider } from '../../domain/entities/SocialAuthOutcome';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';

export interface CompleteSocialRegistrationDto {
  provider: SocialProvider;
  pendingToken: string;
  username: string;
  fullName: string | null;
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export class CompleteSocialRegistration {
  constructor(private readonly authRepository: AuthRepository) {}

  execute(input: CompleteSocialRegistrationDto): Promise<Result<Session, string>> {
    if (!input.pendingToken) {
      return Promise.resolve({ success: false, error: i18n.t('auth.errors.signInSessionNotFound') });
    }
    const username = input.username.trim();
    if (!username || !USERNAME_PATTERN.test(username)) {
      return Promise.resolve({
        success: false,
        error: i18n.t('auth.errors.usernameCharsLong'),
      });
    }
    return this.authRepository.completeSocialRegistration(input.provider, input.pendingToken, username, input.fullName);
  }
}
