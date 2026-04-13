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
  balanced: boolean;
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

export interface DayBookLine {
  date: string;
  voucherNo: string;
  narration: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface DayBookData {
  periodFrom: string;
  periodTo: string;
  accountCode: string | null;
  totalDebit: number;
  totalCredit: number;
  lines: DayBookLine[];
}

export interface BankBookLine {
  date: string;
  voucherNo: string;
  narration: string;
  accountName: string;
  inflow: number;
  outflow: number;
  balance: number;
}

export interface BankBookData {
  periodFrom: string;
  periodTo: string;
  openingBalance: number;
  closingBalance: number;
  totalInflows: number;
  totalOutflows: number;
  lines: BankBookLine[];
}

export interface FundFlowLine {
  description: string;
  amount: number;
}

export interface FundFlowData {
  periodFrom: string;
  periodTo: string;
  netIncome: number;
  workingCapitalChange: number;
  totalSources: number;
  totalUses: number;
  netFundFlow: number;
  sources: FundFlowLine[];
  uses: FundFlowLine[];
}

export interface PdcCheque {
  type: string;
  voucherNo: string;
  partyName: string;
  chequeNo: string;
  chequeDate: string;
  paymentDate: string;
  bankAccount: string;
  amount: number;
  status: string;
  isPostDated: boolean;
}

export interface PdcReportData {
  reportDate: string;
  statusFilter: string | null;
  totalOutgoing: number;
  outgoingCount: number;
  cheques: PdcCheque[];
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
      balanced: d.balanced ?? false,
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

  async getDayBook(from?: string, to?: string, account?: string): Promise<DayBookData> {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    if (account) q.set("account", account);
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/financial-reports/day-book${q.toString() ? "?" + q : ""}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch day book");
    const d = await res.json();
    return {
      periodFrom: d.period_from,
      periodTo: d.period_to,
      accountCode: d.account_code ?? null,
      totalDebit: d.total_debit ?? 0,
      totalCredit: d.total_credit ?? 0,
      lines: (d.lines ?? []).map((l: any) => ({
        date: l.date,
        voucherNo: l.voucher_no,
        narration: l.narration,
        accountCode: l.account_code,
        accountName: l.account_name,
        accountType: l.account_type,
        debit: l.debit ?? 0,
        credit: l.credit ?? 0,
        balance: l.balance ?? 0,
      })),
    };
  }

  async getBankBook(from?: string, to?: string): Promise<BankBookData> {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/financial-reports/bank-book${q.toString() ? "?" + q : ""}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch bank book");
    const d = await res.json();
    return {
      periodFrom: d.period_from,
      periodTo: d.period_to,
      openingBalance: d.opening_balance ?? 0,
      closingBalance: d.closing_balance ?? 0,
      totalInflows: d.total_inflows ?? 0,
      totalOutflows: d.total_outflows ?? 0,
      lines: (d.lines ?? []).map((l: any) => ({
        date: l.date,
        voucherNo: l.voucher_no,
        narration: l.narration,
        accountName: l.account_name,
        inflow: l.inflow ?? 0,
        outflow: l.outflow ?? 0,
        balance: l.balance ?? 0,
      })),
    };
  }

  async getFundFlow(from?: string, to?: string): Promise<FundFlowData> {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/financial-reports/fund-flow${q.toString() ? "?" + q : ""}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch fund flow");
    const d = await res.json();
    return {
      periodFrom: d.period_from,
      periodTo: d.period_to,
      netIncome: d.net_income ?? 0,
      workingCapitalChange: d.working_capital_change ?? 0,
      totalSources: d.total_sources ?? 0,
      totalUses: d.total_uses ?? 0,
      netFundFlow: d.net_fund_flow ?? 0,
      sources: (d.sources ?? []).map((s: any) => ({ description: s.description, amount: s.amount ?? 0 })),
      uses: (d.uses ?? []).map((u: any) => ({ description: u.description, amount: u.amount ?? 0 })),
    };
  }

  async getPdcReport(status?: string): Promise<PdcReportData> {
    const q = status ? `?status=${status}` : "";
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/financial-reports/pdc-report${q}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch PDC report");
    const d = await res.json();
    return {
      reportDate: d.report_date,
      statusFilter: d.status_filter ?? null,
      totalOutgoing: d.total_outgoing ?? 0,
      outgoingCount: d.outgoing_count ?? 0,
      cheques: (d.cheques ?? []).map((c: any) => ({
        type: c.type,
        voucherNo: c.voucher_no,
        partyName: c.party_name,
        chequeNo: c.cheque_no,
        chequeDate: c.cheque_date,
        paymentDate: c.payment_date,
        bankAccount: c.bank_account,
        amount: c.amount ?? 0,
        status: c.status,
        isPostDated: c.is_post_dated ?? false,
      })),
    };
  }
}

export const financialReportsService = new FinancialReportsService();
