import type { Member } from '../../domain/Member';

/**
 * Mirrors backend FreezeRequestDTO, which is explicitly camelCase (freezeUntil, not
 * freeze_until). Dates are YYYY-MM-DD; freezeStartDate defaults to today server-side;
 * freezeUntil is the last day frozen.
 */
export interface FreezeRequest {
  freezeStartDate?: string;
  freezeUntil: string;
  reason?: string;
  /** A manager going past the plan's freeze limits. */
  overrideLimits?: boolean;
  /** Don't bill the days beyond the plan's free freeze days. */
  waiveCharge?: boolean;
}

/** GET /members/{id}/freeze-allowance — camelCase Map keys on the backend. */
export interface FreezeAllowance {
  maxDays: number;
  usedDays: number;
  remainingDays: number;
  maxOccurrences: number | null;
  usedOccurrences: number;
  remainingOccurrences: number | null;
  freeDays: number;
  freeDaysRemaining: number;
  chargePerExtraDay: number;
  autoUnfreeze: boolean;
  canFreeze: boolean;
  unavailableMessage: string | null;
  /** Whether the signed-in staff member may go past the plan's limits (ADMIN/MANAGER). */
  canOverrideLimits: boolean;
}

export interface MemberFreezeRepository {
  freezeMember(id: number, request: FreezeRequest): Promise<Member>;

  getFreezeAllowance(id: number): Promise<FreezeAllowance>;

  unfreezeMember(id: number): Promise<Member>;
}