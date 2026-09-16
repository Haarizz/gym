import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Separator } from "./ui/separator";
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
    engagement: number;
    ltv: number;
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
  getCurrentPeriod
}: KPIReportDialogProps) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
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
                        <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                        <span className="text-xs text-green-600">+{topKPIs.monthlyGrowth}%</span>
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
                      <p className="text-xl font-bold text-blue-600">{topKPIs.activeMembers}</p>
                      <div className="flex items-center mt-1">
                        <TrendingUp className="h-3 w-3 text-blue-500 mr-1" />
                        <span className="text-xs text-blue-600">+8.7%</span>
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
                        <TrendingUp className="h-3 w-3 text-purple-500 mr-1" />
                        <span className="text-xs text-purple-600">+2.1%</span>
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
                      <p className="text-xl font-bold text-orange-600">+{topKPIs.monthlyGrowth}%</p>
                      <div className="flex items-center mt-1">
                        <TrendingUp className="h-3 w-3 text-orange-500 mr-1" />
                        <span className="text-xs text-orange-600">Excellent</span>
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
                              {metric.current}{metric.metric.includes('Rate') || metric.metric.includes('Efficiency') || metric.metric.includes('Occupancy') || metric.metric.includes('Utilization') ? '%' : ''} 
                              <span className="text-xs text-muted-foreground">/ {metric.target}{metric.metric.includes('Rate') || metric.metric.includes('Efficiency') || metric.metric.includes('Occupancy') || metric.metric.includes('Utilization') ? '%' : ''}</span>
                            </span>
                          </div>
                        </div>
                        <Progress value={(metric.current / metric.target) * 100} className="h-2" />
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
                          <div className="flex items-center justify-end">
                            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                            <span className="text-green-600">+{(Math.random() * 10 + 2).toFixed(1)}%</span>
                          </div>
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
                      <Tooltip formatter={(value: any) => [`${(value/1000).toFixed(0)}K AED`, '']} />
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
                        <span className="text-sm font-medium">23.8%</span>
                      </div>
                      <Progress value={23.8} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">Cash Flow Health</span>
                        <span className="text-sm font-medium">92%</span>
                      </div>
                      <Progress value={92} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">Expense Ratio</span>
                        <span className="text-sm font-medium">76.2%</span>
                      </div>
                      <Progress value={76.2} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">Revenue per Member</span>
                        <span className="text-sm font-medium">148.5 AED</span>
                      </div>
                      <Progress value={85} className="h-2" />
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
                      <TableHead className="text-right">LTV (AED)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberAnalytics.map((segment, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{segment.segment}</TableCell>
                        <TableCell className="text-right">{segment.count}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={segment.engagement > 80 ? 'default' : 'outline'}>
                            {segment.engagement}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{segment.ltv.toLocaleString()}</TableCell>
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
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Daily Check-ins</span>
                      <Badge className="bg-green-100 text-green-800">245 avg</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Class Occupancy</span>
                      <Badge className="bg-blue-100 text-blue-800">78%</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Equipment Utilization</span>
                      <Badge className="bg-orange-100 text-orange-800">67%</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Staff Efficiency</span>
                      <Badge className="bg-purple-100 text-purple-800">92%</Badge>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Overall Operational Score</span>
                      <Badge className="bg-[#2B7A78] text-white">82%</Badge>
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
                    {recentReports.map((report, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <p className="text-sm font-medium">{report.report}</p>
                          <p className="text-xs text-muted-foreground">{report.type} • {report.generated}</p>
                        </div>
                        <Button size="sm" variant="ghost">
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
                <CardTitle className="text-base">Industry Benchmarking</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">Your Value</TableHead>
                      <TableHead className="text-right">Industry Avg</TableHead>
                      <TableHead className="text-right">Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {benchmarkData.map((benchmark, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{benchmark.metric}</TableCell>
                        <TableCell className="text-right">
                          {benchmark.value}{benchmark.metric.includes('Revenue') ? ' AED' : '%'}
                        </TableCell>
                        <TableCell className="text-right">
                          {benchmark.industry}{benchmark.metric.includes('Revenue') ? ' AED' : '%'}
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
                        <span className="text-sm font-medium">104.8%</span>
                      </div>
                      <Progress value={104.8} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">Exceeded by 5,750 AED</p>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">Member Growth Target</span>
                        <span className="text-sm font-medium">108.7%</span>
                      </div>
                      <Progress value={108.7} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">Exceeded by 47 members</p>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">Retention Target</span>
                        <span className="text-sm font-medium">99.4%</span>
                      </div>
                      <Progress value={99.4} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">Nearly achieved</p>
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
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Strong Revenue Growth</p>
                        <p className="text-xs text-muted-foreground">12.3% above target this month</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">High Member Retention</p>
                        <p className="text-xs text-muted-foreground">89.5% retention rate, industry-leading</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Equipment Utilization</p>
                        <p className="text-xs text-muted-foreground">Below target, needs attention</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Staff Performance</p>
                        <p className="text-xs text-muted-foreground">Excellent efficiency at 92%</p>
                      </div>
                    </div>
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
          <Button className="bg-[#2B7A78] hover:bg-[#236663]">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button className="bg-[#E63946] hover:bg-[#d32f3f]">
            <FileText className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
