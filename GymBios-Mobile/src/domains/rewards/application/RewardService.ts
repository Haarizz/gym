import type { RewardRepository } from './RewardRepository';
import type { RewardStats } from '../domain/RewardStats';
import type { ReferralReward, RewardListParams, RewardPage } from '../domain/ReferralReward';

export class RewardService {
  constructor(private readonly repository: RewardRepository) {}

  getStats(): Promise<RewardStats> {
    return this.repository.getStats();
  }

  getRewards(params?: RewardListParams): Promise<RewardPage> {
    return this.repository.getRewards(params);
  }

  approve(id: number, remarks?: string): Promise<ReferralReward> {
    return this.repository.approve(id, remarks);
  }

  reject(id: number, remarks?: string): Promise<ReferralReward> {
    return this.repository.reject(id, remarks);
  }

  redeem(id: number): Promise<ReferralReward> {
    return this.repository.redeem(id);
  }
}
