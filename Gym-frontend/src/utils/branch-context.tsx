import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Branch {
  id: number;
  branchName: string;
  branchCode: string;
  isDefault: boolean;
}

interface BranchContextType {
  activeBranchId: number | null;
  activeBranchName: string;
  accessibleBranches: Branch[];
  setActiveBranch: (branchId: number | null) => void;
  isAllBranches: boolean;
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
  const [activeBranchId, setActiveBranchIdState] = useState<number | null>(null);
  const [accessibleBranches, setAccessibleBranches] = useState<Branch[]>([]);

  const refreshBranches = async () => {
    try {
      const { branchApi } = await import('./supabase/branch-service');
      const data = await branchApi.getMyBranches();
      const mappedBranches = data.map((b: any) => ({
         id: b.id,
         branchName: b.branch_name || b.branchName,
         branchCode: b.branch_code || b.branchCode,
         isDefault: b.isDefault || b.is_default || false
      }));
      setAccessibleBranches(mappedBranches);
      sessionStorage.setItem('accessibleBranches', JSON.stringify(mappedBranches));
      
      // Auto-update active branch if needed
      const storedActiveBranchId = sessionStorage.getItem('activeBranchId');
      if (storedActiveBranchId === null || storedActiveBranchId === "undefined") {
          const defaultBranch = mappedBranches.find((b: any) => b.isDefault);
          if (defaultBranch) {
              setActiveBranchIdState(defaultBranch.id);
              sessionStorage.setItem('activeBranchId', defaultBranch.id.toString());
          } else if (mappedBranches.length > 0) {
              setActiveBranchIdState(mappedBranches[0].id);
              sessionStorage.setItem('activeBranchId', mappedBranches[0].id.toString());
          }
      } else if (storedActiveBranchId !== "null") {
          // Ensure state matches what was just set by authService.signIn
          setActiveBranchIdState(Number(storedActiveBranchId));
      } else {
          setActiveBranchIdState(null);
      }
    } catch (e) {
      console.error("Failed to refresh branches", e);
    }
  };

  useEffect(() => {
    // 1. Load branches from session storage synchronously for fast initial render
    const storedBranchesStr = sessionStorage.getItem('accessibleBranches');
    let branches: Branch[] = [];
    if (storedBranchesStr) {
      try {
        branches = JSON.parse(storedBranchesStr);
        setAccessibleBranches(branches);
      } catch (e) {
        console.error('Failed to parse accessible branches', e);
      }
    }

    const storedActiveBranchId = sessionStorage.getItem('activeBranchId');
    if (storedActiveBranchId !== null && storedActiveBranchId !== "null" && storedActiveBranchId !== "undefined") {
        setActiveBranchIdState(Number(storedActiveBranchId));
    } else if (storedActiveBranchId === "null") {
        setActiveBranchIdState(null);
    } else {
        // Auto-select default or first branch
        const defaultBranch = branches.find(b => b.isDefault);
        if (defaultBranch) {
            setActiveBranchIdState(defaultBranch.id);
            sessionStorage.setItem('activeBranchId', defaultBranch.id.toString());
        } else if (branches.length > 0) {
            setActiveBranchIdState(branches[0].id);
            sessionStorage.setItem('activeBranchId', branches[0].id.toString());
        }
    }

    // 2. Fetch fresh branches from backend if user is logged in
    if (sessionStorage.getItem('token')) {
      refreshBranches().catch(e => console.error("Failed to refresh branches in background", e));
    }
  }, []);

  const setActiveBranch = (branchId: number | null) => {
    setActiveBranchIdState(branchId);
    if (branchId === null) {
        sessionStorage.setItem('activeBranchId', 'null');
    } else {
        sessionStorage.setItem('activeBranchId', branchId.toString());
    }
    
    // Dispatch a custom event so non-react code (like axios interceptors) or other windows know it changed
    window.dispatchEvent(new Event('branchChanged'));
  };

  const activeBranch = accessibleBranches.find(b => b.id === activeBranchId);
  const activeBranchName = activeBranchId === null ? "All Branches" : (activeBranch?.branchName || "Unknown Branch");

  return (
    <BranchContext.Provider value={{
      activeBranchId,
      activeBranchName,
      accessibleBranches,
      setActiveBranch,
      isAllBranches: activeBranchId === null,
      refreshBranches
    }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
}
