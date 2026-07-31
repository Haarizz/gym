import type { Member } from '../../domain/Member';

export interface RenewalRequest {
  planId?: number;
  durationMonths?: number;
  startDate?: string;
  paymentMethod?: string;
}

export interface MinorRenewalRequest {
  planId?: number;
  durationMonths?: number;
  startDate?: string;
  paymentMethod?: string;
}

export interface FamilyRenewalRequest {
  planId?: number;
  durationMonths?: number;
  startDate?: string;
  paymentMethod?: string;
}

export interface MemberMembershipRepository {
  renewMember(id: number, request: RenewalRequest): Promise<Member>;

  renewMinor(id: number, request: MinorRenewalRequest): Promise<Member>;

  renewFamily(headId: number, request: FamilyRenewalRequest): Promise<Member>;
}