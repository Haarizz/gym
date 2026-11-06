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
  metric?: string | null;
  basis?: 'percent_of_amount' | 'fixed_per_unit' | null;
  rate?: number | null;
  min_units?: number | null;
  cap_amount?: number | null;
  threshold_pct?: number | null;
  reward_type?: 'fixed' | 'percent_of_metric_amount' | null;
  reward_value?: number | null;
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
        type: item.type,
        label: item.label,
        value: String(item.amount),
        metric: item.metric ?? undefined,
        basis: item.basis ?? undefined,
        rate: item.rate ?? undefined,
        minUnits: item.min_units ?? null,
        capAmount: item.cap_amount ?? null,
        thresholdPct: item.threshold_pct ?? undefined,
        rewardType: item.reward_type ?? undefined,
        rewardValue: item.reward_value ?? undefined,
      })),
      recentEarnings: (raw.recentEarnings || raw.recent_earnings || []).map((item) => ({
        id: item.id,
        date: item.date,
        description: item.description,
        details: item.details,
        amount: item.amount,
        status: (item.status?.toLowerCase() === 'paid' ? 'paid' : 'pending') as 'paid' | 'pending',
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
}

export const staffLedgerRepository = new ApiStaffLedgerRepository();
