import type {
  ExpenseByCategory,
  FinancialDashboard,
  MonthlyTrendPoint,
  RevenueBySource,
} from '../domain/FinancialAnalytics';
import type { FinancialsRepository } from './FinancialsRepository';

export class FinancialsService {
  constructor(private readonly repository: FinancialsRepository) {}

  getDashboard(): Promise<FinancialDashboard> {
    return this.repository.getDashboard();
  }

  getMonthlyTrend(months: number = 6): Promise<MonthlyTrendPoint[]> {
    return this.repository.getMonthlyTrend(months);
  }

  getExpenseByCategory(): Promise<ExpenseByCategory[]> {
    return this.repository.getExpenseByCategory();
  }

  getRevenueBySource(): Promise<RevenueBySource[]> {
    return this.repository.getRevenueBySource();
  }
}
