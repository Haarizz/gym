import { useQuery } from '@tanstack/react-query';
import { trainerPerformanceRepository } from '../infrastructure/ApiTrainerPerformanceRepository';
import type { TrainerPerformanceResponseDTO } from '../domain/TrainerPerformanceData';

export const trainerPerformanceKeys = {
  all: ['performance', 'trainer'] as const,
};

export function useTrainerPerformance() {
  return useQuery({
    queryKey: trainerPerformanceKeys.all,
    queryFn: async (): Promise<TrainerPerformanceResponseDTO> => {
      return trainerPerformanceRepository.getPerformance();
    },
    staleTime: 1000 * 60 * 2,
  });
}
