import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBranchContext } from '@/shared/providers/BranchProvider';
import { ApiRewardRepository } from '../infrastructure/ApiRewardRepository';
import { RewardService } from '../application/RewardService';
import { rewardKeys } from './rewardKeys';
import type { RewardListParams, RewardPage } from '../domain/ReferralReward';

const repository = new ApiRewardRepository();
const rewardService = new RewardService(repository);

export function useRewards(params?: RewardListParams) {
  const { selectedBranchId } = useBranchContext();
  return useQuery<RewardPage, Error>({
    queryKey: [...rewardKeys.list(params), selectedBranchId],
    queryFn: () => rewardService.getRewards(params),
  });
}

export type RewardAction = 'approve' | 'reject' | 'redeem';

export function useRewardAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, action, remarks }: { id: number; action: RewardAction; remarks?: string }) => {
      if (action === 'approve') return rewardService.approve(id, remarks);
      if (action === 'reject') return rewardService.reject(id, remarks);
      return rewardService.redeem(id);
    },
    onSuccess: () => {
      // Both the list and the KPI counts shift when a reward changes status.
      queryClient.invalidateQueries({ queryKey: rewardKeys.all });
    },
  });
}
