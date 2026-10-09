import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Separator } from "../ui/separator";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import {
  Monitor,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  Download,
  FileText,
  CheckCircle,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Target,
  Award,
  Activity,
  Zap,
  Calendar,
  Clock,
  AlertCircle,
  ThumbsUp,
  Briefcase,
  BarChart3,
  PieChart as PieChartIcon,
  Building2,
  Globe
} from 'lucide-react';
import { type BiosLiveData, SampleDataBadge, SampleTitle, formatSignedPercent, clampPercent, compactCurrency } from './bios-live';

interface ExecutiveDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topKPIs: {
    totalRevenue: number;
    activeMembers: number;
    retentionRate: number;
    monthlyGrowth: number;
  };
  formatCurrency: (amount: number) => string;
  getCurrentPeriod: () => string;
  live: BiosLiveData;
}

export function ExecutiveDashboardDialog({
  open,
  onOpenChange,
  topKPIs,
  formatCurrency,
  getCurrentPeriod,
  live
}: ExecutiveDashboardDialogProps) {
  // Executive Summary Data
  const expenseRatio = live.totalRevenue > 0 ? Number(((live.totalExpenses / live.totalRevenue) * 100).toFixed(1)) : 0;
  const executiveSummary = {
    overallHealth: live.overallHealthScore,
    healthStatus: live.overallHealthLabel,
    profitMargin: Number(live.profitMargin.toFixed(1)),
    operatingExpenses: expenseRatio,
    netProfit: live.netIncome,
    // No market/competitor data source yet — illustrative values.
    marketPosition: 'Strong',
    competitiveAdvantage: 'High'
  };

  // Strategic Metrics
  const strategicMetrics = [
    { category: 'Revenue Growth', score: 95, target: 85, status: 'Excellent' },
    { category: 'Member Satisfaction', score: 88, target: 80, status: 'Good' },
    { category: 'Market Penetration', score: 76, target: 75, status: 'Good' },
    { category: 'Brand Awareness', score: 82, target: 85, status: 'Fair' },
    { category: 'Operational Excellence', score: 91, target: 90, status: 'Excellent' },
    { category: 'Innovation Index', score: 73, target: 80, status: 'Fair' }
  ];

  // Business Health Indicators — same components as the page's overall health score.
  const staffAvgAchievement = live.topStaff.length > 0
    ? live.topStaff.reduce((sum, t) => sum + (t.percentage || 0), 0) / live.topStaff.length
    : 0;
  const growthHealth = live.revenueGrowthRate === null ? 100 : clampPercent(live.revenueGrowthRate * 4 + 50);
  const healthTrend = (value: number) => (value >= 70 ? 'up' : value >= 50 ? 'stable' : 'down');
  const healthIndicators = [
    { indicator: 'Financial Health', value: Math.round(clampPercent(live.profitMargin * 2.2)), color: '#10b981' },
    { indicator: 'Operational Health', value: Math.round(live.performanceScore), color: '#3b82f6' },
    { indicator: 'Customer Health', value: Math.round(live.retentionRate), color: '#8b5cf6' },
    { indicator: 'Employee Health', value: Math.round(clampPercent(staffAvgAchievement)), color: '#f59e0b' },
    { indicator: 'Growth Health', value: Math.round(growthHealth), color: '#ec4899' }
  ].map((h) => ({ ...h, trend: healthTrend(h.value) }));

  // Critical Alerts & Opportunities — derived from the gym's live figures.
  const criticalAlerts: Array<{ type: string; title: string; description: string; priority: string; action: string; impact: string }> = [];
  if (live.overdueMembers > 0) {
    criticalAlerts.push({
      type: 'alert',
      title: 'Overdue Member Payments',
      description: `${live.overdueMembers} member${live.overdueMembers === 1 ? ' has' : 's have'} an overdue payment status`,
      priority: live.overdueMembers >= 10 ? 'High' : 'Medium',
      action: 'Follow up on outstanding dues',
      impact: `~${formatCurrency(live.overdueMembers * live.revenuePerMember)} at risk`
    });
  }
  if (live.revenueGrowthRate !== null && live.revenueGrowthRate < 0) {
    criticalAlerts.push({
      type: 'alert',
      title: 'Revenue Down vs Last Month',
      description: `Monthly revenue changed ${formatSignedPercent(live.revenueGrowthRate)}`,
      priority: live.revenueGrowthRate <= -10 ? 'High' : 'Medium',
      action: 'Review renewals and run a promotion',
      impact: `${formatSignedPercent(live.revenueGrowthRate)} month over month`
    });
  }
  if (live.expiredMembers > 0) {
    criticalAlerts.push({
      type: 'opportunity',
      title: 'Win Back Expired Members',
      description: `${live.expiredMembers} member${live.expiredMembers === 1 ? '' : 's'} with expired memberships`,
      priority: live.expiredMembers >= 20 ? 'High' : 'Medium',
      action: 'Launch a renewal campaign',
      impact: `+${formatCurrency(live.expiredMembers * live.revenuePerMember)} potential`
    });
  }
  if (live.peakHours.length > 0) {
    criticalAlerts.push({
      type: 'opportunity',
      title: `Peak Hour: ${live.peakHours[0][0]}`,
      description: `${live.peakHours[0][1]} of today's ${live.todayCheckIns} check-ins happened in this hour`,
      priority: 'Medium',
      action: 'Schedule extra staff and classes at peak time',
      impact: 'Better member experience at peak load'
    });
  }

  // Revenue Forecast — actuals plus a straight-line projection of the average monthly change.
  const actualMonths = live.monthlyTrend;
  const avgMonthlyChange = actualMonths.length > 1
    ? (actualMonths[actualMonths.length - 1].revenue - actualMonths[0].revenue) / (actualMonths.length - 1)
    : 0;
  const lastActual = actualMonths.length > 0 ? actualMonths[actualMonths.length - 1].revenue : 0;
  const forecastLabels = Array.from({ length: 4 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() + i + 1, 1);
    return d.toLocaleDateString('en-GB', { month: 'short' });
  });
  const revenueForecast = [
    // null (not 0) leaves a gap instead of dragging the area to zero; the forecast starts at the last actual.
    ...actualMonths.map((p, i) => ({ month: p.month, actual: Math.round(p.revenue) as number | null, forecast: i === actualMonths.length - 1 ? Math.round(p.revenue) : null })),
    ...forecastLabels.map((month, i) => ({ month, actual: null, forecast: Math.max(0, Math.round(lastActual + avgMonthlyChange * (i + 1))) as number | null }))
  ];

  // Strategic Initiatives
  const strategicInitiatives = [
    {
      initiative: 'Digital Transformation',
      status: 'In Progress',
      completion: 67,
      owner: 'CTO',
      deadline: '2024-12-31',
      impact: 'High'
    },
    {
      initiative: 'Member Experience Enhancement',
      status: 'In Progress',
      completion: 85,
      owner: 'COO',
      deadline: '2024-10-15',
      impact: 'High'
    },
    {
      initiative: 'Revenue Diversification',
      status: 'Planning',
      completion: 25,
      owner: 'CFO',
      deadline: '2025-03-31',
      impact: 'Medium'
    },
    {
      initiative: 'Market Expansion',
      status: 'Planning',
      completion: 15,
      owner: 'CEO',
      deadline: '2025-06-30',
      impact: 'High'
    }
  ];

  // Competitive Position
  const competitivePosition = [
    { aspect: 'Pricing', yours: 85, competitor: 75 },
    { aspect: 'Facilities', yours: 92, competitor: 80 },
    { aspect: 'Member Service', yours: 88, competitor: 85 },
    { aspect: 'Technology', yours: 78, competitor: 82 },
    { aspect: 'Brand', yours: 82, competitor: 88 },
    { aspect: 'Location', yours: 90, competitor: 75 }
  ];

  // Key Decisions Required
  const decisionsRequired = [
    {
      decision: 'Q4 Marketing Budget Allocation',
      urgency: 'High',
      deadline: '2024-10-01',
      options: 'Digital vs Traditional split',
      recommendation: 'Increase digital to 70%'
    },
    {
      decision: 'Facility Expansion vs Equipment Upgrade',
      urgency: 'High',
      deadline: '2024-10-15',
      options: 'Expand space or upgrade equipment',
      recommendation: 'Equipment upgrade (higher ROI)'
    },
    {
      decision: 'New Service Line Launch',
      urgency: 'Medium',
      deadline: '2024-11-30',
      options: 'Nutrition consulting or Wellness spa',
      recommendation: 'Nutrition (aligns with core)'
    }
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <ArrowUp className="h-4 w-4 text-gray-500 rotate-90" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Excellent': return 'bg-green-100 text-green-800';
      case 'Good': return 'bg-blue-100 text-blue-800';
      case 'Fair': return 'bg-yellow-100 text-yellow-800';
      case 'Poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-bios-ui="" className="max-w-7xl sm:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Monitor className="h-6 w-6 text-[#2B7A78]" />
            <span>Executive Dashboard - {getCurrentPeriod()}</span>
          </DialogTitle>
          <DialogDescription>
            Strategic overview and executive insights for informed decision-making
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="strategic">Strategic</TabsTrigger>
            <TabsTrigger value="health">Business Health</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="initiatives">Initiatives</TabsTrigger>
            <TabsTrigger value="decisions">Decisions</TabsTrigger>
          </TabsList>

          {/* Executive Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Business Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">Overall Business Health</p>
                        <p className="text-2xl font-bold text-green-600">{executiveSummary.overallHealth}%</p>
                        <p className="text-sm text-green-600 mt-1">{executiveSummary.healthStatus}</p>
                      </div>
                      <CheckCircle className="h-12 w-12 text-green-600" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Revenue</p>
                        <p className="text-lg font-bold">{formatCurrency(topKPIs.totalRevenue)}</p>
                        <div className="flex items-center mt-1">
                          <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                          <span className="text-xs text-green-600">{formatSignedPercent(live.revenueGrowthRate)}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Net Profit</p>
                        <p className="text-lg font-bold">{formatCurrency(executiveSummary.netProfit)}</p>
                        <div className="flex items-center mt-1">
                          <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                          <span className="text-xs text-green-600">{executiveSummary.profitMargin}% margin</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Active Members</p>
                        <p className="text-lg font-bold">{topKPIs.activeMembers.toLocaleString()}</p>
                        <div className="flex items-center mt-1">
                          <TrendingUp className="h-3 w-3 text-blue-500 mr-1" />
                          <span className="text-xs text-blue-600">{formatSignedPercent(live.memberGrowthRate)} growth</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Retention Rate</p>
                        <p className="text-lg font-bold">{topKPIs.retentionRate}%</p>
                        <div className="flex items-center mt-1">
                          <TrendingUp className="h-3 w-3 text-purple-500 mr-1" />
                          <span className="text-xs text-purple-600">{formatSignedPercent(live.retentionDelta)} vs last month</span>
                        </div>
                      </div>
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
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs">Profit Margin</span>
                        <span className="text-xs font-medium">{executiveSummary.profitMargin}%</span>
                      </div>
                      <Progress value={clampPercent(executiveSummary.profitMargin)} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs">Expense Ratio</span>
                        <span className="text-xs font-medium">{executiveSummary.operatingExpenses}%</span>
                      </div>
                      <Progress value={clampPercent(executiveSummary.operatingExpenses)} className="h-2" />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <SampleDataBadge />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Market Position</span>
                        <Badge className="bg-green-100 text-green-800">{executiveSummary.marketPosition}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Competitive Edge</span>
                        <Badge className="bg-blue-100 text-blue-800">{executiveSummary.competitiveAdvantage}</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue Forecast (Next 4 Months)</CardTitle>
                <CardDescription>Actuals plus a straight-line projection of the average monthly change</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={revenueForecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [compactCurrency(value, live.currencyCode), '']} />
                    <Area type="monotone" dataKey="actual" stroke="#2B7A78" fill="#2B7A78" fillOpacity={0.6} name="Actual" />
                    <Area type="monotone" dataKey="forecast" stroke="#E63946" fill="#E63946" fillOpacity={0.3} name="Forecast" strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Strategic Metrics Tab */}
          <TabsContent value="strategic" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base"><SampleTitle>Strategic Performance Metrics</SampleTitle></CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {strategicMetrics.map((metric, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm">{metric.category}</span>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(metric.status)}>{metric.status}</Badge>
                            <span className="text-sm font-medium">{metric.score}%</span>
                          </div>
                        </div>
                        <Progress value={metric.score} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">Target: {metric.target}%</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base"><SampleTitle>Competitive Position Analysis</SampleTitle></CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <RadarChart data={competitivePosition}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="aspect" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar name="Your Business" dataKey="yours" stroke="#2B7A78" fill="#2B7A78" fillOpacity={0.6} />
                      <Radar name="Competitor Avg" dataKey="competitor" stroke="#E63946" fill="#E63946" fillOpacity={0.3} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Business Health Tab */}
          <TabsContent value="health" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {healthIndicators.map((indicator, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{indicator.indicator}</p>
                        <p className="text-2xl font-bold" style={{ color: indicator.color }}>{indicator.value}%</p>
                      </div>
                      <div className="p-3 rounded-lg" style={{ backgroundColor: indicator.color + '20' }}>
                        {getTrendIcon(indicator.trend)}
                      </div>
                    </div>
                    <Progress value={indicator.value} className="h-2" style={{ backgroundColor: indicator.color + '20' }} />
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Health Score Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={healthIndicators}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="indicator" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2B7A78" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Critical Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {criticalAlerts.length === 0 && (
                <Card>
                  <CardContent className="p-6 flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="text-sm text-muted-foreground">No critical alerts right now — revenue, payments and memberships look healthy.</p>
                  </CardContent>
                </Card>
              )}
              {criticalAlerts.map((alert, index) => (
                <Card key={index} className={alert.type === 'alert' ? 'border-orange-200' : 'border-green-200'}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {alert.type === 'alert' ? (
                          <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                        ) : (
                          <Zap className="h-5 w-5 text-green-600 mt-0.5" />
                        )}
                        <div>
                          <CardTitle className="text-base">{alert.title}</CardTitle>
                          <CardDescription className="mt-1">{alert.description}</CardDescription>
                        </div>
                      </div>
                      <Badge className={alert.priority === 'High' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                        {alert.priority}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Recommended Action</p>
                        <p className="text-sm font-medium">{alert.action}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Financial Impact</p>
                        <p className="text-sm font-medium">{alert.impact}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button size="sm" className="bg-[#2B7A78] hover:bg-[#236663]">
                        Take Action
                      </Button>
                      <Button size="sm" variant="outline">
                        Schedule Review
                      </Button>
                      <Button size="sm" variant="ghost">
                        Dismiss
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Strategic Initiatives Tab */}
          <TabsContent value="initiatives" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base"><SampleTitle>Active Strategic Initiatives</SampleTitle></CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Initiative</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Impact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {strategicInitiatives.map((initiative, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{initiative.initiative}</TableCell>
                        <TableCell>{initiative.owner}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{initiative.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress value={initiative.completion} className="h-2 w-20" />
                            <span className="text-xs">{initiative.completion}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{initiative.deadline}</TableCell>
                        <TableCell>
                          <Badge className={initiative.impact === 'High' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                            {initiative.impact}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {strategicInitiatives.map((initiative, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-sm">{initiative.initiative}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{initiative.completion}%</span>
                      </div>
                      <Progress value={initiative.completion} className="h-2" />
                      <div className="flex justify-between items-center pt-2">
                        <Badge variant="outline">{initiative.status}</Badge>
                        <Button size="sm" variant="ghost">View Details</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Key Decisions Tab */}
          <TabsContent value="decisions" className="space-y-4">
            <div className="flex justify-end">
              <SampleDataBadge />
            </div>
            <div className="grid grid-cols-1 gap-4">
              {decisionsRequired.map((decision, index) => (
                <Card key={index} className="border-blue-200">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <CardTitle className="text-base">{decision.decision}</CardTitle>
                          <div className="flex items-center space-x-4 mt-2">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Deadline: {decision.deadline}</span>
                            </div>
                            <Badge className={decision.urgency === 'High' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                              {decision.urgency} Urgency
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Decision Options</p>
                        <p className="text-sm">{decision.options}</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <ThumbsUp className="h-4 w-4 text-green-600 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-green-800">Recommended</p>
                            <p className="text-sm text-green-700">{decision.recommendation}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" className="bg-[#2B7A78] hover:bg-[#236663]">
                          Approve Recommendation
                        </Button>
                        <Button size="sm" variant="outline">
                          Request Analysis
                        </Button>
                        <Button size="sm" variant="ghost">
                          Schedule Meeting
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
            Export Executive Report
          </Button>
          <Button className="bg-[#E63946] hover:bg-[#d32f3f]" onClick={() => window.print()}>
            <FileText className="h-4 w-4 mr-2" />
            Generate Presentation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
