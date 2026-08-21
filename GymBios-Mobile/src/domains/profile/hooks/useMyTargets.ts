import { useQuery } from '@tanstack/react-query';
import { profileKeys } from './profileKeys';
import { profileService } from './useProfile';

export function useMyTargets() {
  const query = useQuery({
    queryKey: profileKeys.targets(),
    queryFn: () => profileService.getTargets(),
    staleTime: 1000 * 60 * 5,
  });

  const targets = query.data ?? [];
  const activeTargets = targets.filter((t) => t.status === 'active');
  const completedTargets = targets.filter((t) => t.status === 'completed');

  return {
    targets,
    activeTargets,
    completedTargets,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
