import { useQuery } from '@tanstack/react-query';
import { discoveryApi } from '../infrastructure/discoveryApi';
import type { CenterPlan } from '../domain/models';
import { DISCOVERY_QUERY_KEYS } from './useCenters';

export function useCenterPlans(tenantSlug: string, branchId: number) {
  return useQuery<CenterPlan[], Error>({
    queryKey: DISCOVERY_QUERY_KEYS.centerPlans(tenantSlug, branchId),
    queryFn: () => discoveryApi.getCenterPlans(tenantSlug, branchId),
    enabled: !!tenantSlug && !!branchId,
    staleTime: 5 * 60 * 1000,
  });
}
