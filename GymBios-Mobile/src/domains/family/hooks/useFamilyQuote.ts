import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { familyApi } from '../infrastructure/familyApi';

/** Server price for the plan with these family members (isMinor and own plan id per member, in order). */
export const useFamilyQuote = (
  tenantSlug: string,
  branchId: number,
  planId: number | undefined,
  memberIsMinor: boolean[],
  memberPlanIds: (number | null)[],
) => {
  return useQuery({
    queryKey: ['family-quote', tenantSlug, branchId, planId, memberIsMinor, memberPlanIds],
    queryFn: () => familyApi.getQuote(tenantSlug, branchId, planId as number, memberIsMinor, memberPlanIds),
    enabled: !!tenantSlug && !!branchId && !!planId,
    placeholderData: keepPreviousData,
  });
};
