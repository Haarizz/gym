import { apiClient } from '@/core/network/apiClient';
import type { PaymentSplit } from '@/shared/payment/types';

import type { MembershipPaymentRepository } from '../application/MembershipPaymentRepository';
import type {
  BalancePaymentStatus,
  OutstandingBalance,
  OutstandingBill,
  PayBlockedReason,
  SettleOutstandingBalanceRequest,
  SettlementResult,
} from '../domain/types';

// Wire format is snake_case (spring.jackson.property-naming-strategy=SNAKE_CASE on the backend).
interface OutstandingBillDTO {
  receipt_id: number;
  invoice_no: string | null;
  transaction_type: string | null;
  plan_name: string | null;
  transaction_date: string | null;
  due_date: string | null;
  amount: number | null;
  paid_to_date: number | null;
  outstanding_amount: number | null;
}

interface OutstandingBalanceDTO {
  membership_id: number | null;
  plan_name: string | null;
  total_amount: number | null;
  paid_amount: number | null;
  outstanding_amount: number | null;
  payable_amount: number | null;
  currency: string | null;
  currency_symbol: string | null;
  payment_status: BalancePaymentStatus;
  can_pay: boolean;
  pay_blocked_reason: PayBlockedReason | null;
  due_date: string | null;
  allowed_payment_methods: string[] | null;
  bills: OutstandingBillDTO[] | null;
}

interface SettlementResultDTO {
  membership_id: number;
  receipt_id: number | null;
  receipt_no: string | null;
  amount_paid: number | null;
  outstanding_amount: number | null;
  settled_at: string | null;
}

const BASE_PATH = '/mobile/member/membership/outstanding-balance';

function mapBill(b: OutstandingBillDTO): OutstandingBill {
  return {
    receiptId: b.receipt_id,
    invoiceNo: b.invoice_no,
    transactionType: b.transaction_type,
    planName: b.plan_name,
    transactionDate: b.transaction_date,
    dueDate: b.due_date,
    amount: b.amount ?? 0,
    paidToDate: b.paid_to_date ?? 0,
    outstandingAmount: b.outstanding_amount ?? 0,
  };
}

function mapBalance(d: OutstandingBalanceDTO): OutstandingBalance {
  return {
    membershipId: d.membership_id,
    planName: d.plan_name,
    totalAmount: d.total_amount ?? 0,
    paidAmount: d.paid_amount ?? 0,
    outstandingAmount: d.outstanding_amount ?? 0,
    payableAmount: d.payable_amount ?? 0,
    currency: d.currency,
    currencySymbol: d.currency_symbol,
    paymentStatus: d.payment_status,
    canPay: d.can_pay,
    payBlockedReason: d.pay_blocked_reason,
    dueDate: d.due_date,
    allowedPaymentMethods: d.allowed_payment_methods ?? [],
    bills: (d.bills ?? []).map(mapBill),
  };
}

/** PaymentSplitDTO has no @JsonProperty overrides, so its fields are snake_case too. */
function toSplitDTO(s: PaymentSplit) {
  return {
    method: s.method,
    amount: s.amount,
    reference: s.reference,
    card_type: s.cardType,
    cheque_number: s.chequeNumber,
    cheque_date: s.chequeDate,
    bank_name: s.bankName,
    bank_account_code: s.bankAccountCode,
    bank_account_name: s.bankAccountName,
    online_payment_type: s.onlinePaymentType,
    provider_name: s.providerName,
  };
}

export const apiMembershipPaymentRepository: MembershipPaymentRepository = {
  async getOutstandingBalance(membershipId?: number): Promise<OutstandingBalance> {
    const path = membershipId === undefined ? BASE_PATH : `${BASE_PATH}/${membershipId}`;
    // Screens render their own states (e.g. a stale notification's 404), so no global toast.
    const response = await apiClient.get<OutstandingBalanceDTO>(path, { skipGlobalErrorToast: true });
    return mapBalance(response.data);
  },

  async settle(
    membershipId: number,
    idempotencyKey: string,
    payloadFingerprint: string,
    request: SettleOutstandingBalanceRequest,
  ): Promise<SettlementResult> {
    const response = await apiClient.post<SettlementResultDTO>(
      `${BASE_PATH}/${membershipId}/settle`,
      {
        expected_amount: request.expectedAmount,
        payment_method_used: request.paymentMethodUsed,
        payment_breakdown: request.paymentBreakdown.map(toSplitDTO),
      },
      {
        skipGlobalErrorToast: true,
        headers: {
          'Idempotency-Key': idempotencyKey,
          'Payload-Fingerprint': payloadFingerprint,
        },
      },
    );
    const d = response.data;
    return {
      membershipId: d.membership_id,
      receiptId: d.receipt_id,
      receiptNo: d.receipt_no,
      amountPaid: d.amount_paid ?? 0,
      outstandingAmount: d.outstanding_amount ?? 0,
      settledAt: d.settled_at,
    };
  },
};
