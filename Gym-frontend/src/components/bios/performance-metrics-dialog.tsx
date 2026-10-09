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
import { type BiosLiveData, SampleDataBadge, SampleTitle, formatSignedPercent, clampPercent } from './bios-live';

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

  // Historical Performance Data
  const historicalPerformance = [
    { date: '2024-09-20', checkIns: 235, occupancy: 72, revenue: 4200, efficiency: 89 },
    { date: '2024-09-21', checkIns: 248, occupancy: 76, revenue: 4550, efficiency: 91 },
    { date: '2024-09-22', checkIns: 256, occupancy: 78, revenue: 4800, efficiency: 92 },
    { date: '2024-09-23', checkIns: 242, occupancy: 74, revenue: 4400, efficiency: 88 },
    { date: '2024-09-24', checkIns: 268, occupancy: 82, revenue: 5100, efficiency: 94 },
    { date: '2024-09-25', checkIns: 245, occupancy: 75, revenue: 4850, efficiency: 90 }
  ];

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

  // Scheduled Reports
  const scheduledReports = [
    {
      name: 'Daily Performance Summary',
      frequency: 'Daily',
      time: '11:00 PM',
      recipients: 'Management Team',
      lastSent: '2024-09-24',
      status: 'Active'
    },
    {
      name: 'Weekly Metrics Report',
      frequency: 'Weekly',
      time: 'Monday 9:00 AM',
      recipients: 'All Staff',
      lastSent: '2024-09-23',
      status: 'Active'
    },
    {
      name: 'Monthly Performance Review',
      frequency: 'Monthly',
      time: '1st of month, 10:00 AM',
      recipients: 'Executives',
      lastSent: '2024-09-01',
      status: 'Active'
    },
    {
      name: 'Real-time Alert Digest',
      frequency: 'Hourly',
      time: 'Every hour',
      recipients: 'Operations Manager',
      lastSent: '2024-09-25',
      status: 'Active'
    }
  ];

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

  // Department Performance
  const departmentPerformance = [
    { department: 'Front Desk', efficiency: 95, satisfaction: 4.7, target: 90 },
    { department: 'Personal Training', efficiency: 88, satisfaction: 4.8, target: 85 },
    { department: 'Group Classes', efficiency: 82, satisfaction: 4.5, target: 80 },
    { department: 'Maintenance', efficiency: 91, satisfaction: 4.4, target: 90 },
    { department: 'Retail', efficiency: 76, satisfaction: 4.2, target: 75 }
  ];

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
                  <CardTitle className="text-base"><SampleTitle>Department Performance</SampleTitle></CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart data={departmentPerformance}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="department" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar name="Efficiency" dataKey="efficiency" stroke="#2B7A78" fill="#2B7A78" fillOpacity={0.6} />
                      <Radar name="Satisfaction" dataKey="satisfaction" stroke="#E63946" fill="#E63946" fillOpacity={0.3} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
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
            <div className="flex justify-end">
              <SampleDataBadge />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Last 7 Days Performance</h3>
                <p className="text-sm text-muted-foreground">Historical trends and patterns</p>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Check-ins & Occupancy Trend</CardTitle>
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
                    <Line type="monotone" dataKey="occupancy" stroke="#3b82f6" strokeWidth={2} name="Occupancy %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Revenue & Efficiency</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={historicalPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="revenue" fill="#10b981" name={`Revenue (${live.currencyCode})`} />
                      <Bar dataKey="efficiency" fill="#8b5cf6" name="Efficiency %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Performance Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Average Check-ins</span>
                        <span className="text-sm font-medium">249/day</span>
                      </div>
                      <Progress value={88} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Average Occupancy</span>
                        <span className="text-sm font-medium">76%</span>
                      </div>
                      <Progress value={76} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Average Revenue</span>
                        <span className="text-sm font-medium">{formatCurrency(4650)}</span>
                      </div>
                      <Progress value={84} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Average Efficiency</span>
                        <span className="text-sm font-medium">90.7%</span>
                      </div>
                      <Progress value={90.7} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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
                <h3 className="font-semibold flex items-center gap-2">Scheduled Reports <SampleDataBadge /></h3>
                <p className="text-sm text-muted-foreground">Automated performance reports and alerts</p>
              </div>
              <Button className="bg-[#2B7A78] hover:bg-[#236663]" onClick={live.onConfigure}>
                <Calendar className="h-4 w-4 mr-2" />
                New Schedule
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active Schedules</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report Name</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Last Sent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduledReports.map((report, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{report.name}</TableCell>
                        <TableCell>{report.frequency}</TableCell>
                        <TableCell>{report.time}</TableCell>
                        <TableCell>{report.recipients}</TableCell>
                        <TableCell>{report.lastSent}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">{report.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost">
                            <Settings className="h-4 w-4" />
                          </Button>
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
                  <CardTitle className="text-base">Create New Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Report Type</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select report type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily Summary</SelectItem>
                          <SelectItem value="weekly">Weekly Performance</SelectItem>
                          <SelectItem value="monthly">Monthly Review</SelectItem>
                          <SelectItem value="custom">Custom Report</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Recipients</Label>
                      <Input placeholder="Enter email addresses" />
                    </div>
                    <Button className="w-full bg-[#2B7A78] hover:bg-[#236663]" onClick={live.onConfigure}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Create Schedule
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Schedule Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Auto-Send Reports</p>
                        <p className="text-xs text-muted-foreground">Send reports automatically</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Include Charts</p>
                        <p className="text-xs text-muted-foreground">Attach visualizations</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">PDF Format</p>
                        <p className="text-xs text-muted-foreground">Export as PDF</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Delivery Confirmation</p>
                        <p className="text-xs text-muted-foreground">Notify on successful send</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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
