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
import { Switch } from "../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import {
  Gauge,
  Activity,
  TrendingUp,
  TrendingDown,
  Download,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Calendar,
  Users,
  DollarSign,
  Target,
  Zap,
  Bell,
  Settings,
  Eye,
  Play,
  Pause,
  RefreshCw,
  Filter,
  ArrowUp,
  ArrowDown,
  Minus,
  BarChart3,
  TrendingUpDown,
  AlertCircle,
  Info,
  Award,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { type BiosLiveData, formatSignedPercent, clampPercent, useBiosInsights, InsightsStatus, NoData, BiosScheduleTable, downloadCsv, shareOf } from './bios-live';
import { biosInsightsService } from '../../utils/supabase/bios-insights-service';

interface PerformanceMetricsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: string;
  performanceMetrics: Array<{
    metric: string;
    current: number;
    target: number;
    trend: string;
    change: number;
  }>;
  formatCurrency: (amount: number) => string;
  getCurrentPeriod: () => string;
  live: BiosLiveData;
  onRefresh: () => void;
}

export function PerformanceMetricsDialog({
  open,
  onOpenChange,
  defaultTab = 'overview',
  performanceMetrics,
  formatCurrency,
  getCurrentPeriod,
  live,
  onRefresh
}: PerformanceMetricsDialogProps) {
  const [isLiveMode, setIsLiveMode] = React.useState(true);
  const [selectedMetric, setSelectedMetric] = React.useState('all');
  const [refreshInterval, setRefreshInterval] = React.useState('5');

  // Live Metrics Data — today's real figures from attendance, members and finance.
  const checkInMetric = performanceMetrics.find((m) => m.metric === 'Daily Check-ins');
  const thisMonthRevenue = live.monthlyTrend.length > 0 ? live.monthlyTrend[live.monthlyTrend.length - 1].revenue : 0;
  const liveMetrics = [
    {
      metric: 'Check-ins Today',
      value: live.todayCheckIns,
      status: 'active',
      trend: checkInMetric?.trend ?? 'stable',
      change: checkInMetric ? `${formatSignedPercent(checkInMetric.change)} vs target` : 'No target set',
      target: checkInMetric?.target ?? 0,
      category: 'Attendance'
    },
    {
      metric: 'Peak Hour Check-ins',
      value: live.peakHours[0]?.[1] ?? 0,
      status: 'active',
      trend: 'stable',
      change: live.peakHours[0] ? `Busiest at ${live.peakHours[0][0]}` : 'No check-ins yet today',
      target: live.todayCheckIns,
      category: 'Attendance'
    },
    {
      metric: 'Avg Session (min)',
      value: live.avgSessionMinutes,
      status: 'active',
      trend: live.avgSessionMinutes >= 60 ? 'up' : 'stable',
      change: 'Average workout length today',
      target: 60,
      category: 'Sessions'
    },
    {
      metric: 'Active Members',
      value: live.activeMembers,
      status: 'active',
      trend: (live.memberGrowthRate ?? 1) >= 0 ? 'up' : 'down',
      change: `${formatSignedPercent(live.memberGrowthRate)} vs last month`,
      target: live.totalMembers,
      category: 'Members'
    },
    {
      metric: 'Revenue This Month',
      value: thisMonthRevenue,
      status: 'active',
      trend: (live.revenueGrowthRate ?? 1) >= 0 ? 'up' : 'down',
      change: `${formatSignedPercent(live.revenueGrowthRate)} vs last month`,
      target: live.monthlyRevenueTarget ?? 0,
      category: 'Financial'
    },
    {
      metric: 'New Joins This Month',
      value: live.recentJoins,
      status: 'active',
      trend: live.recentJoins > 0 ? 'up' : 'stable',
      change: `${live.totalMembers.toLocaleString()} members in total`,
      target: 0,
      category: 'Members'
    }
  ];

  // Daily history (last 14 days) and departments, loaded when the dialog opens.
  const { data: operations, loading: operationsLoading, error: operationsError } =
    useBiosInsights(() => biosInsightsService.getOperations(), open, live.branchKey);
  const historicalPerformance = (operations?.daily ?? []).map((day) => ({
    date: new Date(`${day.date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    checkIns: day.check_ins,
    occupancy: day.capacity > 0 ? Math.round((day.bookings / day.capacity) * 100) : null,
    revenue: Math.round(day.revenue)
  }));
  const historyDays = historicalPerformance.length;
  const average = (values: number[]) => (values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0);
  const avgCheckIns = Math.round(average(historicalPerformance.map((d) => d.checkIns)));
  const occupancyDays = historicalPerformance.filter((d) => d.occupancy != null).map((d) => d.occupancy as number);
  const avgOccupancy = occupancyDays.length > 0 ? Math.round(average(occupancyDays)) : null;
  const avgRevenue = average(historicalPerformance.map((d) => d.revenue));
  const busiestDay = [...historicalPerformance].sort((a, b) => b.checkIns - a.checkIns)[0] ?? null;
  const exportHistory = () => downloadCsv('bios-daily-performance.csv',
    ['Date', 'Check-ins', 'Class occupancy %', `Revenue (${live.currencyCode})`],
    (operations?.daily ?? []).map((d) => [d.date, d.check_ins, d.capacity > 0 ? Math.round((d.bookings / d.capacity) * 100) : '', d.revenue]));

  // Hourly Performance (Today) — check-ins per hour from today's attendance.
  const hourlyPerformance = [...live.peakHours]
    .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10))
    .map(([hour, count]) => ({
      hour,
      checkIns: count,
      occupancy: live.todayCheckIns > 0 ? Math.round((count / live.todayCheckIns) * 100) : 0
    }));

  // Performance Alerts — every metric measured against its target.
  const performanceAlerts = performanceMetrics
    .filter((m) => m.target > 0)
    .map((m) => {
      const ratio = m.current / m.target;
      return ratio >= 1
        ? {
            type: 'success',
            title: `${m.metric} On Target`,
            description: `${m.current} against a target of ${m.target} (${formatSignedPercent(m.change)})`,
            timestamp: 'Today',
            priority: 'Low',
            action: 'Keep the current approach'
          }
        : {
            type: 'warning',
            title: `${m.metric} Below Target`,
            description: `${m.current} against a target of ${m.target} (${formatSignedPercent(m.change)})`,
            timestamp: 'Today',
            priority: ratio < 0.7 ? 'High' : 'Medium',
            action: 'Review what is driving the gap'
          };
    });

  // Performance Targets — the live metrics plus revenue per member vs your benchmark.
  const isPercentMetric = (metric: string) =>
    metric.includes('Rate') || metric.includes('Efficiency') || metric.includes('Occupancy') || metric.includes('Utilization');
  const performanceTargets = [
    ...performanceMetrics.map((m) => ({
      metric: m.metric,
      current: m.current,
      target: m.target,
      unit: isPercentMetric(m.metric) ? '%' : 'members',
      period: 'Daily',
      achievement: m.target > 0 ? (m.current / m.target) * 100 : 0,
      trend: m.trend === 'up' ? 'improving' : m.trend === 'down' ? 'declining' : 'stable'
    })),
    ...(live.monthlyRevenueTarget ? [{
      metric: 'Monthly Revenue',
      current: thisMonthRevenue,
      target: live.monthlyRevenueTarget,
      unit: live.currencyCode,
      period: 'Monthly',
      achievement: (thisMonthRevenue / live.monthlyRevenueTarget) * 100,
      trend: (live.revenueGrowthRate ?? 1) >= 0 ? 'improving' : 'declining'
    }] : [])
  ];

  // Department Performance — this month's staff targets, grouped by department.
  const departmentPerformance = (operations?.departments ?? []).map((d) => ({
    department: d.department,
    staff: d.staff,
    revenue: d.revenue_target > 0 ? Math.round((d.revenue_achieved / d.revenue_target) * 100) : null,
    sessions: d.sessions_target > 0 ? Math.round((d.sessions_achieved / d.sessions_target) * 100) : null
  }));

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-bios-ui="" className="max-w-7xl sm:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Gauge className="h-6 w-6 text-[#2B7A78]" />
            <span>Performance Metrics - {getCurrentPeriod()}</span>
          </DialogTitle>
          <DialogDescription>
            Real-time monitoring, historical analysis, and performance tracking
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="live">Live View</TabsTrigger>
            <TabsTrigger value="historical">Historical</TabsTrigger>
            <TabsTrigger value="targets">Targets</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {performanceMetrics.map((metric, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{metric.metric}</p>
                        {getTrendIcon(metric.trend)}
                      </div>
                      <p className="text-2xl font-bold">{metric.current}{metric.metric.includes('Rate') || metric.metric.includes('Efficiency') || metric.metric.includes('Occupancy') || metric.metric.includes('Utilization') ? '%' : ''}</p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Target: {metric.target}{metric.metric.includes('Rate') || metric.metric.includes('Efficiency') || metric.metric.includes('Occupancy') || metric.metric.includes('Utilization') ? '%' : ''}</span>
                          <span className={metric.change > 0 ? 'text-green-600' : 'text-red-600'}>
                            {metric.change > 0 ? '+' : ''}{metric.change}%
                          </span>
                        </div>
                        <Progress value={metric.target > 0 ? clampPercent((metric.current / metric.target) * 100) : 0} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Separator />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Department Performance</CardTitle>
                  <CardDescription>This month's staff targets achieved, by department</CardDescription>
                </CardHeader>
                <CardContent>
                  <InsightsStatus loading={operationsLoading} error={operationsError} />
                  {operations && departmentPerformance.length === 0 && <NoData>No staff targets set for this month.</NoData>}
                  {departmentPerformance.length > 0 && (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={departmentPerformance}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="department" />
                        <YAxis unit="%" />
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Legend />
                        <Bar dataKey="revenue" fill="#2B7A78" name="Revenue target %" />
                        <Bar dataKey="sessions" fill="#E63946" name="Sessions target %" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Performance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {performanceMetrics.map((metric, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm">{metric.metric}</span>
                          <div className="flex items-center space-x-2">
                            {getTrendIcon(metric.trend)}
                            <span className="text-sm font-medium">
                              {metric.current}{metric.metric.includes('Rate') || metric.metric.includes('Efficiency') || metric.metric.includes('Occupancy') || metric.metric.includes('Utilization') ? '%' : ''}
                            </span>
                          </div>
                        </div>
                        <Progress value={metric.target > 0 ? clampPercent((metric.current / metric.target) * 100) : 0} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Live View Tab */}
          <TabsContent value="live" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {isLiveMode ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-green-600">Live</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <div className="h-3 w-3 bg-gray-400 rounded-full" />
                      <span className="text-sm font-medium text-gray-600">Paused</span>
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsLiveMode(!isLiveMode)}
                >
                  {isLiveMode ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  {isLiveMode ? 'Pause' : 'Resume'}
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Select value={refreshInterval} onValueChange={setRefreshInterval}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 seconds</SelectItem>
                    <SelectItem value="10">10 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={onRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {liveMetrics.map((metric, index) => (
                <Card key={index} className={isLiveMode ? 'border-green-200' : ''}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge className={getStatusColor(metric.status)}>
                          {metric.category}
                        </Badge>
                        {getTrendIcon(metric.trend)}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{metric.metric}</p>
                        <p className="text-2xl font-bold">
                          {metric.category === 'Financial' ? formatCurrency(metric.value) : metric.value}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">{metric.change}</p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Target:</span>
                          <span>{metric.target <= 0 ? '—' : metric.category === 'Financial' ? formatCurrency(metric.target) : metric.target}</span>
                        </div>
                        <Progress value={metric.target > 0 ? clampPercent((metric.value / metric.target) * 100) : 0} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hourly Performance (Today)</CardTitle>
                <CardDescription>Check-ins per hour, and each hour's share of today's total</CardDescription>
              </CardHeader>
              <CardContent>
                {hourlyPerformance.length === 0 && (
                  <p className="text-sm text-muted-foreground mb-2">No check-ins recorded yet today.</p>
                )}
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={hourlyPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="checkIns" stroke="#2B7A78" fill="#2B7A78" fillOpacity={0.6} name="Check-ins" />
                    <Area type="monotone" dataKey="occupancy" stroke="#E63946" fill="#E63946" fillOpacity={0.3} name="Share of Day %" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Historical Tab */}
          <TabsContent value="historical" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Last {historyDays || 14} Days Performance</h3>
                <p className="text-sm text-muted-foreground">Check-ins, class occupancy and money taken per day</p>
              </div>
              <Button size="sm" variant="outline" onClick={exportHistory} disabled={!operations}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
            <InsightsStatus loading={operationsLoading} error={operationsError} />

            {operations && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Check-ins & Class Occupancy</CardTitle>
                    <CardDescription>Occupancy = class and PT bookings as a share of session capacity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={historicalPerformance}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="checkIns" stroke="#2B7A78" strokeWidth={2} name="Check-ins" />
                        <Line type="monotone" dataKey="occupancy" stroke="#3b82f6" strokeWidth={2} name="Occupancy %" connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Daily Revenue</CardTitle>
                      <CardDescription>Receipts and POS sales</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={historicalPerformance}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend />
                          <Bar dataKey="revenue" fill="#10b981" name={`Revenue (${live.currencyCode})`} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Performance Statistics</CardTitle>
                      <CardDescription>Daily averages over the last {historyDays} days</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-sm">Average Check-ins</span>
                          <span className="text-sm font-medium">{avgCheckIns}/day</span>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Average Class Occupancy</span>
                            <span className="text-sm font-medium">{avgOccupancy != null ? `${avgOccupancy}%` : '—'}</span>
                          </div>
                          <Progress value={avgOccupancy ?? 0} className="h-2" />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Average Revenue</span>
                          <span className="text-sm font-medium">{formatCurrency(avgRevenue)}/day</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Busiest Day</span>
                          <span className="text-sm font-medium">{busiestDay && busiestDay.checkIns > 0 ? `${busiestDay.date} (${busiestDay.checkIns} check-ins)` : '—'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Targets Tab */}
          <TabsContent value="targets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance Targets & Achievement</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">Target</TableHead>
                      <TableHead className="text-right">Achievement</TableHead>
                      <TableHead>Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performanceTargets.map((target, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          <div>
                            <p>{target.metric}</p>
                            <p className="text-xs text-muted-foreground">{target.period}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {target.unit === live.currencyCode ? formatCurrency(target.current) : `${target.current} ${target.unit}`}
                        </TableCell>
                        <TableCell className="text-right">
                          {target.unit === live.currencyCode ? formatCurrency(target.target) : `${target.target} ${target.unit}`}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <span className={target.achievement >= 100 ? 'text-green-600 font-medium' : target.achievement >= 85 ? 'text-blue-600 font-medium' : 'text-red-600 font-medium'}>
                              {target.achievement.toFixed(1)}%
                            </span>
                            <Progress value={clampPercent(target.achievement)} className="h-2 w-20" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            {getTrendIcon(target.trend)}
                            <span className="text-xs capitalize">{target.trend}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Set New Target</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Metric</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select metric" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="checkins">Daily Check-ins</SelectItem>
                          <SelectItem value="occupancy">Class Occupancy</SelectItem>
                          <SelectItem value="equipment">Equipment Utilization</SelectItem>
                          <SelectItem value="efficiency">Staff Efficiency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Target Value</Label>
                      <Input type="number" placeholder="Enter target value" />
                    </div>
                    <div className="space-y-2">
                      <Label>Period</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full bg-[#2B7A78] hover:bg-[#236663]" onClick={live.onConfigure}>
                      <Target className="h-4 w-4 mr-2" />
                      Set Target
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Target Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Alert on Target Miss</p>
                        <p className="text-xs text-muted-foreground">Notify when below 85%</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Daily Summary</p>
                        <p className="text-xs text-muted-foreground">Send at end of day</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Achievement Celebration</p>
                        <p className="text-xs text-muted-foreground">Notify on target exceeded</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label>Alert Recipients</Label>
                      <Input placeholder="email@example.com" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Scheduled Reports</h3>
                <p className="text-sm text-muted-foreground">Automated reports and alerts for this branch</p>
              </div>
              <Button className="bg-[#2B7A78] hover:bg-[#236663]" onClick={live.onConfigure}>
                <Calendar className="h-4 w-4 mr-2" />
                Edit Schedule
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <BiosScheduleTable settings={live.settings} onConfigure={live.onConfigure} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Performance Alerts</h3>
                <p className="text-sm text-muted-foreground">{performanceAlerts.length} active alerts</p>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button size="sm" variant="outline" onClick={live.onConfigure}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {performanceAlerts.map((alert, index) => (
                <Card key={index} className={
                  alert.type === 'warning' ? 'border-yellow-200' : 
                  alert.type === 'success' ? 'border-green-200' : 
                  'border-blue-200'
                }>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {getAlertIcon(alert.type)}
                        <div>
                          <CardTitle className="text-base">{alert.title}</CardTitle>
                          <CardDescription className="mt-1">{alert.description}</CardDescription>
                          <div className="flex items-center space-x-3 mt-2">
                            <span className="text-xs text-muted-foreground flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {alert.timestamp}
                            </span>
                            <Badge className={
                              alert.priority === 'High' ? 'bg-red-100 text-red-800' : 
                              alert.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-blue-100 text-blue-800'
                            }>
                              {alert.priority} Priority
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        <strong>Recommended Action:</strong> {alert.action}
                      </p>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        <Button size="sm" className="bg-[#2B7A78] hover:bg-[#236663]">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Acknowledge
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button className="bg-[#2B7A78] hover:bg-[#236663]" onClick={live.onExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button className="bg-[#E63946] hover:bg-[#d32f3f]" onClick={() => window.print()}>
            <FileText className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
