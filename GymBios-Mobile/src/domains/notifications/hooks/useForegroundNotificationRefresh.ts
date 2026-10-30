import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';

import { notificationKeys } from '@/domains/profile/notifications/hooks/notificationKeys';
import { queryKeys as bookingKeys } from '@/domains/memberPortal/bookings/hooks/useMemberBookings';
import {
  BOOKING_PAYMENT_APPROVED_NOTIFICATION_TYPE,
  BOOKING_PAYMENT_REJECTED_NOTIFICATION_TYPE,
  PAYMENT_APPROVED_NOTIFICATION_TYPE,
  PAYMENT_REJECTED_NOTIFICATION_TYPE,
} from '../domain/notificationRoutes';

const PAYMENT_DECISION_TYPES: unknown[] = [PAYMENT_APPROVED_NOTIFICATION_TYPE, PAYMENT_REJECTED_NOTIFICATION_TYPE];
const BOOKING_PAYMENT_DECISION_TYPES: unknown[] = [
  BOOKING_PAYMENT_APPROVED_NOTIFICATION_TYPE,
  BOOKING_PAYMENT_REJECTED_NOTIFICATION_TYPE,
];

/**
 * Reacts to pushes that arrive while the app is open. A payment approval or
 * rejection re-checks the approval gate right away, which moves a member off the
 * pending screen and shows the matching toast (usePaymentApprovalToast). A booking
 * payment decision refreshes the member's bookings, so a rejection shows up at once.
 */
export function useForegroundNotificationRefresh() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const type = notification.request.content.data?.type;
      if (BOOKING_PAYMENT_DECISION_TYPES.includes(type)) {
        queryClient.invalidateQueries({ queryKey: bookingKeys.all });
        queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        return;
      }
      if (!PAYMENT_DECISION_TYPES.includes(type)) return;
      queryClient.invalidateQueries({ queryKey: ['membership-approval-status'] });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    });
    return () => subscription.remove();
  }, [queryClient]);
}
