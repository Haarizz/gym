import type { PaymentSplit } from '@/shared/payment/types';

/** Why the backend won't take a self-service payment right now. */
export type PayBlockedReason = 'NO_MEMBERSHIP' | 'NO_BALANCE' | 'APPROVAL_PENDING' | 'NO_PAYABLE_BILLS';

export type BalancePaymentStatus = 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';

export interface OutstandingBill {
  receiptId: number;
  invoiceNo: string | null;
  transactionType: string | null;
  planName: string | null;
  transactionDate: string | null;
  dueDate: string | null;
  amount: number;
  paidToDate: number;
  outstandingAmount: number;
}

/**
 * Server-authoritative balance of the member's membership. The client never
 * derives these amounts itself — it only displays them.
 */
export interface OutstandingBalance {
  membershipId: number | null;
  planName: string | null;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  /** What a settlement pays right now. Normally equal to outstandingAmount. */
  payableAmount: number;
  currency: string | null;
  currencySymbol: string | null;
  paymentStatus: BalancePaymentStatus;
  canPay: boolean;
  payBlockedReason: PayBlockedReason | null;
  dueDate: string | null;
  /** PaymentBottomSheet method titles the backend accepts from the app. */
  allowedPaymentMethods: string[];
  bills: OutstandingBill[];
}

/** Body of POST .../outstanding-balance/{membershipId}/settle. Carries no amount to pay. */
export interface SettleOutstandingBalanceRequest {
  /** The payable amount the member was shown — the backend rejects it if the balance has since changed. */
  expectedAmount: number;
  paymentMethodUsed: string;
  paymentBreakdown: PaymentSplit[];
}

export interface SettlementResult {
  membershipId: number;
  receiptId: number | null;
  receiptNo: string | null;
  amountPaid: number;
  outstandingAmount: number;
  settledAt: string | null;
}
