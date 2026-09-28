import { apiClient } from '@/core/network/apiClient';
import type { PaymentSplit } from '@/shared/payment/types';

export interface FamilyMemberInput {
  name: string;
  email?: string;
  phone?: string;
  /** YYYY-MM-DD */
  dateOfBirth?: string;
  relationship: string;
  isMinor: boolean;
  /** Adults on individually-billed plans only: their own plan instead of the buyer's. */
  membershipPlanId?: number;
}

export interface FamilyPurchaseRequest {
  planId: number;
  paymentMethodUsed?: string;
  paymentBreakdown?: PaymentSplit[];
  paidAmount?: number;
  paymentDueDate?: string;
  bankAccountCode?: string;
  bankAccountName?: string;
  connectedMembers: FamilyMemberInput[];
}

/** Server-authoritative price for the family as currently configured. */
export interface FamilyQuote {
  planId: number;
  planName: string;
  billingMode: 'individual' | 'family_head';
  /** The buyer's own fee — under family_head billing, the whole family's invoice. */
  headFee: number;
  /** Per family member, in form order (informational under family_head billing). */
  memberFees: number[];
  /** Per family member, the plan they'll be on. */
  memberPlanNames: string[];
  membersTotal: number;
  total: number;
}

export interface FamilyPurchaseResponse {
  status: 'SUCCESS';
  memberId: string;
  tenantSlug: string;
  approvalPending: boolean;
  totalAmount: number;
  paidAmount: number;
  invitedEmails: string[];
}

export type FamilyClaimStatus =
  | 'CLAIMED'
  | 'SKIPPED_EXISTING_MEMBERSHIP'
  | 'REVOKED'
  | 'EXPIRED'
  | 'INVALID'
  | 'ERROR';

export interface FamilyClaimResult {
  tenantSlug: string;
  gymName: string | null;
  inviterName: string | null;
  planName: string | null;
  status: FamilyClaimStatus;
}

// The gym is addressed by the path on quote/purchase (the buyer usually isn't a
// member there yet), so these ignore whatever X-Tenant-ID is active.
export const familyApi = {
  getQuote: async (
    tenantSlug: string,
    branchId: number,
    planId: number,
    memberIsMinor: boolean[],
    memberPlanIds: (number | null)[],
  ): Promise<FamilyQuote> => {
    const response = await apiClient.post<FamilyQuote>(
      `/mobile/family/quote/${encodeURIComponent(tenantSlug)}/${branchId}`,
      { planId, memberIsMinor, memberPlanIds },
      { skipGlobalErrorToast: true },
    );
    return response.data;
  },

  purchaseFamilyPlan: async (
    tenantSlug: string,
    branchId: number,
    idempotencyKey: string,
    fingerprint: string,
    request: FamilyPurchaseRequest,
  ): Promise<FamilyPurchaseResponse> => {
    const response = await apiClient.post<FamilyPurchaseResponse>(
      `/mobile/family/purchase/${encodeURIComponent(tenantSlug)}/${branchId}`,
      request,
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
          'Payload-Fingerprint': fingerprint,
        },
      },
    );
    return response.data;
  },

  /** Claims every pending family invitation sent to the logged-in account's email. */
  claimPendingInvitations: async (): Promise<FamilyClaimResult[]> => {
    const response = await apiClient.post<FamilyClaimResult[]>(
      '/mobile/family/invitations/claim-pending',
      null,
      { skipGlobalErrorToast: true },
    );
    return response.data;
  },
};
