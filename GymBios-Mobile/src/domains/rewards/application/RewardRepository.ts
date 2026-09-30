import type { RewardStats } from '../domain/RewardStats';
import type { ReferralReward, RewardListParams, RewardPage } from '../domain/ReferralReward';

export interface RewardRepository {
  getStats(): Promise<RewardStats>;
  getRewards(params?: RewardListParams): Promise<RewardPage>;
  approve(id: number, remarks?: string): Promise<ReferralReward>;
  reject(id: number, remarks?: string): Promise<ReferralReward>;
  redeem(id: number): Promise<ReferralReward>;
}
