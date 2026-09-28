import type { Session } from './Session';

export type SocialProvider = 'GOOGLE' | 'APPLE';

/**
 * The three shapes a Google/Apple sign-in attempt can resolve to. Discriminated
 * on `kind` so callers (useSocialAuthFlow) branch exhaustively rather than
 * guessing which optional fields are populated.
 */
export type SocialAuthOutcome =
  | { kind: 'authenticated'; session: Session }
  | { kind: 'linkRequired'; maskedEmail: string; provider: SocialProvider }
  | {
      kind: 'needsUsername';
      pendingToken: string;
      suggestedUsername: string | null;
      prefillFullName: string | null;
      maskedEmail: string;
      expiresAt: string;
      provider: SocialProvider;
    };
