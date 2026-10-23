import type { Member } from '../../domain/Member';

/**
 * A member's app account (backend GET /members/{id}/app-account). NONE — no account;
 * GYM_LOGIN — an old gym-only login that no longer signs in (creating or linking a
 * GymBios account retires it); LINKED — the member's own GymBios account, which the gym
 * can't change; AWAITING_CONFIRMATION — a link request waits for the owner.
 */
export interface MemberAppAccount {
  status: 'NONE' | 'GYM_LOGIN' | 'LINKED' | 'AWAITING_CONFIRMATION';
  username?: string;
  email?: string;
  emailVerified?: boolean;
  linkRequestedAccount?: string;
  linkRequestExpiresAt?: string;
}

export interface MemberAccessRepository {
  getAppAccount(id: number): Promise<MemberAppAccount>;

  /** Creates the member's own GymBios account (email from the member record) and links it. */
  createAppAccount(id: number, username: string, password: string): Promise<Member>;

  /** Asks the owner of an existing GymBios account to link it; they accept in their app. */
  requestAccountLink(id: number, identifier: string): Promise<MemberAppAccount>;

  cancelAccountLink(id: number): Promise<MemberAppAccount>;

  /** Suspends or resumes this gym's membership; the member's app account is never touched. */
  setMembershipSuspended(id: number, suspended: boolean, reason?: string): Promise<Member>;
}