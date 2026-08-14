import type { RewardStats } from '../domain/RewardStats';

export interface RewardRepository {
  getStats(): Promise<RewardStats>;
}
