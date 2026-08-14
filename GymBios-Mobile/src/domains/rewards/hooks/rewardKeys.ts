export const rewardKeys = {
  all: ['rewards'] as const,
  stats: () => [...rewardKeys.all, 'stats'] as const,
};
