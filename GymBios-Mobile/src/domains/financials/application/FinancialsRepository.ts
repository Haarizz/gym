import type {
  ExpenseByCategory,
  FinancialDashboard,
  MonthlyTrendPoint,
  RevenueBySource,
} from '../domain/FinancialAnalytics';

export interface FinancialsRepository {
  getDashboard(): Promise<FinancialDashboard>;
  getMonthlyTrend(months?: number): Promise<MonthlyTrendPoint[]>;
  getExpenseByCategory(): Promise<ExpenseByCategory[]>;
  getRevenueBySource(): Promise<RevenueBySource[]>;
}
