import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { teamApi } from '../infrastructure/teamApi';
import type { RateStaffRequest } from '../domain/TeamMember';

export const teamKeys = {
  all: ['memberTeam'] as const,
  list: () => [...teamKeys.all, 'list'] as const,
  profile: (staffId: number) => [...teamKeys.all, 'profile', staffId] as const,
};

export function useTeam() {
  return useQuery({
    queryKey: teamKeys.list(),
    queryFn: () => teamApi.getTeam(),
  });
}

export function useStaffProfile(staffId: number) {
  return useQuery({
    queryKey: teamKeys.profile(staffId),
    queryFn: () => teamApi.getProfile(staffId),
    enabled: Number.isFinite(staffId),
  });
}

export function useRateStaff(staffId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: RateStaffRequest) => teamApi.rate(staffId, request),
    onSuccess: (profile) => {
      queryClient.setQueryData(teamKeys.profile(staffId), profile);
      queryClient.invalidateQueries({ queryKey: teamKeys.list() });
    },
  });
}
