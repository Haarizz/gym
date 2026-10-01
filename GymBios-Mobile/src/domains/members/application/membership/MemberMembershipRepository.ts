import type { PaymentSplit } from '@/shared/payment';
import type { Member } from '../../domain/Member';

/** What was collected at the counter — shared by every renewal endpoint. */
interface RenewalPayment {
  /** paid / partial / pending */
  paymentStatus: string;
  /** Real method the received portion moved through; "Credit" when nothing was received. */
  paymentMethod?: string;
  /** Only for Mixed — one leg per real method. */
  paymentBreakdown?: PaymentSplit[];
  bankAccountCode?: string;
  bankAccountName?: string;
  processedByStaffId?: number;
}

/** Mirrors backend RenewalRequestDTO. The server derives the new expiry from the plan. */
export interface RenewalRequest extends RenewalPayment {
  planName: string;
  membershipFee: number;
  membershipType?: string;
  membershipStatus?: string;
  amountReceived: number;
}

/** Mirrors backend MinorRenewalRequestDTO — billed to the guardian. */
export interface MinorRenewalRequest extends RenewalPayment {
  planName: string;
  fee: number;
  paidAmount: number;
}

/** Mirrors backend FamilyRenewalRequestDTO. */
export interface FamilyRenewalRequest extends RenewalPayment {
  planName: string;
}

export interface MemberMembershipRepository {
  renewMember(id: number, request: RenewalRequest): Promise<Member>;

  renewMinor(id: number, request: MinorRenewalRequest): Promise<Member>;

  renewFamily(headId: number, request: FamilyRenewalRequest): Promise<Member>;
}
