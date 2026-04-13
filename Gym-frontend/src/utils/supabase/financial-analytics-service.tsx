import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface AnalyticsDashboard {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  profitMargin: number;
  pendingTaxObligations: number;
}

export interface MonthlyTrendPoint {
  month: string;
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface RevenueBySource {
  source: string;
  amount: number;
}

export interface ExpenseByCategory {
  category: string;
  amount: number;
}

export interface LedgerTransaction {
  id: string;
  date: string;
  type: string;
  referenceNo: string;
  description: string;
  debit: number;
  credit: number;
  branch: string | null;
  status: string;
  costCenter: string | null;
}

class FinancialAnalyticsService {
  async getDashboard(): Promise<AnalyticsDashboard> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/financial-analytics/dashboard`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch analytics dashboard");
    const d = await res.json();
    return {
      totalRevenue: d.total_revenue ?? 0,
      totalExpenses: d.total_expenses ?? 0,
      netIncome: d.net_income ?? 0,
      profitMargin: d.profit_margin ?? 0,
      pendingTaxObligations: d.pending_tax_obligations ?? 0,
    };
  }

  async getMonthlyTrend(months: number = 12): Promise<MonthlyTrendPoint[]> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/financial-analytics/monthly-trend?months=${months}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch monthly trend");
    const data = await res.json();
    return data.map((d: any) => ({
      month: d.month,
      period: d.period,
      revenue: d.revenue ?? 0,
      expenses: d.expenses ?? 0,
      profit: d.profit ?? 0,
    }));
  }

  async getRevenueBySource(): Promise<RevenueBySource[]> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/financial-analytics/revenue-by-source`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch revenue by source");
    const data = await res.json();
    return data.map((d: any) => ({
      source: d.source,
      amount: d.amount ?? 0,
    }));
  }

  async getExpenseByCategory(): Promise<ExpenseByCategory[]> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/financial-analytics/expense-by-category`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch expense by category");
    const data = await res.json();
    return data.map((d: any) => ({
      category: d.category,
      amount: d.amount ?? 0,
    }));
  }

  async getTransactions(params?: {
    from?: string;
    to?: string;
    type?: string;
    search?: string;
  }): Promise<LedgerTransaction[]> {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    if (params?.type) q.set("type", params.type);
    if (params?.search) q.set("search", params.search);
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/financial-analytics/transactions${q.toString() ? "?" + q : ""}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch transactions");
    const data = await res.json();
    return data.map((d: any) => ({
      id: d.id,
      date: d.date,
      type: d.type,
      referenceNo: d.referenceNo,
      description: d.description,
      debit: d.debit ?? 0,
      credit: d.credit ?? 0,
      branch: d.branch ?? null,
      status: d.status,
      costCenter: d.costCenter ?? null,
    }));
  }
}

export const financialAnalyticsService = new FinancialAnalyticsService();
