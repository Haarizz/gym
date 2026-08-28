import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useBranch } from "../utils/branch-context";
import { useCurrency, CurrencyGlyph } from "../utils/currency";
import {
  financialReportsService, IncomeStatementData, BalanceSheetData, TrialBalanceData, CashFlowData,
  CashBookData, DayBookData, GeneralLedgerData, AgingData, DeferredRevenueData, TaxSummaryData,
} from "../utils/supabase/financial-reports-service";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  FileText,
  Download,
  TrendingUp,
  Building2,
  DollarSign,
  BookOpen,
  Landmark,
  BarChart3,
  RefreshCw,
  Calculator,
  Wallet,
  ScrollText,
  Users,
  Truck,
  Hourglass,
  Search,
  ChevronRight,
  SlidersHorizontal,
  Clock,
  ShoppingCart,
  Banknote,
  Package,
  Megaphone,
  Activity,
  ExternalLink,
} from "lucide-react";
import { format, subMonths, subYears, subDays, differenceInCalendarDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subQuarters } from "date-fns";
import { cn } from "../components/ui/utils";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const CHART_COLORS = ["#2563eb", "#16a34a", "#f97316", "#7c3aed", "#0891b2", "#dc2626", "#ca8a04", "#0d9488"];

function sortByDate<T>(items: T[], getDate: (item: T) => string | undefined, order: "fifo" | "lifo"): T[] {
  const sorted = [...items].sort((a, b) => {
    const da = getDate(a) ? new Date(getDate(a) as string).getTime() : 0;
    const db = getDate(b) ? new Date(getDate(b) as string).getTime() : 0;
    return da - db;
  });
  return order === "lifo" ? sorted.reverse() : sorted;
}

interface DateRange {
  from: Date;
  to: Date;
}

type ReportKind = "chart" | "table";

interface ReportDefinition {
  id: string;
  title: string;
  description: string;
  group: string;
  type: ReportKind;
  tags: string[];
  /** Reports that live on their own dedicated page elsewhere in the app, rather than rendering inline here. */
  external?: { route: string; state?: Record<string, any> };
}

const GROUP_META: Record<string, { icon: React.ElementType }> = {
  "Profit & Loss": { icon: TrendingUp },
  "Balance Sheet": { icon: Building2 },
  "Cash Flow": { icon: DollarSign },
  "Ledgers": { icon: ScrollText },
  "Membership": { icon: Users },
  "Sales & Revenue": { icon: ShoppingCart },
  "Payroll": { icon: Banknote },
  "Assets": { icon: Package },
  "Member Connect": { icon: Megaphone },
  "Aging & Recoverables": { icon: Clock },
  "Revenue Recognition": { icon: Hourglass },
  "Tax & Compliance": { icon: Landmark },
  "Analytics & Custom": { icon: Activity },
};

const GROUP_ORDER = Object.keys(GROUP_META);

const reportDefinitions: ReportDefinition[] = [
  {
    id: "profit-loss",
    title: "Statement of Profit or Loss (P&L)",
    description: "Revenue, expenses and net profit vs. the prior equivalent period",
    group: "Profit & Loss",
    type: "chart",
    tags: ["IFRS", "income", "net profit"],
  },
  {
    id: "balance-sheet",
    title: "Statement of Financial Position",
    description: "Assets, liabilities and equity as of a selected date",
    group: "Balance Sheet",
    type: "table",
    tags: ["IFRS", "assets", "equity"],
  },
  {
    id: "trial-balance",
    title: "Trial Balance",
    description: "All account balances — debit and credit totals",
    group: "Balance Sheet",
    type: "table",
    tags: ["ledger", "debit", "credit"],
  },
  {
    id: "cash-flow",
    title: "Statement of Cash Flows",
    description: "Cash inflows and outflows for the selected period",
    group: "Cash Flow",
    type: "chart",
    tags: ["cash", "inflow", "outflow"],
  },
  {
    id: "cash-book",
    title: "Cash Book",
    description: "Chronological ledger of the cash/bank accounts, with running balance",
    group: "Cash Flow",
    type: "table",
    tags: ["cash", "bank", "ledger"],
  },
  {
    id: "day-book",
    title: "Day Book",
    description: "Every posted line for a single date, across all accounts",
    group: "Cash Flow",
    type: "table",
    tags: ["daily", "postings"],
  },
  {
    id: "general-ledger",
    title: "General Ledger",
    description: "Every account's postings and running balance, grouped by account",
    group: "Ledgers",
    type: "table",
    tags: ["ledger", "postings"],
  },
  {
    id: "member-aging",
    title: "Member Aging",
    description: "Outstanding member balances bucketed by days overdue",
    group: "Aging & Recoverables",
    type: "table",
    tags: ["receivables", "aging"],
  },
  {
    id: "supplier-aging",
    title: "Supplier Aging",
    description: "Outstanding supplier bills bucketed by days overdue",
    group: "Aging & Recoverables",
    type: "table",
    tags: ["payables", "aging"],
  },
  {
    id: "deferred-revenue",
    title: "Deferred Revenue",
    description: "Unrecognized membership revenue and its amortization schedules",
    group: "Revenue Recognition",
    type: "table",
    tags: ["deferred", "membership"],
  },
  {
    id: "tax-summary",
    title: "Tax & VAT Summary",
    description: "Output/input VAT and corporate tax computation for the period",
    group: "Tax & Compliance",
    type: "chart",
    tags: ["VAT", "corporate tax"],
  },

  // Reports that live on their own dedicated pages elsewhere in the app.
  {
    id: "membership-report",
    title: "Membership Report",
    description: "Membership transactions by type, plan and payment mode",
    group: "Membership",
    type: "table",
    tags: ["members", "transactions"],
    external: { route: "/members", state: { tab: "reports" } },
  },
  {
    id: "attendance-reports",
    title: "Attendance Reports",
    description: "Check-in trends, class attendance and member attendance stats",
    group: "Membership",
    type: "chart",
    tags: ["attendance", "check-ins"],
    external: { route: "/attendance-reports" },
  },
  {
    id: "sales-reports",
    title: "Sales Reports",
    description: "Sales register, weekly trend, category mix and top plans",
    group: "Sales & Revenue",
    type: "chart",
    tags: ["sales", "receipts"],
    external: { route: "/sales-reports" },
  },
  {
    id: "payroll-reports",
    title: "Payroll Reports",
    description: "Detailed payroll register for staff and trainers",
    group: "Payroll",
    type: "table",
    tags: ["payroll", "salary"],
    external: { route: "/payroll-reports" },
  },
  {
    id: "asset-reports",
    title: "Asset Reports",
    description: "Asset, maintenance and compliance report catalogue",
    group: "Assets",
    type: "table",
    tags: ["assets", "maintenance"],
    external: { route: "/asset-reports" },
  },
  {
    id: "member-connect-reports",
    title: "Member Connect Reports",
    description: "Promotions, referrals, follow-ups and campaign ROI",
    group: "Member Connect",
    type: "chart",
    tags: ["marketing", "referrals", "follow-ups"],
    external: { route: "/member-connect-reports" },
  },
  {
    id: "reports-analytics",
    title: "Reports & Analytics",
    description: "General BI dashboard — revenue, attendance and member trends",
    group: "Analytics & Custom",
    type: "chart",
    tags: ["analytics", "dashboard"],
    external: { route: "/reports" },
  },
  {
    id: "custom-reports",
    title: "Custom Reports",
    description: "Build ad-hoc reports, including a printable membership report template",
    group: "Analytics & Custom",
    type: "table",
    tags: ["custom", "ad-hoc"],
    external: { route: "/custom-reports" },
  },
];

export function FinancialReports() {
  const { currencyCode } = useCurrency();
  const { activeBranchName } = useBranch();
  const navigate = useNavigate();

  const [selectedReport, setSelectedReport] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set(GROUP_ORDER));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("current-month");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [sortOrder, setSortOrder] = useState<"fifo" | "lifo">("fifo");

  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementData | null>(null);
  const [incomeStatementPrior, setIncomeStatementPrior] = useState<IncomeStatementData | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceData | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowData | null>(null);
  const [cashBook, setCashBook] = useState<CashBookData | null>(null);
  const [dayBook, setDayBook] = useState<DayBookData | null>(null);
  const [generalLedger, setGeneralLedger] = useState<GeneralLedgerData | null>(null);
  const [memberAging, setMemberAging] = useState<AgingData | null>(null);
  const [supplierAging, setSupplierAging] = useState<AgingData | null>(null);
  const [deferredRevenue, setDeferredRevenue] = useState<DeferredRevenueData | null>(null);
  const [taxSummary, setTaxSummary] = useState<TaxSummaryData | null>(null);

  useEffect(() => {
    const now = new Date();
    switch (selectedPeriod) {
      case "current-month":
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case "last-month": {
        const lastMo = subMonths(now, 1);
        setDateRange({ from: startOfMonth(lastMo), to: endOfMonth(lastMo) });
        break;
      }
      case "current-quarter":
        setDateRange({ from: startOfQuarter(now), to: endOfQuarter(now) });
        break;
      case "last-quarter": {
        const lastQ = subQuarters(now, 1);
        setDateRange({ from: startOfQuarter(lastQ), to: endOfQuarter(lastQ) });
        break;
      }
      case "current-year":
        setDateRange({ from: startOfYear(now), to: endOfYear(now) });
        break;
      case "last-year": {
        const lastYr = subYears(now, 1);
        setDateRange({ from: startOfYear(lastYr), to: endOfYear(lastYr) });
        break;
      }
      default:
        break;
    }
  }, [selectedPeriod]);

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reportDefinitions;
    return reportDefinitions.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const groupedReports = useMemo(
    () =>
      GROUP_ORDER.map((group) => ({
        group,
        reports: filteredReports.filter((r) => r.group === group),
      })).filter((g) => g.reports.length > 0),
    [filteredReports]
  );

  const selectedReportDef = reportDefinitions.find((r) => r.id === selectedReport);

  const getDateParams = () => {
    const from = format(dateRange.from, "yyyy-MM-dd");
    const to = format(dateRange.to, "yyyy-MM-dd");
    return { from, to };
  };

  const handleGenerateReport = async (reportId: string) => {
    setIsGeneratingReport(true);
    setSelectedReport(reportId);
    setSortOrder("fifo");
    setIncomeStatement(null);
    setIncomeStatementPrior(null);
    setBalanceSheet(null);
    setTrialBalance(null);
    setCashFlow(null);
    setCashBook(null);
    setDayBook(null);
    setGeneralLedger(null);
    setMemberAging(null);
    setSupplierAging(null);
    setDeferredRevenue(null);
    setTaxSummary(null);
    const { from, to } = getDateParams();
    try {
      if (reportId === "profit-loss") {
        const rangeDays = differenceInCalendarDays(dateRange.to, dateRange.from);
        const priorTo = subDays(dateRange.from, 1);
        const priorFrom = subDays(priorTo, rangeDays);
        const [current, prior] = await Promise.all([
          financialReportsService.getIncomeStatement(from, to),
          financialReportsService.getIncomeStatement(format(priorFrom, "yyyy-MM-dd"), format(priorTo, "yyyy-MM-dd")),
        ]);
        setIncomeStatement(current);
        setIncomeStatementPrior(prior);
      } else if (reportId === "balance-sheet") {
        const data = await financialReportsService.getBalanceSheet(to);
        setBalanceSheet(data);
      } else if (reportId === "trial-balance") {
        const data = await financialReportsService.getTrialBalance(to);
        setTrialBalance(data);
      } else if (reportId === "cash-flow") {
        const data = await financialReportsService.getCashFlow(from, to);
        setCashFlow(data);
      } else if (reportId === "cash-book") {
        const data = await financialReportsService.getCashBook(from, to);
        setCashBook(data);
      } else if (reportId === "day-book") {
        const data = await financialReportsService.getDayBook(to);
        setDayBook(data);
      } else if (reportId === "general-ledger") {
        const data = await financialReportsService.getGeneralLedger(from, to);
        setGeneralLedger(data);
      } else if (reportId === "member-aging") {
        const data = await financialReportsService.getMemberAging(to);
        setMemberAging(data);
      } else if (reportId === "supplier-aging") {
        const data = await financialReportsService.getSupplierAging(to);
        setSupplierAging(data);
      } else if (reportId === "deferred-revenue") {
        const data = await financialReportsService.getDeferredRevenue();
        setDeferredRevenue(data);
      } else if (reportId === "tax-summary") {
        const data = await financialReportsService.getTaxSummary(from, to);
        setTaxSummary(data);
      }
      toast.success("Report generated");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate report");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleRegenerate = () => {
    if (selectedReport) handleGenerateReport(selectedReport);
  };

  const downloadBlob = (filename: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const toCsvCell = (value: unknown) => {
    const s = value == null ? "" : String(value);
    return `"${s.replaceAll('"', '""')}"`;
  };

  const exportAsCsv = (filename: string, header: string[], rows: Array<Array<unknown>>) => {
    const csv = [
      header.map(toCsvCell).join(","),
      ...rows.map((r) => r.map(toCsvCell).join(",")),
    ].join("\n");
    downloadBlob(filename, new Blob([csv], { type: "text/csv;charset=utf-8" }));
  };

  const exportAsExcel = (filename: string, header: string[], rows: Array<Array<unknown>>) => {
    const html = `
      <html><head><meta charset="utf-8" /></head><body>
      <table border="1" cellspacing="0" cellpadding="4">
        <thead><tr>${header.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? ""}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
      </body></html>
    `.trim();
    downloadBlob(filename, new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }));
  };

  const handleExportReport = (exportFormat: "csv" | "excel" | "pdf") => {
    if (!selectedReport) return;
    const dateLabel = `${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}`;

    const emit = (name: string, header: string[], rows: Array<Array<unknown>>) => {
      const filename = `${name}_${dateLabel}.${exportFormat === "excel" ? "xls" : "csv"}`;
      if (exportFormat === "pdf") {
        window.print();
        return;
      }
      if (exportFormat === "excel") exportAsExcel(filename, header, rows);
      else exportAsCsv(filename, header, rows);
      toast.success("Export started");
    };

    if (selectedReport === "profit-loss") {
      if (!incomeStatement) { toast.error("Generate the report first"); return; }
      const rows = [
        ...incomeStatement.revenueLines.map((l) => ["Revenue", l.accountName, l.amount]),
        ...incomeStatement.expenseLines.map((l) => ["Expense", l.accountName, l.amount]),
        ["", "Total Revenue", incomeStatement.totalRevenue],
        ["", "Total Expenses", incomeStatement.totalExpenses],
        ["", "Net Income", incomeStatement.netIncome],
      ];
      emit("profit-loss", ["Section", "Account", `Amount (${currencyCode})`], rows);
      return;
    }

    if (selectedReport === "trial-balance") {
      if (!trialBalance) { toast.error("Generate the report first"); return; }
      const rows = trialBalance.lines.map((l) => [l.code, l.name, l.debit, l.credit, l.netBalance]);
      emit("trial-balance", ["Code", "Account", `Debit (${currencyCode})`, `Credit (${currencyCode})`, `Net Balance (${currencyCode})`], rows);
      return;
    }

    if (selectedReport === "balance-sheet") {
      if (!balanceSheet) { toast.error("Generate the report first"); return; }
      const rows = Object.entries(balanceSheet.accounts || {}).flatMap(([group, lines]) =>
        (lines || []).map((l) => [group, l.code, l.name, l.balance])
      );
      emit("balance-sheet", ["Group", "Code", "Account", `Balance (${currencyCode})`], rows);
      return;
    }

    if (selectedReport === "cash-flow") {
      if (!cashFlow) { toast.error("Generate the report first"); return; }
      const rows = [
        [`Total Inflows (${currencyCode})`, cashFlow.totalInflows],
        [`Total Outflows (${currencyCode})`, cashFlow.totalOutflows],
        [`Net Cash Flow (${currencyCode})`, cashFlow.netCashFlow],
        ["Inflow Count", cashFlow.inflowCount],
        ["Outflow Count", cashFlow.outflowCount],
      ];
      emit("cash-flow", ["Metric", "Value"], rows);
      return;
    }

    if (selectedReport === "cash-book") {
      if (!cashBook) { toast.error("Generate the report first"); return; }
      const rows = cashBook.entries.map((e) => [e.date, e.voucherNo, e.accountName, e.debit, e.credit, e.runningBalance ?? 0]);
      emit("cash-book", ["Date", "Voucher", "Account", "Debit", "Credit", "Balance"], rows);
      return;
    }

    if (selectedReport === "day-book") {
      if (!dayBook) { toast.error("Generate the report first"); return; }
      const rows = dayBook.entries.map((e) => [e.voucherNo, e.accountName, e.narration ?? "", e.debit, e.credit]);
      emit("day-book", ["Voucher", "Account", "Narration", "Debit", "Credit"], rows);
      return;
    }

    if (selectedReport === "general-ledger") {
      if (!generalLedger) { toast.error("Generate the report first"); return; }
      const rows = generalLedger.accounts.flatMap((acc) =>
        acc.entries.map((e) => [acc.accountCode, acc.accountName, e.date, e.voucherNo, e.debit, e.credit, e.runningBalance ?? 0])
      );
      emit("general-ledger", ["Account Code", "Account Name", "Date", "Voucher", "Debit", "Credit", "Balance"], rows);
      return;
    }

    if (selectedReport === "member-aging" || selectedReport === "supplier-aging") {
      const data = selectedReport === "member-aging" ? memberAging : supplierAging;
      if (!data) { toast.error("Generate the report first"); return; }
      const rows = data.rows.map((r) => [r.name, r.reference ?? "", r.dueDate ?? "", r.outstanding, r.daysOverdue, r.bucket]);
      emit(selectedReport, ["Name", "Reference", "Due Date", "Outstanding", "Days Overdue", "Bucket"], rows);
      return;
    }

    if (selectedReport === "deferred-revenue") {
      if (!deferredRevenue) { toast.error("Generate the report first"); return; }
      const rows = deferredRevenue.schedules.map((s) => [s.memberName ?? "", s.planName ?? "", s.startDate, s.endDate, s.totalAmount, s.recognizedAmount, s.remainingAmount]);
      emit("deferred-revenue", ["Member", "Plan", "Start", "End", "Total", "Recognized", "Remaining"], rows);
      return;
    }

    if (selectedReport === "tax-summary") {
      if (!taxSummary) { toast.error("Generate the report first"); return; }
      const rows = taxSummary.taxByCode.map((t) => [t.taxCode, t.name, t.taxType, t.outputAmount, t.inputAmount]);
      emit("tax-summary", ["Tax Code", "Name", "Type", "Output Amount", "Input Amount"], rows);
      return;
    }
  };

  // Merge current + prior income statement lines by account name for an accurate variance column.
  const profitLossSections = useMemo(() => {
    if (!incomeStatement) return null;
    const priorRevenueMap = new Map((incomeStatementPrior?.revenueLines ?? []).map((l) => [l.accountName, l.amount]));
    const priorExpenseMap = new Map((incomeStatementPrior?.expenseLines ?? []).map((l) => [l.accountName, l.amount]));
    return [
      {
        category: "Revenue",
        accounts: incomeStatement.revenueLines.map((l) => ({
          accountName: l.accountName,
          currentPeriod: l.amount,
          priorPeriod: priorRevenueMap.get(l.accountName) ?? 0,
        })),
        totalCurrent: incomeStatement.totalRevenue,
        totalPrior: incomeStatementPrior?.totalRevenue ?? 0,
      },
      {
        category: "Expenses",
        accounts: incomeStatement.expenseLines.map((l) => ({
          accountName: l.accountName,
          currentPeriod: l.amount,
          priorPeriod: priorExpenseMap.get(l.accountName) ?? 0,
        })),
        totalCurrent: incomeStatement.totalExpenses,
        totalPrior: incomeStatementPrior?.totalExpenses ?? 0,
      },
    ];
  }, [incomeStatement, incomeStatementPrior]);

  const EmptyState = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
    <div className="text-center py-12 text-muted-foreground">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <p>{label}</p>
    </div>
  );

  const SummaryBar = ({ label, value, max, tone }: { label: string; value: number; max: number; tone: "green" | "red" | "primary" }) => {
    const toneClasses: Record<string, { bar: string; text: string }> = {
      green: { bar: "bg-green-500", text: "text-green-700" },
      red: { bar: "bg-red-500", text: "text-red-700" },
      primary: { bar: "bg-primary", text: "text-primary" },
    };
    const c = toneClasses[tone];
    const pct = max > 0 ? Math.min(100, Math.max(4, (Math.abs(value) / max) * 100)) : 0;
    return (
      <div>
        <div className={cn("h-3 rounded-full overflow-hidden bg-muted")}>
          <div className={cn("h-full rounded-full", c.bar)} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2">
          <div className={cn("text-xl font-bold", c.text)}>
            <CurrencyGlyph /> {Math.abs(Math.round(value)).toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    );
  };

  const SortToggle = () => (
    <div className="flex items-center gap-1">
      <Button type="button" size="sm" variant={sortOrder === "fifo" ? "default" : "outline"} onClick={() => setSortOrder("fifo")}>
        FIFO (oldest first)
      </Button>
      <Button type="button" size="sm" variant={sortOrder === "lifo" ? "default" : "outline"} onClick={() => setSortOrder("lifo")}>
        LIFO (newest first)
      </Button>
    </div>
  );

  const MiniBarChart = ({ data, dataKey = "value", nameKey = "name", height = 240, colorful = false }: { data: any[]; dataKey?: string; nameKey?: string; height?: number; colorful?: boolean }) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} interval={0} angle={data.length > 5 ? -20 : 0} textAnchor={data.length > 5 ? "end" : "middle"} height={data.length > 5 ? 50 : 30} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => `${currencyCode} ${Number(v).toLocaleString()}`} />
        <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} fill={CHART_COLORS[0]}>
          {colorful && data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const MiniLineChart = ({ data, dataKey = "value", nameKey = "name", height = 240 }: { data: any[]; dataKey?: string; nameKey?: string; height?: number }) => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => `${currencyCode} ${Number(v).toLocaleString()}`} />
        <Line type="monotone" dataKey={dataKey} stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-primary rounded-lg p-2">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Financial Reports</h1>
            <p className="text-sm text-muted-foreground">
              IFRS-compliant financial reports and statements
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={!selectedReport || isGeneratingReport}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isGeneratingReport && "animate-spin")} />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={!selectedReport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExportReport("csv")}>CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportReport("excel")}>Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportReport("pdf")}>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: report catalogue */}
        <Card className="lg:col-span-4 border-primary/10 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Financial Reports</CardTitle>
            <p className="text-xs text-muted-foreground">Every report across Financials, Membership, Sales, Payroll, Assets and Member Connect.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {groupedReports.map(({ group, reports }) => {
                const GroupIcon = GROUP_META[group]?.icon ?? FileText;
                // Auto-expand groups with matches while searching, without losing the user's manual collapse state once the search is cleared.
                const collapsed = collapsedGroups.has(group) && !searchQuery.trim();
                return (
                  <div key={group} className="border rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group)}
                      className="w-full flex items-center justify-between px-2 py-1.5 bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <span className="flex items-center gap-1.5 text-xs font-semibold">
                        <GroupIcon className="h-3.5 w-3.5 text-primary" />
                        {group}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {reports.length} report{reports.length !== 1 ? "s" : ""}
                        <ChevronRight
                          className="h-3.5 w-3.5"
                          style={{ transform: collapsed ? "rotate(0deg)" : "rotate(90deg)", transition: "transform 0.25s ease" }}
                        />
                      </span>
                    </button>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateRows: collapsed ? "0fr" : "1fr",
                        transition: "grid-template-rows 0.25s ease",
                      }}
                    >
                      <div className="min-h-0 overflow-hidden">
                      <div className="p-1 space-y-1">
                        {reports.map((r) => (
                          <button
                            type="button"
                            key={r.id}
                            onClick={() => (r.external ? navigate(r.external.route, { state: r.external.state }) : handleGenerateReport(r.id))}
                            className={cn(
                              "w-full text-left rounded-lg border p-2 transition-all",
                              selectedReport === r.id
                                ? "border-primary bg-primary/5"
                                : "border-transparent hover:border-primary/20 hover:bg-muted/30"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-semibold leading-tight">{r.title}</span>
                              {r.external ? (
                                <Badge variant="outline" className="text-xs shrink-0">
                                  <ExternalLink /> Opens page
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {r.type === "chart" ? "Chart" : "Table"}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {r.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs font-normal">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </button>
                        ))}
                      </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {groupedReports.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-6">
                  No reports match "{searchQuery}"
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: filters + generated report */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-primary/10 shadow-md">
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
              <div>
                <CardTitle>Filters</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Applied to: <span className="font-medium text-foreground">{selectedReportDef?.title ?? "No report selected"}</span>
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowAdvanced((v) => !v)}>
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Advanced
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Date From</Label>
                  <Input
                    type="date"
                    value={format(dateRange.from, "yyyy-MM-dd")}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      setDateRange((r) => ({ ...r, from: new Date(e.target.value) }));
                      setSelectedPeriod("custom");
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date To</Label>
                  <Input
                    type="date"
                    value={format(dateRange.to, "yyyy-MM-dd")}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      setDateRange((r) => ({ ...r, to: new Date(e.target.value) }));
                      setSelectedPeriod("custom");
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Scope</Label>
                  <div className="h-9 flex items-center px-3 rounded-md border bg-muted/30 text-sm text-muted-foreground truncate">
                    {activeBranchName} (consolidated)
                  </div>
                </div>
              </div>

              {showAdvanced && (
                <div className="space-y-2">
                  <Label>Quick Period</Label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
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
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="font-normal">Date From: {format(dateRange.from, "yyyy-MM-dd")}</Badge>
                  <Badge variant="outline" className="font-normal">Date To: {format(dateRange.to, "yyyy-MM-dd")}</Badge>
                  <Badge variant="outline" className="font-normal">Scope: {activeBranchName}</Badge>
                </div>
                <Button
                  onClick={handleRegenerate}
                  disabled={!selectedReport || isGeneratingReport}
                  className="shrink-0"
                >
                  {isGeneratingReport ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <BarChart3 className="h-4 w-4 mr-2" />
                  )}
                  Generate
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-md">
            <CardHeader>
              <CardTitle>{selectedReportDef?.title ?? "Select a report"}</CardTitle>
              {selectedReport && (
                <p className="text-sm text-muted-foreground">
                  Period: {format(dateRange.from, "MMM dd, yyyy")} – {format(dateRange.to, "MMM dd, yyyy")} · Scope: {activeBranchName}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {!selectedReport ? (
                <EmptyState icon={FileText} label="Pick a report from the left to get started." />
              ) : isGeneratingReport ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Generating report...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedReport === "profit-loss" && (
                    !profitLossSections ? (
                      <EmptyState icon={TrendingUp} label="Generate the report to view revenue, expenses and net profit." />
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <SummaryBar label="Revenue" value={incomeStatement!.totalRevenue} max={Math.max(Math.abs(incomeStatement!.totalRevenue), Math.abs(incomeStatement!.totalExpenses), Math.abs(incomeStatement!.netIncome)) || 1} tone="green" />
                          <SummaryBar label="Total Expenses" value={incomeStatement!.totalExpenses} max={Math.max(Math.abs(incomeStatement!.totalRevenue), Math.abs(incomeStatement!.totalExpenses), Math.abs(incomeStatement!.netIncome)) || 1} tone="red" />
                          <SummaryBar label="Net Income" value={incomeStatement!.netIncome} max={Math.max(Math.abs(incomeStatement!.totalRevenue), Math.abs(incomeStatement!.totalExpenses), Math.abs(incomeStatement!.netIncome)) || 1} tone={incomeStatement!.netIncome >= 0 ? "primary" : "red"} />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <Card className="border-0 shadow-sm bg-muted/30">
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Revenue by Account</CardTitle></CardHeader>
                            <CardContent>
                              {incomeStatement!.revenueLines.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-8 text-center">No revenue recorded.</p>
                              ) : (
                                <MiniBarChart data={incomeStatement!.revenueLines.map((l) => ({ name: l.accountName, value: l.amount }))} colorful />
                              )}
                            </CardContent>
                          </Card>
                          <Card className="border-0 shadow-sm bg-muted/30">
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Expenses by Account</CardTitle></CardHeader>
                            <CardContent>
                              {incomeStatement!.expenseLines.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-8 text-center">No expenses recorded.</p>
                              ) : (
                                <MiniBarChart data={incomeStatement!.expenseLines.map((l) => ({ name: l.accountName, value: Math.abs(l.amount) }))} colorful />
                              )}
                            </CardContent>
                          </Card>
                        </div>
                        <div className="rounded-2xl overflow-hidden border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="font-semibold text-primary">Account</TableHead>
                                <TableHead className="font-semibold text-primary text-right">Current Period ({currencyCode})</TableHead>
                                <TableHead className="font-semibold text-primary text-right">Prior Period ({currencyCode})</TableHead>
                                <TableHead className="font-semibold text-primary text-right">Variance (%)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {profitLossSections.map((section, sectionIndex) => (
                                <React.Fragment key={sectionIndex}>
                                  <TableRow className="bg-muted/30">
                                    <TableCell colSpan={4} className="font-semibold text-primary">
                                      {section.category}
                                    </TableCell>
                                  </TableRow>
                                  {section.accounts.length === 0 ? (
                                    <TableRow>
                                      <TableCell colSpan={4} className="pl-6 text-muted-foreground">No {section.category.toLowerCase()} recorded for this period.</TableCell>
                                    </TableRow>
                                  ) : section.accounts.map((account, accountIndex) => {
                                    const variance = account.priorPeriod !== 0
                                      ? (((account.currentPeriod - account.priorPeriod) / Math.abs(account.priorPeriod)) * 100).toFixed(1)
                                      : null;
                                    return (
                                      <TableRow key={accountIndex}>
                                        <TableCell className="pl-6">{account.accountName}</TableCell>
                                        <TableCell className="text-right">{account.currentPeriod.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{account.priorPeriod.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">
                                          {variance === null ? (
                                            <span className="text-muted-foreground">—</span>
                                          ) : (
                                            <span className={parseFloat(variance) >= 0 ? "text-green-600" : "text-red-600"}>
                                              {parseFloat(variance) > 0 ? "+" : ""}{variance}%
                                            </span>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                  <TableRow className="bg-primary/5 font-semibold">
                                    <TableCell>Total {section.category}</TableCell>
                                    <TableCell className="text-right">{section.totalCurrent.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">{section.totalPrior.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">—</TableCell>
                                  </TableRow>
                                </React.Fragment>
                              ))}
                              <TableRow className="bg-primary/10 font-bold">
                                <TableCell>Net Income</TableCell>
                                <TableCell className="text-right">{incomeStatement!.netIncome.toLocaleString()}</TableCell>
                                <TableCell className="text-right">{((incomeStatementPrior?.netIncome) ?? 0).toLocaleString()}</TableCell>
                                <TableCell className="text-right">—</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )
                  )}

                  {selectedReport === "balance-sheet" && (
                    !balanceSheet ? (
                      <EmptyState icon={Building2} label="Generate the report to view assets, liabilities and equity." />
                    ) : (
                      <div className="space-y-6">
                        <Card className="border-0 shadow-sm bg-muted/30">
                          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Assets vs Liabilities & Equity</CardTitle></CardHeader>
                          <CardContent>
                            <MiniBarChart
                              colorful
                              data={[
                                { name: "Assets", value: balanceSheet.totalAssets },
                                { name: "Liabilities", value: balanceSheet.totalLiabilities },
                                { name: "Equity", value: balanceSheet.totalEquity },
                              ]}
                            />
                          </CardContent>
                        </Card>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-primary">Assets</h4>
                          <div className="rounded-2xl overflow-hidden border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="font-semibold text-primary">Account</TableHead>
                                  <TableHead className="font-semibold text-primary text-right">Amount ({currencyCode})</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {Object.entries(balanceSheet.accounts ?? {})
                                  .filter(([group]) => group.toLowerCase().includes("asset"))
                                  .map(([group, lines]) => (
                                    <React.Fragment key={group}>
                                      <TableRow className="bg-muted/30">
                                        <TableCell colSpan={2} className="font-semibold text-primary">{group}</TableCell>
                                      </TableRow>
                                      {(lines ?? []).map((l) => (
                                        <TableRow key={`${group}-${l.code}-${l.name}`}>
                                          <TableCell className="pl-6">{l.name}</TableCell>
                                          <TableCell className="text-right">{Number(l.balance || 0).toLocaleString()}</TableCell>
                                        </TableRow>
                                      ))}
                                    </React.Fragment>
                                  ))}
                                <TableRow className="bg-primary/5 font-semibold">
                                  <TableCell>Total Assets</TableCell>
                                  <TableCell className="text-right">{balanceSheet.totalAssets.toLocaleString()}</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="font-semibold text-primary">Equity & Liabilities</h4>
                          <div className="rounded-2xl overflow-hidden border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="font-semibold text-primary">Account</TableHead>
                                  <TableHead className="font-semibold text-primary text-right">Amount ({currencyCode})</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {Object.entries(balanceSheet.accounts ?? {})
                                  .filter(([group]) => !group.toLowerCase().includes("asset"))
                                  .map(([group, lines]) => (
                                    <React.Fragment key={group}>
                                      <TableRow className="bg-muted/30">
                                        <TableCell colSpan={2} className="font-semibold text-primary">{group}</TableCell>
                                      </TableRow>
                                      {(lines ?? []).map((l) => (
                                        <TableRow key={`${group}-${l.code}-${l.name}`}>
                                          <TableCell className="pl-6">{l.name}</TableCell>
                                          <TableCell className="text-right">{Number(l.balance || 0).toLocaleString()}</TableCell>
                                        </TableRow>
                                      ))}
                                    </React.Fragment>
                                  ))}
                                <TableRow className="bg-primary/5 font-semibold">
                                  <TableCell>Total Equity & Liabilities</TableCell>
                                  <TableCell className="text-right">{(balanceSheet.totalLiabilities + balanceSheet.totalEquity).toLocaleString()}</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                      </div>
                    )
                  )}

                  {selectedReport === "trial-balance" && (
                    !trialBalance ? (
                      <EmptyState icon={Calculator} label="Generate the report to view every account balance." />
                    ) : (
                      <div className="space-y-6">
                      <Card className="border-0 shadow-sm bg-muted/30">
                        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Debit vs Total Credit</CardTitle></CardHeader>
                        <CardContent>
                          <MiniBarChart
                            colorful
                            data={[
                              { name: "Total Debit", value: trialBalance.totalDebit },
                              { name: "Total Credit", value: trialBalance.totalCredit },
                            ]}
                          />
                        </CardContent>
                      </Card>
                      <div className="rounded-2xl overflow-hidden border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="font-semibold text-primary">Code</TableHead>
                              <TableHead className="font-semibold text-primary">Account</TableHead>
                              <TableHead className="font-semibold text-primary text-right">Debit ({currencyCode})</TableHead>
                              <TableHead className="font-semibold text-primary text-right">Credit ({currencyCode})</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {trialBalance.lines.map((account, index) => (
                              <TableRow key={account.code ?? index}>
                                <TableCell>{account.code}</TableCell>
                                <TableCell>{account.name}</TableCell>
                                <TableCell className="text-right">{account.debit > 0 ? Number(account.debit).toLocaleString() : "-"}</TableCell>
                                <TableCell className="text-right">{account.credit > 0 ? Number(account.credit).toLocaleString() : "-"}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-primary/5 font-semibold">
                              <TableCell colSpan={2}>Total</TableCell>
                              <TableCell className="text-right">{trialBalance.totalDebit.toLocaleString()}</TableCell>
                              <TableCell className="text-right">{trialBalance.totalCredit.toLocaleString()}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                      </div>
                    )
                  )}

                  {selectedReport === "cash-flow" && (
                    !cashFlow ? (
                      <EmptyState icon={DollarSign} label="Generate the report to view cash flow totals." />
                    ) : (
                      <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="border-0 shadow-sm bg-muted/30">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">Total Inflows</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-semibold text-green-700"><CurrencyGlyph /> {cashFlow.totalInflows.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground mt-1">{cashFlow.inflowCount} inflow transactions</p>
                          </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm bg-muted/30">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">Total Outflows</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-semibold text-red-700"><CurrencyGlyph /> {cashFlow.totalOutflows.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground mt-1">{cashFlow.outflowCount} outflow transactions</p>
                          </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm bg-muted/30">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">Net Cash Flow</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-semibold text-primary"><CurrencyGlyph /> {cashFlow.netCashFlow.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground mt-1">{cashFlow.periodFrom} → {cashFlow.periodTo}</p>
                          </CardContent>
                        </Card>
                      </div>
                      <Card className="border-0 shadow-sm bg-muted/30">
                        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Inflows vs Outflows</CardTitle></CardHeader>
                        <CardContent>
                          <MiniBarChart
                            colorful
                            data={[
                              { name: "Inflows", value: cashFlow.totalInflows },
                              { name: "Outflows", value: cashFlow.totalOutflows },
                              { name: "Net", value: cashFlow.netCashFlow },
                            ]}
                          />
                        </CardContent>
                      </Card>
                      </div>
                    )
                  )}

                  {selectedReport === "cash-book" && (
                    !cashBook ? (
                      <EmptyState icon={Wallet} label="Generate the report to view cash/bank ledger entries." />
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex gap-6 text-sm">
                            <span>Opening: <strong>{cashBook.openingBalance.toLocaleString()}</strong></span>
                            <span>Closing: <strong>{cashBook.closingBalance.toLocaleString()}</strong></span>
                          </div>
                          <SortToggle />
                        </div>
                        {cashBook.entries.length > 0 && (
                          <Card className="border-0 shadow-sm bg-muted/30">
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Running Balance</CardTitle></CardHeader>
                            <CardContent>
                              <MiniLineChart data={sortByDate(cashBook.entries, (e) => e.date, sortOrder).map((e) => ({ name: e.date, value: e.runningBalance ?? 0 }))} />
                            </CardContent>
                          </Card>
                        )}
                        <div className="rounded-2xl overflow-hidden border">
                          <Table>
                            <TableHeader><TableRow>
                              <TableHead>Date</TableHead><TableHead>Voucher</TableHead><TableHead>Account</TableHead>
                              <TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead>
                              <TableHead className="text-right">Balance</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                              {cashBook.entries.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No entries in this period.</TableCell></TableRow>
                              ) : sortByDate(cashBook.entries, (e) => e.date, sortOrder).map((e, i) => (
                                <TableRow key={i}>
                                  <TableCell>{e.date}</TableCell>
                                  <TableCell className="font-mono text-xs">{e.voucherNo}</TableCell>
                                  <TableCell>{e.accountName}</TableCell>
                                  <TableCell className="text-right">{e.debit > 0 ? e.debit.toLocaleString() : "-"}</TableCell>
                                  <TableCell className="text-right">{e.credit > 0 ? e.credit.toLocaleString() : "-"}</TableCell>
                                  <TableCell className="text-right">{(e.runningBalance ?? 0).toLocaleString()}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )
                  )}

                  {selectedReport === "day-book" && (
                    !dayBook ? (
                      <EmptyState icon={BookOpen} label={`Generate the report to view postings for ${format(dateRange.to, "MMM dd, yyyy")}.`} />
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex gap-6 text-sm">
                            <span>Total Debit: <strong>{dayBook.totalDebit.toLocaleString()}</strong></span>
                            <span>Total Credit: <strong>{dayBook.totalCredit.toLocaleString()}</strong></span>
                          </div>
                          <SortToggle />
                        </div>
                        {dayBook.entries.length > 0 && (
                          <Card className="border-0 shadow-sm bg-muted/30">
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Debit vs Credit by Account</CardTitle></CardHeader>
                            <CardContent>
                              <MiniBarChart
                                colorful
                                data={Object.values(
                                  dayBook.entries.reduce((acc: Record<string, { name: string; value: number }>, e) => {
                                    const key = e.accountName;
                                    if (!acc[key]) acc[key] = { name: key, value: 0 };
                                    acc[key].value += e.debit - e.credit;
                                    return acc;
                                  }, {})
                                )}
                              />
                            </CardContent>
                          </Card>
                        )}
                        <div className="rounded-2xl overflow-hidden border">
                          <Table>
                            <TableHeader><TableRow>
                              <TableHead>Voucher</TableHead><TableHead>Account</TableHead><TableHead>Narration</TableHead>
                              <TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                              {dayBook.entries.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No postings on this date.</TableCell></TableRow>
                              ) : (sortOrder === "lifo" ? [...dayBook.entries].reverse() : dayBook.entries).map((e, i) => (
                                <TableRow key={i}>
                                  <TableCell className="font-mono text-xs">{e.voucherNo}</TableCell>
                                  <TableCell>{e.accountName}</TableCell>
                                  <TableCell className="max-w-xs truncate" title={e.narration}>{e.narration || "—"}</TableCell>
                                  <TableCell className="text-right">{e.debit > 0 ? e.debit.toLocaleString() : "-"}</TableCell>
                                  <TableCell className="text-right">{e.credit > 0 ? e.credit.toLocaleString() : "-"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )
                  )}

                  {selectedReport === "general-ledger" && (
                    !generalLedger || generalLedger.accounts.length === 0 ? (
                      <EmptyState icon={ScrollText} label="Generate the report to view every account's postings." />
                    ) : (
                      <div className="space-y-6">
                        <Card className="border-0 shadow-sm bg-muted/30">
                          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Closing Balance by Account</CardTitle></CardHeader>
                          <CardContent>
                            <MiniBarChart
                              colorful
                              data={generalLedger.accounts.map((acc) => ({ name: acc.accountName, value: acc.closingBalance }))}
                            />
                          </CardContent>
                        </Card>
                        <div className="flex justify-end">
                          <SortToggle />
                        </div>
                        {generalLedger.accounts.map((acc) => (
                          <div key={acc.accountCode} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-primary">{acc.accountCode} — {acc.accountName}</h4>
                              <span className="text-sm text-muted-foreground">Opening {acc.openingBalance.toLocaleString()} → Closing {acc.closingBalance.toLocaleString()}</span>
                            </div>
                            <div className="rounded-2xl overflow-hidden border">
                              <Table>
                                <TableHeader><TableRow>
                                  <TableHead>Date</TableHead><TableHead>Voucher</TableHead>
                                  <TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead>
                                  <TableHead className="text-right">Balance</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                  {sortByDate(acc.entries, (e) => e.date, sortOrder).map((e, i) => (
                                    <TableRow key={i}>
                                      <TableCell>{e.date}</TableCell>
                                      <TableCell className="font-mono text-xs">{e.voucherNo}</TableCell>
                                      <TableCell className="text-right">{e.debit > 0 ? e.debit.toLocaleString() : "-"}</TableCell>
                                      <TableCell className="text-right">{e.credit > 0 ? e.credit.toLocaleString() : "-"}</TableCell>
                                      <TableCell className="text-right">{(e.runningBalance ?? 0).toLocaleString()}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {(selectedReport === "member-aging" || selectedReport === "supplier-aging") && (() => {
                    const data = selectedReport === "member-aging" ? memberAging : supplierAging;
                    if (!data) {
                      return <EmptyState icon={selectedReport === "member-aging" ? Users : Truck} label="Generate the report to view outstanding balances." />;
                    }
                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <Card className="border-0 shadow-sm bg-muted/30"><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Total Outstanding</div><div className="text-lg font-semibold">{data.totalOutstanding.toLocaleString()}</div></CardContent></Card>
                          {Object.entries(data.buckets).map(([bucket, amount]) => (
                            <Card key={bucket} className="border-0 shadow-sm bg-muted/30"><CardContent className="pt-4"><div className="text-xs text-muted-foreground">{bucket} days</div><div className="text-lg font-semibold">{Number(amount).toLocaleString()}</div></CardContent></Card>
                          ))}
                        </div>
                        {Object.keys(data.buckets).length > 0 && (
                          <Card className="border-0 shadow-sm bg-muted/30">
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Outstanding by Aging Bucket</CardTitle></CardHeader>
                            <CardContent>
                              <MiniBarChart colorful data={Object.entries(data.buckets).map(([bucket, amount]) => ({ name: `${bucket} days`, value: Number(amount) }))} />
                            </CardContent>
                          </Card>
                        )}
                        <div className="flex justify-end">
                          <SortToggle />
                        </div>
                        <div className="rounded-2xl overflow-hidden border">
                          <Table>
                            <TableHeader><TableRow>
                              <TableHead>{selectedReport === "member-aging" ? "Member" : "Supplier"}</TableHead>
                              <TableHead>Reference</TableHead><TableHead>Due Date</TableHead>
                              <TableHead className="text-right">Outstanding</TableHead>
                              <TableHead className="text-right">Days Overdue</TableHead><TableHead>Bucket</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                              {data.rows.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No outstanding balances.</TableCell></TableRow>
                              ) : sortByDate(data.rows, (r) => r.dueDate, sortOrder).map((r, i) => (
                                <TableRow key={i}>
                                  <TableCell>{r.name || "—"}</TableCell>
                                  <TableCell className="font-mono text-xs">{r.reference || "—"}</TableCell>
                                  <TableCell>{r.dueDate || "—"}</TableCell>
                                  <TableCell className="text-right">{r.outstanding.toLocaleString()}</TableCell>
                                  <TableCell className="text-right">{r.daysOverdue}</TableCell>
                                  <TableCell><Badge variant="secondary">{r.bucket}</Badge></TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    );
                  })()}

                  {selectedReport === "deferred-revenue" && (
                    !deferredRevenue ? (
                      <EmptyState icon={Hourglass} label="Generate the report to view unrecognized membership revenue." />
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card className="border-0 shadow-sm bg-muted/30"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ledger Balance</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold"><CurrencyGlyph /> {deferredRevenue.ledgerBalance.toLocaleString()}</div></CardContent></Card>
                          <Card className="border-0 shadow-sm bg-muted/30"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Scheduled Remaining</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold"><CurrencyGlyph /> {deferredRevenue.scheduledRemaining.toLocaleString()}</div></CardContent></Card>
                          <Card className="border-0 shadow-sm bg-muted/30"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Active Schedules</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{deferredRevenue.activeScheduleCount}</div></CardContent></Card>
                        </div>
                        {deferredRevenue.schedules.length > 0 && (
                          <Card className="border-0 shadow-sm bg-muted/30">
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Recognized vs Remaining</CardTitle></CardHeader>
                            <CardContent>
                              <MiniBarChart
                                colorful
                                data={[
                                  { name: "Recognized", value: deferredRevenue.schedules.reduce((s, x) => s + x.recognizedAmount, 0) },
                                  { name: "Remaining", value: deferredRevenue.schedules.reduce((s, x) => s + x.remainingAmount, 0) },
                                ]}
                              />
                            </CardContent>
                          </Card>
                        )}
                        <div className="flex justify-end">
                          <SortToggle />
                        </div>
                        <div className="rounded-2xl overflow-hidden border">
                          <Table>
                            <TableHeader><TableRow>
                              <TableHead>Member</TableHead><TableHead>Plan</TableHead><TableHead>Period</TableHead>
                              <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Recognized</TableHead><TableHead className="text-right">Remaining</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                              {deferredRevenue.schedules.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No active deferred revenue schedules.</TableCell></TableRow>
                              ) : sortByDate(deferredRevenue.schedules, (s) => s.startDate, sortOrder).map((s) => (
                                <TableRow key={s.scheduleId}>
                                  <TableCell>{s.memberName || "—"}</TableCell>
                                  <TableCell>{s.planName || "—"}</TableCell>
                                  <TableCell>{s.startDate} → {s.endDate}</TableCell>
                                  <TableCell className="text-right">{s.totalAmount.toLocaleString()}</TableCell>
                                  <TableCell className="text-right">{s.recognizedAmount.toLocaleString()}</TableCell>
                                  <TableCell className="text-right">{s.remainingAmount.toLocaleString()}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )
                  )}

                  {selectedReport === "tax-summary" && (
                    !taxSummary ? (
                      <EmptyState icon={Landmark} label="Generate the report to view VAT and corporate tax computation." />
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <SummaryBar label="Output VAT" value={taxSummary.outputVat} max={Math.max(Math.abs(taxSummary.outputVat), Math.abs(taxSummary.inputVat), Math.abs(taxSummary.netVatPayable)) || 1} tone="green" />
                          <SummaryBar label="Input VAT" value={taxSummary.inputVat} max={Math.max(Math.abs(taxSummary.outputVat), Math.abs(taxSummary.inputVat), Math.abs(taxSummary.netVatPayable)) || 1} tone="red" />
                          <SummaryBar label="Net VAT Payable" value={taxSummary.netVatPayable} max={Math.max(Math.abs(taxSummary.outputVat), Math.abs(taxSummary.inputVat), Math.abs(taxSummary.netVatPayable)) || 1} tone={taxSummary.netVatPayable >= 0 ? "primary" : "green"} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card className="border-0 shadow-sm bg-muted/30"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Taxable Profit</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold"><CurrencyGlyph /> {taxSummary.taxableProfit.toLocaleString()}</div></CardContent></Card>
                          <Card className="border-0 shadow-sm bg-muted/30"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Corporate Tax Rate</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{taxSummary.corporateTaxRate}%</div></CardContent></Card>
                          <Card className="border-0 shadow-sm bg-muted/30"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Corporate Tax Payable</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold"><CurrencyGlyph /> {taxSummary.corporateTaxPayable.toLocaleString()}</div></CardContent></Card>
                        </div>
                        {taxSummary.taxByCode.length > 0 && (
                          <Card className="border-0 shadow-sm bg-muted/30">
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Output vs Input by Tax Code</CardTitle></CardHeader>
                            <CardContent>
                              <MiniBarChart colorful data={taxSummary.taxByCode.map((t) => ({ name: t.taxCode, value: t.outputAmount - t.inputAmount }))} />
                            </CardContent>
                          </Card>
                        )}
                        <div className="rounded-2xl overflow-hidden border">
                          <Table>
                            <TableHeader><TableRow>
                              <TableHead>Tax Code</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead>
                              <TableHead className="text-right">Output</TableHead><TableHead className="text-right">Input</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                              {taxSummary.taxByCode.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No tax-coded transactions in this period.</TableCell></TableRow>
                              ) : taxSummary.taxByCode.map((t, i) => (
                                <TableRow key={i}>
                                  <TableCell className="font-mono text-xs">{t.taxCode}</TableCell>
                                  <TableCell>{t.name}</TableCell>
                                  <TableCell>{t.taxType}</TableCell>
                                  <TableCell className="text-right">{t.outputAmount.toLocaleString()}</TableCell>
                                  <TableCell className="text-right">{t.inputAmount.toLocaleString()}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
