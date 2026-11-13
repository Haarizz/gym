// Family / Couple households on a membership application — shared by the public join
// page (/join share link) and the desk's Member Registration Request (Service Portfolios).
// The applicant is the family head; a FamilyRow is everyone joining with them.
// Mirrors the server's checks in ServicePortfolioService.householdMembers and
// MemberService.enforceFamilyMemberCaps, so the form catches what approval would reject.
import type { ApplicationFamilyMember, PortfolioHousehold } from './supabase/service-portfolio-service';

export interface FamilyRow {
  key: number;
  name: string;
  relationship: string;
  gender: string;
  dob: string;
  child: boolean;
  phone: string;
  email: string;
}
export type FamilyField = 'name' | 'relationship' | 'gender' | 'dob' | 'email';

// Same choices as the desk's Add Member family section; the gender each implies.
export const RELATIONSHIPS: { value: string; gender: 'Male' | 'Female' | null }[] = [
  { value: 'Wife', gender: 'Female' },
  { value: 'Husband', gender: 'Male' },
  { value: 'Son', gender: 'Male' },
  { value: 'Daughter', gender: 'Female' },
  { value: 'Father', gender: 'Male' },
  { value: 'Mother', gender: 'Female' },
  { value: 'Brother', gender: 'Male' },
  { value: 'Sister', gender: 'Female' },
  { value: 'Other', gender: null },
];
export const COUPLE_RELATIONSHIPS = ['Wife', 'Husband', 'Other'];
export const MAX_FAMILY_ROWS = 20;

let familyKey = 0;
export const newFamilyRow = (): FamilyRow =>
  ({ key: ++familyKey, name: '', relationship: '', gender: '', dob: '', child: false, phone: '', email: '' });

export const ageOn = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : (Date.now() - d.getTime()) / (365.25 * 864e5);
};
/** Under 18 — from the date of birth when given (the server works it out the same way). */
export const isChild = (r: FamilyRow) => {
  const age = r.dob ? ageOn(r.dob) : null;
  return age != null ? age < 18 : r.child;
};
/** The row's gender: picked, or implied by the relationship. */
export const rowGender = (r: FamilyRow) => r.gender || RELATIONSHIPS.find(x => x.value === r.relationship)?.gender || '';

/** What the household pays: per person (applicant included) when the plan is priced that way, else the plan price. */
export function householdTotal(planPrice: number, h: PortfolioHousehold | null | undefined, headcount: number) {
  if (!h?.price_per_member) return planPrice;
  let total = 0;
  for (let i = 0; i < headcount; i++) {
    total += h.max_members && i >= h.max_members ? (h.additional_member_price ?? h.price_per_member) : h.price_per_member;
  }
  return total;
}

/**
 * The plan's member caps as one message, or null when the household fits.
 * `self` names the applicant: "you" on the public page, "the member" at the desk.
 */
export function householdCapError(h: PortfolioHousehold | null | undefined, rows: FamilyRow[], self = 'you'): string | null {
  if (!h) return null;
  if (h.kind === 'couple') {
    if (rows.length !== 1) return `A couple plan is for ${self} and one partner.`;
    if (isChild(rows[0])) return `A couple plan is for ${self} and one adult partner.`;
    return null;
  }
  if (rows.length === 0) return 'Add at least one family member.';
  const adults = 1 + rows.filter(r => !isChild(r)).length;
  const children = rows.filter(isChild).length;
  if (h.max_adults && adults > h.max_adults) return `This plan allows up to ${h.max_adults} adults, including ${self}.`;
  if (h.max_children && children > h.max_children) return `This plan allows up to ${h.max_children} children.`;
  if (h.max_members && adults + children > h.max_members && !h.allow_additional_members) {
    return `This plan allows up to ${h.max_members} people, including ${self}.`;
  }
  return null;
}

/** One line saying who the plan covers. */
export function householdLine(h: PortfolioHousehold | null | undefined, self = 'you') {
  if (!h) return null;
  if (h.kind === 'couple') return `For ${self} and one partner`;
  const parts: string[] = [];
  if (h.max_members) parts.push(`Up to ${h.max_members} people${h.allow_additional_members ? ' (more can be added)' : ''}`);
  if (h.max_adults) parts.push(`${h.max_adults} adults`);
  if (h.max_children) parts.push(`${h.max_children} children`);
  return parts.length ? parts.join(' · ') : `For ${self} and ${self === 'you' ? 'your' : 'their'} family`;
}

/** A row as sent on the application. Children get no phone or email. */
export function toFamilyMember(r: FamilyRow): ApplicationFamilyMember {
  const child = isChild(r);
  return {
    name: r.name.trim(),
    relationship: r.relationship,
    gender: rowGender(r),
    date_of_birth: r.dob || null,
    minor: child,
    phone: child ? null : r.phone.trim() || null,
    email: child ? null : r.email.trim() || null,
  };
}
