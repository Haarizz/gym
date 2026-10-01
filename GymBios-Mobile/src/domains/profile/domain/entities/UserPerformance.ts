export type PerformanceRole = 'staff' | 'trainer';

/**
 * Month-to-date snapshot for the "My Performance" screen. Trainers are measured on
 * sessions delivered, staff on lead conversions — fields for the other role are null.
 * Percentages are null when there is nothing to measure against (no target, no schedule,
 * no activity last month).
 */
export interface UserPerformance {
  role: PerformanceRole;
  periodLabel: string;
  performanceScore: number | null;

  // Trainer
  classesCompleted: number | null;
  sessionsTarget: number | null;
  sessionTargetPercentage: number | null;
  sessionGrowth: number | null;

  // Staff
  leadsConverted: number | null;
  conversionTarget: number | null;
  conversionRate: number | null;
  conversionGrowth: number | null;
  followUpCompletion: number | null;

  // Shared
  hoursWorked: number;
  daysPresent: number;
  daysScheduled: number;
  attendanceRate: number | null;
  revenueAchieved: number;
  revenueTarget: number;
  revenueGrowth: number | null;
  message: string;
}
