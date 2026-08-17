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
  amount: string;
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
  ytdEarnings: string;
  tdsDeducted: string;
  baseSalaryPaid: string;
  totalCommission: string;
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
