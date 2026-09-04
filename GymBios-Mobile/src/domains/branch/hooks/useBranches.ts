import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/domains/auth/store';
import { ApiBranchRepository } from '../infrastructure/ApiBranchRepository';

const branchRepository = new ApiBranchRepository();

export function useMyBranches() {
  const appRole = useAuthStore(state => state.appRole);

  return useQuery({
    queryKey: ['my-branches'],
    queryFn: () => branchRepository.getMyBranches(),
  });
}

export function useAllBranches() {
  return useQuery({
    queryKey: ['all-branches'],
    queryFn: () => branchRepository.getAllBranches(),
  });
}
