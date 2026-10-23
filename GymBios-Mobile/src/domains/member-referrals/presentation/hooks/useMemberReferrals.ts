import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiMemberReferralsRepository } from '../../infrastructure/repositories/ApiMemberReferralsRepository';
import { MemberReferralsApplicationService } from '../../application/MemberReferralsApplicationService';
import type { MyReferralReward, PassContext } from '../../domain/types';

const referralsService = new MemberReferralsApplicationService(apiMemberReferralsRepository);

export const referralsKeys = {
  all: ['member-referrals'] as const,
  profile: () => [...referralsKeys.all, 'profile'] as const,
  history: () => [...referralsKeys.all, 'history'] as const,
  myClaim: () => [...referralsKeys.all, 'my-claim'] as const,
  myRewards: () => [...referralsKeys.all, 'my-rewards'] as const,
  myPasses: (context: PassContext) => [...referralsKeys.all, 'my-passes', context] as const,
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

export const useMyReferralClaim = (enabled = true) => {
  return useQuery({
    queryKey: referralsKeys.myClaim(),
    queryFn: () => referralsService.getMyClaim(),
    enabled,
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

export const useMyReferralRewards = () => {
  return useQuery({
    queryKey: referralsKeys.myRewards(),
    queryFn: () => referralsService.getMyRewards(),
  });
};

/** The member's Reward Passes spendable in a context; disabled (empty) when context is null. */
export const useMyRewardPasses = (context: PassContext | null) => {
  return useQuery({
    queryKey: referralsKeys.myPasses(context ?? 'MEMBERSHIP'),
    queryFn: () => referralsService.getMyPasses(context as PassContext),
    enabled: context != null,
    staleTime: 0, // a pass spent elsewhere must not linger in a picker
  });
};

// Unspent, unexpired COUPON rewards with a generated code (a used coupon flips its reward to REDEEMED).
const isUsableCoupon = (r: MyReferralReward) =>
  r.rewardType === 'COUPON'
  && (r.status === 'AVAILABLE' || r.status === 'CLAIMED')
  && !!r.couponCode
  && (!r.expiryDate || new Date(`${r.expiryDate}T23:59:59`) >= new Date());

/** The member's own referral coupons usable at checkout; disabled (empty) when not enabled. */
export const useMyCoupons = (enabled: boolean) => {
  return useQuery({
    queryKey: referralsKeys.myRewards(),
    queryFn: () => referralsService.getMyRewards(),
    enabled,
    staleTime: 0, // a coupon spent elsewhere must not linger in a picker
    select: (rewards) => rewards.filter(isUsableCoupon),
  });
};
