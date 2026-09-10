import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/domains/auth/store';
import { ApiBranchRepository } from '../infrastructure/ApiBranchRepository';

const branchRepository = new ApiBranchRepository();

export function useMyBranches() {
  const appRole = useAuthStore(state => state.appRole);

  return useQuery({
    queryKey: ['my-branches'],
    queryFn: () => branchRepository.getMyBranches(),
    // A member whose Cash/Credit/Mixed purchase is still awaiting reception
    // approval gets a 403 here by design (see TenantContextFilter on the
    // backend) — retrying is pointless until staff act, and the default
    // retry:3 turned every mount into a burst of repeated 403s.
    retry: false,
  });
}

export function useAllBranches() {
  return useQuery({
    queryKey: ['all-branches'],
    queryFn: () => branchRepository.getAllBranches(),
    retry: false,
  });
}
