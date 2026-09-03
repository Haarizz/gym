import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Branch, useMyBranches } from '@/domains/branch';
import { setApiClientBranch } from '@/core/network/apiClient';
import { useAuthStore } from '@/domains/auth/store';
import { ApiMemberDirectoryRepository } from '@/domains/members/infrastructure/directory/ApiMemberDirectoryRepository';
import { useQuery } from '@tanstack/react-query';

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
  });

  const { data: branches, isLoading: isBranchesLoading } = useMyBranches();

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

  // 2. State for user-selected branch
  const [selectedBranchId, setSelectedBranchId] = useState<BranchId>('ALL');

  // 3. Effective branch ID
  const effectiveBranchId = selectedBranchId === 'ALL' && derivedBranchId !== 'ALL' 
    ? derivedBranchId 
    : selectedBranchId;

  // 4. Sync API client SYNCHRONOUSLY before children render
  useMemo(() => {
    setApiClientBranch(effectiveBranchId);
  }, [effectiveBranchId]);

  const handleSetSelectedBranch = (id: BranchId) => {
    setSelectedBranchId(id);
    setApiClientBranch(id);
  };

  // Block rendering until we resolve the branch ID for members
  if (appRole === 'member' && !user?.branchId && (isMemberProfileLoading || isBranchesLoading)) {
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
