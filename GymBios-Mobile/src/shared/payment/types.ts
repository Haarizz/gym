/**
 * The tiles in the payment sheet. Card / UPI / Net banking are paid in Stripe's own
 * sheet; Cash is a "pay at reception" request (members) or a one-tap "cash received"
 * (staff); Credit and Mixed combine those.
 */
export type PaymentMethod = 'card' | 'upi' | 'netbanking' | 'cash' | 'credit' | 'mixed';

/** The methods Stripe collects — PaymentIntent payment_method_types. */
export type OnlineMethodType = 'card' | 'upi' | 'netbanking';

/** Who is holding the phone: a member paying for themselves, or staff at the desk. */
export type PayerMode = 'member' | 'staff';

export type DiscountType = 'none' | 'fixed' | 'percentage';

export interface DiscountApplied {
  type: DiscountType;
  value: number;
  discountAmount: number;
}

/**
 * Payment leg model matching backend PaymentSplitDTO.
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
  /** Stripe PaymentIntent that collected this leg; the backend verifies it with Stripe. */
  stripePaymentIntentId?: string;
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
  allowDiscount?: boolean;
  initialDiscount?: { type: DiscountType; value: number };
  isProcessing?: boolean;
  /** Defaults to 'member'. Staff take cash in hand; members send a pay-at-reception request. */
  payer?: PayerMode;
  /** Restrict the tiles, e.g. settling a balance only accepts online payment. Defaults to all. */
  methods?: PaymentMethod[];
  /** The gym being paid, when it isn't the app's current gym (first purchase at a new gym). */
  tenantSlug?: string;
  onClose: () => void;
  onComplete: (result: PaymentResult) => void;
}
