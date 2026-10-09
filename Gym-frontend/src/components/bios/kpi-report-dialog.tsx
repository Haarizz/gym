import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Separator } from "../ui/separator";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  BarChart3,
  DollarSign,
  Users,
  Award,
  TrendingUp,
  TrendingDown,
  Download,
  FileText,
  CheckCircle,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  TrendingUpDown as TrendingIcon,
  Minus
} from 'lucide-react';
import { type BiosLiveData, formatSignedPercent, clampPercent, compactCurrency } from './bios-live';

interface KPIReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topKPIs: {
    totalRevenue: number;
    activeMembers: number;
    retentionRate: number;
    monthlyGrowth: number;
  };
  performanceMetrics: Array<{
    metric: string;
    current: number;
    target: number;
    trend: string;
    change: number;
  }>;
  revenueBySource: Array<{
    source: string;
    amount: number;
    percentage: number;
    color: string;
  }>;
  revenueData: Array<{
    month: string;
    revenue: number;
    target: number;
  }>;
  membershipData: Array<{
    month: string;
    members: number;
    retention: number;
    churn: number;
  }>;
  memberAnalytics: Array<{
    segment: string;
    count: number;
    engagement: number | null;
    ltv: number | null;
  }>;
  benchmarkData: Array<{
    metric: string;
    value: number;
    industry: number;
    performance: string;
  }>;
  recentReports: Array<{
    report: string;
    type: string;
    generated: string;
    downloads: number;
    status: string;
  }>;
  formatCurrency: (amount: number) => string;
  getCurrentPeriod: () => string;
  live: BiosLiveData;
}

export function KPIReportDialog({
  open,
  onOpenChange,
  topKPIs,
  performanceMetrics,
  revenueBySource,
  revenueData,
  membershipData,
  memberAnalytics,
  benchmarkData,
  recentReports,
  formatCurrency,
  getCurrentPeriod,
  live
}: KPIReportDialogProps) {
  const growthIcon = (value: number | null, color: string) => (value === null || value >= 0)
    ? <TrendingUp className={`h-3 w-3 ${color} mr-1`} />
    : <TrendingDown className="h-3 w-3 text-red-500 mr-1" />;
  const isPercentMetric = (metric: string) =>
    metric.includes('Rate') || metric.includes('Efficiency') || metric.includes('Occupancy') || metric.includes('Utilization');
  const expenseRatio = live.totalRevenue > 0 ? Number(((live.totalExpenses / live.totalRevenue) * 100).toFixed(1)) : 0;
  const benchmarkFor = (name: string) => benchmarkData.find((b) => b.metric === name);
  const revenuePerMemberTarget = benchmarkFor('Revenue per Member')?.industry ?? 0;
  const retentionTarget = benchmarkFor('Member Retention')?.industry ?? 0;
  const thisMonthRevenue = revenueData.length > 0 ? revenueData[revenueData.length - 1].revenue : 0;
  const revenueTargetPct = live.monthlyRevenueTarget && live.monthlyRevenueTarget > 0
    ? Number(((thisMonthRevenue / live.monthlyRevenueTarget) * 100).toFixed(1))
    : null;
  const retentionTargetPct = retentionTarget > 0 ? Number(((topKPIs.retentionRate / retentionTarget) * 100).toFixed(1)) : null;
  const weakestMetric = [...performanceMetrics]
    .filter((m) => m.target > 0)
    .sort((a, b) => a.current / a.target - b.current / b.target)[0];
  const staffMetric = performanceMetrics.find((m) => m.metric === 'Staff Efficiency');
  const revenueUp = live.revenueGrowthRate === null || live.revenueGrowthRate >= 0;
  const keyInsights = [
    {
      ok: revenueUp,
      title: revenueUp ? 'Strong Revenue Growth' : 'Revenue Decline',
      detail: `${formatSignedPercent(live.revenueGrowthRate)} vs last month`
    },
    {
      ok: topKPIs.retentionRate >= retentionTarget,
      title: topKPIs.retentionRate >= retentionTarget ? 'High Member Retention' : 'Retention Below Target',
      detail: `${topKPIs.retentionRate}% retention rate vs your ${retentionTarget}% target`
    },
    ...(weakestMetric ? [{
      ok: weakestMetric.current >= weakestMetric.target,
      title: weakestMetric.metric,
      detail: weakestMetric.current >= weakestMetric.target ? 'On target' : 'Below target, needs attention'
    }] : []),
    ...(staffMetric && staffMetric !== weakestMetric ? [{
      ok: staffMetric.current >= staffMetric.target,
      title: 'Staff Performance',
      detail: `${staffMetric.current >= staffMetric.target ? 'Excellent' : 'Below target'} efficiency at ${staffMetric.current}%`
    }] : [])
  ];
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-bios-ui="" className="max-w-6xl sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-[#2B7A78]" />
            <span>Comprehensive KPI Report - {getCurrentPeriod()}</span>
          </DialogTitle>
          <DialogDescription>
            Detailed performance indicators and business metrics across all operational areas
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(topKPIs.totalRevenue)}</p>
                      <div className="flex items-center mt-1">
                        {growthIcon(live.revenueGrowthRate, 'text-green-500')}
                        <span className="text-xs text-green-600">{formatSignedPercent(live.revenueGrowthRate)}</span>
                      </div>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Members</p>
                      <p className="text-xl font-bold text-blue-600">{topKPIs.activeMembers.toLocaleString()}</p>
                      <div className="flex items-center mt-1">
                        {growthIcon(live.memberGrowthRate, 'text-blue-500')}
                        <span className="text-xs text-blue-600">{formatSignedPercent(live.memberGrowthRate)}</span>
                      </div>
                    </div>
                    <Users className="h-8 w-8 text-blue-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Retention</p>
                      <p className="text-xl font-bold text-purple-600">{topKPIs.retentionRate}%</p>
                      <div className="flex items-center mt-1">
                        {growthIcon(live.retentionDelta, 'text-purple-500')}
                        <span className="text-xs text-purple-600">{formatSignedPercent(live.retentionDelta)}</span>
                      </div>
                    </div>
                    <Award className="h-8 w-8 text-purple-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Growth</p>
                      <p className="text-xl font-bold text-orange-600">{formatSignedPercent(live.revenueGrowthRate)}</p>
                      <div className="flex items-center mt-1">
                        {growthIcon(live.revenueGrowthRate, 'text-orange-500')}
                        <span className="text-xs text-orange-600">{live.overallHealthLabel}</span>
                      </div>
                    </div>
                    <TrendingIcon className="h-8 w-8 text-orange-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Performance Metrics</CardTitle>
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
                              {metric.current}{isPercentMetric(metric.metric) ? '%' : ''}{' '}
                              <span className="text-xs text-muted-foreground">/ {metric.target}{isPercentMetric(metric.metric) ? '%' : ''}</span>
                            </span>
                          </div>
                        </div>
                        <Progress value={metric.target > 0 ? clampPercent((metric.current / metric.target) * 100) : 0} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Revenue by Source</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {revenueBySource.map((source, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm">{source.source}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{formatCurrency(source.amount)}</span>
                            <Badge variant="outline" className="text-xs">{source.percentage}%</Badge>
                          </div>
                        </div>
                        <Progress value={source.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenueBySource.map((source, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{source.source}</TableCell>
                        <TableCell className="text-right">{formatCurrency(source.amount)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{source.percentage}%</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {/* Per-source history isn't tracked, so there is no change figure to show. */}
                          <span className="text-muted-foreground">—</span>
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
                  <CardTitle className="text-base">Monthly Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => [compactCurrency(value, live.currencyCode), '']} />
                      <Bar dataKey="revenue" fill="#2B7A78" />
                      <Bar dataKey="target" fill="#E63946" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Financial Health Indicators</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">Profit Margin</span>
                        <span className="text-sm font-medium">{live.profitMargin.toFixed(1)}%</span>
                      </div>
                      <Progress value={clampPercent(live.profitMargin)} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">Net Income</span>
                        <span className="text-sm font-medium">{formatCurrency(live.netIncome)}</span>
                      </div>
                      <Progress value={live.totalRevenue > 0 ? clampPercent((live.netIncome / live.totalRevenue) * 100) : 0} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">Expense Ratio</span>
                        <span className="text-sm font-medium">{expenseRatio}%</span>
                      </div>
                      <Progress value={clampPercent(expenseRatio)} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">Revenue per Member</span>
                        <span className="text-sm font-medium">{formatCurrency(live.revenuePerMember)}</span>
                      </div>
                      <Progress value={revenuePerMemberTarget > 0 ? clampPercent((live.revenuePerMember / revenuePerMemberTarget) * 100) : 0} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Member Segmentation</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Segment</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Engagement</TableHead>
                      <TableHead className="text-right">LTV ({live.currencyCode})</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberAnalytics.map((segment, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{segment.segment}</TableCell>
                        <TableCell className="text-right">{segment.count}</TableCell>
                        <TableCell className="text-right">
                          {segment.engagement === null ? <span className="text-muted-foreground">—</span> : (
                            <Badge variant={segment.engagement > 80 ? 'default' : 'outline'}>
                              {segment.engagement}%
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{segment.ltv === null ? '—' : segment.ltv.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Member Growth Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={membershipData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="members" stroke="#2B7A78" fill="#2B7A78" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Retention & Churn</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={membershipData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="retention" stroke="#10b981" strokeWidth={2} name="Retention %" />
                      <Line type="monotone" dataKey="churn" stroke="#E63946" strokeWidth={2} name="Churn %" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Operations Tab */}
          <TabsContent value="operations" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Operational Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {performanceMetrics.map((metric, index) => (
                      <div key={metric.metric} className="flex justify-between items-center">
                        <span className="text-sm">{metric.metric}</span>
                        <Badge className={['bg-green-100 text-green-800', 'bg-blue-100 text-blue-800', 'bg-purple-100 text-purple-800', 'bg-orange-100 text-orange-800'][index % 4]}>
                          {metric.current}{isPercentMetric(metric.metric) ? '%' : ' today'}
                        </Badge>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Overall Operational Score</span>
                      <Badge className="bg-[#2B7A78] text-white">{live.performanceScore}%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentReports.length === 0 && (
                      <p className="text-sm text-muted-foreground">No reports generated yet.</p>
                    )}
                    {recentReports.map((report, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <p className="text-sm font-medium">{report.report}</p>
                          <p className="text-xs text-muted-foreground">{report.type} • {report.generated}</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={live.onExportReport} title="Download a fresh copy">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Benchmarking vs Your Targets</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">Your Value</TableHead>
                      <TableHead className="text-right">Your Target</TableHead>
                      <TableHead className="text-right">Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {benchmarkData.map((benchmark, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{benchmark.metric}</TableCell>
                        <TableCell className="text-right">
                          {benchmark.metric.includes('Revenue') ? formatCurrency(benchmark.value) : `${benchmark.value}%`}
                        </TableCell>
                        <TableCell className="text-right">
                          {benchmark.metric.includes('Revenue') ? formatCurrency(benchmark.industry) : `${benchmark.industry}%`}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant={benchmark.performance === 'above' ? 'default' : 'destructive'}
                            className={benchmark.performance === 'above' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                          >
                            {benchmark.performance === 'above' ? (
                              <><ArrowUp className="h-3 w-3 inline mr-1" />Above</>
                            ) : (
                              <><ArrowDown className="h-3 w-3 inline mr-1" />Below</>
                            )}
                          </Badge>
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
                  <CardTitle className="text-base">Goal Achievement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">Revenue Target</span>
                        <span className="text-sm font-medium">{revenueTargetPct === null ? '—' : `${revenueTargetPct}%`}</span>
                      </div>
                      <Progress value={clampPercent(revenueTargetPct ?? 0)} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {live.monthlyRevenueTarget == null
                          ? 'No monthly revenue target set (BiOS Configuration)'
                          : thisMonthRevenue >= live.monthlyRevenueTarget
                            ? `Exceeded by ${formatCurrency(thisMonthRevenue - live.monthlyRevenueTarget)}`
                            : `${formatCurrency(live.monthlyRevenueTarget - thisMonthRevenue)} to go`}
                      </p>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">Member Growth</span>
                        <span className="text-sm font-medium">{formatSignedPercent(live.memberGrowthRate)}</span>
                      </div>
                      <Progress value={clampPercent(50 + (live.memberGrowthRate ?? 50))} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">{live.recentJoins} joined this month</p>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">Retention Target</span>
                        <span className="text-sm font-medium">{retentionTargetPct === null ? '—' : `${retentionTargetPct}%`}</span>
                      </div>
                      <Progress value={clampPercent(retentionTargetPct ?? 0)} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {retentionTargetPct === null ? 'No retention target set' : retentionTargetPct >= 100 ? 'Achieved' : retentionTargetPct >= 95 ? 'Nearly achieved' : 'Below target'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Key Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {keyInsights.map((insight) => (
                      <div key={insight.title} className="flex items-start space-x-2">
                        {insight.ok ? (
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{insight.title}</p>
                          <p className="text-xs text-muted-foreground">{insight.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
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
            Print Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
