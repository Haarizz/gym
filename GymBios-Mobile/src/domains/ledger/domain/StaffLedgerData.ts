export interface EarningsSummary {
  thisMonth: number;
  lastMonth: number;
  baseSalary: number;
  commission: number;
}

export interface QuickLedgerStats {
  growth: string;
  nextPayoutDate: string;
  daysRemaining: string;
}

export interface EarningsBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
}

export interface CommissionStructureItem {
  label: string;
  /** Null when the backend value has no number in it. */
  amount: number | null;
}

export interface RecentEarningTransaction {
  id: string | number;
  date: string;
  description: string;
  details: string;
  amount: number;
  status: 'paid' | 'pending';
}

export interface TaxInformation {
  ytdEarnings: number;
  tdsDeducted: number;
  baseSalaryPaid: number;
  totalCommission: number;
  conversions: number;
}

export interface TaxDocument {
  id: string | number;
  title: string;
}

export interface StaffLedgerData {
  summary: EarningsSummary;
  quickStats: QuickLedgerStats;
  breakdown: EarningsBreakdownItem[];
  commissionStructure: CommissionStructureItem[];
  recentEarnings: RecentEarningTransaction[];
  taxInfo: TaxInformation;
  taxDocuments: TaxDocument[];
}
