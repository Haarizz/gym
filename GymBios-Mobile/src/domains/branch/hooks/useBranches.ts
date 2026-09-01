import { useQuery } from '@tanstack/react-query';
import { ApiBranchRepository } from '../infrastructure/ApiBranchRepository';

const branchRepository = new ApiBranchRepository();

export function useMyBranches() {
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
