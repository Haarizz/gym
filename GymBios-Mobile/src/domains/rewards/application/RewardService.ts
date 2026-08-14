import type { RewardRepository } from './RewardRepository';
import type { RewardStats } from '../domain/RewardStats';

export class RewardService {
  constructor(private readonly repository: RewardRepository) {}

  getStats(): Promise<RewardStats> {
    return this.repository.getStats();
  }
}
