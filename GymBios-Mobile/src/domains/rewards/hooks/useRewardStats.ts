import { useQuery } from '@tanstack/react-query';
import { useBranchContext } from '@/shared/providers/BranchProvider';
import { ApiRewardRepository } from '../infrastructure/ApiRewardRepository';
import { RewardService } from '../application/RewardService';
import { rewardKeys } from './rewardKeys';
import type { RewardStats } from '../domain/RewardStats';

const repository = new ApiRewardRepository();
const rewardService = new RewardService(repository);

export function useRewardStats() {
  const { selectedBranchId } = useBranchContext();
  return useQuery<RewardStats, Error>({
    queryKey: [...rewardKeys.stats(), selectedBranchId],
    queryFn: () => rewardService.getStats(),
  });
}
