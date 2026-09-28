import type { SocialProvider } from './SocialAuthOutcome';

/**
 * The locally-persisted handle for a NEEDS_USERNAME social registration —
 * mirrors PendingRegistration's role for the OTP flow: no account/JWT exists
 * yet, so this carries only what's needed to resume the username-collection
 * screen after an app restart (see GetPendingSocialRegistration), never
 * anything session-shaped. Persisted the moment the NEEDS_USERNAME response
 * arrives, and cleared once CompleteSocialRegistration succeeds.
 */
export interface PendingSocialRegistration {
  provider: SocialProvider;
  pendingToken: string;
  suggestedUsername: string | null;
  prefillFullName: string | null;
  maskedEmail: string;
  expiresAt: string;
}
