import { useQuery } from '@tanstack/react-query';
import { profileKeys } from './profileKeys';
import { profileService } from './useProfile';

export function useMyTransactions() {
  const query = useQuery({
    queryKey: profileKeys.transactions(),
    queryFn: () => profileService.getTransactions(),
  });

  return {
    transactions: query.data?.transactions ?? [],
    summary: query.data?.summary ?? {
      totalEarnings: 0,
      totalTransactions: 0,
      totalPurchases: 0,
      totalBonuses: 0,
    },
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
