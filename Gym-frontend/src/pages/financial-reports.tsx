import React, { useState, useEffect, useCallback } from "react";
import { useCurrency, CurrencyGlyph } from "../utils/currency";
import { financialReportsService, IncomeStatementData, BalanceSheetData, TrialBalanceData, CashFlowData } from "../utils/supabase/financial-reports-service";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
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
  CreditCard,
  BarChart3,
  Filter,
  RefreshCw,
  Eye,
  ExternalLink,
  PieChart,
  Calculator,
  Banknote,
  ArrowUpDown,
  CheckSquare,
  Clock,
} from "lucide-react";
import { format, subMonths, subYears } from "date-fns";
import { cn } from "../components/ui/utils";

// Types
interface DateRange {
  from: Date;
  to: Date;
}

interface ReportData {
  id: string;
  accountCode?: string;
  accountName?: string;
  debit?: number;
  credit?: number;
  balance?: number;
  amount?: number;
  description?: string;
  date?: string;
  category?: string;
  period?: string;
}

interface Report {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  category: "primary" | "secondary" | "supporting";
  ifrsCompliant: boolean;
  lastGenerated?: string;
  status: "ready" | "generating" | "outdated";
}

// Mock data for reports
const reportDefinitions: Report[] = [
  {
    id: "profit-loss",
    title: "Statement of Profit or Loss (P&L)",
    description: "Comprehensive income statement showing revenue, expenses, and profitability",
    icon: TrendingUp,
    category: "primary",
    ifrsCompliant: true,
    lastGenerated: "2025-09-30 14:30",
    status: "ready",
  },
  {
    id: "balance-sheet",
    title: "Statement of Financial Position",
    description: "Balance sheet showing assets, liabilities, and equity position",
    icon: Building2,
    category: "primary",
    ifrsCompliant: true,
    lastGenerated: "2025-09-30 14:30",
    status: "ready",
  },
  {
    id: "cash-flow",
    title: "Statement of Cash Flows",
    description: "Cash flow analysis from operating, investing, and financing activities",
    icon: DollarSign,
    category: "primary",
    ifrsCompliant: true,
    lastGenerated: "2025-09-30 14:25",
    status: "ready",
  },
  {
    id: "trial-balance",
    title: "Trial Balance",
    description: "Complete listing of all account balances for verification",
    icon: Calculator,
    category: "secondary",
    ifrsCompliant: true,
    lastGenerated: "2025-09-30 14:35",
    status: "ready",
  },
  {
    id: "day-book",
    title: "Day Book (General Ledger)",
    description: "Chronological record of all transactions by date",
    icon: BookOpen,
    category: "supporting",
    ifrsCompliant: true,
    lastGenerated: "2025-09-30 14:20",
    status: "ready",
  },
  {
    id: "bank-book",
    title: "Bank Book",
    description: "Bank transactions with reconciliation status and balances",
    icon: Landmark,
    category: "supporting",
    ifrsCompliant: true,
    lastGenerated: "2025-09-30 14:40",
    status: "ready",
  },
  {
    id: "fund-flow",
    title: "Fund Flow Statement",
    description: "Sources and uses of funds analysis for working capital management",
    icon: ArrowUpDown,
    category: "secondary",
    ifrsCompliant: true,
    lastGenerated: "2025-09-30 14:15",
    status: "ready",
  },
  {
    id: "pdc-report",
    title: "Post-Dated Cheques (PDC) Report",
    description: "Incoming and outgoing PDCs with maturity and status tracking",
    icon: Receipt,
    category: "supporting",
    ifrsCompliant: true,
    lastGenerated: "2025-09-30 14:10",
    status: "ready",
  },
];

// Mock P&L data
const profitLossData = [
  { category: "Revenue", accounts: [
    { accountName: "Membership Revenue", currentPeriod: 125000, priorPeriod: 118000 },
    { accountName: "Personal Training Revenue", currentPeriod: 35000, priorPeriod: 32000 },
    { accountName: "Class & Drop-in Revenue", currentPeriod: 18000, priorPeriod: 16500 },
    { accountName: "Retail & Merchandise Revenue", currentPeriod: 8500, priorPeriod: 7200 },
    { accountName: "Other Operating Income", currentPeriod: 2500, priorPeriod: 2100 },
  ]},
  { category: "Cost of Sales", accounts: [
    { accountName: "Cost of Goods Sold (Retail)", currentPeriod: -4250, priorPeriod: -3600 },
    { accountName: "Trainer Commission", currentPeriod: -10500, priorPeriod: -9600 },
  ]},
  { category: "Operating Expenses", accounts: [
    { accountName: "Employee Benefits Expense", currentPeriod: -45000, priorPeriod: -42000 },
    { accountName: "Depreciation & Amortisation", currentPeriod: -8500, priorPeriod: -8200 },
    { accountName: "Rent & Utilities", currentPeriod: -25000, priorPeriod: -24000 },
    { accountName: "Marketing & Advertising", currentPeriod: -6500, priorPeriod: -5800 },
    { accountName: "Repairs & Maintenance", currentPeriod: -3200, priorPeriod: -2900 },
    { accountName: "Software & Hosting", currentPeriod: -2800, priorPeriod: -2600 },
    { accountName: "Administrative Expenses", currentPeriod: -4200, priorPeriod: -3800 },
  ]},
  { category: "Finance", accounts: [
    { accountName: "Finance Income", currentPeriod: 150, priorPeriod: 200 },
    { accountName: "Finance Expense", currentPeriod: -1200, priorPeriod: -1100 },
  ]},
];

// Mock Balance Sheet data
const balanceSheetData = [
  { category: "Non-current Assets", accounts: [
    { accountName: "Property, Plant & Equipment", amount: 285000 },
    { accountName: "Right-of-use Assets", amount: 45000 },
    { accountName: "Intangible Assets", amount: 15000 },
    { accountName: "Deferred Tax Assets", amount: 2500 },
  ]},
  { category: "Current Assets", accounts: [
    { accountName: "Inventories", amount: 12000 },
    { accountName: "Trade & Other Receivables", amount: 18500 },
    { accountName: "Prepayments", amount: 8200 },
    { accountName: "Cash & Cash Equivalents", amount: 45300 },
  ]},
  { category: "Equity", accounts: [
    { accountName: "Share Capital", amount: 100000 },
    { accountName: "Retained Earnings", amount: 165500 },
    { accountName: "Other Reserves", amount: 12000 },
  ]},
  { category: "Non-current Liabilities", accounts: [
    { accountName: "Long-term Borrowings", amount: 85000 },
    { accountName: "Lease Liabilities", amount: 38000 },
    { accountName: "Deferred Tax Liabilities", amount: 4200 },
  ]},
  { category: "Current Liabilities", accounts: [
    { accountName: "Trade & Other Payables", amount: 15800 },
    { accountName: "Contract Liabilities", amount: 22000 },
    { accountName: "Short-term Borrowings", amount: 8000 },
    { accountName: "Tax Payable", amount: 3500 },
  ]},
];

// Mock Trial Balance data
const trialBalanceData = [
  { accountCode: "1000", accountName: "Cash at Bank", debit: 45300, credit: 0 },
  { accountCode: "1100", accountName: "Trade Receivables", debit: 18500, credit: 0 },
  { accountCode: "1200", accountName: "Inventory", debit: 12000, credit: 0 },
  { accountCode: "1500", accountName: "Equipment", debit: 285000, credit: 0 },
  { accountCode: "2000", accountName: "Trade Payables", debit: 0, credit: 15800 },
  { accountCode: "2100", accountName: "Contract Liabilities", debit: 0, credit: 22000 },
  { accountCode: "3000", accountName: "Share Capital", debit: 0, credit: 100000 },
  { accountCode: "3100", accountName: "Retained Earnings", debit: 0, credit: 165500 },
  { accountCode: "4000", accountName: "Membership Revenue", debit: 0, credit: 125000 },
  { accountCode: "4100", accountName: "Training Revenue", debit: 0, credit: 35000 },
  { accountCode: "5000", accountName: "Staff Salaries", debit: 45000, credit: 0 },
  { accountCode: "5100", accountName: "Rent Expense", debit: 25000, credit: 0 },
];

export function FinancialReports() {
  const { currencyCode } = useCurrency();
  const [selectedReport, setSelectedReport] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("current-month");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState("all");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementData | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceData | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowData | null>(null);

  // Filter reports based on category
  const filteredReports = reportDefinitions.filter(report =>
    reportCategory === "all" || report.category === reportCategory
  );

  const branches = ["All Branches", "Downtown", "Mall Branch", "Marina Branch"];

  const getDateParams = () => {
    const from = format(dateRange.from, "yyyy-MM-dd");
    const to = format(dateRange.to, "yyyy-MM-dd");
    return { from, to };
  };

  const handleGenerateReport = async (reportId: string) => {
    setIsGeneratingReport(true);
    setSelectedReport(reportId);
    setIncomeStatement(null);
    setBalanceSheet(null);
    setTrialBalance(null);
    setCashFlow(null);
    const { from, to } = getDateParams();
    try {
      if (reportId === "profit-loss") {
        const data = await financialReportsService.getIncomeStatement(from, to);
        setIncomeStatement(data);
      } else if (reportId === "balance-sheet") {
        const data = await financialReportsService.getBalanceSheet(to);
        setBalanceSheet(data);
      } else if (reportId === "trial-balance") {
        const data = await financialReportsService.getTrialBalance(to);
        setTrialBalance(data);
      } else if (reportId === "cash-flow") {
        const data = await financialReportsService.getCashFlow(from, to);
        setCashFlow(data);
      }
      toast.success("Report generated successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate report");
    } finally {
      setIsGeneratingReport(false);
    }
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

    // Build a flat table depending on report type.
    if (selectedReport === "profit-loss") {
      const src = incomeStatement;
      const rows = src
        ? [
            ...src.revenueLines.map((l) => ["Revenue", l.accountName, l.amount]),
            ...src.expenseLines.map((l) => ["Expense", l.accountName, l.amount]),
            ["", "Total Revenue", src.totalRevenue],
            ["", "Total Expenses", src.totalExpenses],
            ["", "Net Income", src.netIncome],
          ]
        : profitLossData.flatMap((s) => s.accounts.map((a) => [s.category, a.accountName, a.currentPeriod]));

      const header = ["Section", "Account", `Amount (${currencyCode})`];
      const filename = `profit-loss_${dateLabel}.${exportFormat === "excel" ? "xls" : "csv"}`;
      if (exportFormat === "pdf") {
        window.print();
        return;
      }
      if (exportFormat === "excel") exportAsExcel(filename, header, rows);
      else exportAsCsv(filename, header, rows);
      toast.success("Export started");
      return;
    }

    if (selectedReport === "trial-balance") {
      const src = trialBalance;
      const header = ["Code", "Account", `Debit (${currencyCode})`, `Credit (${currencyCode})`, `Net Balance (${currencyCode})`];
      const rows = src
        ? src.lines.map((l) => [l.code, l.name, l.debit, l.credit, l.netBalance])
        : trialBalanceData.map((l) => [l.accountCode, l.accountName, l.debit, l.credit, (l.debit || 0) - (l.credit || 0)]);
      const filename = `trial-balance_${dateLabel}.${exportFormat === "excel" ? "xls" : "csv"}`;
      if (exportFormat === "pdf") {
        window.print();
        return;
      }
      if (exportFormat === "excel") exportAsExcel(filename, header, rows);
      else exportAsCsv(filename, header, rows);
      toast.success("Export started");
      return;
    }

    if (selectedReport === "balance-sheet") {
      const src = balanceSheet;
      const header = ["Group", "Code", "Account", `Balance (${currencyCode})`];
      const rows = src
        ? Object.entries(src.accounts || {}).flatMap(([group, lines]) =>
            (lines || []).map((l) => [group, l.code, l.name, l.balance])
          )
        : balanceSheetData.flatMap((s) => s.accounts.map((a) => [s.category, "", a.accountName, a.amount]));
      const filename = `balance-sheet_${dateLabel}.${exportFormat === "excel" ? "xls" : "csv"}`;
      if (exportFormat === "pdf") {
        window.print();
        return;
      }
      if (exportFormat === "excel") exportAsExcel(filename, header, rows);
      else exportAsCsv(filename, header, rows);
      toast.success("Export started");
      return;
    }

    if (selectedReport === "cash-flow") {
      const src = cashFlow;
      if (!src) {
        toast.error("Generate the cash flow report first");
        return;
      }
      const header = ["Metric", "Value"];
      const rows = [
        [`Total Inflows (${currencyCode})`, src.totalInflows],
        [`Total Outflows (${currencyCode})`, src.totalOutflows],
        [`Net Cash Flow (${currencyCode})`, src.netCashFlow],
        ["Inflow Count", src.inflowCount],
        ["Outflow Count", src.outflowCount],
      ];
      const filename = `cash-flow_${dateLabel}.${exportFormat === "excel" ? "xls" : "csv"}`;
      if (exportFormat === "pdf") {
        window.print();
        return;
      }
      if (exportFormat === "excel") exportAsExcel(filename, header, rows);
      else exportAsCsv(filename, header, rows);
      toast.success("Export started");
      return;
    }

    toast.info("Export for this report type is not available yet.");
  };

  const calculateTotals = (data: any[], field: string) => {
    return data.reduce((sum, item) => sum + (item[field] || 0), 0);
  };

  const StatusBadge = ({ status }: { status: Report["status"] }) => {
    const statusConfig = {
      ready: { color: "bg-green-100 text-green-800", label: "Ready" },
      generating: { color: "bg-yellow-100 text-yellow-800", label: "Generating" },
      outdated: { color: "bg-red-100 text-red-800", label: "Outdated" },
    };

    const config = statusConfig[status];
    return (
      <Badge variant="secondary" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const profitLossSections = incomeStatement
    ? ([
        {
          category: "Revenue",
          accounts: incomeStatement.revenueLines.map((l) => ({
            accountName: l.accountName,
            currentPeriod: l.amount,
            priorPeriod: 0,
          })),
        },
        {
          category: "Expenses",
          accounts: incomeStatement.expenseLines.map((l) => ({
            accountName: l.accountName,
            currentPeriod: l.amount,
            priorPeriod: 0,
          })),
        },
        {
          category: "Net Income",
          accounts: [
            { accountName: "Net Income", currentPeriod: incomeStatement.netIncome, priorPeriod: 0 },
          ],
        },
      ] as typeof profitLossData)
    : profitLossData;

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
            <p className="text-sm text-gray-600">
              IFRS-compliant financial reports and statements
            </p>
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
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch">Branch/Entity</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch} value={branch.toLowerCase().replace(/\s+/g, '-')}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="period">Period</Label>
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

            <div className="space-y-2">
              <Label htmlFor="category">Report Category</Label>
              <Select value={reportCategory} onValueChange={setReportCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
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
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                    disabled={selectedPeriod !== "custom"}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={(range) => {
                      if (range) {
                        setDateRange(range as DateRange);
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
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
                <StatusBadge status={report.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                {report.description}
              </p>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center">
                  <CheckSquare className="h-3 w-3 mr-1" />
                  IFRS Compliant
                </span>
                {report.lastGenerated && (
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {format(new Date(report.lastGenerated), "MMM dd, HH:mm")}
                  </span>
                )}
              </div>

              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={() => handleGenerateReport(report.id)}
                  disabled={isGeneratingReport}
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
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>
                {reportDefinitions.find(r => r.id === selectedReport)?.title}
              </DialogTitle>
              <DialogDescription>
                Period: {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")} | 
                Branch: {selectedBranch === "all" ? "All Branches" : selectedBranch}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Export Actions */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleExportReport("csv")}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportReport("excel")}>
                  <Download className="h-4 w-4 mr-2" />
                  Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportReport("pdf")}>
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>

              {/* Report Content */}
              {isGeneratingReport ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-gray-600">Generating report...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedReport === "profit-loss" && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Statement of Profit or Loss</h3>
                      <div className="rounded-2xl overflow-hidden bg-white shadow-sm">
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
                                <TableRow className="bg-gray-50">
                                  <TableCell colSpan={4} className="font-semibold text-primary">
                                    {section.category}
                                  </TableCell>
                                </TableRow>
                                {section.accounts.map((account, accountIndex) => {
                                  const variance = account.priorPeriod !== 0 
                                    ? ((account.currentPeriod - account.priorPeriod) / Math.abs(account.priorPeriod) * 100).toFixed(1)
                                    : "N/A";
                                  
                                  return (
                                    <TableRow key={accountIndex}>
                                      <TableCell className="pl-6">{account.accountName}</TableCell>
                                      <TableCell className="text-right">
                                        {account.currentPeriod.toLocaleString()}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {account.priorPeriod.toLocaleString()}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <span className={variance !== "N/A" && parseFloat(variance) > 0 ? "text-green-600" : "text-red-600"}>
                                          {variance !== "N/A" ? `${variance}%` : "N/A"}
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                                {sectionIndex === 0 && (
                                  <TableRow className="bg-blue-50 font-semibold">
                                    <TableCell>Total Revenue</TableCell>
                                    <TableCell className="text-right">
                                      {section.accounts.reduce((sum, acc) => sum + acc.currentPeriod, 0).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {section.accounts.reduce((sum, acc) => sum + acc.priorPeriod, 0).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">-</TableCell>
                                  </TableRow>
                                )}
                              </React.Fragment>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {selectedReport === "balance-sheet" && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Statement of Financial Position</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="font-semibold text-primary">Assets</h4>
                          <div className="rounded-2xl overflow-hidden bg-white shadow-sm">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="font-semibold text-primary">Account</TableHead>
                                  <TableHead className="font-semibold text-primary text-right">Amount ({currencyCode})</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {balanceSheet ? (
                                  Object.entries(balanceSheet.accounts ?? {})
                                    .filter(([group]) => group.toLowerCase().includes("asset"))
                                    .map(([group, lines]) => (
                                      <React.Fragment key={group}>
                                        <TableRow className="bg-gray-50">
                                          <TableCell colSpan={2} className="font-semibold text-primary">
                                            {group}
                                          </TableCell>
                                        </TableRow>
                                        {(lines ?? []).map((l) => (
                                          <TableRow key={`${group}-${l.code}-${l.name}`}>
                                            <TableCell className="pl-6">{l.name}</TableCell>
                                            <TableCell className="text-right">{Number(l.balance || 0).toLocaleString()}</TableCell>
                                          </TableRow>
                                        ))}
                                      </React.Fragment>
                                    ))
                                ) : (
                                  balanceSheetData.filter(section =>
                                    section.category.includes("Assets")
                                  ).map((section, sectionIndex) => (
                                    <React.Fragment key={sectionIndex}>
                                      <TableRow className="bg-gray-50">
                                        <TableCell colSpan={2} className="font-semibold text-primary">
                                          {section.category}
                                        </TableCell>
                                      </TableRow>
                                      {section.accounts.map((account, accountIndex) => (
                                        <TableRow key={accountIndex}>
                                          <TableCell className="pl-6">{account.accountName}</TableCell>
                                          <TableCell className="text-right">
                                            {account.amount.toLocaleString()}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </React.Fragment>
                                  ))
                                )}
                                <TableRow className="bg-blue-50 font-semibold">
                                  <TableCell>Total Assets</TableCell>
                                  <TableCell className="text-right">
                                    {(balanceSheet
                                      ? balanceSheet.totalAssets
                                      : balanceSheetData
                                          .filter(section => section.category.includes("Assets"))
                                          .reduce((total, section) =>
                                            total + section.accounts.reduce((sum, acc) => sum + acc.amount, 0), 0
                                          )
                                    ).toLocaleString()}
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="font-semibold text-primary">Equity & Liabilities</h4>
                          <div className="rounded-2xl overflow-hidden bg-white shadow-sm">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="font-semibold text-primary">Account</TableHead>
                                  <TableHead className="font-semibold text-primary text-right">Amount ({currencyCode})</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {balanceSheet ? (
                                  Object.entries(balanceSheet.accounts ?? {})
                                    .filter(([group]) => !group.toLowerCase().includes("asset"))
                                    .map(([group, lines]) => (
                                      <React.Fragment key={group}>
                                        <TableRow className="bg-gray-50">
                                          <TableCell colSpan={2} className="font-semibold text-primary">
                                            {group}
                                          </TableCell>
                                        </TableRow>
                                        {(lines ?? []).map((l) => (
                                          <TableRow key={`${group}-${l.code}-${l.name}`}>
                                            <TableCell className="pl-6">{l.name}</TableCell>
                                            <TableCell className="text-right">{Number(l.balance || 0).toLocaleString()}</TableCell>
                                          </TableRow>
                                        ))}
                                      </React.Fragment>
                                    ))
                                ) : (
                                  balanceSheetData.filter(section =>
                                    !section.category.includes("Assets")
                                  ).map((section, sectionIndex) => (
                                    <React.Fragment key={sectionIndex}>
                                      <TableRow className="bg-gray-50">
                                        <TableCell colSpan={2} className="font-semibold text-primary">
                                          {section.category}
                                        </TableCell>
                                      </TableRow>
                                      {section.accounts.map((account, accountIndex) => (
                                        <TableRow key={accountIndex}>
                                          <TableCell className="pl-6">{account.accountName}</TableCell>
                                          <TableCell className="text-right">
                                            {account.amount.toLocaleString()}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </React.Fragment>
                                  ))
                                )}
                                <TableRow className="bg-blue-50 font-semibold">
                                  <TableCell>Total Equity & Liabilities</TableCell>
                                  <TableCell className="text-right">
                                    {(balanceSheet
                                      ? (balanceSheet.totalLiabilities + balanceSheet.totalEquity)
                                      : balanceSheetData
                                          .filter(section => !section.category.includes("Assets"))
                                          .reduce((total, section) =>
                                            total + section.accounts.reduce((sum, acc) => sum + acc.amount, 0), 0
                                          )
                                    ).toLocaleString()}
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedReport === "trial-balance" && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Trial Balance</h3>
                      <div className="rounded-2xl overflow-hidden bg-white shadow-sm">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="font-semibold text-primary">Account Code</TableHead>
                              <TableHead className="font-semibold text-primary">Account Name</TableHead>
                              <TableHead className="font-semibold text-primary text-right">Debit ({currencyCode})</TableHead>
                              <TableHead className="font-semibold text-primary text-right">Credit ({currencyCode})</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(trialBalance?.lines ?? trialBalanceData).map((account: any, index: number) => (
                              <TableRow key={account.code ?? account.accountCode ?? index}>
                                <TableCell>{account.code ?? account.accountCode}</TableCell>
                                <TableCell>{account.name ?? account.accountName}</TableCell>
                                <TableCell className="text-right">
                                  {(account.debit ?? 0) > 0 ? Number(account.debit).toLocaleString() : "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                  {(account.credit ?? 0) > 0 ? Number(account.credit).toLocaleString() : "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-blue-50 font-semibold">
                              <TableCell colSpan={2}>Total</TableCell>
                              <TableCell className="text-right">
                                {(trialBalance?.totalDebit ?? trialBalanceData.reduce((sum, acc) => sum + acc.debit, 0)).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                {(trialBalance?.totalCredit ?? trialBalanceData.reduce((sum, acc) => sum + acc.credit, 0)).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Other reports would follow similar patterns */}
                  {selectedReport === "cash-flow" && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Statement of Cash Flows</h3>
                      {!cashFlow ? (
                        <div className="text-center py-10 text-gray-500">
                          <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                          <p>Generate the report to view cash flow totals.</p>
                          <p className="text-sm">Uses your real transactions for the selected range.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm text-muted-foreground">Total Inflows</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-semibold text-green-700"><CurrencyGlyph /> {cashFlow.totalInflows.toLocaleString()}</div>
                              <p className="text-xs text-muted-foreground mt-1">{cashFlow.inflowCount} inflow transactions</p>
                            </CardContent>
                          </Card>
                          <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm text-muted-foreground">Total Outflows</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-semibold text-red-700"><CurrencyGlyph /> {cashFlow.totalOutflows.toLocaleString()}</div>
                              <p className="text-xs text-muted-foreground mt-1">{cashFlow.outflowCount} outflow transactions</p>
                            </CardContent>
                          </Card>
                          <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm text-muted-foreground">Net Cash Flow</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-semibold text-primary"><CurrencyGlyph /> {cashFlow.netCashFlow.toLocaleString()}</div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {cashFlow.periodFrom} → {cashFlow.periodTo}
                              </p>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </div>
                  )}

                  {["day-book", "bank-book", "fund-flow", "pdc-report"].includes(selectedReport) && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">
                        {reportDefinitions.find(r => r.id === selectedReport)?.title}
                      </h3>
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-4" />
                        <p>Report implementation in progress</p>
                        <p className="text-sm">IFRS-compliant data structure ready</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

