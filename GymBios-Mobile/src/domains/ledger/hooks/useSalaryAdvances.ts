import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateSalaryAdvanceInput, LedgerRole } from '../domain/SalaryAdvance';
import { salaryAdvanceRepository } from '../infrastructure/ApiSalaryAdvanceRepository';
import { ledgerKeys } from './useStaffLedger';
import { trainerLedgerKeys } from './useTrainerLedger';

export const salaryAdvanceKeys = {
  all: ['salaryAdvances'] as const,
  role: (role: LedgerRole) => [...salaryAdvanceKeys.all, role] as const,
};

export function useSalaryAdvances(role: LedgerRole) {
  return useQuery({
    queryKey: salaryAdvanceKeys.role(role),
    queryFn: () => salaryAdvanceRepository.list(role),
    staleTime: 1000 * 60,
  });
}

/** Create and withdraw; both refresh the advances list and the ledger. */
export function useSalaryAdvanceMutations(role: LedgerRole) {
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: salaryAdvanceKeys.role(role) }),
      queryClient.invalidateQueries({ queryKey: role === 'staff' ? ledgerKeys.staff() : trainerLedgerKeys.all }),
    ]);

  const create = useMutation({
    mutationFn: (input: CreateSalaryAdvanceInput) => salaryAdvanceRepository.create(role, input),
    onSettled: refresh,
  });

  const cancel = useMutation({
    mutationFn: (id: number) => salaryAdvanceRepository.cancel(role, id),
    onSettled: refresh,
  });

  return { create, cancel };
}
