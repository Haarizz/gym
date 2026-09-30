import { apiClient } from '@/core/network/apiClient';
import type { RewardRepository } from '../application/RewardRepository';
import type { RewardStats } from '../domain/RewardStats';
import type { ReferralReward, RewardListParams, RewardPage } from '../domain/ReferralReward';

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

// The backend serializes with a global SNAKE_CASE naming strategy.
interface ReferralRewardResponseDTO {
  id: number;
  reward_code: string;
  referral_id?: number;
  member_id: string;
  member_type?: ReferralReward['memberType'];
  reward_name?: string;
  reward_type: ReferralReward['rewardType'];
  reward_value?: number | null;
  currency?: string | null;
  reward_unit?: ReferralReward['rewardUnit'];
  status: ReferralReward['status'];
  approval_required?: boolean;
  approved_by?: string | null;
  generated_date?: string | null;
  expiry_date?: string | null;
  redeemed_date?: string | null;
  remarks?: string | null;
}

interface RewardPageResponseDTO {
  rewards?: ReferralRewardResponseDTO[];
  pagination?: { total?: number; total_pages?: number };
}

function mapReward(r: ReferralRewardResponseDTO): ReferralReward {
  return {
    id: r.id,
    rewardCode: r.reward_code,
    referralId: r.referral_id,
    memberId: r.member_id,
    memberType: r.member_type,
    rewardName: r.reward_name,
    rewardType: r.reward_type,
    rewardValue: r.reward_value,
    currency: r.currency,
    rewardUnit: r.reward_unit,
    status: r.status,
    approvalRequired: r.approval_required,
    approvedBy: r.approved_by,
    generatedDate: r.generated_date,
    expiryDate: r.expiry_date,
    redeemedDate: r.redeemed_date,
    remarks: r.remarks,
  };
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

  async getRewards(params?: RewardListParams): Promise<RewardPage> {
    const response = await apiClient.get<RewardPageResponseDTO>('/rewards', { params });
    const pg = response.data.pagination ?? {};
    return {
      rewards: (response.data.rewards ?? []).map(mapReward),
      totalItems: pg.total ?? 0,
      totalPages: pg.total_pages ?? 1,
    };
  }

  async approve(id: number, remarks?: string): Promise<ReferralReward> {
    const response = await apiClient.post<ReferralRewardResponseDTO>(`/rewards/${id}/approve`, { remarks });
    return mapReward(response.data);
  }

  async reject(id: number, remarks?: string): Promise<ReferralReward> {
    const response = await apiClient.post<ReferralRewardResponseDTO>(`/rewards/${id}/reject`, { remarks });
    return mapReward(response.data);
  }

  async redeem(id: number): Promise<ReferralReward> {
    const response = await apiClient.post<ReferralRewardResponseDTO>(`/rewards/${id}/redeem`);
    return mapReward(response.data);
  }
}
