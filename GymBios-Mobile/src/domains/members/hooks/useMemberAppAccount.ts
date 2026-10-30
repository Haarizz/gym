import { useQuery, useQueryClient } from '@tanstack/react-query';

import { MemberAccessService } from '../application/access/MemberAccessService';
import { ApiMemberAccessRepository } from '../infrastructure/access/ApiMemberAccessRepository';

const accessService = new MemberAccessService(new ApiMemberAccessRepository());

export const memberAppAccountKeys = {
  all: ['memberAppAccount'] as const,
  detail: (memberId: number) => [...memberAppAccountKeys.all, memberId] as const,
};

/**
 * A member's GymBios app account as staff see it: create one at the desk, ask to link
 * the member's existing account, or (old gym-only logins) reset its password. Once a
 * GymBios account is linked it belongs to the member — nothing here changes it.
 */
export function useMemberAppAccount(memberId: number, enabled = true) {
  const queryClient = useQueryClient();

  const accountQuery = useQuery({
    queryKey: memberAppAccountKeys.detail(memberId),
    queryFn: () => accessService.getAppAccount(memberId),
    enabled: enabled && memberId > 0,
    retry: false,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: memberAppAccountKeys.detail(memberId) });
    queryClient.invalidateQueries({ queryKey: ['members'] });
  };

  const createAccount = async (username: string, password: string) => {
    const member = await accessService.createAppAccount(memberId, username, password);
    refresh();
    return member;
  };

  const requestLink = async (identifier: string) => {
    const account = await accessService.requestAccountLink(memberId, identifier);
    queryClient.setQueryData(memberAppAccountKeys.detail(memberId), account);
    return account;
  };

  const cancelLink = async () => {
    const account = await accessService.cancelAccountLink(memberId);
    queryClient.setQueryData(memberAppAccountKeys.detail(memberId), account);
    return account;
  };

  return {
    account: accountQuery.data ?? null,
    loadingAccount: accountQuery.isLoading,
    refresh,
    createAccount,
    requestLink,
    cancelLink,
  };
}
