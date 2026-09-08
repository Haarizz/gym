import { useQuery } from '@tanstack/react-query';
import { discoveryApi } from '../infrastructure/discoveryApi';
import type { CenterSummary } from '../domain/models';

export const DISCOVERY_QUERY_KEYS = {
  allCenters: ['discovery', 'centers'] as const,
  centerDetails: (tenantSlug: string, branchId: number) =>
    ['discovery', 'centerDetails', tenantSlug, branchId] as const,
  centerPlans: (tenantSlug: string, branchId: number) =>
    ['discovery', 'centerPlans', tenantSlug, branchId] as const,
};

export function useCenters() {
  return useQuery<CenterSummary[], Error>({
    queryKey: DISCOVERY_QUERY_KEYS.allCenters,
    queryFn: discoveryApi.getCenters,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
