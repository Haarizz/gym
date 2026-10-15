import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Separator } from "../ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, ScatterChart, Scatter } from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  CheckCircle,
  Activity,
  Target,
  Zap,
  Brain,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  TrendingUpDown,
  Calendar,
  Building2,
  CreditCard,
  Banknote,
  Receipt,
  ShoppingBag,
  Dumbbell,
  Coffee,
  Package,
  Wrench,
  UserCheck,
  UserX,
  BarChart3,
  PieChart as PieChartIcon,
  Timer,
  Flame,
  Shield,
  Award,
  Heart,
  FileText,
  Download,
  Bell,
  ThumbsUp,
  ThumbsDown,
  Star,
  Percent,
  Clock,
  Store,
  Wifi,
  Lightbulb,
  TrendingUpIcon,
  CircleDollarSign,
  Briefcase,
  HeartHandshake,
  UserCog,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  Printer,
  Share2,
  Filter,
  Settings,
  Eye,
  Calculator,
  PiggyBank,
  Wallet,
  BadgeDollarSign,
  Coins,
  CreditCardIcon,
  BookOpen,
  GraduationCap,
  Trophy,
  Medal,
  Crown,
  Phone
} from 'lucide-react';
import { type BiosLiveData, formatSignedPercent, clampPercent, useBiosInsights, InsightsStatus, NoData, changePercent } from './bios-live';
import { biosInsightsService } from '../../utils/supabase/bios-insights-service';

interface BIEngineDashboardV2Props {
  formatCurrency: (amount: number) => string;
  getCurrentPeriod: () => string;
  live: BiosLiveData;
}

export function BIEngineDashboardV2({ formatCurrency, getCurrentPeriod, live }: BIEngineDashboardV2Props) {
  const [timeFilter, setTimeFilter] = useState('monthly');
  const [activeModule, setActiveModule] = useState('overview');

  // 1. Business Overview KPIs — live finance, member and attendance figures.
  const trend = live.monthlyTrend;
  const lastPoint = trend.length > 0 ? trend[trend.length - 1] : null;
  const prevPoint = trend.length > 1 ? trend[trend.length - 2] : null;
  const sumRevenue = (points: typeof trend) => points.reduce((sum, p) => sum + p.revenue, 0);
  const profitGrowth = prevPoint && prevPoint.profit !== 0 && lastPoint
    ? Number((((lastPoint.profit - prevPoint.profit) / Math.abs(prevPoint.profit)) * 100).toFixed(1))
    : null;
  const businessOverviewKPIs = {
    totalRevenue: { mtd: lastPoint?.revenue ?? 0, qtd: sumRevenue(trend.slice(-3)), ytd: sumRevenue(trend), growth: live.revenueGrowthRate },
    netProfit: { value: live.netIncome, margin: Number(live.profitMargin.toFixed(1)), growth: profitGrowth },
    cashFlow: { value: live.netIncome, status: live.netIncome >= 0 ? 'healthy' : 'negative' },
    activeMembers: live.activeMembers,
    inactiveMembers: Math.max(0, live.totalMembers - live.activeMembers),
    retentionRate: live.retentionRate,
    churnRate: Number((100 - live.retentionRate).toFixed(1)),
    arpm: live.revenuePerMember,
    // Share of active members who checked in today.
    engagementScore: live.activeMembers > 0 ? Number(((live.todayCheckIns / live.activeMembers) * 100).toFixed(1)) : 0
  };

  // 2. Revenue Intelligence - Source-wise (payment split and sub-breakdown aren't tracked per source)
  const revenueBySource = live.revenueSources.map((s) => ({
    category: s.source,
    total: s.amount,
    breakdown: null as Record<string, number> | null,
    cash: null as number | null,
    card: null as number | null,
    percentage: s.percentage,
    trend: null as number | null,
    color: s.color
  }));

  // Real member and operations figures — loaded when the BI Engine is shown.
  const { data: memberInsights, loading: membersLoading, error: membersError } =
    useBiosInsights(() => biosInsightsService.getMembers(), true, live.branchKey);
  const { data: operations, loading: operationsLoading, error: operationsError } =
    useBiosInsights(() => biosInsightsService.getOperations(), true, live.branchKey);

  // Member Lifetime Value — average paid on receipts per paying member.
  const mltv = memberInsights?.ltv.average ?? null;

  // Approved expenses per category: last 30 days vs the 30 days before.
  const expenseChange = (category: string) => {
    const change = operations?.expense_changes.find((c) => c.category.toLowerCase() === category.toLowerCase());
    return change ? changePercent(change.current, change.previous) : null;
  };
  const costAlerts = (operations?.expense_changes ?? [])
    .map((c) => ({ ...c, change: changePercent(c.current, c.previous) }))
    .filter((c) => c.current > 0 && (c.change === null || c.change >= 15))
    .sort((a, b) => (b.current - b.previous) - (a.current - a.previous))
    .slice(0, 5);

  // 3. Expense Intelligence — live expense categories (no budgets are set in GymBios).
  const expenseTotal = Object.values(live.expensesByCategory).reduce((sum, v) => sum + v, 0);
  const expenseData = Object.entries(live.expensesByCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({
      category: category.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      amount,
      percentage: expenseTotal > 0 ? Number(((amount / expenseTotal) * 100).toFixed(1)) : 0,
      trend: expenseChange(category),
      budget: null as number | null,
      status: null as string | null,
      vendors: null
    }));

  const totalExpenses = expenseTotal;
  const monthlyBurnRate = totalExpenses / 30;
  const highestExpense = expenseData[0] ?? null;

  // 4. Inventory — stock, purchase costs and slow movers from POS and purchase orders.
  const inventory = operations?.inventory;

  // 5. Staff Performance — this month's staff targets.
  const staffPerformance = live.topStaff.map((t) => ({
    name: t.staff_name || 'Unknown',
    role: t.staff_role || 'Staff',
    attendance: null as number | null,
    punctuality: null as number | null,
    ptSessions: t.sessions_achieved || 0,
    memberFeedback: null as number | null,
    revenueContribution: t.revenue_achieved || 0,
    commission: t.commission_earned || 0,
    performance: (t.percentage || 0) >= 100 ? 'excellent' : (t.percentage || 0) >= 75 ? 'good' : 'needs improvement',
    attritionRisk: null as string | null,
    targetPercent: t.percentage || 0
  }));

  // 6. Member Behavior — engagement tiers (last 30 days) and active members who've stopped visiting.
  const memberSegments = memberInsights?.engagement_tiers ?? [];
  const atRiskMembers = memberInsights?.at_risk ?? [];

  // 7. Revenue Prediction & Forecasting — straight-line projection of the live trend, ±5% band.
  const avgRevenueChange = trend.length > 1 ? ((lastPoint?.revenue ?? 0) - trend[0].revenue) / (trend.length - 1) : 0;
  const avgExpenseChange = trend.length > 1 ? ((lastPoint?.expenses ?? 0) - trend[0].expenses) / (trend.length - 1) : 0;
  const futureLabel = (ahead: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + ahead, 1);
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };
  const projectedMonths = [1, 2, 3].map((ahead) => {
    const predicted = Math.max(0, Math.round((lastPoint?.revenue ?? 0) + avgRevenueChange * ahead));
    return { month: futureLabel(ahead), predicted, lower: Math.round(predicted * 0.95), upper: Math.round(predicted * 1.05), confidence: null as number | null };
  });
  const next90 = projectedMonths.reduce((sum, m) => sum + m.predicted, 0);
  const revenueForecast = [
    ...projectedMonths,
    { month: 'Next 90 days', predicted: next90, lower: Math.round(next90 * 0.95), upper: Math.round(next90 * 1.05), confidence: null as number | null }
  ];

  const expenseForecast = [1, 2].map((ahead) => ({
    month: futureLabel(ahead),
    predicted: Math.max(0, Math.round((lastPoint?.expenses ?? 0) + avgExpenseChange * ahead)),
    reason: avgExpenseChange > 0 ? 'Expenses have been trending up' : avgExpenseChange < 0 ? 'Expenses have been trending down' : 'Expenses are steady'
  }));

  // 9. Assets and 10. Financial position — the asset register and posted journals.
  const assets = operations?.assets;
  const finance = operations?.finance;
  const todayKey = new Date().toISOString().slice(0, 10);
  const cashReserveDays = finance && finance.avg_monthly_expenses > 0
    ? Math.floor(finance.cash_and_bank / (finance.avg_monthly_expenses / 30))
    : null;
  const totalLiabilities = (finance?.liabilities ?? []).reduce((sum, l) => sum + l.balance, 0);
  const formatDay = (date: string | null) =>
    date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <ArrowUpRight className="h-4 w-4" />;
    if (trend < 0) return <ArrowDownRight className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case 'excellent':
        return 'text-green-600';
      case 'good':
        return 'text-blue-600';
      case 'needs improvement':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'within':
        return <Badge className="bg-green-100 text-green-800">Within Budget</Badge>;
      case 'over':
        return <Badge className="bg-red-100 text-red-800">Over Budget</Badge>;
      case 'under':
        return <Badge className="bg-blue-100 text-blue-800">Under Budget</Badge>;
      default:
        return <Badge variant="outline">N/A</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-[#2B7A78]" />
            GymBios Strategic BI & Decision-Making Engine™
          </h1>
          <p className="text-muted-foreground mt-1">
            Enterprise-Grade Business Intelligence Platform - {getCurrentPeriod()}
          </p>
        </div>
        
        {/* Global Actions */}
        <div className="flex items-center gap-3">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm" onClick={live.onExportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button className="bg-[#2B7A78] hover:bg-[#236663]" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <Tabs value={activeModule} onValueChange={setActiveModule} className="space-y-6">
        <TabsList className="bios-engine-modules grid w-full grid-cols-3 gap-1 h-auto p-1 bg-white shadow-sm">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="revenue" className="text-xs">Revenue</TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs">Expenses</TabsTrigger>
          <TabsTrigger value="inventory" className="text-xs">Inventory</TabsTrigger>
          <TabsTrigger value="staff" className="text-xs">Staff</TabsTrigger>
          <TabsTrigger value="members" className="text-xs">Members</TabsTrigger>
          <TabsTrigger value="forecast" className="text-xs">Forecast</TabsTrigger>
          <TabsTrigger value="assets" className="text-xs">Assets</TabsTrigger>
          <TabsTrigger value="financial" className="text-xs">Financial Health</TabsTrigger>
        </TabsList>

        {/* 1. Business Overview Module */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    {formatSignedPercent(businessOverviewKPIs.totalRevenue.growth)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Total Revenue (MTD)</p>
                <p className="text-2xl font-bold">{formatCurrency(businessOverviewKPIs.totalRevenue.mtd)}</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  <p>QTD: {formatCurrency(businessOverviewKPIs.totalRevenue.qtd)}</p>
                  <p>Last {trend.length} months: {formatCurrency(businessOverviewKPIs.totalRevenue.ytd)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <PiggyBank className="h-6 w-6 text-blue-600" />
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">
                    {businessOverviewKPIs.netProfit.margin}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className="text-2xl font-bold">{formatCurrency(businessOverviewKPIs.netProfit.value)}</p>
                <div className="mt-2 text-xs text-green-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {formatSignedPercent(businessOverviewKPIs.netProfit.growth)} growth
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <Badge className="bg-purple-100 text-purple-800">
                    {businessOverviewKPIs.retentionRate}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Active Members</p>
                <p className="text-2xl font-bold">{businessOverviewKPIs.activeMembers.toLocaleString()}</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  <p>Inactive: {businessOverviewKPIs.inactiveMembers}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <CircleDollarSign className="h-6 w-6 text-orange-600" />
                  </div>
                  <Badge className="bg-orange-100 text-orange-800">ARPM</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Avg Revenue Per Member</p>
                <p className="text-2xl font-bold">{formatCurrency(businessOverviewKPIs.arpm)}</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  <p>Checked in today: {businessOverviewKPIs.engagementScore}%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Key Performance Metrics Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Member Retention Rate</p>
                    <div className="flex items-center justify-between">
                      <p className="text-3xl font-bold text-green-600">{businessOverviewKPIs.retentionRate}%</p>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                    <Progress value={clampPercent(businessOverviewKPIs.retentionRate)} className="mt-2" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Churn Rate</p>
                    <div className="flex items-center justify-between">
                      <p className="text-3xl font-bold text-orange-600">{businessOverviewKPIs.churnRate}%</p>
                      <AlertTriangle className="h-8 w-8 text-orange-500" />
                    </div>
                    <Progress value={businessOverviewKPIs.churnRate} className="mt-2" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Cash Flow Status</p>
                    <div className="flex items-center justify-between">
                      <p className={`text-3xl font-bold ${businessOverviewKPIs.cashFlow.value >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(businessOverviewKPIs.cashFlow.value)}</p>
                      <Wallet className="h-8 w-8 text-blue-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Net income ({businessOverviewKPIs.cashFlow.status})</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Member Lifetime Value</p>
                    <div className="flex items-center justify-between">
                      <p className="text-3xl font-bold text-purple-600">{mltv != null ? formatCurrency(mltv) : '—'}</p>
                      <Star className="h-8 w-8 text-purple-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Average paid per member, all time</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                    <span className="text-sm">Revenue Growth</span>
                    <span className="font-bold text-green-600">{formatSignedPercent(businessOverviewKPIs.totalRevenue.growth)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <span className="text-sm">Profit Margin</span>
                    <span className="font-bold text-blue-600">{businessOverviewKPIs.netProfit.margin}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                    <span className="text-sm">Checked In Today</span>
                    <span className="font-bold text-purple-600">{businessOverviewKPIs.engagementScore}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                    <span className="text-sm">Inactive Members</span>
                    <span className="font-bold text-orange-600">{businessOverviewKPIs.inactiveMembers.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. Revenue Intelligence Module */}
        <TabsContent value="revenue" className="space-y-6">
          {revenueBySource.length === 0 && (
            <p className="text-sm text-muted-foreground">No revenue recorded yet.</p>
          )}
          <div className="grid grid-cols-1 gap-4">
            {revenueBySource.map((source, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold">{source.category}</h3>
                        <Badge style={{ backgroundColor: source.color, color: 'white' }}>
                          {source.percentage}%
                        </Badge>
                        {source.trend !== null && (
                          <div className={`flex items-center ${getTrendColor(source.trend)}`}>
                            {getTrendIcon(source.trend)}
                            <span className="text-sm ml-1">{source.trend > 0 ? '+' : ''}{source.trend}%</span>
                          </div>
                        )}
                      </div>
                      <p className="text-3xl font-bold">{formatCurrency(source.total)}</p>
                    </div>
                    {source.cash !== null && source.card !== null && (
                      <div className="text-right">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Cash</p>
                            <p className="font-semibold text-green-600">{formatCurrency(source.cash)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Card</p>
                            <p className="font-semibold text-blue-600">{formatCurrency(source.card)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {source.breakdown && (
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mt-4 pt-4 border-t">
                      {Object.entries(source.breakdown).map(([key, value]) => (
                        <div key={key} className="text-center p-2 bg-gray-50 rounded">
                          <p className="text-xs text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </p>
                          <p className="font-semibold">{formatCurrency(value as number)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={revenueBySource}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percentage }) => `${category}: ${percentage}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="total"
                  >
                    {revenueBySource.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Expense Intelligence Module */}
        <TabsContent value="expenses" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">Total Expenses</p>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
                <p className="text-xs text-muted-foreground mt-2">Monthly burn rate: {formatCurrency(monthlyBurnRate)}/day</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">Expense Ratio</p>
                <p className="text-3xl font-bold text-green-600">
                  {live.totalRevenue > 0 ? `${((live.totalExpenses / live.totalRevenue) * 100).toFixed(1)}%` : '—'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Of total revenue</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">Highest Expense</p>
                <p className="text-3xl font-bold text-blue-600">{highestExpense?.category ?? '—'}</p>
                <p className="text-xs text-muted-foreground mt-2">{highestExpense ? `${highestExpense.percentage}% of total expenses` : 'No expenses recorded'}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown & Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                    <TableHead className="text-right">Trend</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseData.map((expense, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{expense.category}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(expense.amount)}</TableCell>
                      <TableCell className="text-right">{expense.percentage}%</TableCell>
                      <TableCell className="text-right">
                        {expense.trend === null ? <span className="text-muted-foreground">—</span> : (
                          <div className={`flex items-center justify-end ${getTrendColor(expense.trend)}`}>
                            {getTrendIcon(expense.trend)}
                            <span className="ml-1">{expense.trend > 0 ? '+' : ''}{expense.trend}%</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{expense.budget === null ? '—' : formatCurrency(expense.budget)}</TableCell>
                      <TableCell>{expense.status === null ? <span className="text-muted-foreground">No budget</span> : getStatusBadge(expense.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="h-5 w-5" />
                Cost Alerts
              </CardTitle>
              <CardDescription className="text-orange-700">Categories up 15% or more: approved expenses, last 30 days vs the 30 before</CardDescription>
            </CardHeader>
            <CardContent>
              <InsightsStatus loading={operationsLoading} error={operationsError} />
              {operations && costAlerts.length === 0 && <NoData>No category has jumped in the last 30 days.</NoData>}
              <div className="space-y-3">
                {costAlerts.map((alert) => (
                  <div key={alert.category} className="p-3 bg-white rounded border border-orange-200">
                    <p className="font-medium text-orange-900">{alert.category}</p>
                    <p className="text-sm text-orange-700">
                      {formatCurrency(alert.current)} in the last 30 days vs {formatCurrency(alert.previous)} before
                      {alert.change !== null ? ` (+${alert.change}%)` : ' (new this period)'}.
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Inventory & Purchase Optimization Module */}
        <TabsContent value="inventory" className="space-y-6">
          <InsightsStatus loading={operationsLoading} error={operationsError} />
          {inventory && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Products</p>
                  <p className="text-2xl font-bold">{inventory.products}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Units in Stock</p>
                  <p className="text-2xl font-bold">{inventory.stock_units}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Stock Value (cost)</p>
                  <p className="text-2xl font-bold">{formatCurrency(inventory.stock_value)}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Low Stock Items</p>
                  <p className={`text-2xl font-bold ${inventory.low_stock > 0 ? 'text-red-600' : 'text-green-600'}`}>{inventory.low_stock}</p>
                </CardContent></Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-[#2B7A78]" />
                    Purchase Cost Changes
                  </CardTitle>
                  <CardDescription>Latest vs previous purchase-order price, with the cheapest price you've been charged</CardDescription>
                </CardHeader>
                <CardContent>
                  {inventory.cost_changes.length === 0 && <NoData>No product has been purchased twice yet.</NoData>}
                  {inventory.cost_changes.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Latest Supplier</TableHead>
                          <TableHead className="text-right">Previous</TableHead>
                          <TableHead className="text-right">Latest</TableHead>
                          <TableHead className="text-right">Change</TableHead>
                          <TableHead>Cheapest Seen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventory.cost_changes.map((item) => {
                          const change = changePercent(item.latest_cost, item.previous_cost);
                          return (
                            <TableRow key={`${item.product}-${item.latest_date}`}>
                              <TableCell className="font-medium">{item.product}</TableCell>
                              <TableCell>{item.supplier}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.previous_cost)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.latest_cost)}</TableCell>
                              <TableCell className="text-right">
                                {change === null || change === 0 ? (
                                  <Badge className="bg-green-100 text-green-800">No change</Badge>
                                ) : (
                                  <Badge className={change > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>{change > 0 ? '+' : ''}{change}%</Badge>
                                )}
                              </TableCell>
                              <TableCell>{formatCurrency(item.cheapest_cost)} · {item.cheapest_supplier}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      Low Stock
                    </CardTitle>
                    <CardDescription>At or below the reorder level</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {inventory.low_stock_items.length === 0 && <NoData>Nothing is at its reorder level.</NoData>}
                    {inventory.low_stock_items.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">In Stock</TableHead>
                            <TableHead className="text-right">Reorder Level</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inventory.low_stock_items.map((item) => (
                            <TableRow key={item.product}>
                              <TableCell className="font-medium">{item.product}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">{item.reorder_level}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-800">
                      <AlertCircle className="h-5 w-5" />
                      Dead Stock
                    </CardTitle>
                    <CardDescription className="text-red-700">In stock but not sold through POS for 45+ days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {inventory.dead_stock.length === 0 && <NoData>No slow-moving stock.</NoData>}
                    {inventory.dead_stock.length > 0 && (
                      <>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead className="text-right">Quantity</TableHead>
                              <TableHead className="text-right">Value</TableHead>
                              <TableHead className="text-right">Last Sold</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {inventory.dead_stock.map((item) => (
                              <TableRow key={item.product}>
                                <TableCell className="font-medium">{item.product}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right font-semibold text-red-600">{formatCurrency(item.value)}</TableCell>
                                <TableCell className="text-right">{item.days_since_last_sale == null ? 'Never' : `${item.days_since_last_sale} days ago`}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <p className="mt-4 font-semibold text-red-900">
                          Tied up: {formatCurrency(inventory.dead_stock.reduce((sum, item) => sum + item.value, 0))}
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* 5. Staff Performance Module */}
        <TabsContent value="staff" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-[#2B7A78]" />
                Staff Performance & Productivity Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {staffPerformance.length === 0 && (
                  <p className="text-sm text-muted-foreground">No staff targets set for this month — add them under Staff Targets.</p>
                )}
                {staffPerformance.map((staff, index) => (
                  <Card key={index} className={staff.performance === 'needs improvement' ? 'border-orange-300 bg-orange-50' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg">{staff.name}</h3>
                            <Badge variant="outline">{staff.role}</Badge>
                            <Badge className={`${staff.performance === 'excellent' ? 'bg-green-100 text-green-800' : staff.performance === 'good' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                              {staff.performance}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Revenue Contribution</p>
                          <p className="text-xl font-bold text-green-600">{formatCurrency(staff.revenueContribution)}</p>
                          <p className="text-xs text-muted-foreground">{staff.targetPercent}% of target</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Attendance</p>
                          <p className="font-semibold">{staff.attendance === null ? '—' : `${staff.attendance}%`}</p>
                          <Progress value={staff.attendance ?? 0} className="h-1 mt-1" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Punctuality</p>
                          <p className="font-semibold">{staff.punctuality === null ? '—' : `${staff.punctuality}%`}</p>
                          <Progress value={staff.punctuality ?? 0} className="h-1 mt-1" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Sessions</p>
                          <p className="font-semibold">{staff.ptSessions}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Member Rating</p>
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                            <p className="font-semibold">{staff.memberFeedback ?? '—'}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Commission</p>
                          <p className="font-semibold">{formatCurrency(staff.commission)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Attrition Risk</p>
                          {staff.attritionRisk === null ? <p className="font-semibold">—</p> : (
                            <Badge className={`${staff.attritionRisk === 'low' ? 'bg-green-100 text-green-800' : staff.attritionRisk === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                              {staff.attritionRisk}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {staff.performance === 'excellent' && (
                        <div className="mt-3 p-2 bg-green-100 rounded">
                          <p className="text-xs text-green-800">
                            <strong>Recommendation:</strong> {staff.name} has hit this month's target. Consider promotion or increased PT incentives.
                          </p>
                        </div>
                      )}
                      {staff.performance === 'needs improvement' && (
                        <div className="mt-3 p-2 bg-orange-100 rounded">
                          <p className="text-xs text-orange-800">
                            <strong>Recommendation:</strong> Below 75% of this month's target. Schedule a performance review and provide additional training support.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. Member Behavior & Retention Module */}
        <TabsContent value="members" className="space-y-6">
          <InsightsStatus loading={membersLoading} error={membersError} />
          {memberInsights && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {memberSegments.map((segment) => (
                  <Card key={segment.tier}>
                    <CardHeader>
                      <CardTitle className="text-base">{segment.tier}</CardTitle>
                      <CardDescription>{segment.members} active {segment.members === 1 ? 'member' : 'members'} · last 30 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm">Check-in Freq</span>
                          <span className="font-semibold">{segment.avg_visits_per_week}/week</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Booked a Class</span>
                          <span className="font-semibold">{segment.class_uptake_percent}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">POS Purchases</span>
                          <span className="font-semibold">{segment.avg_pos_purchases30}/member</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-sm">Lifetime Value</span>
                          <span className="font-bold text-green-600">{segment.avg_ltv != null ? formatCurrency(segment.avg_ltv) : '—'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-800">
                    <AlertTriangle className="h-5 w-5" />
                    Members Who've Stopped Visiting
                  </CardTitle>
                  <CardDescription className="text-red-700">Active members with no check-in for 14+ days, longest gap first</CardDescription>
                </CardHeader>
                <CardContent>
                  {atRiskMembers.length === 0 && <NoData>Every active member has visited in the last 14 days.</NoData>}
                  {atRiskMembers.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Member ID</TableHead>
                          <TableHead>Last Visit</TableHead>
                          <TableHead className="text-right">Days Since</TableHead>
                          <TableHead>Membership Ends</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {atRiskMembers.map((member) => (
                          <TableRow key={member.member_db_id}>
                            <TableCell className="font-medium">{member.name}</TableCell>
                            <TableCell>{member.member_code || '—'}</TableCell>
                            <TableCell>{member.last_visit ? formatDay(member.last_visit) : 'Never checked in'}</TableCell>
                            <TableCell className="text-right">{member.days_since_visit ?? '—'}</TableCell>
                            <TableCell>{formatDay(member.membership_ends)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* 7. Revenue Prediction & Forecasting Module */}
        <TabsContent value="forecast" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUpDown className="h-5 w-5 text-[#2B7A78]" />
                Revenue Forecast (Next 90 Days)
              </CardTitle>
              <CardDescription>Straight-line projection of your average monthly change, with a ±5% band</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {revenueForecast.map((forecast, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground mb-1">{forecast.month}</p>
                      <p className="text-2xl font-bold">{formatCurrency(forecast.predicted)}</p>
                      <div className="mt-2 text-xs">
                        <p className="text-muted-foreground">Range: {formatCurrency(forecast.lower)} - {formatCurrency(forecast.upper)}</p>
                        <Badge className="bg-blue-100 text-blue-800 mt-1">
                          {forecast.confidence === null ? 'Trend projection' : `${forecast.confidence}% confidence`}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={revenueForecast}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Area type="monotone" dataKey="upper" fill="#0F766E" fillOpacity={0.1} stroke="none" name="Upper Bound" />
                  <Area type="monotone" dataKey="lower" fill="#0F766E" fillOpacity={0.1} stroke="none" name="Lower Bound" />
                  <Line type="monotone" dataKey="predicted" stroke="#0F766E" strokeWidth={3} name="Predicted Revenue" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Expense Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {expenseForecast.map((forecast, index) => (
                    <div key={index} className="p-3 border rounded">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{forecast.month}</span>
                        <span className="font-bold text-red-600">{formatCurrency(forecast.predicted)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{forecast.reason}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-base text-green-900">Forecast Notes</CardTitle>
                <CardDescription>What the projection is based on</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-white rounded border border-green-200">
                    <p className="text-sm text-green-900">
                      <Sparkles className="h-4 w-4 inline mr-1" />
                      Revenue has changed by {formatCurrency(Math.round(avgRevenueChange))} a month on average over the last {trend.length} months; the next 90 days project to {formatCurrency(next90)}.
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded border border-green-200">
                    <p className="text-sm text-green-900">
                      <AlertTriangle className="h-4 w-4 inline mr-1 text-orange-600" />
                      {expenseForecast[0]?.reason ?? 'Expenses are steady'} ({formatCurrency(Math.round(avgExpenseChange))} a month on average).
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded border border-green-200">
                    <p className="text-sm text-green-900">
                      <TrendingUp className="h-4 w-4 inline mr-1" />
                      A straight line ignores seasonality; the ±5% band is a guide, not a confidence interval.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 9. Asset & Equipment Management Module */}
        <TabsContent value="assets" className="space-y-6">
          <InsightsStatus loading={operationsLoading} error={operationsError} />
          {assets && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Purchase Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(assets.purchase_value)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{assets.count} assets in use</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Current Value</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(assets.current_value)}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Annual Depreciation</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(assets.annual_depreciation)}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">In Maintenance</p>
                  <p className="text-2xl font-bold">{assets.in_maintenance}</p>
                </CardContent></Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-[#2B7A78]" />
                    Service Due
                  </CardTitle>
                  <CardDescription>In maintenance, or due for service in the next 14 days</CardDescription>
                </CardHeader>
                <CardContent>
                  {assets.needing_service.length === 0 && <NoData>No assets are due for service.</NoData>}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assets.needing_service.map((asset) => {
                      const overdue = asset.next_service != null && asset.next_service < todayKey;
                      return (
                        <Card key={asset.code + asset.name} className={overdue ? 'border-orange-300 bg-orange-50' : ''}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-bold">{asset.name} <span className="text-xs text-muted-foreground">{asset.code}</span></h4>
                              <Badge className={overdue ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>{overdue ? 'Overdue' : asset.status}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div><p className="text-xs text-muted-foreground">Condition</p><p className="font-semibold">{asset.condition}</p></div>
                              <div><p className="text-xs text-muted-foreground">Utilization</p><p className="font-semibold">{asset.utilization_rate != null ? `${asset.utilization_rate}%` : '—'}</p></div>
                              <div><p className="text-xs text-muted-foreground">Last Service</p><p className="font-semibold">{formatDay(asset.last_service)}</p></div>
                              <div><p className="text-xs text-muted-foreground">Next Service</p><p className={`font-semibold ${overdue ? 'text-red-600' : ''}`}>{formatDay(asset.next_service)}</p></div>
                              <div><p className="text-xs text-muted-foreground">Maintenance (12 months)</p><p className="font-semibold">{formatCurrency(asset.maintenance_cost12m)}</p></div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* 10. Liabilities & Financial Health Module */}
        <TabsContent value="financial" className="space-y-6">
          <InsightsStatus loading={operationsLoading} error={operationsError} />
          {finance && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Cash & Bank</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(finance.cash_and_bank)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Posted balances</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Cash Reserve</p>
                  <p className="text-2xl font-bold">{cashReserveDays != null ? `${cashReserveDays} days` : '—'}</p>
                  <p className="text-xs text-muted-foreground mt-1">At {formatCurrency(finance.avg_monthly_expenses)}/month of expenses</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Member Balances Owed</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(finance.member_receivables)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{finance.members_with_balance} {finance.members_with_balance === 1 ? 'member' : 'members'}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Supplier Payables</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(finance.supplier_payables)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Unpaid supplier bills</p>
                </CardContent></Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Loans & Liabilities</CardTitle>
                  <CardDescription>Liability account balances from posted journals</CardDescription>
                </CardHeader>
                <CardContent>
                  {finance.liabilities.length === 0 && <NoData>No liability balances posted.</NoData>}
                  <div className="space-y-2">
                    {finance.liabilities.map((liability) => (
                      <div key={liability.code} className="p-3 border rounded flex justify-between">
                        <span className="font-semibold">{liability.name} <span className="text-xs text-muted-foreground">{liability.code}</span></span>
                        <span className="font-bold">{formatCurrency(liability.balance)}</span>
                      </div>
                    ))}
                  </div>
                  {finance.liabilities.length > 0 && (
                    <p className="mt-3 text-sm font-semibold">Total: {formatCurrency(totalLiabilities)}</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
