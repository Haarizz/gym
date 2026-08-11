export interface FinancialDashboard {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  profitMargin: number;
  pendingTaxObligations?: number;
  outstandingPayments?: number;
  pendingReconciliations?: number;
}

export interface MonthlyTrendPoint {
  month: string;
  period?: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface ExpenseByCategory {
  category: string;
  amount: number;
}

export interface RevenueBySource {
  source: string;
  amount: number;
}
