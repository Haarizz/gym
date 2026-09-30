import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBranchContext } from '@/shared/providers/BranchProvider';
import { ApiPromotionRepository } from '../infrastructure/ApiPromotionRepository';
import { PromotionService } from '../application/PromotionService';
import { promotionKeys } from './promotionKeys';
import type {
  PromotionCampaignRequest,
  PromotionCampaignResponse,
  PromotionImpact,
} from '../domain/PromotionCampaign';
import type { ApplyAccessDaysRequest } from '../domain/AccessDays';

const repository = new ApiPromotionRepository();
const promotionService = new PromotionService(repository);

export function usePromotions(statusFilter?: string) {
  const { selectedBranchId } = useBranchContext();
  return useQuery<PromotionCampaignResponse[], Error>({
    queryKey: [...promotionKeys.list(statusFilter), selectedBranchId],
    queryFn: () => promotionService.getPromotions(statusFilter),
  });
}

export function usePromotion(id: number, enabled = true) {
  const { selectedBranchId } = useBranchContext();
  return useQuery<PromotionCampaignResponse, Error>({
    queryKey: [...promotionKeys.detail(id), selectedBranchId],
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
      memberId,
    }: {
      id: number;
      revenue?: number;
      savings?: number;
      memberId?: number;
    }) => promotionService.redeemPromotion(id, revenue, savings, memberId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: promotionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: promotionKeys.impact() });
      queryClient.invalidateQueries({
        queryKey: promotionKeys.detail(variables.id),
      });
    },
  });
}

export function usePromotionImpact() {
  const { selectedBranchId } = useBranchContext();
  return useQuery<PromotionImpact, Error>({
    queryKey: [...promotionKeys.impact(), selectedBranchId],
    queryFn: () => promotionService.getMonthlyImpact(),
  });
}

export function useEligibilityMembers() {
  const { selectedBranchId } = useBranchContext();
  return useQuery({
    queryKey: [...promotionKeys.eligibilityMembers(), selectedBranchId],
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
