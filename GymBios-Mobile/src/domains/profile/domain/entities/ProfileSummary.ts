import type { PerformanceRole } from './UserPerformance';

/** Roles that have summary stats; admins get none. */
export type SummaryRole = PerformanceRole | 'member';

/**
 * The three headline stats under the avatar in the profile hub. Staff and trainers see
 * their month-to-date performance; members see their gym activity. Null values render
 * as "—" (no target set, no schedule, no active plan).
 */
export type ProfileSummary =
  | {
      kind: 'employee';
      performanceScore: number | null;
      /** Sessions (trainers) or conversions (staff) achieved this month. */
      targetAchieved: number;
      /** Monthly target for the same metric; 0 when none is set. */
      targetTotal: number;
      attendanceRate: number | null;
    }
  | {
      kind: 'member';
      totalVisits: number;
      streakDays: number;
      /** Days left on the current membership; null without an active plan. */
      membershipDaysLeft: number | null;
    };
