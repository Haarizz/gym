/**
 * Mirrors the backend rule on POST /checkin (CheckInService.validateMembership):
 * the membership status must be "active" (case-insensitive) and the membership
 * must not have run past its end date. Having a plan attached isn't enough —
 * expired and frozen members still carry one.
 */
export interface CheckInEligibility {
  eligible: boolean;
  /** Human-readable membership state for a badge, e.g. "active", "expired", "frozen". */
  label: string;
}

export function getCheckInEligibility(person: {
  status?: string | null;
  expiryDate?: string | null;
  endDate?: string | null;
}): CheckInEligibility {
  const status = person.status?.trim();
  if (!status) return { eligible: false, label: 'No membership' };

  const isActiveStatus = status.toLowerCase() === 'active';
  // Same precedence as the backend: expiry_date, falling back to membership_end_date.
  const expiry = person.expiryDate || person.endDate;
  const isExpiredByDate = !!expiry && new Date(expiry).getTime() < Date.now();

  if (isActiveStatus && isExpiredByDate) return { eligible: false, label: 'expired' };
  return { eligible: isActiveStatus, label: status.replace(/_/g, ' ').toLowerCase() };
}
