/**
 * A member can hold memberships at several gyms on one GymBios account; the app works
 * in one gym at a time (X-Tenant-ID). This module lists those gyms, switches between
 * them, and asks which one to open when a member with several signs in on a new device.
 * See docs/mobile-multi-membership-switcher-plan.md.
 */
export {
  useMyGymMemberships,
  getMyGymMemberships,
  fetchMyGymMemberships,
  gymMembershipKeys,
  type GymMembership,
  type GymMembershipStatus,
} from './gymMembershipsApi';
export { switchGym } from './switchGym';
export { GymSwitcherSheet } from './presentation/GymSwitcherSheet';
export { ChooseGymScreen } from './presentation/ChooseGymScreen';
