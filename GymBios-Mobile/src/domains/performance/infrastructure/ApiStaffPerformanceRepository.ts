import { apiClient } from '@/core/network/apiClient';
import type { StaffPerformanceData } from '../domain/StaffPerformanceData';

interface RawPerformanceResponse {
  period: {
    year: number;
    month: number;
    label: string;
  };

  revenue_target: {
    achieved: number;
    target: number;
    percentage: number;
  };

  conversion_target: {
    achieved: number;
    target: number;
    percentage: number;
  };

  summary: {
    rating: number;
    growth_percentage: number;
    lead_count: number;
  };

  trend: Array<{
    period: string;
    label: string;
    conversions: number;
    revenue: number;
  }>;

  leaderboard: Array<{
    rank: number;
    staff_id: number;
    staff_name: string;
    conversion_count: number;
    revenue: number;
    current_user: boolean;
  }>;

  breakdown: {
    conversion_rate: number;
    follow_up_completion: number;
    customer_satisfaction: number;
  };

  motivation: {
    remaining_conversions: number;
    message: string;
    status: string;
  };
}

function formatRevenue(amount: number): string {
  if (!amount || amount <= 0) return '₹0';
  if (amount >= 100000) {
    const lakhs = amount / 100000;
    return lakhs % 1 === 0 ? `₹${lakhs}L` : `₹${lakhs.toFixed(1)}L`;
  }
  if (amount >= 1000) {
    const k = amount / 1000;
    return k % 1 === 0 ? `₹${k}K` : `₹${k.toFixed(0)}K`;
  }
  return `₹${amount}`;
}

export class ApiStaffPerformanceRepository {
  /**
   * GET /api/mobile/staff/performance
   * Fetches the scoped staff performance dataset from the backend.
   */
  async getStaffPerformance(): Promise<StaffPerformanceData> {
    const response = await apiClient.get<RawPerformanceResponse>('/mobile/staff/performance');
    const raw = response.data;

    return {
      targets: {
        monthlyTarget: raw.revenue_target?.target ?? 0,
        achieved: raw.revenue_target?.achieved ?? 0,
        percentage: raw.revenue_target?.percentage ?? 0,

        conversionsTarget: raw.conversion_target?.target ?? 0,
        conversionsAchieved: raw.conversion_target?.achieved ?? 0,

        rating: raw.summary?.rating ?? 0,

        growth:
          raw.summary?.growth_percentage >= 0
            ? `+${raw.summary.growth_percentage}%`
            : `${raw.summary.growth_percentage}%`,

        leads: raw.summary?.lead_count ?? 0,
      },

      monthlyTrends: Array.isArray(raw.trend)
        ? raw.trend.map((t) => ({
            month: t.label || t.period,
            conversions: t.conversions ?? 0,
            revenue: t.revenue ?? 0,
          }))
        : [],

      leaderboard: Array.isArray(raw.leaderboard)
        ? raw.leaderboard.map((l) => ({
            name: l.staff_name || 'Staff',
            conversions: l.conversion_count ?? 0,
            revenue: formatRevenue(l.revenue),
            rank: l.rank,
            isCurrentUser: Boolean(l.current_user),
          }))
        : [],

      breakdown: {
        conversionRate: raw.breakdown?.conversion_rate ?? 0,
        followUpCompletion: raw.breakdown?.follow_up_completion ?? 0,
        customerSatisfaction: raw.breakdown?.customer_satisfaction ?? 0,
      },

      motivationMessage: raw.motivation?.message ?? '',
    };
  }
}

export const staffPerformanceRepository = new ApiStaffPerformanceRepository();
