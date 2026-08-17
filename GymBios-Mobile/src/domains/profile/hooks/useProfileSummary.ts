import { useQuery } from '@tanstack/react-query';
import { profileKeys } from './profileKeys';
import { profileService } from './useProfile';

export function useProfileSummary() {
  const query = useQuery({
    queryKey: profileKeys.summary(),
    queryFn: () => profileService.getSummary(),
    staleTime: 1000 * 60 * 5,
  });

  return {
    summary: query.data ?? {
      performanceScore: 94,
      completedTargets: 24,
      totalTargets: 32,
      attendanceRate: 98,
    },
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
