// Leaf import (not the domain index) so this stays free of screen/hook imports.
import { membershipPaymentPath } from '@/domains/membershipPayment/domain/routes';

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
    default:
      return null;
  }
}
