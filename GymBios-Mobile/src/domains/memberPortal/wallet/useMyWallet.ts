import { useQuery } from '@tanstack/react-query';
import { walletApi } from './walletApi';

export const walletKeys = {
  mine: ['memberWallet'] as const,
};

/** Balance must be fresh at checkout — a stale figure would be refused by the server. */
export function useMyWallet(enabled = true) {
  return useQuery({
    queryKey: walletKeys.mine,
    queryFn: walletApi.getMyWallet,
    enabled,
    staleTime: 0,
  });
}
