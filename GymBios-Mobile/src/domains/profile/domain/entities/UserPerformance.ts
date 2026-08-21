export interface PerformanceKpi {
  label: string;
  value: string;
  growth: string;
  isPositive: boolean;
  subtitle: string;
}

export interface UserPerformance {
  performanceScore: number;
  classesCompleted: number;
  hoursWorked: number;
  clientSatisfaction: number;
  kpis: PerformanceKpi[];
}
