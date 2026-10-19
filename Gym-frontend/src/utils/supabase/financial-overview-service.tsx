import api from '../../api/axiosConfig';

// GET /api/financial-analytics/overview — everything the Financial Analytics page shows for a
// date range next to a comparison period. P&L and balances come from posted journal vouchers
// (same source as the Income Statement); collections, dues and supplier bills from receipts /
// POS sales / members / bills. Keys are camelCase (the backend returns plain maps).

export type CompareMode = 'previous' | 'year';
export type Granularity = 'day' | 'week' | 'month';

export interface Metric {
  current: number;
  previous: number;
  /** % change vs the comparison period; null when the comparison is zero. */
  changePct: number | null;
}

export interface OverviewKpis {
  revenue: Metric;
  expenses: Metric;
  netProfit: Metric;
  profitMargin: { current: number; previous: number; change: number | null };
  cashIn: Metric;
  cashOut: Metric;
  netCashFlow: Metric;
  cashBalance: number;
  collections: Metric;
  avgDailyRevenue: Metric;
  payingMembers: Metric;
  avgReceipt: Metric;
  receivables: { amount: number; members: number; overdue: number; ledger: number };
  payables: { amount: number; overdue: number; bills: number; ledger: number };
  taxPayable: number;
  deferredRevenue: number;
  openReconciliations: number;
}

export interface TrendPoint {
  start: string;
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
  cashIn: number;
  cashOut: number;
  previousRevenue: number | null;
}

export interface MonthPoint {
  month: string;
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number | null;
}

export interface AccountRow {
  code: string;
  name: string;
  current: number;
  previous: number;
  changePct: number | null;
  share: number;
}

export interface MethodRow { method: string; amount: number; count: number; share: number; previous: number }
export interface SourceRow extends Metric { label: string }
export interface AgingRow { bucket: string; label: string; amount: number; count: number }
export interface DebtorRow { name: string; memberId?: number; amount: number; oldestDue: string; daysOverdue: number }
export interface PayableRow { vendor: string; bill?: string; amount: number; dueDate: string; daysOverdue: number }

export interface BranchRow {
  branchId: number;
  name: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number | null;
  revenueShare: number;
  revenueChangePct: number | null;
}

export type ActivityKind = 'income' | 'expense' | 'income_reversal' | 'expense_reversal';
export interface ActivityRow {
  id: number;
  date: string;
  voucherNo?: string;
  narration?: string;
  reference?: string;
  kind: ActivityKind;
  amount: number;
  accounts: string;
}

export type InsightType = 'positive' | 'info' | 'warning' | 'critical';
export interface Insight { type: InsightType; rank: number; title: string; detail: string }

export interface FinancialOverview {
  period: { from: string; to: string; days: number; granularity: Granularity };
  comparePeriod: { from: string; to: string; mode: CompareMode };
  kpis: OverviewKpis;
  trend: TrendPoint[];
  monthly: MonthPoint[];
  revenueByAccount: AccountRow[];
  expenseByAccount: AccountRow[];
  collectionsByMethod: MethodRow[];
  collectionsBySource: SourceRow[];
  receivablesAging: AgingRow[];
  topDebtors: DebtorRow[];
  payablesAging: AgingRow[];
  upcomingPayables: PayableRow[];
  branches: BranchRow[];
  activity: ActivityRow[];
  insights: Insight[];
}

export const financialOverviewService = {
  /** Dates are yyyy-MM-dd. compareFrom/compareTo (both) override `compare`. */
  get: async (params: { from: string; to: string; compare: CompareMode; compareFrom?: string; compareTo?: string }): Promise<FinancialOverview> =>
    (await api.get<FinancialOverview>('/financial-analytics/overview', { params })).data,
};

/** Backend error bodies are { message } (GlobalExceptionHandler) — surface them when present. */
export function overviewErrorMessage(error: unknown, fallback: string): string {
  const data = (error as any)?.response?.data;
  if (data && typeof data.message === 'string' && data.message) return data.message;
  return fallback;
}
