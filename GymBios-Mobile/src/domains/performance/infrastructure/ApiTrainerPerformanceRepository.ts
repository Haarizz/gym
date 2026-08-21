import { apiClient } from '@/core/network/apiClient';
import { TrainerPerformanceResponseDTO } from '../domain/TrainerPerformanceData';

interface RawTrainerPerformanceResponse {
  monthly_performance: {
    revenue: {
      achieved: number;
      target: number;
      percentage: number;
    };
    sessions: {
      completed: number;
      target: number;
      percentage: number;
    };
  };
  active_clients: {
    count: number;
    monthly_change: number;
  };
  six_month_trend: Array<{
    month: string;
    sessions: number;
  }>;
  performance_tip: {
    remaining_percentage: number;
    sessions_remaining: number;
  };
}

export class ApiTrainerPerformanceRepository {
  public async getPerformance(): Promise<TrainerPerformanceResponseDTO> {
    const response = await apiClient.get<RawTrainerPerformanceResponse>('/mobile/trainer/performance');
    const raw = response.data;

    return {
      monthlyPerformance: {
        revenue: {
          achieved: raw.monthly_performance?.revenue?.achieved ?? 0,
          target: raw.monthly_performance?.revenue?.target ?? 0,
          percentage: raw.monthly_performance?.revenue?.percentage ?? 0,
        },
        sessions: {
          completed: raw.monthly_performance?.sessions?.completed ?? 0,
          target: raw.monthly_performance?.sessions?.target ?? 0,
          percentage: raw.monthly_performance?.sessions?.percentage ?? 0,
        },
      },
      activeClients: {
        count: raw.active_clients?.count ?? 0,
        monthlyChange: raw.active_clients?.monthly_change ?? 0,
      },
      sixMonthTrend: Array.isArray(raw.six_month_trend)
        ? raw.six_month_trend.map(t => ({
            month: t.month,
            sessions: t.sessions ?? 0,
          }))
        : [],
      performanceTip: {
        remainingPercentage: raw.performance_tip?.remaining_percentage ?? 0,
        sessionsRemaining: raw.performance_tip?.sessions_remaining ?? 0,
      },
    };
  }
}

export const trainerPerformanceRepository = new ApiTrainerPerformanceRepository();
