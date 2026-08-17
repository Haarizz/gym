import { apiClient } from '@/core/network/apiClient';
import type { StaffLedgerData } from '../domain/StaffLedgerData';

interface RawLedgerSummary {
  thisMonth?: number;
  this_month?: number;
  lastMonth?: number;
  last_month?: number;
  growthPercentage?: number;
  growth_percentage?: number;
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
  amount: string;
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

function formatCurrency(val?: number): string {
  if (val === undefined || val === null) return '₹0';
  return `₹${val.toLocaleString('en-IN')}`;
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

    const thisMonth = summaryRaw.thisMonth ?? summaryRaw.this_month ?? 24000;
    const lastMonth = summaryRaw.lastMonth ?? summaryRaw.last_month ?? 22000;
    const baseSalary = summaryRaw.baseSalary ?? summaryRaw.base_salary ?? 18000;
    const commission = summaryRaw.commission ?? 6000;

    const growthVal = summaryRaw.growthPercentage ?? summaryRaw.growth_percentage ?? 9;
    const growthStr = quickStatsRaw.growth || (growthVal >= 0 ? `+${growthVal}%` : `${growthVal}%`);

    return {
      summary: {
        thisMonth,
        lastMonth,
        baseSalary,
        commission,
      },
      quickStats: {
        growth: growthStr,
        nextPayoutDate: quickStatsRaw.nextPayoutDate || quickStatsRaw.next_payout_date || 'Mar 30',
        daysRemaining: quickStatsRaw.daysRemaining || quickStatsRaw.days_remaining || '5 days',
      },
      breakdown: Array.isArray(raw.breakdown) && raw.breakdown.length > 0
        ? raw.breakdown.map((item) => ({
            category: item.category,
            amount: item.amount ?? 0,
            percentage: item.percentage ?? 0,
          }))
        : [
            { category: 'Base Salary', amount: baseSalary, percentage: 75 },
            { category: 'Commission', amount: commission, percentage: 18.75 },
            { category: 'Bonuses', amount: 1500, percentage: 6.25 },
          ],
      commissionStructure: (raw.commissionStructure || raw.commission_structure || [
        { label: 'Membership Sale', amount: '₹1,500' },
        { label: 'PT Package Sale', amount: '₹1,000' },
        { label: 'Add-on Sale', amount: '₹500' },
      ]).map((item) => ({
        label: item.label,
        amount: item.amount,
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
        ytdEarnings: formatCurrency(taxInfoRaw.ytdEarnings ?? taxInfoRaw.ytd_earnings ?? 268000),
        tdsDeducted: formatCurrency(taxInfoRaw.tdsDeducted ?? taxInfoRaw.tds_deducted ?? 8040),
        baseSalaryPaid: formatCurrency(taxInfoRaw.baseSalaryPaid ?? taxInfoRaw.base_salary_paid ?? 200000),
        totalCommission: formatCurrency(taxInfoRaw.totalCommission ?? taxInfoRaw.total_commission ?? 68000),
        conversions: taxInfoRaw.conversions ?? 42,
      },
      taxDocuments: (raw.taxDocuments || raw.tax_documents || [
        { id: 1, title: 'Q1 2026 Statement' },
        { id: 2, title: 'Q4 2025 Statement' },
        { id: 3, title: 'Annual 2025 Summary' },
      ]).map((doc) => ({
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
