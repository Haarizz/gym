import { useQuery } from '@tanstack/react-query';
import { profileKeys } from './profileKeys';
import { ProfileApi } from '../infrastructure/api/ProfileApi';
import { ApiProfileRepository } from '../infrastructure/repository/ApiProfileRepository';
import { ProfileService } from '../application/services/ProfileService';

const profileApi = new ProfileApi();
const profileRepository = new ApiProfileRepository(profileApi);
export const profileService = new ProfileService(profileRepository);

export function useProfile() {
  const query = useQuery({
    queryKey: profileKeys.current(),
    queryFn: () => profileService.getProfile(),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const profile = query.data;
  const isLoading = query.isLoading;
  const error = query.error;

  const initials = profile?.name
    ? profile.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  const firstName = profile?.name ? profile.name.split(' ')[0] : 'there';

  return {
    profile,
    initials,
    firstName,
    isLoading,
    error,
    refetch: query.refetch,
  };
}
