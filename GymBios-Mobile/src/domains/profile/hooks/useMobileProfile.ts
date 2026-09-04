import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMobileProfile, updateMobileProfile } from '../apiModule';
import type { UpdateProfileRequestApiModel } from '../infrastructure/api/ProfileApiModels';
import { Session } from '../../auth/domain/entities/Session';
import { User } from '../../auth/domain/entities/User';
import { useAuthStore } from '../../auth/store/authStore';
import { authRepository } from '../../auth';

export function useMobileProfile() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const session = useAuthStore((state) => state.session);

  const query = useQuery({
    queryKey: ['mobileProfile'],
    queryFn: async () => {
      const result = await getMobileProfile.execute();
      if (!result.success) throw new Error(result.error);
      return result.value;
    },
  });

  const mutation = useMutation({
    mutationFn: async (input: UpdateProfileRequestApiModel) => {
      const result = await updateMobileProfile.execute(input);
      if (!result.success) throw new Error(result.error);
      return result.value;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['mobileProfile'] });
      // Update session to reflect profileCompleted = true
      if (session) {
        const updatedSession = Session.create({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt,
          appRole: session.appRole,
          permissions: session.permissions,
          profileCompleted: true,
          user: User.create({
            id: session.user.id,
            username: session.user.username,
            email: session.user.email,
            fullName: session.user.fullName,
            appRole: session.user.appRole,
            permissions: session.user.permissions,
            branchId: session.user.branchId,
            profileCompleted: true,
          }),
        });

        // 1. Update in-memory store first (triggers AuthBootstrap re-evaluation)
        setSession(updatedSession);

        // 2. Persist to SecureStore so profileCompleted = true survives app restart
        await authRepository.persistSession(updatedSession);
      }
    },
  });

  return {
    profile: query.data,
    isLoading: query.isLoading,
    updateProfile: mutation.mutate,
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
}
