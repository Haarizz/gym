// Leaf import (not the domain index) so this stays free of screen/hook imports.
import { membershipPaymentPath } from '@/domains/membershipPayment/domain/routes';

/** Sent by the backend's MemberPaymentApprovalNotifier when staff approve a Cash/Credit/Mixed purchase. */
export const PAYMENT_APPROVED_NOTIFICATION_TYPE = 'membership_payment_approved';
/** Sent by the same notifier when staff reject one; the message carries their reason. */
export const PAYMENT_REJECTED_NOTIFICATION_TYPE = 'membership_payment_rejected';

/**
 * Maps a push notification's data payload to the in-app route it opens.
 * Only known notification types are routed — a payload can never send the
 * member to an arbitrary screen.
 */
export function resolveNotificationPath(data: Record<string, unknown> | null | undefined): string | null {
  if (!data) return null;

  switch (data.type) {
    case 'outstanding_balance': {
      const membershipId = Number(data.membershipId);
      return Number.isInteger(membershipId) && membershipId > 0 ? membershipPaymentPath(membershipId) : null;
    }
    // Informational only: tapping it just opens the app.
    case PAYMENT_APPROVED_NOTIFICATION_TYPE:
    case PAYMENT_REJECTED_NOTIFICATION_TYPE:
    default:
      return null;
  }
}
