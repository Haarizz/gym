import { apiClient } from '@/core/network/apiClient';

export interface WalletTransaction {
  id: number;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  balanceAfter: number;
  /** e.g. BOOKING_REFUND, BOOKING, REFERRAL_REWARD, BILLING_USE */
  sourceType: string | null;
  sourceId: number | null;
  remarks: string | null;
  createdAt: string | null;
}

export interface MemberWallet {
  balance: number;
  transactions: WalletTransaction[];
}

// Wire format is snake_case (spring.jackson.property-naming-strategy=SNAKE_CASE on the backend).
export const walletApi = {
  /** The signed-in member's wallet — refunds, reward credits and spends. */
  getMyWallet: async (): Promise<MemberWallet> => {
    const response = await apiClient.get<any>('/mobile/member/wallet');
    const d = response.data ?? {};
    return {
      balance: Number(d.balance ?? 0),
      transactions: (d.transactions ?? []).map((t: any) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount ?? 0),
        balanceAfter: Number(t.balance_after ?? 0),
        sourceType: t.source_type ?? null,
        sourceId: t.source_id ?? null,
        remarks: t.remarks ?? null,
        createdAt: t.created_at ?? null,
      })),
    };
  },
};
