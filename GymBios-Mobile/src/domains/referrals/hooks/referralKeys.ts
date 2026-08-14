import type { ReferralListParams } from '../domain/ReferralListParams';

export const referralKeys = {
  all: ['referrals'] as const,
  lists: () => [...referralKeys.all, 'list'] as const,
  list: (params?: ReferralListParams) => [...referralKeys.lists(), params ?? {}] as const,
  details: () => [...referralKeys.all, 'detail'] as const,
  detail: (id: number) => [...referralKeys.details(), id] as const,
  stats: () => [...referralKeys.all, 'stats'] as const,
  rules: () => [...referralKeys.all, 'rules'] as const,
  settings: () => [...referralKeys.all, 'settings'] as const,
  unredeemed: (memberId: string) => [...referralKeys.all, 'unredeemed', memberId] as const,
};
