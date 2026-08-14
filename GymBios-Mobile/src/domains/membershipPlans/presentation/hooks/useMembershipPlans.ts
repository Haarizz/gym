import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { MembershipPlan } from '../../domain/MembershipPlan';
import type { MembershipPlanRequest } from '../../application/MembershipPlanRepository';
import { MembershipPlanService } from '../../application/MembershipPlanService';
import { ApiMembershipPlanRepository } from '../../infrastructure/ApiMembershipPlanRepository';

const repository = new ApiMembershipPlanRepository();
const planService = new MembershipPlanService(repository);

export const membershipPlanKeys = {
  all: ['membershipPlans'] as const,
  lists: () => [...membershipPlanKeys.all, 'list'] as const,
  list: (status?: string) => [...membershipPlanKeys.lists(), status] as const,
  details: () => [...membershipPlanKeys.all, 'detail'] as const,
  detail: (id: number) => [...membershipPlanKeys.details(), id] as const,
};

export function useMembershipPlans(statusFilter?: string) {
  const queryClient = useQueryClient();

  const plansQuery = useQuery({
    queryKey: membershipPlanKeys.list(statusFilter),
    queryFn: () => planService.getPlans(statusFilter),
  });

  const plans = plansQuery.data ?? [];
  const loading = plansQuery.isFetching;
  const error = plansQuery.error as Error | null;

  const refresh = useCallback(() => {
    return plansQuery.refetch();
  }, [plansQuery]);

  const loadPlanById = useCallback(
    async (id: number) => {
      return queryClient.fetchQuery({
        queryKey: membershipPlanKeys.detail(id),
        queryFn: () => planService.getPlanById(id),
      });
    },
    [queryClient],
  );

  const deletePlanMutation = useDeletePlan();

  const deletePlan = useCallback(
    async (id: number) => {
      await deletePlanMutation.mutateAsync(id);
    },
    [deletePlanMutation],
  );

  const duplicatePlanMutation = useDuplicatePlan();

  const duplicatePlan = useCallback(
    async (id: number) => {
      return duplicatePlanMutation.mutateAsync(id);
    },
    [duplicatePlanMutation],
  );

  return {
    plans,
    loading,
    submitting:
      deletePlanMutation.isPending || duplicatePlanMutation.isPending,
    error,
    refresh,
    loadPlanById,
    deletePlan,
    duplicatePlan,
  };
}

export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: MembershipPlanRequest) =>
      planService.createPlan(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membershipPlanKeys.all });
    },
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: number;
      request: MembershipPlanRequest;
    }) => planService.updatePlan(id, request),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: membershipPlanKeys.all });
      queryClient.invalidateQueries({
        queryKey: membershipPlanKeys.detail(variables.id),
      });
    },
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => planService.deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membershipPlanKeys.all });
    },
  });
}

export function useDuplicatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => planService.duplicatePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membershipPlanKeys.all });
    },
  });
}

export type { MembershipPlan };