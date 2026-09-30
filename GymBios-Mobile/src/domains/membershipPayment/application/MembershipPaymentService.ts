import * as Crypto from 'expo-crypto';

import type { MembershipPaymentRepository } from './MembershipPaymentRepository';
import type { OutstandingBalance, SettleOutstandingBalanceRequest, SettlementResult } from '../domain/types';

export class MembershipPaymentService {
  constructor(private readonly repository: MembershipPaymentRepository) {}

  getOutstandingBalance(membershipId?: number): Promise<OutstandingBalance> {
    return this.repository.getOutstandingBalance(membershipId);
  }

  /**
   * Settles the balance. Reusing the same idempotencyKey for a retry is safe: a
   * payment the backend already recorded is returned instead of taken again. The
   * backend rejects a reused key whose payload differs, hence the fingerprint.
   */
  async settle(
    membershipId: number,
    idempotencyKey: string,
    request: SettleOutstandingBalanceRequest,
  ): Promise<SettlementResult> {
    const fingerprint = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      JSON.stringify(request),
    );
    return this.repository.settle(membershipId, idempotencyKey, fingerprint, request);
  }
}
