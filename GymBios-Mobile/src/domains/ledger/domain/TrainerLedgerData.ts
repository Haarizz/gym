export interface TrainerEarningsSummary {
  thisMonth: number;
  lastMonth: number;
  pending: number;
  paid: number;
}

export interface TrainerQuickLedgerStats {
  growth: string;
  nextPayoutDate: string;
  daysRemaining: string;
}

export interface TrainerEarningsBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
}

export interface TrainerRecentTransaction {
  id: string | number;
  date: string;
  description: string;
  member: string;
  amount: number;
  status: 'paid' | 'pending';
}

export interface TrainerLedgerData {
  summary: TrainerEarningsSummary;
  quickStats: TrainerQuickLedgerStats;
  breakdown: TrainerEarningsBreakdownItem[];
  recentTransactions: TrainerRecentTransaction[];
}
