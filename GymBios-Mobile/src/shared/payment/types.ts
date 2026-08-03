export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'credit'
  | 'mixed'
  | 'cheque'
  | 'bank_transfer'
  | 'online';

export type DiscountType = 'none' | 'fixed' | 'percentage';

export interface DiscountApplied {
  type: DiscountType;
  value: number;
  discountAmount: number;
}

export interface PaymentSplitRow {
  id: string;
  method: PaymentMethod;
  amount: number;
  cardType?: string;
  reference?: string;
  chequeNumber?: string;
  bankName?: string;
  chequeDate?: string;
  bankAccountId?: string;
  onlinePaymentType?: string;
  providerName?: string;
}

/**
 * Payment leg model matching backend PaymentSplitDTO exactly.
 */
export interface PaymentSplit {
  method: string;
  amount: number;
  reference?: string;
  cardType?: string;
  chequeNumber?: string;
  chequeDate?: string;
  bankName?: string;
  bankAccountCode?: string;
  bankAccountName?: string;
  onlinePaymentType?: string;
  providerName?: string;
}

/**
 * UI-only summary model for displaying totals. Never sent to backend.
 */
export interface PaymentSummary {
  subtotal: number;
  discount: DiscountApplied;
  finalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  payBackAmount: number;
  paymentDueDate?: string;
}

export type PaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE';

export interface PaymentResult {
  paymentMethodUsed: string;
  paymentBreakdown: PaymentSplit[];
  paymentStatus: PaymentStatus;
  outstandingBalance: number;
  discountApplied: number;
  bankAccountCode?: string;
  bankAccountName?: string;
  summary: PaymentSummary;
}

export interface PaymentBottomSheetProps {
  visible: boolean;
  amount: number;
  title: string;
  subtitle?: string;
  currency?: string;
  allowDiscount?: boolean;
  initialDiscount?: { type: DiscountType; value: number };
  onClose: () => void;
  onComplete: (result: PaymentResult) => void;
}
