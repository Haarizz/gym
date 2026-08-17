export const profileKeys = {
  all: ['profile'] as const,
  current: () => [...profileKeys.all, 'current'] as const,
  summary: () => [...profileKeys.all, 'summary'] as const,
  targets: () => [...profileKeys.all, 'targets'] as const,
  performance: () => [...profileKeys.all, 'performance'] as const,
  transactions: () => [...profileKeys.all, 'transactions'] as const,
  settings: () => [...profileKeys.all, 'settings'] as const,
};
