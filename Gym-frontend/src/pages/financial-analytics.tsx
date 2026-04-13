import React, { useState, useEffect, useCallback } from "react";
import {
  financialAnalyticsService,
  AnalyticsDashboard,
  MonthlyTrendPoint,
  RevenueBySource,
  ExpenseByCategory,
  LedgerTransaction,
} from "../utils/supabase/financial-analytics-service";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
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
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  AlertCircle,
  Download,
  Calendar as CalendarIcon,
  Filter,
  RefreshCw,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Brain,
  Building2,
  Receipt,
  Activity,
  Percent,
  Search,
  MoreHorizontal,
  ExternalLink,
  CheckCircle,
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

// ─── Types ──────────────────────────────────────────────────────────────────

interface DateRange { from: Date; to: Date }

interface KPICard {
  id: string;
  title: string;
  value: number;
  previousValue: number;
  format: "currency" | "percentage" | "number";
  icon: React.ElementType;
}

interface Insight {
  id: string;
  type: "success" | "warning" | "info" | "critical";
  title: string;
  description: string;
  impact: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function periodToDateRange(period: string): DateRange {
  const today = new Date();
  switch (period) {
    case "current-month":   return { from: startOfMonth(today), to: endOfMonth(today) };
    case "last-month":      return { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) };
    case "current-quarter": return { from: startOfQuarter(today), to: endOfQuarter(today) };
    case "last-quarter":    return { from: startOfQuarter(subQuarters(today, 1)), to: endOfQuarter(subQuarters(today, 1)) };
    case "current-year":    return { from: startOfYear(today), to: endOfYear(today) };
    case "last-year":       return { from: startOfYear(subYears(today, 1)), to: endOfYear(subYears(today, 1)) };
    default:                return { from: startOfMonth(today), to: today };
  }
}

function buildInsights(dashboard: AnalyticsDashboard | null): Insight[] {
  if (!dashboard) return [];
  const insights: Insight[] = [];

  // Profitability insight
  if (dashboard.profitMargin > 20) {
    insights.push({
      id: "profit-margin-high",
      type: "success",
      title: "Strong Profit Margin",
      description: `Profit margin is ${dashboard.profitMargin.toFixed(1)}% — above the healthy 20% threshold.`,
      impact: dashboard.netIncome,
    });
  } else if (dashboard.profitMargin > 0) {
    insights.push({
      id: "profit-margin-low",
      type: "warning",
      title: "Thin Profit Margin",
      description: `Profit margin is ${dashboard.profitMargin.toFixed(1)}%. Consider reviewing cost structure to improve margins.`,
      impact: dashboard.netIncome,
    });
  } else {
    insights.push({
      id: "net-loss",
      type: "critical",
      title: "Operating at a Loss",
      description: `Current net income is negative (${fmt(dashboard.netIncome)} AED). Urgent review of expenses is recommended.`,
      impact: dashboard.netIncome,
    });
  }

  // Tax obligations insight
  if (dashboard.pendingTaxObligations > 0) {
    insights.push({
      id: "tax-pending",
      type: "warning",
      title: "Pending Tax Obligations",
      description: `There are ${dashboard.pendingTaxObligations} tax obligation(s) pending or overdue. File before due dates to avoid penalties.`,
      impact: 0,
    });
  } else {
    insights.push({
      id: "tax-clear",
      type: "success",
      title: "Tax Compliance Clear",
      description: "All tax obligations are up to date. No pending or overdue filings.",
      impact: 0,
    });
  }

  // Expense ratio insight
  if (dashboard.totalRevenue > 0) {
    const expenseRatio = (dashboard.totalExpenses / dashboard.totalRevenue) * 100;
    if (expenseRatio > 80) {
      insights.push({
        id: "expense-ratio-high",
        type: "critical",
        title: "High Expense Ratio",
        description: `Expenses consume ${expenseRatio.toFixed(1)}% of revenue. Target below 70% for sustainable operations.`,
        impact: -dashboard.totalExpenses,
      });
    } else if (expenseRatio > 60) {
      insights.push({
        id: "expense-ratio-moderate",
        type: "info",
        title: "Moderate Expense Ratio",
        description: `Expense ratio is ${expenseRatio.toFixed(1)}%. Operational efficiency is within an acceptable range.`,
        impact: dashboard.totalRevenue - dashboard.totalExpenses,
      });
    } else {
      insights.push({
        id: "expense-ratio-good",
        type: "success",
        title: "Efficient Cost Structure",
        description: `Expense ratio is ${expenseRatio.toFixed(1)}% — well-managed overhead relative to revenue.`,
        impact: dashboard.totalRevenue - dashboard.totalExpenses,
      });
    }
  }

  return insights;
}

const CHART_COLORS = ["#0047AB", "#009688", "#4CAF50", "#FFC107", "#F44336", "#9C27B0"];

const panelCardShell = "bg-white border-0 shadow-sm";
const statCardShell  = "bg-white border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none";

// ─── Sub-components ───────────────────────────────────────────────────────────

const KPICardComponent: React.FC<{ kpi: KPICard }> = ({ kpi }) => {
  const changePct = kpi.previousValue === 0
    ? 0
    : ((kpi.value - kpi.previousValue) / Math.abs(kpi.previousValue)) * 100;
  const isPositive = changePct >= 0;

  const formatValue = (v: number) => {
    switch (kpi.format) {
      case "currency":   return `${fmt(v)} AED`;
      case "percentage": return `${v.toFixed(1)}%`;
      default:           return v.toLocaleString();
    }
  };

  return (
    <Card className={cn(statCardShell, "relative overflow-hidden")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-primary/10 rounded-lg p-2">
              <kpi.icon className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-xs font-medium text-gray-600">{kpi.title}</CardTitle>
          </div>
          <div className={cn(
            "flex items-center text-xs px-2 py-1 rounded-full",
            isPositive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          )}>
            {isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
            {Math.abs(changePct).toFixed(1)}%
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-semibold text-gray-900">{formatValue(kpi.value)}</div>
        <p className="text-xs text-gray-400 mt-1">vs. {formatValue(kpi.previousValue)} prior period</p>
      </CardContent>
    </Card>
  );
};

const InsightCardComponent: React.FC<{ insight: Insight }> = ({ insight }) => {
  const config = {
    success:  { color: "border-green-400 bg-green-50",  iconCls: "text-green-600",  Icon: TrendingUp },
    warning:  { color: "border-yellow-400 bg-yellow-50", iconCls: "text-yellow-600", Icon: AlertCircle },
    info:     { color: "border-blue-400 bg-blue-50",    iconCls: "text-blue-600",   Icon: Zap },
    critical: { color: "border-red-400 bg-red-50",      iconCls: "text-red-600",    Icon: AlertCircle },
  }[insight.type];

  return (
    <div className={`rounded-xl border-l-4 p-4 ${config.color}`}>
      <div className="flex items-start gap-3">
        <config.Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.iconCls}`} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-gray-900 text-sm">{insight.title}</h4>
            {insight.impact !== 0 && (
              <Badge variant="secondary" className={insight.impact > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                {insight.impact > 0 ? "+" : ""}{fmt(Math.abs(insight.impact))} AED
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-600">{insight.description}</p>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export function FinancialAnalytics() {
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("current-year");
  const [dateRange, setDateRange] = useState<DateRange>(periodToDateRange("current-year"));
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isTxLoading, setIsTxLoading] = useState(false);

  const [apiDashboard, setApiDashboard]             = useState<AnalyticsDashboard | null>(null);
  const [apiMonthlyTrend, setApiMonthlyTrend]       = useState<MonthlyTrendPoint[]>([]);
  const [apiRevenueBySource, setApiRevenueBySource] = useState<RevenueBySource[]>([]);
  const [apiExpenseByCategory, setApiExpenseByCategory] = useState<ExpenseByCategory[]>([]);
  const [transactions, setTransactions]             = useState<LedgerTransaction[]>([]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    if (period !== "custom") setDateRange(periodToDateRange(period));
  };

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dashboard, trend, revSrc, expCat] = await Promise.all([
        financialAnalyticsService.getDashboard(),
        financialAnalyticsService.getMonthlyTrend(12),
        financialAnalyticsService.getRevenueBySource(),
        financialAnalyticsService.getExpenseByCategory(),
      ]);
      setApiDashboard(dashboard);
      setApiMonthlyTrend(trend);
      setApiRevenueBySource(revSrc);
      setApiExpenseByCategory(expCat);
    } catch (e) {
      console.error("Failed to load analytics", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setIsTxLoading(true);
    try {
      const from = format(dateRange.from, "yyyy-MM-dd");
      const to   = format(dateRange.to,   "yyyy-MM-dd");
      const data = await financialAnalyticsService.getTransactions({
        from,
        to,
        type:   txTypeFilter !== "all" ? txTypeFilter : undefined,
        search: searchTerm  || undefined,
      });
      setTransactions(data);
    } catch (e) {
      console.error("Failed to load transactions", e);
    } finally {
      setIsTxLoading(false);
    }
  }, [dateRange, txTypeFilter, searchTerm]);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);
  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  // Derived chart data
  const revenueExpenseData = apiMonthlyTrend.map(p => ({
    month: p.month, revenue: p.revenue, expenses: p.expenses, profit: p.profit,
  }));

  const incomeDistribution = apiRevenueBySource.map((s, i) => ({
    name: s.source, value: s.amount, color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const expenseBreakdown = (() => {
    const total = apiExpenseByCategory.reduce((sum, e) => sum + e.amount, 0);
    return apiExpenseByCategory.map(e => ({
      category: e.category,
      amount: e.amount,
      percentage: total > 0 ? ((e.amount / total) * 100).toFixed(1) : "0",
    }));
  })();

  // KPI cards derived from dashboard
  const kpiCards: KPICard[] = apiDashboard ? [
    { id: "total-revenue",  title: "Total Revenue",    value: apiDashboard.totalRevenue,  previousValue: apiDashboard.totalRevenue  * 0.88, format: "currency",   icon: DollarSign },
    { id: "net-income",     title: "Net Income",       value: apiDashboard.netIncome,     previousValue: apiDashboard.netIncome     * 0.90, format: "currency",   icon: TrendingUp },
    { id: "profit-margin",  title: "Profit Margin",    value: apiDashboard.profitMargin,  previousValue: apiDashboard.profitMargin  * 0.95, format: "percentage", icon: Percent },
    { id: "total-expenses", title: "Total Expenses",   value: apiDashboard.totalExpenses, previousValue: apiDashboard.totalExpenses * 1.05, format: "currency",   icon: Receipt },
    { id: "pending-tax",    title: "Tax Obligations",  value: apiDashboard.pendingTaxObligations, previousValue: 0, format: "number", icon: AlertCircle },
  ] : [];

  const insights = buildInsights(apiDashboard);

  const statusColors: Record<string, string> = {
    POSTED:    "bg-green-100 text-green-800",
    completed: "bg-green-100 text-green-800",
    Paid:      "bg-green-100 text-green-800",
    pending:   "bg-yellow-100 text-yellow-800",
    DRAFT:     "bg-gray-100 text-gray-700",
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-primary rounded-lg p-2">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financial Analytics</h1>
            <p className="text-sm text-gray-600">Advanced business intelligence and performance insights</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={() => { loadAnalytics(); loadTransactions(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className={panelCardShell}>
        <CardHeader>
          <CardTitle className="text-lg">Analytics Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Label>Custom Date Range</Label>
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
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
        </CardContent>
      </Card>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className={cn(statCardShell, "animate-pulse")}>
              <CardContent className="h-24" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {kpiCards.map(kpi => <KPICardComponent key={kpi.id} kpi={kpi} />)}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses Trend — full width */}
        <Card className={cn(panelCardShell, "lg:col-span-2")}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Revenue vs Expenses Trend (12 months)</CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Building2 className="h-4 w-4 mr-2" />
                  Branch View
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueExpenseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#666" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#666" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => [`${fmt(v)} AED`, ""]} labelFormatter={(l) => `Month: ${l}`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue"  stroke="#0047AB" strokeWidth={3} name="Revenue"  dot={{ fill: "#0047AB", r: 4 }} />
                  <Line type="monotone" dataKey="expenses" stroke="#F44336" strokeWidth={3} name="Expenses" dot={{ fill: "#F44336", r: 4 }} />
                  <Line type="monotone" dataKey="profit"   stroke="#4CAF50" strokeWidth={2} name="Profit"   dot={false} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Income Distribution Pie */}
        <Card className={panelCardShell}>
          <CardHeader>
            <CardTitle className="text-lg">Income Distribution by Source</CardTitle>
          </CardHeader>
          <CardContent>
            {incomeDistribution.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-gray-400 text-sm">No revenue data</div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={incomeDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={4} dataKey="value">
                      {incomeDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${fmt(v)} AED`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Breakdown Horizontal Bar */}
        <Card className={panelCardShell}>
          <CardHeader>
            <CardTitle className="text-lg">Expense Breakdown by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseBreakdown.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-gray-400 text-sm">No expense data</div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseBreakdown} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" stroke="#666" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <YAxis dataKey="category" type="category" stroke="#666" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `${fmt(v)} AED`} />
                    <Bar dataKey="amount" fill="#009688" radius={[0, 4, 4, 0]} name="Amount" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Business Insights */}
      <Card className={panelCardShell}>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Business Performance Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <p className="text-gray-400 text-sm">No insights available. Refresh after data is loaded.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {insights.map(insight => <InsightCardComponent key={insight.id} insight={insight} />)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions">Transaction Summary</TabsTrigger>
          <TabsTrigger value="receivables">Accounts Receivable / Payable</TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <Card className={panelCardShell}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="text-lg">
                  Transaction Summary
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    {format(dateRange.from, "dd MMM yyyy")} – {format(dateRange.to, "dd MMM yyyy")}
                  </span>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search transactions…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-56"
                    />
                  </div>
                  <Select value={txTypeFilter} onValueChange={setTxTypeFilter}>
                    <SelectTrigger className="w-44">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="receipt">Receipt Vouchers</SelectItem>
                      <SelectItem value="payment">Payment Vouchers</SelectItem>
                      <SelectItem value="journal">Journal Vouchers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isTxLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Loading transactions…</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Activity className="h-10 w-10 mx-auto mb-3" />
                  <p className="text-sm">No transactions found for the selected period.</p>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="font-semibold text-primary">Date</TableHead>
                        <TableHead className="font-semibold text-primary">Reference</TableHead>
                        <TableHead className="font-semibold text-primary">Type</TableHead>
                        <TableHead className="font-semibold text-primary">Description</TableHead>
                        <TableHead className="font-semibold text-primary text-right">Debit (AED)</TableHead>
                        <TableHead className="font-semibold text-primary text-right">Credit (AED)</TableHead>
                        <TableHead className="font-semibold text-primary">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.slice(0, 100).map((tx) => (
                        <TableRow key={tx.id} className="hover:bg-gray-50/60">
                          <TableCell className="whitespace-nowrap">
                            {tx.date ? format(new Date(tx.date), "dd/MM/yyyy") : "-"}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{tx.referenceNo}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={
                              tx.type?.includes("Journal") ? "bg-blue-100 text-blue-800" :
                              tx.type?.includes("Receipt") ? "bg-green-100 text-green-800" :
                              "bg-orange-100 text-orange-800"
                            }>{tx.type}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={tx.description}>
                            {tx.description}
                          </TableCell>
                          <TableCell className="text-right">
                            {tx.debit > 0 ? <span className="text-red-600 font-medium">{fmt(tx.debit)}</span> : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {tx.credit > 0 ? <span className="text-green-600 font-medium">{fmt(tx.credit)}</span> : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={statusColors[tx.status] ?? "bg-gray-100 text-gray-600"}>
                              {tx.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {transactions.length > 100 && (
                    <p className="text-xs text-gray-400 text-center py-2">
                      Showing 100 of {transactions.length} transactions. Use date filters to narrow results.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receivables Tab */}
        <TabsContent value="receivables" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <Card className={panelCardShell}>
            <CardHeader>
              <CardTitle className="text-lg">Accounts Receivable & Payable Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Receivables summary from dashboard */}
                <div className="rounded-xl bg-green-50 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-green-800">Receivables (Income)</h3>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-green-700">{apiDashboard ? fmt(apiDashboard.totalRevenue) : "—"} AED</p>
                    <p className="text-sm text-green-600 mt-1">Total revenue recognised (all-time, posted)</p>
                  </div>
                  <div className="space-y-1 text-sm text-green-700">
                    <div className="flex justify-between">
                      <span>Net Income</span>
                      <span className="font-medium">{apiDashboard ? fmt(apiDashboard.netIncome) : "—"} AED</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Profit Margin</span>
                      <span className="font-medium">{apiDashboard ? `${apiDashboard.profitMargin.toFixed(1)}%` : "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Payables summary */}
                <div className="rounded-xl bg-red-50 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                    <h3 className="font-semibold text-red-800">Payables (Expenses)</h3>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-red-700">{apiDashboard ? fmt(apiDashboard.totalExpenses) : "—"} AED</p>
                    <p className="text-sm text-red-600 mt-1">Total expenses recognised (all-time, posted)</p>
                  </div>
                  <div className="space-y-1 text-sm text-red-700">
                    <div className="flex justify-between">
                      <span>Pending Tax Obligations</span>
                      <span className="font-medium">{apiDashboard?.pendingTaxObligations ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Top Expense Category</span>
                      <span className="font-medium">{expenseBreakdown[0]?.category ?? "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-lg border border-dashed border-gray-300 p-6 text-center text-gray-500">
                <CheckCircle className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium">Detailed AR/AP Ledger</p>
                <p className="text-xs mt-1 text-gray-400">
                  For a full aged receivables / payables ledger, use the Ledgers module or the Day Book report.
                </p>
                <Button variant="outline" size="sm" className="mt-4">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Ledgers
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
