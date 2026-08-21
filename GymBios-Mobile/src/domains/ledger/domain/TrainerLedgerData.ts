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

export interface TrainerTaxInformation {
  ytdEarnings: string;
  totalSessions: number;
  avgPerSession: string;
  activeClients: number;
}

export interface TrainerTaxDocument {
  id: string | number;
  title: string;
}

export interface TrainerLedgerData {
  summary: TrainerEarningsSummary;
  quickStats: TrainerQuickLedgerStats;
  breakdown: TrainerEarningsBreakdownItem[];
  recentTransactions: TrainerRecentTransaction[];
  taxInfo: TrainerTaxInformation;
  taxDocuments: TrainerTaxDocument[];
}
