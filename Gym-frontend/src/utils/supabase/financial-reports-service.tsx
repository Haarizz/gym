import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface IncomeStatementData {
  periodFrom: string;
  periodTo: string;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  revenueLines: { accountName: string; amount: number }[];
  expenseLines: { accountName: string; amount: number }[];
}

export interface BalanceSheetData {
  asOf: string;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  accounts: Record<string, { code: string; name: string; subGroup: string; balance: number }[]>;
}

export interface TrialBalanceData {
  asOf: string;
  totalDebit: number;
  totalCredit: number;
  lines: {
    code: string;
    name: string;
    type: string;
    openingBalance: number;
    debit: number;
    credit: number;
    netBalance: number;
  }[];
}

export interface CashFlowData {
  periodFrom: string;
  periodTo: string;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  inflowCount: number;
  outflowCount: number;
}

export interface TaxSummaryData {
  periodFrom: string;
  periodTo: string;
  totalRevenue: number;
  deductions: number;
  taxableProfit: number;
  corporateTaxZeroRateThreshold: number;
  corporateTaxRate: number;
  corporateTaxPayable: number;
  outputVat: number;
  inputVat: number;
  netVatPayable: number;
}

class FinancialReportsService {
  async getIncomeStatement(from?: string, to?: string): Promise<IncomeStatementData> {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/financial-reports/income-statement${q.toString() ? "?" + q : ""}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch income statement");
    const d = await res.json();
    return {
      periodFrom: d.period_from,
      periodTo: d.period_to,
      totalRevenue: d.total_revenue ?? 0,
      totalExpenses: d.total_expenses ?? 0,
      netIncome: d.net_income ?? 0,
      revenueLines: (d.revenue_lines ?? []).map((l: any) => ({
        accountName: l.account_name,
        amount: l.amount ?? 0,
      })),
      expenseLines: (d.expense_lines ?? []).map((l: any) => ({
        accountName: l.account_name,
        amount: l.amount ?? 0,
      })),
    };
  }

  async getBalanceSheet(asOf?: string): Promise<BalanceSheetData> {
    const q = asOf ? `?as_of=${asOf}` : "";
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/financial-reports/balance-sheet${q}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch balance sheet");
    const d = await res.json();
    return {
      asOf: d.as_of,
      totalAssets: d.total_assets ?? 0,
      totalLiabilities: d.total_liabilities ?? 0,
      totalEquity: d.total_equity ?? 0,
      accounts: d.accounts ?? {},
    };
  }

  async getTrialBalance(asOf?: string): Promise<TrialBalanceData> {
    const q = asOf ? `?as_of=${asOf}` : "";
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/financial-reports/trial-balance${q}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch trial balance");
    const d = await res.json();
    return {
      asOf: d.as_of,
      totalDebit: d.total_debit ?? 0,
      totalCredit: d.total_credit ?? 0,
      lines: (d.lines ?? []).map((l: any) => ({
        code: l.code,
        name: l.name,
        type: l.type,
        openingBalance: l.opening_balance ?? 0,
        debit: l.debit ?? 0,
        credit: l.credit ?? 0,
        netBalance: l.net_balance ?? 0,
      })),
    };
  }

  async getCashFlow(from?: string, to?: string): Promise<CashFlowData> {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/financial-reports/cash-flow${q.toString() ? "?" + q : ""}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch cash flow");
    const d = await res.json();
    return {
      periodFrom: d.period_from,
      periodTo: d.period_to,
      totalInflows: d.total_inflows ?? 0,
      totalOutflows: d.total_outflows ?? 0,
      netCashFlow: d.net_cash_flow ?? 0,
      inflowCount: d.inflow_count ?? 0,
      outflowCount: d.outflow_count ?? 0,
    };
  }

  async getTaxSummary(from?: string, to?: string): Promise<TaxSummaryData> {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/financial-reports/tax-summary${q.toString() ? "?" + q : ""}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch tax summary");
    const d = await res.json();
    return {
      periodFrom: d.period_from,
      periodTo: d.period_to,
      totalRevenue: d.total_revenue ?? 0,
      deductions: d.deductions ?? 0,
      taxableProfit: d.taxable_profit ?? 0,
      corporateTaxZeroRateThreshold: d.corporate_tax_zero_rate_threshold ?? 0,
      corporateTaxRate: d.corporate_tax_rate ?? 0,
      corporateTaxPayable: d.corporate_tax_payable ?? 0,
      outputVat: d.output_vat ?? 0,
      inputVat: d.input_vat ?? 0,
      netVatPayable: d.net_vat_payable ?? 0,
    };
  }
}

export const financialReportsService = new FinancialReportsService();
