import React, { useState, useEffect, useCallback } from "react";
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

export function FinancialReports() {
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

  const handleExportReport = (format: "csv" | "excel" | "pdf") => {
    console.log(`Exporting ${selectedReport} as ${format}`);
    // Implementation for export functionality
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
                              <TableHead className="font-semibold text-primary text-right">Current Period (AED)</TableHead>
                              <TableHead className="font-semibold text-primary text-right">Prior Period (AED)</TableHead>
                              <TableHead className="font-semibold text-primary text-right">Variance (%)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow className="bg-gray-50">
                              <TableCell colSpan={4} className="font-semibold text-primary">Revenue</TableCell>
                            </TableRow>
                            {incomeStatement?.revenueLines?.map((acc, idx) => (
                              <TableRow key={`rev-${idx}`}>
                                <TableCell className="pl-6">{acc.accountName}</TableCell>
                                <TableCell className="text-right">{acc.amount?.toLocaleString()}</TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-right">-</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-blue-50 font-semibold">
                              <TableCell>Total Revenue</TableCell>
                              <TableCell className="text-right">{incomeStatement?.totalRevenue?.toLocaleString()}</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right">-</TableCell>
                            </TableRow>
                            
                            <TableRow className="bg-gray-50">
                              <TableCell colSpan={4} className="font-semibold text-primary">Expenses</TableCell>
                            </TableRow>
                            {incomeStatement?.expenseLines?.map((acc, idx) => (
                              <TableRow key={`exp-${idx}`}>
                                <TableCell className="pl-6">{acc.accountName}</TableCell>
                                <TableCell className="text-right">{acc.amount?.toLocaleString()}</TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-right">-</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-blue-50 font-semibold">
                              <TableCell>Total Expenses</TableCell>
                              <TableCell className="text-right">{incomeStatement?.totalExpenses?.toLocaleString()}</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right">-</TableCell>
                            </TableRow>
                            
                            <TableRow className="bg-green-50 font-semibold">
                              <TableCell>Net Income</TableCell>
                              <TableCell className="text-right text-green-700">{incomeStatement?.netIncome?.toLocaleString()}</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right">-</TableCell>
                            </TableRow>
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
                                  <TableHead className="font-semibold text-primary text-right">Amount (AED)</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {Object.entries(balanceSheet?.accounts || {}).filter(([group]) => group.includes('Asset') || group.includes('ASSET')).map(([group, accounts], groupIndex) => (
                                  <React.Fragment key={`asset-group-${groupIndex}`}>
                                    <TableRow className="bg-gray-50">
                                      <TableCell colSpan={2} className="font-semibold text-primary">{group}</TableCell>
                                    </TableRow>
                                    {accounts.map((acc, accIdx) => (
                                      <TableRow key={`asset-acc-${accIdx}`}>
                                        <TableCell className="pl-6">{acc.name}</TableCell>
                                        <TableCell className="text-right">{acc.balance?.toLocaleString()}</TableCell>
                                      </TableRow>
                                    ))}
                                  </React.Fragment>
                                ))}
                                <TableRow className="bg-blue-50 font-semibold">
                                  <TableCell>Total Assets</TableCell>
                                  <TableCell className="text-right">
                                    {balanceSheet?.totalAssets?.toLocaleString() || "0"}
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
                                  <TableHead className="font-semibold text-primary text-right">Amount (AED)</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {Object.entries(balanceSheet?.accounts || {}).filter(([group]) => !group.includes('Asset') && !group.includes('ASSET')).map(([group, accounts], groupIndex) => (
                                  <React.Fragment key={`liab-group-${groupIndex}`}>
                                    <TableRow className="bg-gray-50">
                                      <TableCell colSpan={2} className="font-semibold text-primary">{group}</TableCell>
                                    </TableRow>
                                    {accounts.map((acc, accIdx) => (
                                      <TableRow key={`liab-acc-${accIdx}`}>
                                        <TableCell className="pl-6">{acc.name}</TableCell>
                                        <TableCell className="text-right">{acc.balance?.toLocaleString()}</TableCell>
                                      </TableRow>
                                    ))}
                                  </React.Fragment>
                                ))}
                                <TableRow className="bg-blue-50 font-semibold">
                                  <TableCell>Total Equity & Liabilities</TableCell>
                                  <TableCell className="text-right">
                                    {((balanceSheet?.totalLiabilities || 0) + (balanceSheet?.totalEquity || 0)).toLocaleString()}
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
                              <TableHead className="font-semibold text-primary text-right">Debit (AED)</TableHead>
                              <TableHead className="font-semibold text-primary text-right">Credit (AED)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {trialBalance?.lines?.map((account, index) => (
                              <TableRow key={index}>
                                <TableCell>{account.code}</TableCell>
                                <TableCell>{account.name}</TableCell>
                                <TableCell className="text-right">
                                  {account.debit > 0 ? account.debit.toLocaleString() : "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                  {account.credit > 0 ? account.credit.toLocaleString() : "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-blue-50 font-semibold">
                              <TableCell colSpan={2}>Total</TableCell>
                              <TableCell className="text-right">
                                {trialBalance?.totalDebit?.toLocaleString() || "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                {trialBalance?.totalCredit?.toLocaleString() || "-"}
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
                      <div className="text-center py-8 text-gray-500">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                        <p>Cash Flow Statement implementation in progress</p>
                        <p className="text-sm">Operating, Investing, and Financing Activities</p>
                      </div>
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

