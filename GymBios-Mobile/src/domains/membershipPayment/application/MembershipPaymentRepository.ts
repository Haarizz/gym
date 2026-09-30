import type { OutstandingBalance, SettleOutstandingBalanceRequest, SettlementResult } from '../domain/types';

export interface MembershipPaymentRepository {
  /** The member's own balance, or a specific membership's (404 unless it's theirs). */
  getOutstandingBalance(membershipId?: number): Promise<OutstandingBalance>;
  settle(
    membershipId: number,
    idempotencyKey: string,
    payloadFingerprint: string,
    request: SettleOutstandingBalanceRequest,
  ): Promise<SettlementResult>;
}
