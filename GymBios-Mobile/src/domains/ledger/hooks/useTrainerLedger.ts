import { useQuery } from '@tanstack/react-query';
import type { TrainerLedgerData } from '../domain/TrainerLedgerData';
import { trainerLedgerRepository } from '../infrastructure/ApiTrainerLedgerRepository';

export const trainerLedgerKeys = {
  all: ['ledger', 'trainer'] as const,
};

export function useTrainerLedger() {
  const query = useQuery({
    queryKey: trainerLedgerKeys.all,
    queryFn: trainerLedgerRepository.getLedger,
    staleTime: 1000 * 60 * 2,
  });

  return {
    ...query,
    data: query.data,
  };
}

