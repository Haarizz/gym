import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { UpdateStaffContactDto } from '../application/dto/ProfileDtos';
import { profileKeys } from './profileKeys';
import { profileService } from './useProfile';

/** The logged-in staff/trainer's employee record (null if the account isn't linked to one). */
export function useStaffProfile(enabled = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: profileKeys.staff(),
    queryFn: () => profileService.getStaffProfile(),
    enabled,
  });

  const updateContact = useMutation({
    mutationFn: (data: UpdateStaffContactDto) => profileService.updateStaffContact(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(profileKeys.staff(), updated);
      // The header/contact rows elsewhere read phone & address from profileKeys.current().
      queryClient.invalidateQueries({ queryKey: profileKeys.current() });
    },
  });

  return {
    staffProfile: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    updateContact: updateContact.mutateAsync,
    isUpdatingContact: updateContact.isPending,
  };
}
