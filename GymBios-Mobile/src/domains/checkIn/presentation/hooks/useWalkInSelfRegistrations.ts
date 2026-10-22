import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { checkInKeys } from '../../hooks/checkInKeys';
import { walkInApi } from '../../infrastructure/WalkInApi';

/**
 * Visitors who signed up with the walk-in QR and wait for staff to take payment.
 * Polled, since they register from their own phones while the desk has this open.
 */
export function usePendingWalkInRegistrations() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: checkInKeys.pendingWalkIns(),
    queryFn: () => walkInApi.listPending(),
    refetchInterval: 30_000,
  });
  const dismiss = useMutation({
    mutationFn: (id: number) => walkInApi.dismiss(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: checkInKeys.pendingWalkIns() }),
  });
  return { pending: query.data ?? [], isLoading: query.isLoading, refetch: query.refetch, dismiss };
}

/** The signed-in user's walk-in QR link (personal for staff). Fetched only when shown. */
export function useMyWalkInLink(enabled: boolean) {
  return useQuery({
    queryKey: checkInKeys.myWalkInLink(),
    queryFn: () => walkInApi.myLink(),
    enabled,
  });
}
