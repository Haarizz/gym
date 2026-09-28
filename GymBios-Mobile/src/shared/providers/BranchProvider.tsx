import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { Branch, useMyBranches } from '@/domains/branch';
import { setApiClientBranch } from '@/core/network/apiClient';
import { useAuthStore } from '@/domains/auth/store';
import { ApiMemberDirectoryRepository } from '@/domains/members/infrastructure/directory/ApiMemberDirectoryRepository';
import { useQuery } from '@tanstack/react-query';
import { useMembershipApprovalStatus } from '@/domains/discovery/hooks/useMembershipApprovalStatus';

export type BranchId = number | 'ALL';

interface BranchContextType {
  selectedBranchId: BranchId;
  setSelectedBranchId: (id: BranchId) => void;
  availableBranches: Branch[];
  isLoading: boolean;
}

const memberRepository = new ApiMemberDirectoryRepository();

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(state => state.user);
  const appRole = useAuthStore(state => state.appRole);

  // Fetch member profile if user is a member to get their branch ID
  const { data: memberProfile, isLoading: isMemberProfileLoading } = useQuery({
    queryKey: ['current-member'],
    queryFn: () => memberRepository.getCurrentMember(),
    enabled: appRole === 'member' && !user?.branchId,
    retry: false,
  });

  // /api/branches/my-branches is 403'd by TenantContextFilter while a member's
  // Cash/Credit/Mixed purchase awaits reception approval — hold it until
  // /api/members/me confirms access isn't pending (see MemberApprovalGate).
  const approval = useMembershipApprovalStatus({ enabled: appRole === 'member' });
  const isApprovalPending = approval.data?.approvalStatus === 'PENDING';
  const { data: branches, isLoading: isBranchesLoading } = useMyBranches({
    enabled: appRole !== 'member' || (!approval.isLoading && !isApprovalPending),
  });

  // 1. Determine the best available branch ID based on loaded data
  let derivedBranchId: BranchId = 'ALL';
  if (user?.branchId) {
    derivedBranchId = user.branchId;
  } else if (appRole === 'member' && memberProfile?.branchId) {
    derivedBranchId = memberProfile.branchId;
  } else if (branches?.length === 1) {
    // Auto-select if there's exactly one branch available to the user
    derivedBranchId = branches[0].id;
  }

  // 2. State for user-selected branch. `null` means "no explicit choice yet",
  // distinct from 'ALL' which is the user's explicit "All Branches" choice.
  const [userSelectedBranchId, setUserSelectedBranchId] = useState<BranchId | null>(null);

  // 3. Effective branch ID: defer to the derived default only until the user
  // has made an explicit selection.
  const effectiveBranchId = userSelectedBranchId === null
    ? derivedBranchId
    : userSelectedBranchId;

  // 4. Sync API client SYNCHRONOUSLY before children render
  useMemo(() => {
    setApiClientBranch(effectiveBranchId);
  }, [effectiveBranchId]);

  const handleSetSelectedBranch = (id: BranchId) => {
    setUserSelectedBranchId(id);
    setApiClientBranch(id);
  };

  // Block rendering until we resolve the branch ID for members — but only on
  // the first resolution. Returning to the foreground (e.g. after an OS
  // permission / "turn on location" dialog) refetches these queries, and a
  // query with no cached data goes back to isLoading; unmounting children then
  // would tear down the tab navigator and drop the user back on Home.
  const isResolving =
    appRole === 'member' &&
    (approval.isLoading || (!user?.branchId && (isMemberProfileLoading || isBranchesLoading)));
  const hasResolvedRef = useRef(false);
  if (!isResolving) {
    hasResolvedRef.current = true;
  }

  if (isResolving && !hasResolvedRef.current) {
    return null; // Block children from mounting without the branch context
  }

  return (
    <BranchContext.Provider
      value={{
        selectedBranchId: effectiveBranchId,
        setSelectedBranchId: handleSetSelectedBranch,
        availableBranches: branches || [],
        isLoading: isBranchesLoading || isMemberProfileLoading,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranchContext() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranchContext must be used within a BranchProvider');
  }
  return context;
}
