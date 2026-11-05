export interface EarningsSummary {
  thisMonth: number;
  lastMonth: number;
  baseSalary: number;
  commission: number;
}

export interface QuickLedgerStats {
  /** "+8%", "-4%", or "—" when there were no earnings last month to compare against. */
  growth: string;
  nextPayoutDate: string;
  daysRemaining: string;
}

export interface EarningsBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
}

/**
 * One line of the staff member's incentive plan (configured on the web). label/value are the
 * backend's English wording; the structured fields let the app word it in the user's language.
 */
export interface CommissionStructureItem {
  /** Metric code (MEMBER_ADMISSION, POS_SALE, …), TARGET_BONUS, or NONE when there is no plan. */
  type?: string;
  label: string;
  /** A rate as configured on the web, e.g. "10%" or "+2%". */
  value: string;
  metric?: string;
  basis?: 'percent_of_amount' | 'fixed_per_unit';
  rate?: number;
  minUnits?: number | null;
  capAmount?: number | null;
  thresholdPct?: number;
  rewardType?: 'fixed' | 'percent_of_metric_amount';
  rewardValue?: number;
}

export interface RecentEarningTransaction {
  id: string | number;
  date: string;
  description: string;
  details: string;
  amount: number;
  status: 'paid' | 'pending';
}

export interface StaffLedgerData {
  summary: EarningsSummary;
  quickStats: QuickLedgerStats;
  breakdown: EarningsBreakdownItem[];
  commissionStructure: CommissionStructureItem[];
  recentEarnings: RecentEarningTransaction[];
}
