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
  taxByCode: { taxCode: string; name: string; taxType: string; outputAmount: number; inputAmount: number }[];
}

export interface LedgerEntry {
  date: string;
  voucherNo: string;
  narration?: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  runningBalance?: number;
}

export interface CashBookData {
  periodFrom: string;
  periodTo: string;
  openingBalance: number;
  closingBalance: number;
  entries: LedgerEntry[];
}

export interface DayBookData {
  date: string;
  totalDebit: number;
  totalCredit: number;
  entries: LedgerEntry[];
}

export interface GeneralLedgerAccount {
  accountCode: string;
  accountName: string;
  openingBalance: number;
  closingBalance: number;
  entries: LedgerEntry[];
}

export interface GeneralLedgerData {
  periodFrom: string;
  periodTo: string;
  accounts: GeneralLedgerAccount[];
}

export interface AgingRow {
  name: string;
  reference?: string;
  dueDate?: string;
  outstanding: number;
  daysOverdue: number;
  bucket: string;
}

export interface AgingData {
  asOf: string;
  totalOutstanding: number;
  buckets: Record<string, number>;
  rows: AgingRow[];
}

export interface DeferredRevenueSchedule {
  scheduleId: string;
  memberName?: string;
  planName?: string;
  startDate: string;
  endDate: string;
  totalPeriods: number;
  totalAmount: number;
  recognizedAmount: number;
  remainingAmount: number;
}

export interface DeferredRevenueData {
  ledgerBalance: number;
  scheduledRemaining: number;
  activeScheduleCount: number;
  schedules: DeferredRevenueSchedule[];
}

function mapLedgerEntry(l: any): LedgerEntry {
  return {
    date: l.date,
    voucherNo: l.voucher_no,
    narration: l.narration,
    accountCode: l.account_code,
    accountName: l.account_name,
    debit: Number(l.debit ?? 0),
    credit: Number(l.credit ?? 0),
    runningBalance: l.running_balance != null ? Number(l.running_balance) : undefined,
  };
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
      taxByCode: (d.tax_by_code ?? []).map((t: any) => ({
        taxCode: t.tax_code,
        name: t.name,
        taxType: t.tax_type,
        outputAmount: Number(t.output_amount ?? 0),
        inputAmount: Number(t.input_amount ?? 0),
      })),
    };
  }

  async getCashBook(from?: string, to?: string): Promise<CashBookData> {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/financial-reports/cash-book${q.toString() ? "?" + q : ""}`
    );
    if (!res.ok) throw new Error("Failed to fetch cash book");
    const d = await res.json();
    return {
      periodFrom: d.period_from,
      periodTo: d.period_to,
      openingBalance: Number(d.opening_balance ?? 0),
      closingBalance: Number(d.closing_balance ?? 0),
      entries: (d.entries ?? []).map(mapLedgerEntry),
    };
  }

  async getDayBook(date?: string): Promise<DayBookData> {
    const q = date ? `?date=${date}` : "";
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/financial-reports/day-book${q}`);
    if (!res.ok) throw new Error("Failed to fetch day book");
    const d = await res.json();
    return {
      date: d.date,
      totalDebit: Number(d.total_debit ?? 0),
      totalCredit: Number(d.total_credit ?? 0),
      entries: (d.entries ?? []).map(mapLedgerEntry),
    };
  }

  async getGeneralLedger(from?: string, to?: string, accountCode?: string): Promise<GeneralLedgerData> {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    if (accountCode) q.set("account_code", accountCode);
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/financial-reports/general-ledger${q.toString() ? "?" + q : ""}`
    );
    if (!res.ok) throw new Error("Failed to fetch general ledger");
    const d = await res.json();
    return {
      periodFrom: d.period_from,
      periodTo: d.period_to,
      accounts: (d.accounts ?? []).map((a: any) => ({
        accountCode: a.account_code,
        accountName: a.account_name,
        openingBalance: Number(a.opening_balance ?? 0),
        closingBalance: Number(a.closing_balance ?? 0),
        entries: (a.entries ?? []).map(mapLedgerEntry),
      })),
    };
  }

  private mapAging(d: any, nameKey: string, refKey: string): AgingData {
    return {
      asOf: d.as_of,
      totalOutstanding: Number(d.total_outstanding ?? 0),
      buckets: d.buckets ?? {},
      rows: (d.rows ?? []).map((r: any) => ({
        name: r[nameKey],
        reference: r[refKey],
        dueDate: r.due_date,
        outstanding: Number(r.outstanding ?? 0),
        daysOverdue: Number(r.days_overdue ?? 0),
        bucket: r.bucket,
      })),
    };
  }

  async getMemberAging(asOf?: string): Promise<AgingData> {
    const q = asOf ? `?as_of=${asOf}` : "";
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/financial-reports/member-aging${q}`);
    if (!res.ok) throw new Error("Failed to fetch member aging report");
    return this.mapAging(await res.json(), "member_name", "receipt_no");
  }

  async getSupplierAging(asOf?: string): Promise<AgingData> {
    const q = asOf ? `?as_of=${asOf}` : "";
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/financial-reports/supplier-aging${q}`);
    if (!res.ok) throw new Error("Failed to fetch supplier aging report");
    return this.mapAging(await res.json(), "supplier_name", "bill_number");
  }

  async getDeferredRevenue(): Promise<DeferredRevenueData> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/financial-reports/deferred-revenue`);
    if (!res.ok) throw new Error("Failed to fetch deferred revenue report");
    const d = await res.json();
    return {
      ledgerBalance: Number(d.ledger_balance ?? 0),
      scheduledRemaining: Number(d.scheduled_remaining ?? 0),
      activeScheduleCount: Number(d.active_schedule_count ?? 0),
      schedules: (d.schedules ?? []).map((s: any) => ({
        scheduleId: String(s.schedule_id),
        memberName: s.member_name,
        planName: s.plan_name,
        startDate: s.start_date,
        endDate: s.end_date,
        totalPeriods: Number(s.total_periods ?? 0),
        totalAmount: Number(s.total_amount ?? 0),
        recognizedAmount: Number(s.recognized_amount ?? 0),
        remainingAmount: Number(s.remaining_amount ?? 0),
      })),
    };
  }
}

export const financialReportsService = new FinancialReportsService();
