import type { Result } from '@/core/types';
import type { SocialProvider } from '../../domain/entities/SocialAuthOutcome';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';

export interface LinkProviderDto {
  provider: SocialProvider;
  providerToken: string;
}

/**
 * Links a Google/Apple identity to the currently-authenticated account. The
 * backend requires the caller's Bearer token to have been issued recently
 * (see MobileSocialAuthService.assertFreshBearer) — this is what actually
 * proves "re-authenticated via the existing method", not just holding a
 * valid session. Callers must have just completed a fresh sign-in (password
 * or the account's original provider) before invoking this.
 */
export class LinkProvider {
  constructor(private readonly authRepository: AuthRepository) {}

  execute(input: LinkProviderDto): Promise<Result<void, string>> {
    if (!input.providerToken) {
      return Promise.resolve({ success: false, error: 'Missing provider credential.' });
    }
    return this.authRepository.linkProvider(input.provider, input.providerToken);
  }
}
