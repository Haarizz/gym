import { useQuery } from '@tanstack/react-query';
import { profileKeys } from './profileKeys';
import { profileService } from './useProfile';

export function useMyPerformance() {
  const query = useQuery({
    queryKey: profileKeys.performance(),
    queryFn: () => profileService.getPerformance(),
    staleTime: 1000 * 60 * 5,
  });

  return {
    performance: query.data ?? {
      performanceScore: 94,
      classesCompleted: 156,
      hoursWorked: 340,
      clientSatisfaction: 96,
      kpis: [],
    },
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
