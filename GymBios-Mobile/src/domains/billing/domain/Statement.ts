import type { MinorCharge } from './Receipt';

/**
 * Type of a statement line — either an invoice (bill) or a payment.
 * Mirrors backend StatementLineDTO.type values.
 */
export enum StatementLineType {
  Invoice = 'Invoice',
  Payment = 'Payment',
}

/**
 * One row in a member's Statement of Account.
 * Mirrors backend StatementLineDTO.
 */
export interface StatementLine {
  date?: string;
  receiptNo?: string;
  type?: StatementLineType;
  description?: string;
  debit?: number;
  credit?: number;
  balance?: number;
  paymentMethod?: string;
  status?: string;
  minorCharges?: MinorCharge[];
}

/**
 * A member's full Statement of Account.
 * Mirrors backend MemberStatementResponseDTO.
 */
export interface Statement {
  memberDbId?: string;
  memberId?: string;
  memberName?: string;
  memberPhone?: string;
  isMinor?: boolean;
  billedToHead?: boolean;
  familyHeadName?: string;
  openingBalance?: number;
  totalBilled?: number;
  totalPaid?: number;
  closingBalance?: number;
  lines: StatementLine[];
}