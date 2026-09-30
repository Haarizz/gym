import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/domains/auth/store/authStore';
import { isNotFoundError } from '../infrastructure/settlementErrors';
import { membershipPaymentKeys } from './membershipPaymentKeys';
import { membershipPaymentService } from './membershipPaymentService';

/**
 * The member's outstanding balance, straight from the backend. Pass a
 * membershipId (e.g. from a notification deep link) to scope it to that
 * membership — isNotFound is then true if it isn't the member's own.
 */
export function useOutstandingBalance(membershipId?: number) {
  const activeTenant = useAuthStore((s) => s.activeTenant);

  const query = useQuery({
    queryKey: membershipPaymentKeys.outstandingBalance(activeTenant, membershipId),
    queryFn: () => membershipPaymentService.getOutstandingBalance(membershipId),
    // A balance can be paid elsewhere (reception, another device) at any time.
    staleTime: 0,
    retry: (failureCount, error) => !isNotFoundError(error) && failureCount < 2,
  });

  return { ...query, isNotFound: isNotFoundError(query.error) };
}
