import { useQuery } from '@tanstack/react-query';
import type { StaffLedgerData } from '../domain/StaffLedgerData';
import { staffLedgerRepository } from '../infrastructure/ApiStaffLedgerRepository';

export const ledgerKeys = {
  all: ['ledger'] as const,
  staff: () => [...ledgerKeys.all, 'staff'] as const,
};

export function useStaffLedger() {
  return useQuery({
    queryKey: ledgerKeys.staff(),
    queryFn: (): Promise<StaffLedgerData> => staffLedgerRepository.getStaffLedger(),
    staleTime: 1000 * 60 * 2,
  });
}
