// Leaf import (not the domain index) so this stays free of screen/hook imports.
import { membershipPaymentPath } from '@/domains/membershipPayment/domain/routes';
import { MEMBER_ENQUIRY_PUSH_TYPE } from '@/domains/memberPortal/enquiries/enquiriesApi';
import { CONVERSATION_PUSH_TYPE } from '@/domains/conversations/domain/types';

/** Sent by the backend's MemberPaymentApprovalNotifier when staff approve a Cash/Credit/Mixed purchase. */
export const PAYMENT_APPROVED_NOTIFICATION_TYPE = 'membership_payment_approved';
/** Sent by the same notifier when staff reject one; the message carries their reason. */
export const PAYMENT_REJECTED_NOTIFICATION_TYPE = 'membership_payment_rejected';
/** Sent by the backend's BookingPaymentNotifier when staff approve / reject a booking's payment. */
export const BOOKING_PAYMENT_APPROVED_NOTIFICATION_TYPE = 'booking_payment_approved';
export const BOOKING_PAYMENT_REJECTED_NOTIFICATION_TYPE = 'booking_payment_rejected';
/** Sent by the backend's SalaryAdvanceService when a staff/trainer advance request is approved or rejected. */
export const SALARY_ADVANCE_DECIDED_NOTIFICATION_TYPE = 'salary_advance_decided';

/**
 * Maps a push notification's data payload to the in-app route it opens.
 * Only known notification types are routed — a payload can never send the
 * member to an arbitrary screen. appRole picks the app area for pushes staff and
 * trainers get (a chat message, a salary advance decision); the rest are member-only.
 */
export function resolveNotificationPath(
  data: Record<string, unknown> | null | undefined,
  appRole?: string | null,
): string | null {
  if (!data) return null;
  const staffGroup = appRole === 'staff' ? '(staff)' : appRole === 'trainer' ? '(trainer)' : null;

  switch (data.type) {
    case 'outstanding_balance': {
      const membershipId = Number(data.membershipId);
      return Number.isInteger(membershipId) && membershipId > 0 ? membershipPaymentPath(membershipId) : null;
    }
    // Only members raise enquiries, so the reply always opens the member profile.
    case MEMBER_ENQUIRY_PUSH_TYPE: {
      const enquiryId = Number(data.enquiryId);
      return Number.isInteger(enquiryId) && enquiryId > 0
        ? `/(member)/profile?view=enquiries&enquiryId=${enquiryId}`
        : '/(member)/profile?view=enquiries';
    }
    // A chat message: from staff to a member, or from a member to staff / the front desk.
    case CONVERSATION_PUSH_TYPE: {
      const conversationId = Number(data.conversationId);
      const valid = Number.isInteger(conversationId) && conversationId > 0;
      if (staffGroup) {
        return valid ? `/${staffGroup}/messaging/chat?conversationId=${conversationId}` : `/${staffGroup}/messaging/chats`;
      }
      return valid ? `/(member)/team/chat?conversationId=${conversationId}` : '/(member)/team';
    }
    // Opens the ledger's Advances tab in the employee's own role group.
    case SALARY_ADVANCE_DECIDED_NOTIFICATION_TYPE:
      return staffGroup ? `/${staffGroup}/ledger?tab=advances` : null;
    // A rejected booking is listed (with the reason) on the Bookings screen.
    case BOOKING_PAYMENT_APPROVED_NOTIFICATION_TYPE:
    case BOOKING_PAYMENT_REJECTED_NOTIFICATION_TYPE:
      return '/(member)/bookings';
    // Informational only: tapping it just opens the app.
    case PAYMENT_APPROVED_NOTIFICATION_TYPE:
    case PAYMENT_REJECTED_NOTIFICATION_TYPE:
    default:
      return null;
  }
}
