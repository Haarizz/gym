/**
 * Navigation Layout Route Configurations
 * 
 * Defines route patterns for hiding top role headers, floating bottom tabs,
 * and module routes for Expo Router layouts.
 */

export type RoutePattern = readonly [string, string?] | readonly string[];

/**
 * Routes where both the top role header AND bottom tab bar should be hidden (full screen view).
 */
export const FULL_SCREEN_ROUTES: readonly RoutePattern[] = [
  // Staff
  ['staff', 'create'],
  ['staff', 'edit'],

  // Membership Plans
  ['membership-plans', 'create'],
  ['membership-plans', 'edit'],

  // Members
  ['members', 'create'],
  ['members', 'edit'],

  // Billing
  ['billing', 'create-receipt'],

  // Community
  ['community', 'create-post'],

  // Promotions
  ['promotions', 'create'],
  ['promotions', 'edit'],
  ['messaging', 'compose-message'],
  ['messaging', 'compose'],

  // Profile Hub & Sub-screens
  ['profile'],
] as const;

/**
 * Module routes that should be accessible via navigation but hidden from the bottom tab bar.
 */
export const MODULE_ROUTES = [
  'membership-plans',
  'members',
  'billing',
  'attendance',
  'check-in',
  'training-streams',
  'facilities',
  'community',
  'promotions',
  'referrals',
  'leads',
  'follow-ups',
  'messaging',
  'automations',
  'workout-feedback',
  'roles',
  'profile',
  'trainer',
] as const;

/**
 * Routes where the top role header should be hidden, but bottom tab bar remains visible.
 */
export const HIDE_ROLE_HEADER_ROUTES: readonly (readonly [string, string])[] = [
  // Billing
  ['billing', 'receipts'],
  ['billing', 'dues'],
  ['billing', 'statements'],
  ['billing', 'members'],
  ['billing', 'reports'],
  ['billing', 'create-receipt'],

  // Members & Staff Details
  ['members', '[id]'],
  ['staff', '[id]'],

  // Attendance
  ['attendance', 'staff'],
  ['attendance', 'reports'],
  ['attendance', 'trends'],
  ['attendance', 'today'],
  ['attendance', 'members'],

  // Check-in
  ['check-in', 'members-staff'],
  ['check-in', 'walk-in'],

  // Training Streams
  ['training-streams', 'create'],
  ['training-streams', 'upload'],

  // Facilities
  ['facilities', 'create'],
  ['facilities', '[id]'],

  // Analytics
  ['analytics', 'community'],
  ['analytics', 'community-advanced'],

  ['referrals','overview'],
  ['referrals','members'],
  ['referrals','activity'],
  ['referrals','my-rewards'],
  ['referrals','reward-rules'],
  ['referrals','reward-queue'],
  ['referrals','analytics'],
  ['referrals','settings'],

  ['messaging','history'],
  ['messaging','compose'],
  ['messaging','compose-message'],
  ['messaging','templates'],
  ['messaging','analytics'],
  
  ['automations','[id]'],
  ['automations','create'],

  ['workout-feedback','check-in'],
  ['workout-feedback','recent'],
  ['workout-feedback','active-sessions'],
  ['workout-feedback','analytics'],
  ['workout-feedback','stats'],
  
  ['roles', '[id]']
] as const;

/**
 * Check if current route segments represent a full screen view.
 */
export function isFullScreenRoute(segments: readonly string[]): boolean {
  if (!segments || segments.length < 2) return false;
  return FULL_SCREEN_ROUTES.some(([feature, action]) => {
    if (action === undefined) {
      return segments[1] === feature;
    }
    return segments[1] === feature && segments[2] === action;
  });
}

/**
 * Check if top role header should be hidden for current route segments.
 */
export function isRoleHeaderHiddenRoute(segments: readonly string[]): boolean {
  if (!segments || segments.length < 2) return false;
  return HIDE_ROLE_HEADER_ROUTES.some(
    ([feature, page]) => segments[1] === feature && segments[2] === page,
  );
}

/**
 * Check if current route is the top-level community screen.
 */
export function isCommunityRoute(segments: readonly string[]): boolean {
  return segments?.[1] === 'community';
}
