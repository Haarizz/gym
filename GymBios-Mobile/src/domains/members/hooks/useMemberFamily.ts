import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { AddFamilyMemberRequest } from '../application/family/MemberFamilyRepository';
import { MemberFamilyService } from '../application/family/MemberFamilyService';
import { ApiMemberFamilyRepository } from '../infrastructure/family/ApiMemberFamilyRepository';

const familyRepository = new ApiMemberFamilyRepository();
const familyService = new MemberFamilyService(familyRepository);

export const memberFamilyKeys = {
  all: ['memberFamily'] as const,
  detail: (memberId: number) => [...memberFamilyKeys.all, memberId] as const,
};

export function useMemberFamily(memberId: number) {
  const queryClient = useQueryClient();

  const familyQuery = useQuery({
    queryKey: memberFamilyKeys.detail(memberId),
    queryFn: () => familyService.getFamily(memberId),
    enabled: memberId > 0,
  });

  const addFamilyMember = async (
    headId: number,
    request: AddFamilyMemberRequest,
  ) => {
    const result = await familyService.addFamilyMember(headId, request);
    queryClient.invalidateQueries({ queryKey: memberFamilyKeys.all });
    queryClient.invalidateQueries({ queryKey: ['members'] });
    return result;
  };

  return {
    family: familyQuery.data ?? null,
    loadingFamily: familyQuery.isLoading,
    addFamilyMember,
  };
}