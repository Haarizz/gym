/** Mirrors the backend's BookingPaymentService.REFUND_CUTOFF. */
export const REFUND_CUTOFF_HOURS = 2;

/**
 * The server sends the refund deadline as the gym's wall-clock time with no zone
 * ("2026-10-12T14:00"), so it is parsed field by field rather than with Date.parse,
 * which would treat it as UTC on some engines.
 */
function parseLocal(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
}

/** "2:00 PM, Oct 12" — or null when there's no deadline. */
export function formatRefundDeadline(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = parseLocal(iso);
  if (!d) return null;
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${time}, ${date}`;
}
