import { useQuery } from '@tanstack/react-query';
import type { StaffPerformanceData } from '../domain/StaffPerformanceData';
import { staffPerformanceRepository } from '../infrastructure/ApiStaffPerformanceRepository';

export const performanceKeys = {
  all: ['performance'] as const,
  staff: () => [...performanceKeys.all, 'staff'] as const,
};

export function useStaffPerformance() {
  return useQuery<StaffPerformanceData>({
    queryKey: performanceKeys.staff(),
    queryFn: () => staffPerformanceRepository.getStaffPerformance(),
    staleTime: 1000 * 60 * 2,
  });
}
