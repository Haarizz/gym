import React, { createContext, useContext, useState, useEffect } from 'react';
import { Branch, useMyBranches } from '@/domains/branch';
import { setApiClientBranch } from '@/core/network/apiClient';

export type BranchId = number | 'ALL';

interface BranchContextType {
  selectedBranchId: BranchId;
  setSelectedBranchId: (id: BranchId) => void;
  availableBranches: Branch[];
  isLoading: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  // 1. Default the all branches view for admin upon login, just like the web app
  const [selectedBranchId, setSelectedBranchId] = useState<BranchId>('ALL');

  const handleSetSelectedBranch = (id: BranchId) => {
    setApiClientBranch(id);
    setSelectedBranchId(id);
  };

  const { data: branches, isLoading } = useMyBranches();

  useEffect(() => {
    if (selectedBranchId === 'ALL' && branches?.length === 1) {
      handleSetSelectedBranch(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  return (
    <BranchContext.Provider
      value={{
        selectedBranchId,
        setSelectedBranchId: handleSetSelectedBranch,
        availableBranches: branches || [],
        isLoading,
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
