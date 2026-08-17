import { useQuery } from '@tanstack/react-query';
import { profileKeys } from './profileKeys';
import { profileService } from './useProfile';

export function useMyTransactions() {
  const query = useQuery({
    queryKey: profileKeys.transactions(),
    queryFn: () => profileService.getTransactions(),
    staleTime: 1000 * 60 * 5,
  });

  return {
    transactions: query.data?.transactions ?? [],
    summary: query.data?.summary ?? {
      totalEarnings: 4785,
      totalTransactions: 156,
      totalPurchases: 89,
      totalBonuses: 2,
    },
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
