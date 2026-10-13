import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Separator } from "../ui/separator";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, ComposedChart } from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Calendar,
  Users,
  Target,
  Eye,
  Filter,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
  ShoppingCart,
  CreditCard,
  Percent,
  PieChart as PieChartIcon,
  BarChart3,
  Package,
  Wallet,
  Receipt,
  TrendingUpDown,
  Zap,
  Award,
  Activity
} from 'lucide-react';
import { type BiosLiveData, formatSignedPercent, clampPercent, useBiosInsights, InsightsStatus, NoData, WEEKDAY_LABELS, hourLabel, changePercent, shareOf } from './bios-live';
import { biosInsightsService } from '../../utils/supabase/bios-insights-service';

interface RevenueAnalyticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: string;
  revenueBySource: Array<{
    source: string;
    amount: number;
    percentage: number;
    color: string;
  }>;
  revenueData: Array<{
    month: string;
    revenue: number;
    target: number | null;
  }>;
  formatCurrency: (amount: number) => string;
  getCurrentPeriod: () => string;
  live: BiosLiveData;
}

export function RevenueAnalyticsDialog({
  open,
  onOpenChange,
  defaultTab = 'breakdown',
  revenueBySource,
  revenueData,
  formatCurrency,
  getCurrentPeriod,
  live
}: RevenueAnalyticsDialogProps) {
  const [selectedPeriod, setSelectedPeriod] = React.useState('monthly');
  const [selectedSource, setSelectedSource] = React.useState('all');

  // Real figures for the last 90 days (receipts + POS sales), loaded when the dialog opens.
  const { data: insights, loading: insightsLoading, error: insightsError } =
    useBiosInsights(() => biosInsightsService.getRevenue(90), open, live.branchKey);
  const windowDays = insights?.window_days ?? 90;

  const paymentTotal = (insights?.payment_methods ?? []).reduce((sum, m) => sum + m.amount, 0);
  const revenueByPayment = (insights?.payment_methods ?? []).map((m) => ({
    method: m.method,
    amount: m.amount,
    percentage: shareOf(m.amount, paymentTotal),
    transactions: m.transactions,
    avgTransaction: m.transactions > 0 ? m.amount / m.transactions : 0
  }));

  const revenueByDay = (insights?.by_weekday ?? []).map((d) => ({
    day: WEEKDAY_LABELS[d.slot],
    revenue: Math.round(d.amount),
    transactions: d.transactions,
    avgTransaction: d.transactions > 0 ? d.amount / d.transactions : 0
  }));

  // Only the hours the gym actually took money in, first to last.
  const hours = insights?.by_hour ?? [];
  const firstHour = hours.findIndex((h) => h.transactions > 0);
  const lastHour = hours.length - 1 - [...hours].reverse().findIndex((h) => h.transactions > 0);
  const revenueByHour = firstHour < 0 ? [] : hours.slice(firstHour, lastHour + 1).map((h) => ({
    hour: hourLabel(h.slot),
    revenue: Math.round(h.amount),
    transactions: h.transactions
  }));

  const membershipRevenue = (insights?.membership_types ?? []).map((t) => ({
    tier: t.membership_type,
    members: t.active_members,
    totalMembers: t.members,
    monthlyFee: t.avg_monthly_fee,
    totalRevenue: t.revenue,
    growth: changePercent(t.revenue, t.previous_revenue),
    churnRate: t.lapsed_percent,
    avgLifetime: t.avg_tenure_months
  }));

  const ptRevenue = (insights?.trainers ?? []).map((t) => ({
    trainer: t.name,
    sessions: t.sessions,
    bookings: t.bookings,
    revenue: t.revenue,
    utilization: t.capacity > 0 ? Math.round((t.bookings / t.capacity) * 100) : null
  }));

  const classRevenue = (insights?.classes ?? []).map((c) => ({
    class: c.name,
    sessions: c.sessions,
    attendees: c.bookings,
    revenue: c.revenue,
    avgPerSession: c.sessions > 0 ? c.revenue / c.sessions : 0
  }));

  const retailRevenue = (insights?.retail ?? []).map((r) => ({
    category: r.category,
    sales: r.units,
    revenue: r.revenue,
    avgSale: r.transactions > 0 ? r.revenue / r.transactions : 0,
    margin: r.revenue > 0 && r.cost > 0 ? Number((((r.revenue - r.cost) / r.revenue) * 100).toFixed(1)) : null
  }));

  // Revenue Growth Drivers — each stream's last 30 days vs the 30 days before.
  const streamTotal = (insights?.streams ?? []).reduce((sum, d) => sum + d.current, 0);
  const growthDrivers = (insights?.streams ?? []).map((d) => ({
    driver: d.stream,
    contribution: d.current,
    percentage: shareOf(d.current, streamTotal),
    growth: changePercent(d.current, d.previous)
  }));

  const conversionRate = insights && insights.leads > 0
    ? Number(((insights.converted_leads / insights.leads) * 100).toFixed(1))
    : null;

  // Revenue Forecast — straight-line projection of the live monthly trend, ±5% band.
  const trend = live.monthlyTrend;
  const lastPoint = trend.length > 0 ? trend[trend.length - 1] : null;
  const prevPoint = trend.length > 1 ? trend[trend.length - 2] : null;
  const avgMonthlyChange = trend.length > 1 ? ((lastPoint?.revenue ?? 0) - trend[0].revenue) / (trend.length - 1) : 0;
  const projectMonth = (ahead: number) => Math.max(0, Math.round((lastPoint?.revenue ?? 0) + avgMonthlyChange * ahead));
  const monthLabel = (ahead: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + ahead, 1);
    return d.toLocaleDateString('en-GB', { month: 'short' });
  };
  const revenueForecast = [
    ...(lastPoint ? [{ month: lastPoint.month, actual: Math.round(lastPoint.revenue) as number | null, forecast: Math.round(lastPoint.revenue), lower: Math.round(lastPoint.revenue), upper: Math.round(lastPoint.revenue) }] : []),
    ...Array.from({ length: 6 }, (_, i) => {
      const forecast = projectMonth(i + 1);
      return { month: monthLabel(i + 1), actual: null as number | null, forecast, lower: Math.round(forecast * 0.95), upper: Math.round(forecast * 1.05) };
    })
  ];
  const nextMonthForecast = projectMonth(1);
  const avgNewMembers = live.memberTrend.length > 0
    ? Number((live.memberTrend.reduce((sum, p) => sum + p.newMembers, 0) / live.memberTrend.length).toFixed(1))
    : 0;
  const next3MonthsForecast = projectMonth(1) + projectMonth(2) + projectMonth(3);
  const next6MonthsForecast = Array.from({ length: 6 }, (_, i) => projectMonth(i + 1)).reduce((a, b) => a + b, 0);

  // Monthly Comparison — this month vs last month from the live trend.
  const pctChange = (current: number, previous: number) =>
    previous !== 0 ? Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1)) : 0;
  const monthlyComparison: Array<{ metric: string; current: number; previous: number; change: number; target: number | null }> = [
    { metric: 'Total Revenue', current: lastPoint?.revenue ?? 0, previous: prevPoint?.revenue ?? 0, change: pctChange(lastPoint?.revenue ?? 0, prevPoint?.revenue ?? 0), target: live.monthlyRevenueTarget },
    { metric: 'Expenses', current: lastPoint?.expenses ?? 0, previous: prevPoint?.expenses ?? 0, change: pctChange(lastPoint?.expenses ?? 0, prevPoint?.expenses ?? 0), target: null },
    { metric: 'Net Profit', current: lastPoint?.profit ?? 0, previous: prevPoint?.profit ?? 0, change: pctChange(lastPoint?.profit ?? 0, prevPoint?.profit ?? 0), target: null }
  ];

  // Revenue Metrics
  const recurringRevenue = revenueBySource
    .filter((s) => /member|subscri|plan|renew/i.test(s.source))
    .reduce((sum, s) => sum + s.amount, 0);
  const thisMonthRevenue = lastPoint?.revenue ?? 0;
  const targetAchievement = live.monthlyRevenueTarget && live.monthlyRevenueTarget > 0
    ? Number(((thisMonthRevenue / live.monthlyRevenueTarget) * 100).toFixed(1))
    : null;
  const topSourceShare = revenueBySource.reduce((max, s) => Math.max(max, s.percentage), 0);
  const revenueMetrics = {
    totalRevenue: live.totalRevenue,
    recurringRevenue,
    oneTimeRevenue: Math.max(0, live.totalRevenue - recurringRevenue),
    averageRevenuePerMember: live.revenuePerMember,
    revenueGrowthRate: live.revenueGrowthRate,
    targetAchievement,
    conversionRate
  };
  const recurringShare = revenueMetrics.totalRevenue > 0
    ? ((revenueMetrics.recurringRevenue / revenueMetrics.totalRevenue) * 100).toFixed(1)
    : '0.0';

  const pct = (value: number) => `${value.toFixed(1)}%`;
  const revenueInsights: Array<{ title: string; text: string; icon: React.ReactNode; border: string }> = [];
  if (lastPoint && prevPoint && prevPoint.revenue > 0) {
    const growth = ((lastPoint.revenue - prevPoint.revenue) / prevPoint.revenue) * 100;
    revenueInsights.push({
      title: growth >= 0 ? 'Revenue is up on last month' : 'Revenue is down on last month',
      text: `${lastPoint.month}: ${formatCurrency(lastPoint.revenue)} vs ${formatCurrency(prevPoint.revenue)} in ${prevPoint.month} (${growth >= 0 ? '+' : ''}${pct(growth)}).`
        + (live.monthlyRevenueTarget ? ` That is ${pct((lastPoint.revenue / live.monthlyRevenueTarget) * 100)} of your monthly target.` : ''),
      icon: growth >= 0 ? <TrendingUp className="h-5 w-5 text-green-600 mt-1" /> : <TrendingDown className="h-5 w-5 text-red-600 mt-1" />,
      border: growth >= 0 ? 'border-l-green-500' : 'border-l-red-500'
    });
  }
  if (revenueByHour.length > 0) {
    const hourTotal = revenueByHour.reduce((sum, h) => sum + h.revenue, 0);
    const peak = [...revenueByHour].sort((a, b) => b.revenue - a.revenue)[0];
    if (hourTotal > 0) revenueInsights.push({
      title: 'Busiest payment hour',
      text: `${peak.hour} brought in ${pct((peak.revenue / hourTotal) * 100)} of the last ${windowDays} days' takings (${peak.transactions} payments).`,
      icon: <Zap className="h-5 w-5 text-blue-600 mt-1" />,
      border: 'border-l-blue-500'
    });
  }
  const sellingTiers = membershipRevenue.filter((t) => t.totalRevenue > 0);
  if (sellingTiers.length > 0) {
    const tierTotal = sellingTiers.reduce((sum, t) => sum + t.totalRevenue, 0);
    revenueInsights.push({
      title: `${sellingTiers[0].tier} leads membership sales`,
      text: `${pct((sellingTiers[0].totalRevenue / tierTotal) * 100)} of new and renewal sales in the last ${windowDays} days (${formatCurrency(sellingTiers[0].totalRevenue)}).`,
      icon: <Users className="h-5 w-5 text-purple-600 mt-1" />,
      border: 'border-l-purple-500'
    });
  }
  const retailTotal = retailRevenue.reduce((sum, r) => sum + r.revenue, 0);
  if (retailTotal > 0 && paymentTotal > 0) {
    const best = [...retailRevenue].sort((a, b) => (b.margin ?? -1) - (a.margin ?? -1))[0];
    revenueInsights.push({
      title: 'Retail share of takings',
      text: `POS sales were ${pct((retailTotal / paymentTotal) * 100)} of the last ${windowDays} days' takings.`
        + (best?.margin != null ? ` ${best.category} has the best margin at ${best.margin}%.` : ''),
      icon: <ShoppingCart className="h-5 w-5 text-orange-600 mt-1" />,
      border: 'border-l-orange-500'
    });
  }
  const tradingDays = revenueByDay.filter((d) => d.revenue > 0);
  if (tradingDays.length >= 2) {
    const sorted = [...tradingDays].sort((a, b) => b.revenue - a.revenue);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    revenueInsights.push({
      title: `${bottom.day} is the quietest day`,
      text: `${bottom.day} took ${formatCurrency(bottom.revenue)} vs ${formatCurrency(top.revenue)} on ${top.day} over the last ${windowDays} days.`,
      icon: <AlertTriangle className="h-5 w-5 text-yellow-600 mt-1" />,
      border: 'border-l-yellow-500'
    });
  }
  if (revenueByPayment.length >= 2) {
    const topAvg = [...revenueByPayment].sort((a, b) => b.avgTransaction - a.avgTransaction)[0];
    revenueInsights.push({
      title: 'Payment methods',
      text: `${revenueByPayment[0].method} carries the most money (${pct(revenueByPayment[0].percentage)}). ${topAvg.method} has the highest average payment (${formatCurrency(topAvg.avgTransaction)}).`,
      icon: <CreditCard className="h-5 w-5 text-cyan-600 mt-1" />,
      border: 'border-l-cyan-500'
    });
  }

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-bios-ui="" className="max-w-7xl sm:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <DollarSign className="h-6 w-6 text-[#2B7A78]" />
            <span>Revenue Analytics - {getCurrentPeriod()}</span>
          </DialogTitle>
          <DialogDescription>
            Comprehensive revenue breakdown, analysis, and forecasting
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          {/* Breakdown Tab */}
          <TabsContent value="breakdown" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(revenueMetrics.totalRevenue)}
                    </p>
                    <div className="flex items-center">
                      <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-xs text-green-600">{formatSignedPercent(revenueMetrics.revenueGrowthRate)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Recurring Revenue</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(revenueMetrics.recurringRevenue)}
                    </p>
                    <div className="flex items-center">
                      <Percent className="h-3 w-3 text-blue-500 mr-1" />
                      <span className="text-xs text-blue-600">
                        {recurringShare}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Avg Per Member</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(revenueMetrics.averageRevenuePerMember)}
                    </p>
                    <div className="flex items-center">
                      <Users className="h-3 w-3 text-purple-500 mr-1" />
                      <span className="text-xs text-purple-600">Per member</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Target Achievement</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {revenueMetrics.targetAchievement === null ? '—' : `${revenueMetrics.targetAchievement}%`}
                    </p>
                    <div className="flex items-center">
                      <Target className="h-3 w-3 text-orange-500 mr-1" />
                      <span className="text-xs text-orange-600">
                        {revenueMetrics.targetAchievement === null ? 'No target set' : revenueMetrics.targetAchievement >= 100 ? 'Above target' : 'Below target'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Revenue by Source</CardTitle>
                  <CardDescription>Distribution across all revenue streams</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={revenueBySource}
                        dataKey="amount"
                        nameKey="source"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ percentage }) => `${percentage}%`}
                      >
                        {revenueBySource.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Revenue by Payment Method</CardTitle>
                  <CardDescription>Receipts and POS sales, last {windowDays} days</CardDescription>
                </CardHeader>
                <CardContent>
                  <InsightsStatus loading={insightsLoading} error={insightsError} />
                  {insights && revenueByPayment.length === 0 && <NoData>No payments recorded in this period.</NoData>}
                  <div className="space-y-3">
                    {revenueByPayment.map((method, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">{method.method}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-muted-foreground">
                              {method.transactions} txns
                            </span>
                            <span className="text-sm font-medium">{formatCurrency(method.amount)}</span>
                          </div>
                        </div>
                        <Progress value={method.percentage} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          Avg: {formatCurrency(method.avgTransaction)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue by Day of Week</CardTitle>
                <CardDescription>Last {windowDays} days</CardDescription>
              </CardHeader>
              <CardContent>
                <InsightsStatus loading={insightsLoading} error={insightsError} />
                {insights && (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={revenueByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#2B7A78" name={`Revenue (${live.currencyCode})`} />
                    <Bar dataKey="transactions" fill="#3b82f6" name="Transactions" />
                  </BarChart>
                </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue by Hour</CardTitle>
                <CardDescription>When payments are taken, last {windowDays} days</CardDescription>
              </CardHeader>
              <CardContent>
                <InsightsStatus loading={insightsLoading} error={insightsError} />
                {insights && revenueByHour.length === 0 && <NoData>No payments recorded in this period.</NoData>}
                {revenueByHour.length > 0 && (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={revenueByHour}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name={`Revenue (${live.currencyCode})`} />
                    <Area type="monotone" dataKey="transactions" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Transactions" />
                  </AreaChart>
                </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sources Tab */}
          <TabsContent value="sources" className="space-y-4">
            <InsightsStatus loading={insightsLoading} error={insightsError} />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Membership Revenue Breakdown</CardTitle>
                <CardDescription>New and renewal sales in the last {windowDays} days, vs the {windowDays} days before</CardDescription>
              </CardHeader>
              <CardContent>
                {insights && membershipRevenue.length === 0 && <NoData>No membership sales recorded yet.</NoData>}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membership Type</TableHead>
                      <TableHead className="text-right">Active Members</TableHead>
                      <TableHead className="text-right">Avg Monthly Fee</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">Growth</TableHead>
                      <TableHead className="text-right">Lapsed</TableHead>
                      <TableHead className="text-right">Avg Tenure</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {membershipRevenue.map((tier, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{tier.tier}</TableCell>
                        <TableCell className="text-right">{tier.members} <span className="text-xs text-muted-foreground">of {tier.totalMembers}</span></TableCell>
                        <TableCell className="text-right">{tier.monthlyFee != null ? formatCurrency(tier.monthlyFee) : '—'}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(tier.totalRevenue)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end">
                            {getTrendIcon(tier.growth ?? 0)}
                            <span className={getTrendColor(tier.growth ?? 0)}>{formatSignedPercent(tier.growth)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{tier.churnRate}%</TableCell>
                        <TableCell className="text-right">{tier.avgLifetime != null ? `${tier.avgLifetime} months` : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Personal Training Revenue</CardTitle>
                  <CardDescription>PT sessions in the last {windowDays} days, by trainer</CardDescription>
                </CardHeader>
                <CardContent>
                  {insights && ptRevenue.length === 0 && <NoData>No PT sessions in this period.</NoData>}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Trainer</TableHead>
                        <TableHead className="text-right">Sessions</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Booked</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ptRevenue.map((trainer, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{trainer.trainer}</TableCell>
                          <TableCell className="text-right">{trainer.sessions}</TableCell>
                          <TableCell className="text-right">{formatCurrency(trainer.revenue)}</TableCell>
                          <TableCell className="text-right">
                            {trainer.utilization == null ? '—' : (
                              <Badge className={trainer.utilization >= 90 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                {trainer.utilization}%
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Class Revenue</CardTitle>
                  <CardDescription>Class sessions in the last {windowDays} days</CardDescription>
                </CardHeader>
                <CardContent>
                  {insights && classRevenue.length === 0 && <NoData>No classes in this period.</NoData>}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Class</TableHead>
                        <TableHead className="text-right">Sessions</TableHead>
                        <TableHead className="text-right">Attendees</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classRevenue.map((cls, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{cls.class}</TableCell>
                          <TableCell className="text-right">{cls.sessions}</TableCell>
                          <TableCell className="text-right">{cls.attendees}</TableCell>
                          <TableCell className="text-right">{formatCurrency(cls.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Retail & Supplements Revenue</CardTitle>
                <CardDescription>POS sales by product category, last {windowDays} days</CardDescription>
              </CardHeader>
              <CardContent>
                {insights && retailRevenue.length === 0 && <NoData>No POS sales in this period.</NoData>}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Units Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Avg Sale</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {retailRevenue.map((category, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{category.category}</TableCell>
                        <TableCell className="text-right">{category.sales}</TableCell>
                        <TableCell className="text-right">{formatCurrency(category.revenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(category.avgSale)}</TableCell>
                        <TableCell className="text-right">
                          {category.margin == null ? '—' : <Badge variant="outline">{category.margin}%</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue Growth Trend</CardTitle>
                <CardDescription>6-month revenue performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#10b981" name="Actual Revenue" />
                    {revenueData.some((point) => point.target != null) && (
                      <Line type="monotone" dataKey="target" stroke="#6b7280" strokeWidth={2} strokeDasharray="5 5" name="Target" />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue Growth Drivers</CardTitle>
                <CardDescription>Money taken per stream, last 30 days vs the 30 days before</CardDescription>
              </CardHeader>
              <CardContent>
                <InsightsStatus loading={insightsLoading} error={insightsError} />
                {insights && growthDrivers.length === 0 && <NoData>No payments in the last 60 days.</NoData>}
                <div className="space-y-4">
                  {growthDrivers.map((driver, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">{driver.driver}</span>
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline">{driver.percentage}% of total</Badge>
                          <span className={`text-sm font-medium ${getTrendColor(driver.growth ?? 0)}`}>{formatSignedPercent(driver.growth)}</span>
                          <span className="text-sm font-medium">{formatCurrency(driver.contribution)}</span>
                        </div>
                      </div>
                      <Progress value={driver.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Growth Rate</p>
                      <p className="text-2xl font-bold text-green-600">{formatSignedPercent(revenueMetrics.revenueGrowthRate)}</p>
                      <p className="text-xs text-green-600 mt-1">vs last month</p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-green-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Recurring Revenue %</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {recurringShare}%
                      </p>
                      <p className="text-xs text-blue-600 mt-1">Stable base</p>
                    </div>
                    <Activity className="h-10 w-10 text-blue-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Lead Conversion</p>
                      <p className="text-2xl font-bold text-purple-600">{revenueMetrics.conversionRate != null ? `${revenueMetrics.conversionRate}%` : '—'}</p>
                      <p className="text-xs text-purple-600 mt-1">
                        {insights ? `${insights.converted_leads} of ${insights.leads} leads, last ${windowDays} days` : 'Leads converted to members'}
                      </p>
                    </div>
                    <Award className="h-10 w-10 text-purple-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Month-over-Month Comparison</CardTitle>
                <CardDescription>Current vs previous month performance</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">Current Month</TableHead>
                      <TableHead className="text-right">Previous Month</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead className="text-right">Target</TableHead>
                      <TableHead className="text-right">vs Target</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyComparison.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.metric}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.current)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.previous)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end">
                            {getTrendIcon(item.change)}
                            <span className={getTrendColor(item.change)}>
                              {item.change > 0 ? '+' : ''}{item.change}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{item.target === null ? '—' : formatCurrency(item.target)}</TableCell>
                        <TableCell className="text-right">
                          {item.target === null || item.target <= 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <Badge className={
                              item.current >= item.target
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }>
                              {((item.current / item.target) * 100).toFixed(1)}%
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Revenue Source Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={revenueBySource} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="source" type="category" width={120} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Bar dataKey="amount" fill="#2B7A78" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Performance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Revenue Target Achievement</span>
                        <span className="text-sm font-medium text-green-600">{targetAchievement === null ? '—' : `${targetAchievement}%`}</span>
                      </div>
                      <Progress value={clampPercent(targetAchievement ?? 0)} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Growth vs Last Month</span>
                        <span className="text-sm font-medium text-blue-600">{formatSignedPercent(revenueMetrics.revenueGrowthRate)}</span>
                      </div>
                      <Progress value={clampPercent(50 + (revenueMetrics.revenueGrowthRate ?? 50))} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Revenue Diversification</span>
                        <span className="text-sm font-medium text-purple-600">{revenueBySource.length > 0 ? `${Math.round(100 - topSourceShare)}%` : '—'}</span>
                      </div>
                      <Progress value={revenueBySource.length > 0 ? clampPercent(100 - topSourceShare) : 0} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">Share of revenue outside your largest source</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Forecast Tab */}
          <TabsContent value="forecast" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">6-Month Revenue Forecast</CardTitle>
                <CardDescription>Straight-line projection of your average monthly change, with a ±5% band</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueForecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={3} name="Actual" />
                    <Line type="monotone" dataKey="forecast" stroke="#3b82f6" strokeWidth={2} name="Forecast" />
                    <Line type="monotone" dataKey="upper" stroke="#94a3b8" strokeDasharray="5 5" name="Upper Bound" />
                    <Line type="monotone" dataKey="lower" stroke="#94a3b8" strokeDasharray="5 5" name="Lower Bound" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Next Month Forecast</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(nextMonthForecast)}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Range</span>
                      <span className="text-xs">{formatCurrency(nextMonthForecast * 0.95)} - {formatCurrency(nextMonthForecast * 1.05)}</span>
                    </div>
                    <Progress value={live.monthlyRevenueTarget ? clampPercent((nextMonthForecast / live.monthlyRevenueTarget) * 100) : 0} className="h-2" />
                    <p className="text-xs text-blue-600">{live.monthlyRevenueTarget ? 'Bar shows progress against your monthly target' : 'Projected from your monthly trend'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Next 3 Months Forecast</p>
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(next3MonthsForecast)}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">vs last 3 months</span>
                      <span className="text-xs text-green-600">
                        {formatSignedPercent(trend.length >= 3 ? pctChange(next3MonthsForecast, trend.slice(-3).reduce((s, p) => s + p.revenue, 0)) : null)}
                      </span>
                    </div>
                    <Progress value={clampPercent(50 + avgMonthlyChange / Math.max(1, lastPoint?.revenue ?? 1) * 100)} className="h-2" />
                    <p className="text-xs text-purple-600">Projected from your monthly trend</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Next 6 Months Projection</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(next6MonthsForecast)}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">vs Target</span>
                      <span className="text-xs text-green-600">
                        {live.monthlyRevenueTarget ? formatSignedPercent(pctChange(next6MonthsForecast, live.monthlyRevenueTarget * 6)) : '—'}
                      </span>
                    </div>
                    <Progress value={live.monthlyRevenueTarget ? clampPercent((next6MonthsForecast / (live.monthlyRevenueTarget * 6)) * 100) : 0} className="h-2" />
                    <p className="text-xs text-green-600">Projected from your monthly trend</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Forecast Assumptions</CardTitle>
                <CardDescription>What the straight-line projection above is based on</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Inputs</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                        <span>Average monthly revenue change: {formatCurrency(Math.round(avgMonthlyChange))} over the last {trend.length} months</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                        <span>New members: {avgNewMembers} per month on average</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                        <span>Recurring (membership) share of revenue: {recurringShare}%</span>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Risks</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-start">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2 mt-0.5" />
                        <span>Retention is {live.retentionRate}%: {live.expiredMembers} lapsed and {live.overdueMembers} overdue members</span>
                      </li>
                      <li className="flex items-start">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2 mt-0.5" />
                        <span>A straight line ignores seasonality — treat months further out with more caution</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            <InsightsStatus loading={insightsLoading} error={insightsError} />
            {insights && revenueInsights.length === 0 && <NoData>Not enough activity yet to draw insights.</NoData>}
            <div className="grid grid-cols-1 gap-4">
              {revenueInsights.map((insight) => (
                <Card key={insight.title} className={`border-l-4 ${insight.border}`}>
                  <CardHeader>
                    <div className="flex items-start space-x-3">
                      {insight.icon}
                      <div>
                        <CardTitle className="text-base">{insight.title}</CardTitle>
                        <CardDescription className="mt-1">{insight.text}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button className="bg-[#2B7A78] hover:bg-[#236663]" onClick={live.onExportData}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button className="bg-[#E63946] hover:bg-[#d32f3f]" onClick={() => window.print()}>
            <FileText className="h-4 w-4 mr-2" />
            Print Analysis
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
