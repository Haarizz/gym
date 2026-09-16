import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiMemberReferralsRepository } from '../../infrastructure/repositories/ApiMemberReferralsRepository';
import { MemberReferralsApplicationService } from '../../application/MemberReferralsApplicationService';

const referralsService = new MemberReferralsApplicationService(apiMemberReferralsRepository);

export const referralsKeys = {
  all: ['member-referrals'] as const,
  profile: () => [...referralsKeys.all, 'profile'] as const,
  history: () => [...referralsKeys.all, 'history'] as const,
  myClaim: () => [...referralsKeys.all, 'my-claim'] as const,
};

export const useReferralProfile = () => {
  return useQuery({
    queryKey: referralsKeys.profile(),
    queryFn: () => referralsService.getMyProfile(),
  });
};

export const useReferralHistory = () => {
  return useQuery({
    queryKey: referralsKeys.history(),
    queryFn: () => referralsService.getHistory(),
  });
};

export const useClaimReferral = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => referralsService.claimCode(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referralsKeys.history() });
      queryClient.invalidateQueries({ queryKey: referralsKeys.myClaim() });
    },
  });
};

export const useMyReferralClaim = () => {
  return useQuery({
    queryKey: referralsKeys.myClaim(),
    queryFn: () => referralsService.getMyClaim(),
  });
};

export const useRetryReferralClaim = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => referralsService.retryMyClaim(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referralsKeys.myClaim() });
    },
  });
};
