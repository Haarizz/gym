export interface ApplyAccessDaysMatch {
  ruleId?: string | null;
  memberId: string;
  rewardDays: number;
}

export interface ApplyAccessDaysRequest {
  promotionId: number;
  matches: ApplyAccessDaysMatch[];
}

export interface ApplyAccessDaysResponse {
  success: boolean;
  appliedCount: number;
  skippedCount: number;
  totalDaysApplied: number;
  appliedAt: string;
  skippedMemberIds: string[];
}
