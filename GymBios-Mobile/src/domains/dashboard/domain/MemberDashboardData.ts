export interface MemberInfo {
  name: string;
  role: string;
  gymName: string;
  membershipType: string;
  daysRemaining: number;
  validUntil: string;
  isActive: boolean;
  status?: string;
  isFrozen: boolean;
  totalVisits: number;
}

export interface MemberTodayScheduleItem {
  id?: string | number;
  time: string;
  class: string;
  trainer: string;
  spotsLeft: number;
  location?: string;
}

export interface MemberQuickStatItem {
  kind: 'checkIns' | 'classes' | 'calories' | 'streak';
  label: string;
  value: string;
  icon: string;
  color: string;
}

export interface MemberDashboardCheckInStatus {
  checkedIn: boolean;
  activeAttendanceId?: number | null;
  checkInTime?: string | null;
}

/** The promotion the dashboard banner shows — already filtered and ranked for this member by the server. */
export interface MemberOffer {
  id: number;
  name: string;
  description?: string | null;
  /** percentage / fixed / free / promotional-access-days */
  discountType?: string | null;
  discountValue: number;
  maximumDiscount?: number | null;
  code?: string | null;
  /** yyyy-MM-dd */
  endDate?: string | null;
  /** membership / services / special-events / loyalty / demographics */
  category?: string | null;
  termsAndConditions?: string | null;
  /** Picked for this member by the gym (a "Specific Members" promotion) */
  personal: boolean;
}

/**
 * What "Claim" does: renew with the offer applied (membership offers — by code, or by id when it
 * has none), book a session with its code (services offers), or just copy the code. A Promotional
 * Access Days offer (staff apply those), or a non-membership one without a code, has nothing to claim.
 */
export type OfferClaim = 'renew' | 'book' | 'copy' | 'none';

export function offerClaim(offer: MemberOffer): OfferClaim {
  if (offer.discountType === 'promotional-access-days') return 'none';
  if (offer.category === 'membership') return 'renew';
  if (!offer.code) return 'none';
  if (offer.category === 'services') return 'book';
  return 'copy';
}

export interface MemberDashboardData {
  memberInfo: MemberInfo;
  todaysSchedule: MemberTodayScheduleItem[];
  quickStats: MemberQuickStatItem[];
  checkInStatus?: MemberDashboardCheckInStatus;
  offer?: MemberOffer;
}
