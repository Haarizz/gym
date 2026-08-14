import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { Member } from '../domain/Member';
import type {
  CreateMemberRequest,
  UpdateMemberRequest,
} from '../application/directory/MemberDirectoryRepository';
import type { AddFamilyMemberRequest } from '../application/family/MemberFamilyRepository';
import type { FreezeRequest } from '../application/freeze/MemberFreezeRepository';
import type { SetCredentialsRequest } from '../application/access/MemberAccessRepository';
import type {
  RenewalRequest,
  MinorRenewalRequest,
  FamilyRenewalRequest,
} from '../application/membership/MemberMembershipRepository';

import { MemberMembershipService } from '../application/membership/MemberMembershipService';
import { ApiMemberMembershipRepository } from '../infrastructure/membership/ApiMemberMembershipRepository';
import { MemberFamilyService } from '../application/family/MemberFamilyService';
import { ApiMemberFamilyRepository } from '../infrastructure/family/ApiMemberFamilyRepository';
import { MemberFreezeService } from '../application/freeze/MemberFreezeService';
import { ApiMemberFreezeRepository } from '../infrastructure/freeze/ApiMemberFreezeRepository';
import { MemberAccessService } from '../application/access/MemberAccessService';
import { ApiMemberAccessRepository } from '../infrastructure/access/ApiMemberAccessRepository';

import {
  memberKeys,
  useCreateMember,
  useUpdateMember,
  useDeleteMember,
} from './useMembers';

const membershipRepository = new ApiMemberMembershipRepository();
const membershipService = new MemberMembershipService(membershipRepository);

const familyRepository = new ApiMemberFamilyRepository();
const familyService = new MemberFamilyService(familyRepository);

const freezeRepository = new ApiMemberFreezeRepository();
const freezeService = new MemberFreezeService(freezeRepository);

const accessRepository = new ApiMemberAccessRepository();
const accessService = new MemberAccessService(accessRepository);

export function useMemberActions() {
  const queryClient = useQueryClient();
  const createMemberMutation = useCreateMember();
  const updateMemberMutation = useUpdateMember();
  const deleteMemberMutation = useDeleteMember();

  const invalidateMemberData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: memberKeys.all });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }, [queryClient]);

  const submitting =
    createMemberMutation.isPending ||
    updateMemberMutation.isPending ||
    deleteMemberMutation.isPending;
  const error =
    (createMemberMutation.error ??
      updateMemberMutation.error ??
      deleteMemberMutation.error) as Error | null;

  // --- Directory ---

  const createMember = useCallback(
    async (request: CreateMemberRequest): Promise<Member> => {
      return createMemberMutation.mutateAsync(request);
    },
    [createMemberMutation],
  );

  const updateMember = useCallback(
    async (id: number, request: UpdateMemberRequest): Promise<Member> => {
      return updateMemberMutation.mutateAsync({ id, request });
    },
    [updateMemberMutation],
  );

  const deleteMember = useCallback(
    async (id: number): Promise<void> => {
      await deleteMemberMutation.mutateAsync(id);
    },
    [deleteMemberMutation],
  );

  // --- Membership ---

  const renewMember = useCallback(
    async (id: number, request: RenewalRequest): Promise<Member> => {
      const result = await membershipService.renewMember(id, request);
      invalidateMemberData();
      return result;
    },
    [invalidateMemberData],
  );

  const renewMinor = useCallback(
    async (id: number, request: MinorRenewalRequest): Promise<Member> => {
      const result = await membershipService.renewMinor(id, request);
      invalidateMemberData();
      return result;
    },
    [invalidateMemberData],
  );

  const renewFamily = useCallback(
    async (headId: number, request: FamilyRenewalRequest): Promise<Member> => {
      const result = await membershipService.renewFamily(headId, request);
      invalidateMemberData();
      return result;
    },
    [invalidateMemberData],
  );

  // --- Family ---

  const addFamilyMember = useCallback(
    async (
      headId: number,
      request: AddFamilyMemberRequest,
    ): Promise<Member> => {
      const result = await familyService.addFamilyMember(headId, request);
      queryClient.invalidateQueries({ queryKey: ['memberFamily'] });
      invalidateMemberData();
      return result;
    },
    [queryClient, invalidateMemberData],
  );

  // --- Freeze ---

  const freezeMember = useCallback(
    async (id: number, request: FreezeRequest): Promise<Member> => {
      const result = await freezeService.freezeMember(id, request);
      invalidateMemberData();
      return result;
    },
    [invalidateMemberData],
  );

  const unfreezeMember = useCallback(
    async (id: number): Promise<Member> => {
      const result = await freezeService.unfreezeMember(id);
      invalidateMemberData();
      return result;
    },
    [invalidateMemberData],
  );

  // --- Access ---

  const setCredentials = useCallback(
    async (id: number, request: SetCredentialsRequest): Promise<Member> => {
      const result = await accessService.setCredentials(id, request);
      invalidateMemberData();
      return result;
    },
    [invalidateMemberData],
  );

  const toggleAccess = useCallback(
    async (id: number, enabled: boolean): Promise<Member> => {
      const result = await accessService.toggleAccess(id, enabled);
      invalidateMemberData();
      return result;
    },
    [invalidateMemberData],
  );

  return {
    submitting,
    error,

    createMember,
    updateMember,
    deleteMember,

    renewMember,
    renewMinor,
    renewFamily,

    addFamilyMember,

    freezeMember,
    unfreezeMember,

    setCredentials,
    toggleAccess,
  };
}