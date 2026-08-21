import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileKeys } from './profileKeys';
import { profileService } from './useProfile';
import type { ChangePasswordDto, UpdateProfileDto, UpdateSettingsDto } from '../application/dto/ProfileDtos';

export function useProfileMutations() {
  const queryClient = useQueryClient();

  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateProfileDto) => profileService.updateProfile(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(profileKeys.current(), updated);
      queryClient.invalidateQueries({ queryKey: profileKeys.current() });
    },
  });

  const updatePhotoMutation = useMutation({
    mutationFn: (uriOrDataUrl: string) => profileService.updateProfilePhoto(uriOrDataUrl),
    onSuccess: (newPhotoUrl) => {
      queryClient.setQueryData(profileKeys.current(), (old: any) => {
        if (!old) return old;
        return { ...old, photoUrl: newPhotoUrl };
      });
      queryClient.invalidateQueries({ queryKey: profileKeys.current() });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordDto) => profileService.changePassword(data),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: UpdateSettingsDto) => profileService.updateSettings(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(profileKeys.settings(), updated);
      queryClient.invalidateQueries({ queryKey: profileKeys.settings() });
    },
  });

  return {
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
    updatePhoto: updatePhotoMutation.mutateAsync,
    isUpdatingPhoto: updatePhotoMutation.isPending,
    changePassword: changePasswordMutation.mutateAsync,
    isChangingPassword: changePasswordMutation.isPending,
    updateSettings: updateSettingsMutation.mutateAsync,
    isUpdatingSettings: updateSettingsMutation.isPending,
  };
}
