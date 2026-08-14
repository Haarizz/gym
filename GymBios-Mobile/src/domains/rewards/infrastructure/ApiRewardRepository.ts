import { apiClient } from '@/core/network/apiClient';
import type { RewardRepository } from '../application/RewardRepository';
import type { RewardStats } from '../domain/RewardStats';

interface RewardStatsResponseDTO {
  total_generated?: number;
  totalGenerated?: number;
  available?: number;
  pending_approval?: number;
  pendingApproval?: number;
  redeemed?: number;
  expired?: number;
  cancelled?: number;
  wallet_credits_issued?: number;
  walletCreditsIssued?: number;
  coupons_used?: number;
  couponsUsed?: number;
  top_reward_type?: string;
  topRewardType?: string;
  most_active_referrer?: string;
  mostActiveReferrer?: string;
  highest_reward_earned?: number;
  highestRewardEarned?: number;
  monthly_rewards?: { month: string; count: number }[];
  monthlyRewards?: { month: string; count: number }[];
  reward_type_distribution?: Record<string, number>;
  rewardTypeDistribution?: Record<string, number>;
}

export class ApiRewardRepository implements RewardRepository {
  async getStats(): Promise<RewardStats> {
    const response = await apiClient.get<RewardStatsResponseDTO>('/rewards/stats');
    const s = response.data;
    return {
      totalGenerated: s.total_generated ?? s.totalGenerated ?? 0,
      available: s.available ?? 0,
      pendingApproval: s.pending_approval ?? s.pendingApproval ?? 0,
      redeemed: s.redeemed ?? 0,
      expired: s.expired ?? 0,
      cancelled: s.cancelled ?? 0,
      walletCreditsIssued: s.wallet_credits_issued ?? s.walletCreditsIssued ?? 0,
      couponsUsed: s.coupons_used ?? s.couponsUsed ?? 0,
      topRewardType: s.top_reward_type ?? s.topRewardType,
      mostActiveReferrer: s.most_active_referrer ?? s.mostActiveReferrer,
      highestRewardEarned: s.highest_reward_earned ?? s.highestRewardEarned,
      monthlyRewards: s.monthly_rewards ?? s.monthlyRewards ?? [],
      rewardTypeDistribution: s.reward_type_distribution ?? s.rewardTypeDistribution ?? {},
    };
  }
}
