import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiReferralRepository } from '../infrastructure/ApiReferralRepository';
import { ReferralService } from '../application/ReferralService';
import { referralKeys } from './referralKeys';
import { rewardKeys } from '@/domains/rewards';
import type {
  CreateReferralPayload,
  UpdateReferralPayload,
  MarkSuccessfulPayload,
} from '../domain/ReferralPayloads';
import type { UpdateReferralSettingsPayload } from '../domain/ReferralSettings';

const repository = new ApiReferralRepository();
const referralService = new ReferralService(repository);

export function useCreateReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateReferralPayload) => referralService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referralKeys.lists() });
      queryClient.invalidateQueries({ queryKey: referralKeys.stats() });
    },
  });
}

export function useUpdateReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateReferralPayload }) =>
      referralService.update(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: referralKeys.lists() });
      queryClient.invalidateQueries({ queryKey: referralKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: referralKeys.stats() });
    },
  });
}

export function useDeleteReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => referralService.delete(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: referralKeys.lists() });
      queryClient.invalidateQueries({ queryKey: referralKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: referralKeys.stats() });
    },
  });
}

export function useMarkReferralSuccessful() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload?: MarkSuccessfulPayload }) =>
      referralService.markSuccessful(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: referralKeys.lists() });
      queryClient.invalidateQueries({ queryKey: referralKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: referralKeys.stats() });
      queryClient.invalidateQueries({ queryKey: rewardKeys.stats() });
    },
  });
}

export function useMarkReferralExpired() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => referralService.markExpired(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: referralKeys.lists() });
      queryClient.invalidateQueries({ queryKey: referralKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: referralKeys.stats() });
    },
  });
}

export function useUpdateReferralSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateReferralSettingsPayload) =>
      referralService.updateSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referralKeys.settings() });
      queryClient.invalidateQueries({ queryKey: referralKeys.stats() });
    },
  });
}

export function useRedeemReferralReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => referralService.redeemReward(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: referralKeys.lists() });
      queryClient.invalidateQueries({ queryKey: referralKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: referralKeys.stats() });
      queryClient.invalidateQueries({ queryKey: rewardKeys.stats() });
    },
  });
}

export function useValidateReferralCode() {
  return useMutation({
    mutationFn: (code: string) => referralService.validateCode(code),
  });
}

export function useFixReferralRewards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => referralService.fixRewards(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referralKeys.lists() });
      queryClient.invalidateQueries({ queryKey: referralKeys.stats() });
      queryClient.invalidateQueries({ queryKey: rewardKeys.stats() });
    },
  });
}
