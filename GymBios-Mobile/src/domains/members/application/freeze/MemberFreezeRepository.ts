import type { Member } from '../../domain/Member';

/**
 * Mirrors backend FreezeRequestDTO, which is explicitly camelCase (freezeUntil, not
 * freeze_until). Dates are YYYY-MM-DD; freezeStartDate defaults to today server-side.
 */
export interface FreezeRequest {
  freezeStartDate?: string;
  freezeUntil: string;
  reason?: string;
}

export interface MemberFreezeRepository {
  freezeMember(id: number, request: FreezeRequest): Promise<Member>;

  unfreezeMember(id: number): Promise<Member>;
}