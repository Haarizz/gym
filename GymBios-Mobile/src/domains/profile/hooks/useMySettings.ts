import { useQuery } from '@tanstack/react-query';
import { profileKeys } from './profileKeys';
import { profileService } from './useProfile';

export function useMySettings() {
  const query = useQuery({
    queryKey: profileKeys.settings(),
    queryFn: () => profileService.getSettings(),
  });

  return {
    settings: query.data ?? {
      notifications: {
        email: true,
        push: true,
        sms: false,
        performance: true,
        targets: true,
        payroll: true,
      },
      linkedAccounts: [],
      privacy: {
        profileVisibility: true,
        performanceVisibility: true,
        activityStatus: true,
      },
    },
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
