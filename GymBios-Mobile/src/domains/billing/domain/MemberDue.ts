/**
 * Due status of a member's outstanding payment.
 * Mirrors backend MemberDueDTO.status values.
 */
export enum DueStatus {
  Overdue = 'Overdue',
  DueSoon = 'Due Soon',
}

/**
 * A member with an outstanding or upcoming payment.
 * Mirrors backend MemberDueDTO.
 */
export interface MemberDue {
  id: number;
  memberId?: string;
  memberName?: string;
  memberEmail?: string;
  memberPhone?: string;
  membership?: string;
  amount?: number;
  dueDate?: string;
  daysOverdue: number;
  lastPayment?: string;
  status?: DueStatus;
}