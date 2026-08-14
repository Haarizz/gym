import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiPromotionRepository } from '../infrastructure/ApiPromotionRepository';
import { PromotionService } from '../application/PromotionService';
import { promotionKeys } from './promotionKeys';
import type {
  PromotionCampaignRequest,
  PromotionCampaignResponse,
} from '../domain/PromotionCampaign';
import type { ApplyAccessDaysRequest } from '../domain/AccessDays';

const repository = new ApiPromotionRepository();
const promotionService = new PromotionService(repository);

export function usePromotions(statusFilter?: string) {
  return useQuery<PromotionCampaignResponse[], Error>({
    queryKey: promotionKeys.list(statusFilter),
    queryFn: () => promotionService.getPromotions(statusFilter),
  });
}

export function usePromotion(id: number, enabled = true) {
  return useQuery<PromotionCampaignResponse, Error>({
    queryKey: promotionKeys.detail(id),
    queryFn: () => promotionService.getPromotionById(id),
    enabled: enabled && id > 0,
  });
}

export function useCreatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: PromotionCampaignRequest) =>
      promotionService.createPromotion(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promotionKeys.lists() });
    },
  });
}

export function useUpdatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: number;
      request: PromotionCampaignRequest;
    }) => promotionService.updatePromotion(id, request),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: promotionKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: promotionKeys.detail(variables.id),
      });
    },
  });
}

export function useDeletePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => promotionService.deletePromotion(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: promotionKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: promotionKeys.detail(id),
      });
    },
  });
}

export function useDuplicatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => promotionService.duplicatePromotion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promotionKeys.lists() });
    },
  });
}

export function useBulkPromotionAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ action, ids }: { action: string; ids: number[] }) =>
      promotionService.bulkAction(action, ids),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: promotionKeys.lists() });
      for (const id of variables.ids) {
        queryClient.invalidateQueries({
          queryKey: promotionKeys.detail(id),
        });
      }
    },
  });
}

export function useValidatePromotionCode() {
  return useMutation({
    mutationFn: (code: string) => promotionService.validateCode(code),
  });
}

export function useRedeemPromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      revenue,
      savings,
    }: {
      id: number;
      revenue?: number;
      savings?: number;
    }) => promotionService.redeemPromotion(id, revenue, savings),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: promotionKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: promotionKeys.detail(variables.id),
      });
    },
  });
}

export function useEligibilityMembers() {
  return useQuery({
    queryKey: promotionKeys.eligibilityMembers(),
    queryFn: () => promotionService.getEligibilityMembers(),
  });
}

export function useApplyAccessDays() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ApplyAccessDaysRequest) =>
      promotionService.applyAccessDays(request),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: promotionKeys.detail(variables.promotionId),
      });
    },
  });
}
