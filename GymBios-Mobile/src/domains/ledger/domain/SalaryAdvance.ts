/** Status of a salary advance as stored by the backend. */
export type SalaryAdvanceStatus =
  | 'Pending Approval'
  | 'Active'
  | 'Approved'
  | 'Fully Repaid'
  | 'Rejected'
  | 'Cancelled'
  | (string & {});

export type LedgerRole = 'staff' | 'trainer';

export interface SalaryAdvanceLimits {
  baseSalary: number;
  /** Balance still owed on Active/Approved advances. */
  outstanding: number;
  /** baseSalary − outstanding: the most the employee can request now. */
  available: number;
  hasPending: boolean;
  canRequest: boolean;
  /** Server's English explanation when canRequest is false. */
  reasonBlocked: string | null;
}

export interface SalaryAdvance {
  id: number;
  requestDate: string | null;
  requestedAmount: number;
  approvedAmount: number;
  status: SalaryAdvanceStatus;
  /** The employee's reason (plus any approval note). */
  remarks: string | null;
  installmentCount: number;
  installmentAmount: number;
  startMonth: string | null;
  nextDeductionDate: string | null;
  totalDeducted: number;
  balance: number;
  approvedDate: string | null;
  rejectionNote: string | null;
}

export interface SalaryAdvanceOverview {
  limits: SalaryAdvanceLimits;
  advances: SalaryAdvance[];
}

export interface CreateSalaryAdvanceInput {
  amount: number;
  reason: string;
}

/** Same limit the backend enforces. */
export const SALARY_ADVANCE_REASON_MAX = 500;

export const SALARY_ADVANCE_PENDING: SalaryAdvanceStatus = 'Pending Approval';
