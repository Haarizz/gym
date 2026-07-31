import { useCallback, useState } from 'react';

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

import { MemberDirectoryService } from '../application/directory/MemberDirectoryService';
import { ApiMemberDirectoryRepository } from '../infrastructure/directory/ApiMemberDirectoryRepository';
import { MemberMembershipService } from '../application/membership/MemberMembershipService';
import { ApiMemberMembershipRepository } from '../infrastructure/membership/ApiMemberMembershipRepository';
import { MemberFamilyService } from '../application/family/MemberFamilyService';
import { ApiMemberFamilyRepository } from '../infrastructure/family/ApiMemberFamilyRepository';
import { MemberFreezeService } from '../application/freeze/MemberFreezeService';
import { ApiMemberFreezeRepository } from '../infrastructure/freeze/ApiMemberFreezeRepository';
import { MemberAccessService } from '../application/access/MemberAccessService';
import { ApiMemberAccessRepository } from '../infrastructure/access/ApiMemberAccessRepository';

const directoryRepository = new ApiMemberDirectoryRepository();
const directoryService = new MemberDirectoryService(directoryRepository);

const membershipRepository = new ApiMemberMembershipRepository();
const membershipService = new MemberMembershipService(membershipRepository);

const familyRepository = new ApiMemberFamilyRepository();
const familyService = new MemberFamilyService(familyRepository);

const freezeRepository = new ApiMemberFreezeRepository();
const freezeService = new MemberFreezeService(freezeRepository);

const accessRepository = new ApiMemberAccessRepository();
const accessService = new MemberAccessService(accessRepository);

export function useMemberActions() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // --- Directory ---

  const createMember = useCallback(
    async (request: CreateMemberRequest): Promise<Member> => {
      try {
        setSubmitting(true);
        setError(null);

        return await directoryService.createMember(request);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  const updateMember = useCallback(
    async (id: number, request: UpdateMemberRequest): Promise<Member> => {
      try {
        setSubmitting(true);
        setError(null);

        return await directoryService.updateMember(id, request);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  const deleteMember = useCallback(
    async (id: number): Promise<void> => {
      try {
        setSubmitting(true);
        setError(null);

        await directoryService.deleteMember(id);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  // --- Membership ---

  const renewMember = useCallback(
    async (id: number, request: RenewalRequest): Promise<Member> => {
      try {
        setSubmitting(true);
        setError(null);

        return await membershipService.renewMember(id, request);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  const renewMinor = useCallback(
    async (id: number, request: MinorRenewalRequest): Promise<Member> => {
      try {
        setSubmitting(true);
        setError(null);

        return await membershipService.renewMinor(id, request);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  const renewFamily = useCallback(
    async (headId: number, request: FamilyRenewalRequest): Promise<Member> => {
      try {
        setSubmitting(true);
        setError(null);

        return await membershipService.renewFamily(headId, request);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  // --- Family ---

  const addFamilyMember = useCallback(
    async (
      headId: number,
      request: AddFamilyMemberRequest,
    ): Promise<Member> => {
      try {
        setSubmitting(true);
        setError(null);

        return await familyService.addFamilyMember(headId, request);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  // --- Freeze ---

  const freezeMember = useCallback(
    async (id: number, request: FreezeRequest): Promise<Member> => {
      try {
        setSubmitting(true);
        setError(null);

        return await freezeService.freezeMember(id, request);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  const unfreezeMember = useCallback(
    async (id: number): Promise<Member> => {
      try {
        setSubmitting(true);
        setError(null);

        return await freezeService.unfreezeMember(id);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  // --- Access ---

  const setCredentials = useCallback(
    async (id: number, request: SetCredentialsRequest): Promise<Member> => {
      try {
        setSubmitting(true);
        setError(null);

        return await accessService.setCredentials(id, request);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  const toggleAccess = useCallback(
    async (id: number, enabled: boolean): Promise<Member> => {
      try {
        setSubmitting(true);
        setError(null);

        return await accessService.toggleAccess(id, enabled);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [],
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