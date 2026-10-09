import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { toast } from '@/shared/components/Toasts';
import { useAuthStore } from '@/domains/auth/store/authStore';
import { useMembershipApprovalStatus } from './useMembershipApprovalStatus';

const POLL_WHILE_PENDING_MS = 15_000;

/**
 * Toasts once when staff approve or reject the member's Cash/Credit/Mixed
 * purchase, i.e. when the approval status flips PENDING → APPROVED/REJECTED. Doesn't rely on the push
 * arriving: while pending it polls, and re-checks whenever the app returns to
 * the foreground (an approval push received in the foreground also triggers a
 * re-check, see useForegroundNotificationToasts).
 */
export function usePaymentApprovalToast() {
  const activeTenant = useAuthStore((s) => s.activeTenant);
  const { data, refetch } = useMembershipApprovalStatus({ pollWhilePendingMs: POLL_WHILE_PENDING_MS });
  const status = data?.approvalStatus;
  const previous = useRef<{ tenant: typeof activeTenant; status: typeof status }>({ tenant: activeTenant, status });

  useEffect(() => {
    const prev = previous.current;
    if (prev.tenant === activeTenant && prev.status === 'PENDING' && status === 'APPROVED') {
      toast.success(
        `Your payment${data?.membershipPlan ? ` for ${data.membershipPlan}` : ''} has been approved. Your membership is now active.`,
        { title: 'Payment Approved' },
      );
    }
    if (prev.tenant === activeTenant && prev.status === 'PENDING' && status === 'REJECTED') {
      const reason = data?.rejectionReason?.trim();
      toast.error(
        `Your payment${data?.membershipPlan ? ` for ${data.membershipPlan}` : ''} was rejected.${reason ? ` Reason: ${reason}` : ''}`,
        { title: 'Payment Rejected' },
      );
    }
    previous.current = { tenant: activeTenant, status };
  }, [activeTenant, status, data?.membershipPlan, data?.rejectionReason]);

  useEffect(() => {
    if (status !== 'PENDING') return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetch();
    });
    return () => subscription.remove();
  }, [status, refetch]);
}
