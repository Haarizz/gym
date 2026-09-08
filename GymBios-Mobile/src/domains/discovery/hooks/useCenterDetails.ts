import { useQuery } from '@tanstack/react-query';
import { discoveryApi } from '../infrastructure/discoveryApi';
import type { CenterDetails } from '../domain/models';
import { DISCOVERY_QUERY_KEYS } from './useCenters';

export function useCenterDetails(tenantSlug: string, branchId: number) {
  return useQuery<CenterDetails, Error>({
    queryKey: DISCOVERY_QUERY_KEYS.centerDetails(tenantSlug, branchId),
    queryFn: () => discoveryApi.getCenterDetails(tenantSlug, branchId),
    enabled: !!tenantSlug && !!branchId,
    staleTime: 5 * 60 * 1000,
  });
}
