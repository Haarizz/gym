import React, { useState, useCallback } from "react";
import {
  financialReportsService,
  IncomeStatementData,
  BalanceSheetData,
  TrialBalanceData,
  CashFlowData,
  DayBookData,
  BankBookData,
  FundFlowData,
  PdcReportData,
} from "../utils/supabase/financial-reports-service";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import {
  FileText,
  Download,
  Calendar as CalendarIcon,
  TrendingUp,
  Building2,
  DollarSign,
  Receipt,
  BookOpen,
  Landmark,
  Calculator,
  BarChart3,
  RefreshCw,
  Eye,
  ArrowUpDown,
  CheckSquare,
  Clock,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subQuarters,
  subYears,
} from "date-fns";
import { cn } from "../components/ui/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

interface DateRange { from: Date; to: Date }

type ReportId = "profit-loss" | "balance-sheet" | "cash-flow" | "trial-balance"
              | "day-book" | "bank-book" | "fund-flow" | "pdc-report";

interface Report {
  id: ReportId;
  title: string;
  description: string;
  icon: React.ElementType;
  category: "primary" | "secondary" | "supporting";
  ifrsCompliant: boolean;
}

// ─── Report definitions ────────────────────────────────────────────────────

const reportDefinitions: Report[] = [
  {
    id: "profit-loss",
    title: "Statement of Profit or Loss (P&L)",
    description: "Comprehensive income statement showing revenue, expenses, and profitability",
    icon: TrendingUp,
    category: "primary",
    ifrsCompliant: true,
  },
  {
    id: "balance-sheet",
    title: "Statement of Financial Position",
    description: "Balance sheet showing assets, liabilities, and equity position",
    icon: Building2,
    category: "primary",
    ifrsCompliant: true,
  },
  {
    id: "cash-flow",
    title: "Statement of Cash Flows",
    description: "Cash flow analysis from operating, investing, and financing activities",
    icon: DollarSign,
    category: "primary",
    ifrsCompliant: true,
  },
  {
    id: "trial-balance",
    title: "Trial Balance",
    description: "Complete listing of all account balances for verification",
    icon: Calculator,
    category: "secondary",
    ifrsCompliant: true,
  },
  {
    id: "day-book",
    title: "Day Book (General Ledger)",
    description: "Chronological record of all transactions by date with running balance",
    icon: BookOpen,
    category: "supporting",
    ifrsCompliant: true,
  },
  {
    id: "bank-book",
    title: "Bank Book",
    description: "Bank and cash account movements with opening and closing balances",
    icon: Landmark,
    category: "supporting",
    ifrsCompliant: true,
  },
  {
    id: "fund-flow",
    title: "Fund Flow Statement",
    description: "Sources and uses of funds analysis for working capital management",
    icon: ArrowUpDown,
    category: "secondary",
    ifrsCompliant: true,
  },
  {
    id: "pdc-report",
    title: "Post-Dated Cheques (PDC) Report",
    description: "Outgoing PDCs with cheque date, party name, and maturity status",
    icon: Receipt,
    category: "supporting",
    ifrsCompliant: true,
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function periodToDateRange(period: string): DateRange {
  const today = new Date();
  switch (period) {
    case "current-month":  return { from: startOfMonth(today), to: endOfMonth(today) };
    case "last-month":     return { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) };
    case "current-quarter": return { from: startOfQuarter(today), to: endOfQuarter(today) };
    case "last-quarter":   return { from: startOfQuarter(subQuarters(today, 1)), to: endOfQuarter(subQuarters(today, 1)) };
    case "current-year":   return { from: startOfYear(today), to: endOfYear(today) };
    case "last-year":      return { from: startOfYear(subYears(today, 1)), to: endOfYear(subYears(today, 1)) };
    default:               return { from: startOfMonth(today), to: today };
  }
}

// ─── Main Component ────────────────────────────────────────────────────────

export function FinancialReports() {
  const [selectedReport, setSelectedReport] = useState<ReportId | "">("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("current-month");
  const [dateRange, setDateRange] = useState<DateRange>(periodToDateRange("current-month"));
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState("all");
  const [isGenerating, setIsGenerating] = useState(false);

  // Report data states
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementData | null>(null);
  const [balanceSheet, setBalanceSheet]       = useState<BalanceSheetData | null>(null);
  const [trialBalance, setTrialBalance]       = useState<TrialBalanceData | null>(null);
  const [cashFlow, setCashFlow]               = useState<CashFlowData | null>(null);
  const [dayBook, setDayBook]                 = useState<DayBookData | null>(null);
  const [bankBook, setBankBook]               = useState<BankBookData | null>(null);
  const [fundFlow, setFundFlow]               = useState<FundFlowData | null>(null);
  const [pdcReport, setPdcReport]             = useState<PdcReportData | null>(null);

  const filteredReports = reportDefinitions.filter(
    r => reportCategory === "all" || r.category === reportCategory
  );

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    if (period !== "custom") setDateRange(periodToDateRange(period));
  };

  const getDateParams = () => ({
    from: format(dateRange.from, "yyyy-MM-dd"),
    to:   format(dateRange.to,   "yyyy-MM-dd"),
  });

  const handleGenerateReport = useCallback(async (reportId: ReportId) => {
    setIsGenerating(true);
    setSelectedReport(reportId);
    const { from, to } = getDateParams();
    try {
      switch (reportId) {
        case "profit-loss":  setIncomeStatement(await financialReportsService.getIncomeStatement(from, to)); break;
        case "balance-sheet": setBalanceSheet(await financialReportsService.getBalanceSheet(to)); break;
        case "trial-balance": setTrialBalance(await financialReportsService.getTrialBalance(to)); break;
        case "cash-flow":    setCashFlow(await financialReportsService.getCashFlow(from, to)); break;
        case "day-book":     setDayBook(await financialReportsService.getDayBook(from, to)); break;
        case "bank-book":    setBankBook(await financialReportsService.getBankBook(from, to)); break;
        case "fund-flow":    setFundFlow(await financialReportsService.getFundFlow(from, to)); break;
        case "pdc-report":   setPdcReport(await financialReportsService.getPdcReport()); break;
      }
      toast.success("Report generated successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  }, [dateRange]);

  // ─── Report Viewers ──────────────────────────────────────────────────────

  const ProfitLossViewer = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Revenue", value: incomeStatement?.totalRevenue ?? 0, color: "text-green-700" },
          { label: "Total Expenses", value: incomeStatement?.totalExpenses ?? 0, color: "text-red-700" },
          { label: "Net Income", value: incomeStatement?.netIncome ?? 0, color: (incomeStatement?.netIncome ?? 0) >= 0 ? "text-green-700" : "text-red-700" },
        ].map(kpi => (
          <Card key={kpi.label} className="bg-gray-50 border-0">
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">{kpi.label}</p>
              <p className={`text-lg font-bold ${kpi.color}`}>{fmt(kpi.value)} AED</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold text-primary">Account</TableHead>
            <TableHead className="font-semibold text-primary text-right">Amount (AED)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="bg-blue-50">
            <TableCell colSpan={2} className="font-semibold text-primary">Revenue</TableCell>
          </TableRow>
          {(incomeStatement?.revenueLines ?? []).map((l, i) => (
            <TableRow key={i}>
              <TableCell className="pl-8">{l.accountName}</TableCell>
              <TableCell className="text-right text-green-700">{fmt(l.amount)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-green-50 font-semibold">
            <TableCell>Total Revenue</TableCell>
            <TableCell className="text-right text-green-700">{fmt(incomeStatement?.totalRevenue ?? 0)}</TableCell>
          </TableRow>

          <TableRow className="bg-blue-50">
            <TableCell colSpan={2} className="font-semibold text-primary">Expenses</TableCell>
          </TableRow>
          {(incomeStatement?.expenseLines ?? []).map((l, i) => (
            <TableRow key={i}>
              <TableCell className="pl-8">{l.accountName}</TableCell>
              <TableCell className="text-right text-red-700">{fmt(l.amount)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-red-50 font-semibold">
            <TableCell>Total Expenses</TableCell>
            <TableCell className="text-right text-red-700">{fmt(incomeStatement?.totalExpenses ?? 0)}</TableCell>
          </TableRow>

          <TableRow className={`font-bold text-base ${(incomeStatement?.netIncome ?? 0) >= 0 ? "bg-green-100" : "bg-red-100"}`}>
            <TableCell>Net Income / (Loss)</TableCell>
            <TableCell className={`text-right ${(incomeStatement?.netIncome ?? 0) >= 0 ? "text-green-800" : "text-red-800"}`}>
              {fmt(incomeStatement?.netIncome ?? 0)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );

  const BalanceSheetViewer = () => {
    const accounts = balanceSheet?.accounts ?? {};
    const assetGroups = Object.entries(accounts).filter(([g]) => g === "ASSET");
    const liabilityGroups = Object.entries(accounts).filter(([g]) => g === "LIABILITY");
    const equityGroups = Object.entries(accounts).filter(([g]) => g === "EQUITY");
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Assets", value: balanceSheet?.totalAssets ?? 0, color: "text-blue-700" },
            { label: "Total Liabilities", value: balanceSheet?.totalLiabilities ?? 0, color: "text-orange-700" },
            { label: "Total Equity", value: balanceSheet?.totalEquity ?? 0, color: "text-purple-700" },
          ].map(kpi => (
            <Card key={kpi.label} className="bg-gray-50 border-0">
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500">{kpi.label}</p>
                <p className={`text-lg font-bold ${kpi.color}`}>{fmt(kpi.value)} AED</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assets */}
          <div>
            <h4 className="font-semibold text-primary mb-2">Assets</h4>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount (AED)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assetGroups.flatMap(([, items]) => items).map((a, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6">{a.name}</TableCell>
                    <TableCell className="text-right">{fmt(a.balance)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-blue-50 font-semibold">
                  <TableCell>Total Assets</TableCell>
                  <TableCell className="text-right text-blue-700">{fmt(balanceSheet?.totalAssets ?? 0)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          {/* Liabilities & Equity */}
          <div>
            <h4 className="font-semibold text-primary mb-2">Liabilities & Equity</h4>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount (AED)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-gray-100">
                  <TableCell colSpan={2} className="font-semibold text-sm text-gray-600">Liabilities</TableCell>
                </TableRow>
                {liabilityGroups.flatMap(([, items]) => items).map((a, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6">{a.name}</TableCell>
                    <TableCell className="text-right">{fmt(a.balance)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-orange-50 font-semibold">
                  <TableCell>Total Liabilities</TableCell>
                  <TableCell className="text-right text-orange-700">{fmt(balanceSheet?.totalLiabilities ?? 0)}</TableCell>
                </TableRow>
                <TableRow className="bg-gray-100">
                  <TableCell colSpan={2} className="font-semibold text-sm text-gray-600">Equity</TableCell>
                </TableRow>
                {equityGroups.flatMap(([, items]) => items).map((a, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6">{a.name}</TableCell>
                    <TableCell className="text-right">{fmt(a.balance)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-purple-50 font-semibold">
                  <TableCell>Total Equity</TableCell>
                  <TableCell className="text-right text-purple-700">{fmt(balanceSheet?.totalEquity ?? 0)}</TableCell>
                </TableRow>
                <TableRow className="bg-blue-50 font-bold">
                  <TableCell>Total Liabilities & Equity</TableCell>
                  <TableCell className="text-right text-blue-700">
                    {fmt((balanceSheet?.totalLiabilities ?? 0) + (balanceSheet?.totalEquity ?? 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  };

  const TrialBalanceViewer = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {trialBalance?.balanced ? (
          <Badge className="bg-green-100 text-green-800">
            <CheckSquare className="h-3 w-3 mr-1" /> Balanced
          </Badge>
        ) : (
          <Badge className="bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" /> Out of Balance
          </Badge>
        )}
        <span className="text-sm text-gray-500">As of {trialBalance?.asOf ?? "-"}</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold text-primary">Code</TableHead>
            <TableHead className="font-semibold text-primary">Account Name</TableHead>
            <TableHead className="font-semibold text-primary">Type</TableHead>
            <TableHead className="font-semibold text-primary text-right">Opening (AED)</TableHead>
            <TableHead className="font-semibold text-primary text-right">Debit (AED)</TableHead>
            <TableHead className="font-semibold text-primary text-right">Credit (AED)</TableHead>
            <TableHead className="font-semibold text-primary text-right">Net Balance (AED)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(trialBalance?.lines ?? []).map((l, i) => (
            <TableRow key={i} className="hover:bg-gray-50/60">
              <TableCell className="font-mono text-sm">{l.code}</TableCell>
              <TableCell>{l.name}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">{l.type}</Badge>
              </TableCell>
              <TableCell className="text-right">{l.openingBalance !== 0 ? fmt(l.openingBalance) : "-"}</TableCell>
              <TableCell className="text-right">{l.debit > 0 ? fmt(l.debit) : "-"}</TableCell>
              <TableCell className="text-right">{l.credit > 0 ? fmt(l.credit) : "-"}</TableCell>
              <TableCell className={`text-right font-medium ${l.netBalance >= 0 ? "text-blue-700" : "text-red-700"}`}>
                {fmt(l.netBalance)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-blue-50 font-semibold">
            <TableCell colSpan={4}>Totals</TableCell>
            <TableCell className="text-right">{fmt(trialBalance?.totalDebit ?? 0)}</TableCell>
            <TableCell className="text-right">{fmt(trialBalance?.totalCredit ?? 0)}</TableCell>
            <TableCell className="text-right">{fmt((trialBalance?.totalDebit ?? 0) - (trialBalance?.totalCredit ?? 0))}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );

  const CashFlowViewer = () => {
    const cf = cashFlow;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Inflows", value: cf?.totalInflows ?? 0, count: cf?.inflowCount ?? 0, color: "text-green-700" },
            { label: "Total Outflows", value: cf?.totalOutflows ?? 0, count: cf?.outflowCount ?? 0, color: "text-red-700" },
            { label: "Net Cash Flow", value: cf?.netCashFlow ?? 0, count: null, color: (cf?.netCashFlow ?? 0) >= 0 ? "text-green-700" : "text-red-700" },
          ].map(kpi => (
            <Card key={kpi.label} className="bg-gray-50 border-0">
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500">{kpi.label}</p>
                <p className={`text-lg font-bold ${kpi.color}`}>{fmt(kpi.value)} AED</p>
                {kpi.count !== null && <p className="text-xs text-gray-400">{kpi.count} transactions</p>}
              </CardContent>
            </Card>
          ))}
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-primary">Item</TableHead>
              <TableHead className="font-semibold text-primary text-right">Amount (AED)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="bg-green-50">
              <TableCell colSpan={2} className="font-semibold text-green-800">Cash Inflows (Operating)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-8">Total receipts from bank/cash accounts</TableCell>
              <TableCell className="text-right text-green-700">{fmt(cf?.totalInflows ?? 0)}</TableCell>
            </TableRow>
            <TableRow className="bg-green-100 font-semibold">
              <TableCell>Total Inflows ({cf?.inflowCount ?? 0} transactions)</TableCell>
              <TableCell className="text-right text-green-700">{fmt(cf?.totalInflows ?? 0)}</TableCell>
            </TableRow>

            <TableRow className="bg-red-50">
              <TableCell colSpan={2} className="font-semibold text-red-800">Cash Outflows (Operating)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-8">Total payments from bank/cash accounts</TableCell>
              <TableCell className="text-right text-red-700">{fmt(cf?.totalOutflows ?? 0)}</TableCell>
            </TableRow>
            <TableRow className="bg-red-100 font-semibold">
              <TableCell>Total Outflows ({cf?.outflowCount ?? 0} transactions)</TableCell>
              <TableCell className="text-right text-red-700">{fmt(cf?.totalOutflows ?? 0)}</TableCell>
            </TableRow>

            <TableRow className={`font-bold text-base ${(cf?.netCashFlow ?? 0) >= 0 ? "bg-green-100" : "bg-red-100"}`}>
              <TableCell>Net Cash Flow</TableCell>
              <TableCell className={`text-right ${(cf?.netCashFlow ?? 0) >= 0 ? "text-green-800" : "text-red-800"}`}>
                {fmt(cf?.netCashFlow ?? 0)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <p className="text-xs text-gray-400 mt-2">
          * Cash flows derived from movements in Cash and Bank ASSET accounts (POSTED journal entries only).
        </p>
      </div>
    );
  };

  const DayBookViewer = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gray-50 border-0">
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Total Debit</p>
            <p className="text-lg font-bold text-blue-700">{fmt(dayBook?.totalDebit ?? 0)} AED</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-50 border-0">
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Total Credit</p>
            <p className="text-lg font-bold text-blue-700">{fmt(dayBook?.totalCredit ?? 0)} AED</p>
          </CardContent>
        </Card>
      </div>
      <div className="text-sm text-gray-500">{(dayBook?.lines ?? []).length} entries</div>
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold text-primary">Date</TableHead>
            <TableHead className="font-semibold text-primary">Voucher No.</TableHead>
            <TableHead className="font-semibold text-primary">Narration</TableHead>
            <TableHead className="font-semibold text-primary">Account</TableHead>
            <TableHead className="font-semibold text-primary">Type</TableHead>
            <TableHead className="font-semibold text-primary text-right">Debit (AED)</TableHead>
            <TableHead className="font-semibold text-primary text-right">Credit (AED)</TableHead>
            <TableHead className="font-semibold text-primary text-right">Balance (AED)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(dayBook?.lines ?? []).map((l, i) => (
            <TableRow key={i} className="hover:bg-gray-50/60">
              <TableCell className="whitespace-nowrap">{l.date}</TableCell>
              <TableCell className="font-mono text-sm">{l.voucherNo}</TableCell>
              <TableCell className="max-w-[180px] truncate" title={l.narration}>{l.narration}</TableCell>
              <TableCell>{l.accountName}</TableCell>
              <TableCell><Badge variant="secondary" className="text-xs">{l.accountType}</Badge></TableCell>
              <TableCell className="text-right">{l.debit > 0 ? fmt(l.debit) : "-"}</TableCell>
              <TableCell className="text-right">{l.credit > 0 ? fmt(l.credit) : "-"}</TableCell>
              <TableCell className={`text-right font-medium ${l.balance >= 0 ? "text-blue-700" : "text-red-700"}`}>
                {fmt(l.balance)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-blue-50 font-semibold">
            <TableCell colSpan={5}>Totals</TableCell>
            <TableCell className="text-right">{fmt(dayBook?.totalDebit ?? 0)}</TableCell>
            <TableCell className="text-right">{fmt(dayBook?.totalCredit ?? 0)}</TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );

  const BankBookViewer = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Opening Balance", value: bankBook?.openingBalance ?? 0, color: "text-gray-700" },
          { label: "Total Inflows", value: bankBook?.totalInflows ?? 0, color: "text-green-700" },
          { label: "Total Outflows", value: bankBook?.totalOutflows ?? 0, color: "text-red-700" },
          { label: "Closing Balance", value: bankBook?.closingBalance ?? 0, color: (bankBook?.closingBalance ?? 0) >= 0 ? "text-blue-700" : "text-red-700" },
        ].map(kpi => (
          <Card key={kpi.label} className="bg-gray-50 border-0">
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">{kpi.label}</p>
              <p className={`text-lg font-bold ${kpi.color}`}>{fmt(kpi.value)} AED</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold text-primary">Date</TableHead>
            <TableHead className="font-semibold text-primary">Voucher No.</TableHead>
            <TableHead className="font-semibold text-primary">Narration</TableHead>
            <TableHead className="font-semibold text-primary">Account</TableHead>
            <TableHead className="font-semibold text-primary text-right">Inflow (AED)</TableHead>
            <TableHead className="font-semibold text-primary text-right">Outflow (AED)</TableHead>
            <TableHead className="font-semibold text-primary text-right">Balance (AED)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="bg-gray-100 italic">
            <TableCell colSpan={6} className="text-gray-500 text-sm">Opening Balance</TableCell>
            <TableCell className="text-right font-semibold">{fmt(bankBook?.openingBalance ?? 0)}</TableCell>
          </TableRow>
          {(bankBook?.lines ?? []).map((l, i) => (
            <TableRow key={i} className="hover:bg-gray-50/60">
              <TableCell className="whitespace-nowrap">{l.date}</TableCell>
              <TableCell className="font-mono text-sm">{l.voucherNo}</TableCell>
              <TableCell className="max-w-[180px] truncate" title={l.narration}>{l.narration}</TableCell>
              <TableCell>{l.accountName}</TableCell>
              <TableCell className="text-right text-green-700">{l.inflow > 0 ? fmt(l.inflow) : "-"}</TableCell>
              <TableCell className="text-right text-red-700">{l.outflow > 0 ? fmt(l.outflow) : "-"}</TableCell>
              <TableCell className={`text-right font-medium ${l.balance >= 0 ? "text-blue-700" : "text-red-700"}`}>
                {fmt(l.balance)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-blue-50 font-semibold">
            <TableCell colSpan={4}>Closing Balance</TableCell>
            <TableCell className="text-right text-green-700">{fmt(bankBook?.totalInflows ?? 0)}</TableCell>
            <TableCell className="text-right text-red-700">{fmt(bankBook?.totalOutflows ?? 0)}</TableCell>
            <TableCell className="text-right text-blue-700">{fmt(bankBook?.closingBalance ?? 0)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );

  const FundFlowViewer = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Sources", value: fundFlow?.totalSources ?? 0, color: "text-green-700" },
          { label: "Total Uses", value: fundFlow?.totalUses ?? 0, color: "text-red-700" },
          { label: "Net Fund Flow", value: fundFlow?.netFundFlow ?? 0, color: (fundFlow?.netFundFlow ?? 0) >= 0 ? "text-green-700" : "text-red-700" },
        ].map(kpi => (
          <Card key={kpi.label} className="bg-gray-50 border-0">
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">{kpi.label}</p>
              <p className={`text-lg font-bold ${kpi.color}`}>{fmt(kpi.value)} AED</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Sources of Funds
          </h4>
          <Table>
            <TableHeader>
              <TableRow className="bg-green-50">
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount (AED)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(fundFlow?.sources ?? []).map((s, i) => (
                <TableRow key={i}>
                  <TableCell>{s.description}</TableCell>
                  <TableCell className="text-right text-green-700">{fmt(s.amount)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-green-100 font-semibold">
                <TableCell>Total Sources</TableCell>
                <TableCell className="text-right text-green-700">{fmt(fundFlow?.totalSources ?? 0)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div>
          <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
            <TrendingDown className="h-4 w-4" /> Uses of Funds
          </h4>
          <Table>
            <TableHeader>
              <TableRow className="bg-red-50">
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount (AED)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(fundFlow?.uses ?? []).map((u, i) => (
                <TableRow key={i}>
                  <TableCell>{u.description}</TableCell>
                  <TableCell className="text-right text-red-700">{fmt(u.amount)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-red-100 font-semibold">
                <TableCell>Total Uses</TableCell>
                <TableCell className="text-right text-red-700">{fmt(fundFlow?.totalUses ?? 0)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      <div className={`rounded-lg p-4 font-semibold text-center ${(fundFlow?.netFundFlow ?? 0) >= 0 ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
        Net Fund Flow: {fmt(fundFlow?.netFundFlow ?? 0)} AED
        {(fundFlow?.workingCapitalChange ?? 0) !== 0 && (
          <span className="ml-4 text-sm font-normal text-gray-600">
            | Working Capital Change: {fmt(fundFlow?.workingCapitalChange ?? 0)} AED
          </span>
        )}
      </div>
    </div>
  );

  const PdcReportViewer = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gray-50 border-0">
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Total Outstanding</p>
            <p className="text-lg font-bold text-orange-700">{fmt(pdcReport?.totalOutgoing ?? 0)} AED</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-50 border-0">
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Cheque Count</p>
            <p className="text-lg font-bold text-gray-700">{pdcReport?.outgoingCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold text-primary">Voucher No.</TableHead>
            <TableHead className="font-semibold text-primary">Party Name</TableHead>
            <TableHead className="font-semibold text-primary">Cheque No.</TableHead>
            <TableHead className="font-semibold text-primary">Cheque Date</TableHead>
            <TableHead className="font-semibold text-primary">Bank Account</TableHead>
            <TableHead className="font-semibold text-primary text-right">Amount (AED)</TableHead>
            <TableHead className="font-semibold text-primary">Status</TableHead>
            <TableHead className="font-semibold text-primary">PDC</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(pdcReport?.cheques ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-gray-500">No cheques found</TableCell>
            </TableRow>
          )}
          {(pdcReport?.cheques ?? []).map((c, i) => (
            <TableRow key={i} className="hover:bg-gray-50/60">
              <TableCell className="font-mono text-sm">{c.voucherNo}</TableCell>
              <TableCell>{c.partyName}</TableCell>
              <TableCell className="font-mono">{c.chequeNo || "-"}</TableCell>
              <TableCell>{c.chequeDate || "-"}</TableCell>
              <TableCell>{c.bankAccount || "-"}</TableCell>
              <TableCell className="text-right font-medium">{fmt(c.amount)}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={
                  c.status?.toLowerCase() === "paid" ? "bg-green-100 text-green-800" :
                  c.status?.toLowerCase() === "pending" ? "bg-yellow-100 text-yellow-800" :
                  "bg-gray-100 text-gray-800"
                }>{c.status}</Badge>
              </TableCell>
              <TableCell>
                {c.isPostDated ? (
                  <Badge className="bg-orange-100 text-orange-800">Post-Dated</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-500">Current</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const reportViewerMap: Record<ReportId, React.ReactNode> = {
    "profit-loss":   <ProfitLossViewer />,
    "balance-sheet": <BalanceSheetViewer />,
    "trial-balance": <TrialBalanceViewer />,
    "cash-flow":     <CashFlowViewer />,
    "day-book":      <DayBookViewer />,
    "bank-book":     <BankBookViewer />,
    "fund-flow":     <FundFlowViewer />,
    "pdc-report":    <PdcReportViewer />,
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-primary rounded-lg p-2">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Financial Reports</h1>
            <p className="text-sm text-gray-600">IFRS-compliant financial reports and statements</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Package
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white border-0 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-light border-b border-slate-100">
          <CardTitle className="text-lg">Report Filters</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Branch / Entity</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {["All Branches", "Downtown", "Mall Branch", "Marina Branch"].map(b => (
                    <SelectItem key={b} value={b.toLowerCase().replace(/\s+/g, "-")}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-month">Current Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="current-quarter">Current Quarter</SelectItem>
                  <SelectItem value="last-quarter">Last Quarter</SelectItem>
                  <SelectItem value="current-year">Current Year</SelectItem>
                  <SelectItem value="last-year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Report Category</Label>
              <Select value={reportCategory} onValueChange={setReportCategory}>
                <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="primary">Primary Statements</SelectItem>
                  <SelectItem value="secondary">Secondary Reports</SelectItem>
                  <SelectItem value="supporting">Supporting Reports</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Custom Date Range</Label>
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal")}
                    disabled={selectedPeriod !== "custom"}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, "LLL dd, y")} – {format(dateRange.to, "LLL dd, y")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={(range) => { if (range?.from && range.to) setDateRange({ from: range.from, to: range.to }); }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Selected period: <strong>{format(dateRange.from, "dd MMM yyyy")}</strong> – <strong>{format(dateRange.to, "dd MMM yyyy")}</strong>
          </p>
        </CardContent>
      </Card>

      {/* Report Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredReports.map((report) => (
          <Card
            key={report.id}
            className="bg-white border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none cursor-pointer overflow-hidden rounded-2xl"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 rounded-lg p-2">
                    <report.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-tight">{report.title}</h3>
                  </div>
                </div>
                <Badge variant="secondary" className={`text-xs ${
                  report.category === "primary" ? "bg-blue-100 text-blue-800" :
                  report.category === "secondary" ? "bg-purple-100 text-purple-800" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {report.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">{report.description}</p>
              <div className="flex items-center text-xs text-gray-500">
                <CheckSquare className="h-3 w-3 mr-1" />
                IFRS Compliant
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={() => handleGenerateReport(report.id)}
                  disabled={isGenerating}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Viewer Dialog */}
      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport("")}>
          <DialogContent className="max-w-6xl max-h-[85vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>
                {reportDefinitions.find(r => r.id === selectedReport)?.title}
              </DialogTitle>
              <DialogDescription>
                Period: {format(dateRange.from, "dd MMM yyyy")} – {format(dateRange.to, "dd MMM yyyy")} | Branch: {selectedBranch === "all" ? "All Branches" : selectedBranch}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Export Actions */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />CSV</Button>
                <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Excel</Button>
                <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />PDF</Button>
              </div>

              {/* Report Content */}
              {isGenerating ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                  <p className="text-gray-600">Generating report…</p>
                </div>
              ) : (
                selectedReport && reportViewerMap[selectedReport]
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
