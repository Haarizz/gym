/**
 * Pure payment-line domain model for progressive (mixed) checkout settlement.
 *
 * A checkout is an ordered list of payment lines (allocations). A sale paid
 * two ways is simply a sale with two lines — there is no "Mixed" mode to
 * choose up front, and no customer-advance line: an advance is a
 * customer-ledger operation owned by the member/customer module, not a till
 * tender.
 */

export const PAYMENT_TYPES = {
  CASH: "CASH",
  CARD: "CARD",
  ONLINE: "ONLINE",
  CREDIT: "CREDIT",
} as const;

export type PaymentType = (typeof PAYMENT_TYPES)[keyof typeof PAYMENT_TYPES];

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  [PAYMENT_TYPES.CASH]: "Cash",
  [PAYMENT_TYPES.CARD]: "Card",
  [PAYMENT_TYPES.ONLINE]: "Online",
  [PAYMENT_TYPES.CREDIT]: "Credit",
};

/** Half a minor currency unit — so 2-dp rounding never flips a comparison. */
export const AMOUNT_TOLERANCE = 0.005;

/** Only cash may be tendered above the remaining balance; the excess is change. */
export const OVERPAYABLE_TYPES: PaymentType[] = [PAYMENT_TYPES.CASH];

export interface PaymentLine {
  id: string;
  paymentType: PaymentType;
  /** Card network ("Visa"), bank name, etc. — never used to change behavior, only display/posting. */
  paymentSubtype: string | null;
  amount: number;
  reference: string | null;
  bankAccountId: string | null;
  bankAccountName: string | null;
  customerCode: string | null;
  customerName: string | null;
  /** UI hints only — never read by selectors or validators. */
  metadata: Record<string, unknown>;
}

export interface CreatePaymentLineInput {
  paymentType: PaymentType;
  paymentSubtype?: string | null;
  amount: number | string | null;
  reference?: string | null;
  bankAccountId?: string | null;
  bankAccountName?: string | null;
  customerCode?: string | null;
  customerName?: string | null;
  metadata?: Record<string, unknown>;
}

let lineIdCounter = 0;

function generateLineId(): string {
  lineIdCounter += 1;
  return `pline_${Date.now().toString(36)}_${lineIdCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Parses keypad strings/numbers/null into a safe non-negative number. */
export function toAmount(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

/** Creates a payment line with a unique client-side id. Edits/removals key off this id, never the array index. */
export function createPaymentLine(input: CreatePaymentLineInput): PaymentLine {
  return {
    id: generateLineId(),
    paymentType: input.paymentType,
    paymentSubtype: input.paymentSubtype ?? null,
    amount: toAmount(input.amount),
    reference: input.reference ?? null,
    bankAccountId: input.bankAccountId ?? null,
    bankAccountName: input.bankAccountName ?? null,
    customerCode: input.customerCode ?? null,
    customerName: input.customerName ?? null,
    metadata: input.metadata ?? {},
  };
}

/** CARD lines report their network subtype ("Visa"); everything else reports the type label. */
export function lineLabel(line: PaymentLine): string {
  if (line.paymentType === PAYMENT_TYPES.CARD && line.paymentSubtype) {
    return line.paymentSubtype;
  }
  return PAYMENT_TYPE_LABELS[line.paymentType];
}

/** Per-line completeness check. Returns an error string, or null when the line is valid. */
export function validateLine(line: PaymentLine): string | null {
  if (!(line.amount > 0)) {
    return "Amount must be greater than 0";
  }
  if (line.paymentType === PAYMENT_TYPES.CARD && !line.paymentSubtype) {
    return "Select a card type";
  }
  if (line.paymentType === PAYMENT_TYPES.ONLINE && !line.bankAccountId) {
    return "Select a receiving bank account";
  }
  if (line.paymentType === PAYMENT_TYPES.CREDIT && !line.customerCode) {
    return "Select a customer";
  }
  return null;
}
