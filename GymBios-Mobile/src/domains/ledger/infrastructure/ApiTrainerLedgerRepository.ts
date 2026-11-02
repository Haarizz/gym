import { apiClient } from '@/core/network/apiClient';
import type { TrainerLedgerData } from '../domain/TrainerLedgerData';

export const trainerLedgerRepository = {
  getLedger: async (): Promise<TrainerLedgerData> => {
    const { data: raw } = await apiClient.get<any>('/mobile/trainer/ledger');

    const summaryRaw = raw.summary || {};
    const quickStatsRaw = raw.quickStats || raw.quick_stats || {};

    return {
      summary: {
        thisMonth: summaryRaw.thisMonth ?? summaryRaw.this_month ?? 0,
        lastMonth: summaryRaw.lastMonth ?? summaryRaw.last_month ?? 0,
        pending: summaryRaw.pending ?? 0,
        paid: summaryRaw.paid ?? 0,
      },
      quickStats: {
        growth: quickStatsRaw.growth || '—',
        nextPayoutDate: quickStatsRaw.nextPayoutDate ?? quickStatsRaw.next_payout_date ?? '',
        daysRemaining: quickStatsRaw.daysRemaining ?? quickStatsRaw.days_remaining ?? '',
      },
      breakdown: (raw.breakdown || []).map((item: any) => ({
        category: item.category,
        amount: item.amount,
        percentage: item.percentage,
      })),
      recentTransactions: (raw.recentTransactions || raw.recent_transactions || []).map((item: any) => ({
        id: item.id,
        date: item.date,
        description: item.description,
        member: item.member,
        amount: item.amount,
        status: item.status,
      })),
    };
  },
};
