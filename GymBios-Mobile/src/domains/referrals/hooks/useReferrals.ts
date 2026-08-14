import { useQuery } from '@tanstack/react-query';
import { ApiReferralRepository } from '../infrastructure/ApiReferralRepository';
import { ReferralService } from '../application/ReferralService';
import { referralKeys } from './referralKeys';
import type { Referral, ReferralPage } from '../domain/Referral';
import type { ReferralStats } from '../domain/ReferralStats';
import type { ReferralRule } from '../domain/ReferralRule';
import type { ReferralSettings } from '../domain/ReferralSettings';
import type { ReferralListParams } from '../domain/ReferralListParams';

const repository = new ApiReferralRepository();
const referralService = new ReferralService(repository);

export function useReferralStats() {
  return useQuery<ReferralStats, Error>({
    queryKey: referralKeys.stats(),
    queryFn: () => referralService.getStats(),
  });
}

export function useReferrals(params?: ReferralListParams) {
  return useQuery<ReferralPage, Error>({
    queryKey: referralKeys.list(params),
    queryFn: () => referralService.getReferrals(params),
  });
}

export function useReferral(id: number, enabled = true) {
  return useQuery<Referral, Error>({
    queryKey: referralKeys.detail(id),
    queryFn: () => referralService.getById(id),
    enabled: enabled && id > 0,
  });
}

export function useReferralRules() {
  return useQuery<ReferralRule[], Error>({
    queryKey: referralKeys.rules(),
    queryFn: () => referralService.getRules(),
  });
}

export function useReferralSettings() {
  return useQuery<ReferralSettings, Error>({
    queryKey: referralKeys.settings(),
    queryFn: () => referralService.getSettings(),
  });
}

export function useUnredeemedReward(memberId: string, enabled = true) {
  return useQuery<Referral | null, Error>({
    queryKey: referralKeys.unredeemed(memberId),
    queryFn: () => referralService.getUnredeemedReward(memberId),
    enabled: enabled && Boolean(memberId),
  });
}
