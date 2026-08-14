import type { Receipt } from './Receipt';

/**
 * A bill — a pending/partial receipt that is payable by a member.
 * Bills are a subset of receipts with status Pending, Overdue, or Partial.
 */
export interface Bill extends Receipt {
  /** Amount still owed on this bill. */
  dueAmount: number;
  /** When this bill is due. */
  dueDate?: string;
  /** Cumulative amount paid toward this bill across its whole lifecycle. */
  totalPaidToDate?: number;
}