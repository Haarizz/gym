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

export interface CommissionStructureItem {
  label: string;
  /** A rate as configured in the web commission rules, e.g. "10%" or "+2%". */
  value: string;
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
