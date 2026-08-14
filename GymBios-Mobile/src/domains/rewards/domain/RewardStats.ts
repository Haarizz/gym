export interface RewardStats {
  totalGenerated: number;
  available: number;
  pendingApproval: number;
  redeemed: number;
  expired: number;
  cancelled: number;
  walletCreditsIssued: number;
  couponsUsed: number;
  topRewardType?: string;
  mostActiveReferrer?: string;
  highestRewardEarned?: number;
  monthlyRewards?: { month: string; count: number }[];
  rewardTypeDistribution?: Record<string, number>;
}
