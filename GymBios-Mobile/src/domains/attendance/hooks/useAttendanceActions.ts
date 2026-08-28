import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CheckOutResult } from '../application/AttendanceRepository';
import { AttendanceService } from '../application/AttendanceService';
import { AttendanceApiRepository } from '../infrastructure/AttendanceApiRepository';

import { attendanceKeys } from './attendanceKeys';

const repository = new AttendanceApiRepository();
const attendanceService = new AttendanceService(repository);

/**
 * Check out an attendance record.
 * Invalidates only the affected queries — never the whole cache.
 */
export function useCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number): Promise<CheckOutResult> =>
      attendanceService.checkout(id),
    onSuccess: (_data, id) => {
      // The attendance list and detail are directly affected.
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.detail(id) });
      // Stats and reports may have changed after a checkout.
      queryClient.invalidateQueries({ queryKey: attendanceKeys.stats });
      // Also invalidate check-in today list because checkout modifies recent check-ins
      queryClient.invalidateQueries({ queryKey: ['checkIns', 'today'] });
    },
  });
}

export type { CheckOutResult };