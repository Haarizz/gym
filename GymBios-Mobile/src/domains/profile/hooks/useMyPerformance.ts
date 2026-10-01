import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/domains/auth';
import type { PerformanceRole } from '../domain';
import { profileKeys } from './profileKeys';
import { profileService } from './useProfile';

export function useMyPerformance() {
  const appRole = useAuthStore((s) => s.appRole);
  // Only staff and trainers have performance data; admins and members never reach this screen.
  const role: PerformanceRole | null = appRole === 'staff' || appRole === 'trainer' ? appRole : null;

  const query = useQuery({
    queryKey: [...profileKeys.performance(), role],
    queryFn: () => profileService.getPerformance(role as PerformanceRole),
    enabled: role !== null,
    staleTime: 1000 * 60 * 5,
  });

  return {
    performance: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
