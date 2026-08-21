export interface RevenuePerformanceDTO {
  achieved: number;
  target: number;
  percentage: number;
}

export interface SessionPerformanceDTO {
  completed: number;
  target: number;
  percentage: number;
}

export interface MonthlyPerformanceDTO {
  revenue: RevenuePerformanceDTO;
  sessions: SessionPerformanceDTO;
}

export interface ActiveClientsDTO {
  count: number;
  monthlyChange: number;
}

export interface TrainerSessionTrendDTO {
  month: string;
  sessions: number;
}

export interface PerformanceTipDTO {
  remainingPercentage: number;
  sessionsRemaining: number;
}

export interface TrainerPerformanceResponseDTO {
  monthlyPerformance: MonthlyPerformanceDTO;
  activeClients: ActiveClientsDTO;
  sixMonthTrend: TrainerSessionTrendDTO[];
  performanceTip: PerformanceTipDTO;
}
