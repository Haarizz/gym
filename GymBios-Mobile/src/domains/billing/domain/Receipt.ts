/**
 * Transaction type of a receipt.
 * Mirrors backend Receipt.transactionType values.
 */
export enum TransactionType {
  New = 'New',
  Renewal = 'Renewal',
  AddOn = 'Add-on',
  DailyEntry = 'Daily Entry',
  Payment = 'Payment',
}

/**
 * Payment status of a receipt/bill.
 * Mirrors backend Receipt.status values.
 */
export enum ReceiptStatus {
  Paid = 'Paid',
  Pending = 'Pending',
  Overdue = 'Overdue',
  Partial = 'Partial',
}

/**
 * Payment method used for a receipt.
 * Mirrors backend Receipt.paymentMethod values.
 */
export enum PaymentMethod {
  Cash = 'Cash',
  Card = 'Card',
  Online = 'Online',
  Wallet = 'Wallet',
  BankTransfer = 'Bank Transfer',
  Cheque = 'Cheque',
  Mixed = 'Mixed',
  Credit = 'Credit',
}

/**
 * Membership type on a receipt.
 * Mirrors backend Receipt.membershipType values.
 */
export enum MembershipType {
  Individual = 'Individual',
  Family = 'Family',
  Corporate = 'Corporate',
}

/**
 * One leg of a payment — either one of several legs in a Mixed payment, or the
 * single leg describing how a non-Mixed payment was actually received.
 * Mirrors backend PaymentSplitDTO.
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
 * One line item within a guardian's Receipt representing a minor family
 * member's fee folded into the guardian's bill.
 * Mirrors backend MinorChargeDTO.
 */
export interface MinorCharge {
  memberId?: string;
  memberDbId?: number;
  name?: string;
  amount?: number;
  paid?: boolean;
}

/**
 * A receipt — the core billing record. Represents either a bill/invoice
 * (transactionType != Payment) or a settlement/payment (transactionType == Payment).
 * Mirrors backend ReceiptResponseDTO.
 */
export interface Receipt {
  id: string;
  receiptNo?: string;
  transactionDate?: string;
  memberDbId?: string;
  memberId?: string;
  memberName?: string;
  memberPhone?: string;
  transactionType?: TransactionType;
  amount?: number;
  paymentMethod?: PaymentMethod;
  paymentBreakdown?: PaymentSplit[];
  status?: ReceiptStatus;
  planName?: string;
  validFrom?: string;
  validTill?: string;
  processedBy?: string;
  remarks?: string;
  membershipType?: MembershipType;
  paidAmount?: number;
  dueAmount?: number;
  dueDate?: string;
  bankAccountCode?: string;
  bankAccountName?: string;
  minorCharges?: MinorCharge[];
  totalPaidToDate?: number;
  balanceAfter?: number;
  linkedBillId?: string;
  createdAt?: string;
  updatedAt?: string;
}