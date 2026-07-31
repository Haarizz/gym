import { useCallback, useEffect, useState } from 'react';

import type { MembershipPlan } from '../../domain/MembershipPlan';
import { MembershipPlanService } from '../../application/MembershipPlanService';
import { ApiMembershipPlanRepository } from '../../infrastructure/ApiMembershipPlanRepository';

const repository = new ApiMembershipPlanRepository();
const planService = new MembershipPlanService(repository);

export function useMembershipPlans(statusFilter?: string) {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await planService.getPlans(statusFilter);
      setPlans(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadPlanById = useCallback(async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      return await planService.getPlanById(id);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePlan = useCallback(async (id: number) => {
    try {
      setSubmitting(true);
      setError(null);
      await planService.deletePlan(id);
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const duplicatePlan = useCallback(async (id: number) => {
    try {
      setSubmitting(true);
      setError(null);
      const copy = await planService.duplicatePlan(id);
      setPlans((prev) => [copy, ...prev]);
      return copy;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    plans,
    loading,
    submitting,
    error,
    refresh,
    loadPlanById,
    deletePlan,
    duplicatePlan,
  };
}