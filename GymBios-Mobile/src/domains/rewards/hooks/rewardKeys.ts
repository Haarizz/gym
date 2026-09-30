import type { RewardListParams } from '../domain/ReferralReward';

export const rewardKeys = {
  all: ['rewards'] as const,
  stats: () => [...rewardKeys.all, 'stats'] as const,
  lists: () => [...rewardKeys.all, 'list'] as const,
  list: (params?: RewardListParams) => [...rewardKeys.lists(), params] as const,
};
