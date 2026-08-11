import { apiClient } from '@/core/network/apiClient';
import type { FinancialsRepository } from '../application/FinancialsRepository';
import type {
  ExpenseByCategory,
  FinancialDashboard,
  MonthlyTrendPoint,
  RevenueBySource,
} from '../domain/FinancialAnalytics';

interface FinancialDashboardResponse {
  total_revenue?: number;
  total_expenses?: number;
  net_income?: number;
  profit_margin?: number;
  pending_tax_obligations?: number;
  outstanding_payments?: number;
  pending_reconciliations?: number;
}

interface MonthlyTrendResponseItem {
  month: string;
  period?: string;
  revenue?: number;
  expenses?: number;
  profit?: number;
}

interface ExpenseByCategoryResponseItem {
  category: string;
  amount?: number;
}

interface RevenueBySourceResponseItem {
  source: string;
  amount?: number;
}

export class ApiFinancialsRepository implements FinancialsRepository {
  async getDashboard(): Promise<FinancialDashboard> {
    const response = await apiClient.get<FinancialDashboardResponse>(
      '/financial-analytics/dashboard',
    );
    const data = response.data;
    return {
      totalRevenue: data?.total_revenue ?? 0,
      totalExpenses: data?.total_expenses ?? 0,
      netIncome: data?.net_income ?? 0,
      profitMargin: data?.profit_margin ?? 0,
      pendingTaxObligations: data?.pending_tax_obligations ?? 0,
      outstandingPayments: data?.outstanding_payments ?? 0,
      pendingReconciliations: data?.pending_reconciliations ?? 0,
    };
  }

  async getMonthlyTrend(months: number = 6): Promise<MonthlyTrendPoint[]> {
    const response = await apiClient.get<MonthlyTrendResponseItem[]>(
      '/financial-analytics/monthly-trend',
      { params: { months } },
    );
    return (response.data ?? []).map(item => ({
      month: item.month,
      period: item.period,
      revenue: item.revenue ?? 0,
      expenses: item.expenses ?? 0,
      profit: item.profit ?? 0,
    }));
  }

  async getExpenseByCategory(): Promise<ExpenseByCategory[]> {
    const response = await apiClient.get<ExpenseByCategoryResponseItem[]>(
      '/financial-analytics/expense-by-category',
    );
    return (response.data ?? []).map(item => ({
      category: item.category,
      amount: item.amount ?? 0,
    }));
  }

  async getRevenueBySource(): Promise<RevenueBySource[]> {
    const response = await apiClient.get<RevenueBySourceResponseItem[]>(
      '/financial-analytics/revenue-by-source',
    );
    return (response.data ?? []).map(item => ({
      source: item.source,
      amount: item.amount ?? 0,
    }));
  }
}
