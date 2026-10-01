import { apiClient } from '@/core/network/apiClient';
import type { StaffLedgerData } from '../domain/StaffLedgerData';

interface RawLedgerSummary {
  thisMonth?: number;
  this_month?: number;
  lastMonth?: number;
  last_month?: number;
  growthPercentage?: number | null;
  growth_percentage?: number | null;
  baseSalary?: number;
  base_salary?: number;
  commission?: number;
}

interface RawQuickStats {
  growth?: string;
  nextPayoutDate?: string;
  next_payout_date?: string;
  daysRemaining?: string;
  days_remaining?: string;
}

interface RawBreakdownItem {
  category: string;
  amount?: number;
  percentage?: number;
}

interface RawCommissionItem {
  type?: string;
  label: string;
  amount: string | number;
}

interface RawRecentEarning {
  id: string | number;
  type?: string;
  title?: string;
  description: string;
  details: string;
  date: string;
  amount: number;
  status: string;
}

interface RawTaxInfo {
  taxYear?: string;
  tax_year?: string;
  ytdEarnings?: number;
  ytd_earnings?: number;
  tdsDeducted?: number;
  tds_deducted?: number;
  baseSalaryPaid?: number;
  base_salary_paid?: number;
  totalCommission?: number;
  total_commission?: number;
  conversions?: number;
}

interface RawTaxDocument {
  id: string | number;
  title: string;
  documentUrl?: string;
  document_url?: string;
}

interface RawLedgerResponse {
  period?: {
    year: number;
    month: number;
    label: string;
  };
  summary?: RawLedgerSummary;
  quickStats?: RawQuickStats;
  quick_stats?: RawQuickStats;
  breakdown?: RawBreakdownItem[];
  commissionStructure?: RawCommissionItem[];
  commission_structure?: RawCommissionItem[];
  recentEarnings?: RawRecentEarning[];
  recent_earnings?: RawRecentEarning[];
  taxInfo?: RawTaxInfo;
  tax_info?: RawTaxInfo;
  taxDocuments?: RawTaxDocument[];
  tax_documents?: RawTaxDocument[];
}

export class ApiStaffLedgerRepository {
  /**
   * GET /api/mobile/staff/ledger
   * Fetches the scoped staff ledger dataset from the backend.
   */
  async getStaffLedger(): Promise<StaffLedgerData> {
    const response = await apiClient.get<RawLedgerResponse>('/mobile/staff/ledger');
    const raw = response.data;

    const summaryRaw: RawLedgerSummary = raw.summary || {};
    const quickStatsRaw: RawQuickStats = raw.quickStats || raw.quick_stats || {};
    const taxInfoRaw: RawTaxInfo = raw.taxInfo || raw.tax_info || {};

    const thisMonth = summaryRaw.thisMonth ?? summaryRaw.this_month ?? 0;
    const lastMonth = summaryRaw.lastMonth ?? summaryRaw.last_month ?? 0;
    const baseSalary = summaryRaw.baseSalary ?? summaryRaw.base_salary ?? 0;
    const commission = summaryRaw.commission ?? 0;

    const growthVal = summaryRaw.growthPercentage ?? summaryRaw.growth_percentage;
    const growthStr =
      quickStatsRaw.growth ||
      (growthVal == null ? '—' : growthVal >= 0 ? `+${growthVal}%` : `${growthVal}%`);

    return {
      summary: {
        thisMonth,
        lastMonth,
        baseSalary,
        commission,
      },
      quickStats: {
        growth: growthStr,
        nextPayoutDate: quickStatsRaw.nextPayoutDate || quickStatsRaw.next_payout_date || '—',
        daysRemaining: quickStatsRaw.daysRemaining || quickStatsRaw.days_remaining || '',
      },
      breakdown: (raw.breakdown || []).map((item) => ({
        category: item.category,
        amount: item.amount ?? 0,
        percentage: item.percentage ?? 0,
      })),
      commissionStructure: (raw.commissionStructure || raw.commission_structure || []).map((item) => ({
        label: item.label,
        value: String(item.amount),
      })),
      recentEarnings: (raw.recentEarnings || raw.recent_earnings || []).map((item) => ({
        id: item.id,
        date: item.date,
        description: item.description,
        details: item.details,
        amount: item.amount,
        status: (item.status?.toLowerCase() === 'paid' ? 'paid' : 'pending') as 'paid' | 'pending',
      })),
      taxInfo: {
        ytdEarnings: taxInfoRaw.ytdEarnings ?? taxInfoRaw.ytd_earnings ?? 0,
        tdsDeducted: taxInfoRaw.tdsDeducted ?? taxInfoRaw.tds_deducted ?? 0,
        baseSalaryPaid: taxInfoRaw.baseSalaryPaid ?? taxInfoRaw.base_salary_paid ?? 0,
        totalCommission: taxInfoRaw.totalCommission ?? taxInfoRaw.total_commission ?? 0,
        conversions: taxInfoRaw.conversions ?? 0,
      },
      taxDocuments: (raw.taxDocuments || raw.tax_documents || []).map((doc) => ({
        id: doc.id,
        title: doc.title,
      })),
    };
  }

  /**
   * GET /api/mobile/staff/ledger/salary-slip
   * Retrieves salary slip data from backend.
   */
  async downloadSalarySlip(year?: number, month?: number): Promise<string> {
    const params = new URLSearchParams();
    if (year) params.append('year', String(year));
    if (month) params.append('month', String(month));

    const response = await apiClient.get<string>(
      `/mobile/staff/ledger/salary-slip${params.toString() ? `?${params.toString()}` : ''}`
    );
    return response.data;
  }

  /**
   * GET /api/mobile/staff/ledger/tax-documents/{id}
   * Retrieves tax document content from backend.
   */
  async downloadTaxDocument(docId: string | number): Promise<string> {
    const response = await apiClient.get<string>(`/mobile/staff/ledger/tax-documents/${docId}`);
    return response.data;
  }
}

export const staffLedgerRepository = new ApiStaffLedgerRepository();
