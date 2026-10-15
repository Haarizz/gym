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
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart } from 'recharts';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Download,
  FileText,
  Eye,
  Filter,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
  Award,
  CheckCircle,
  AlertTriangle,
  Star,
  Building2,
  Globe,
  Users,
  DollarSign,
  Activity,
  BarChart3,
  PieChart,
  Zap,
  ThumbsUp,
  TrendingUpDown,
  Crown,
  Medal,
  Trophy,
  Shield,
  Flag,
  MapPin
} from 'lucide-react';
import { type BiosLiveData, NoData } from './bios-live';

interface BenchmarkingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: string;
  benchmarkData: Array<{
    metric: string;
    value: number;
    industry: number;
    performance: string;
  }>;
  formatCurrency: (amount: number) => string;
  getCurrentPeriod: () => string;
  live: BiosLiveData;
}

export function BenchmarkingDialog({
  open,
  onOpenChange,
  defaultTab = 'industry',
  benchmarkData,
  formatCurrency,
  getCurrentPeriod,
  live
}: BenchmarkingDialogProps) {

  // Your metrics against the comparison targets you set in BiOS Configuration.
  // GymBios has no external industry data feed, so quartiles/percentiles aren't available.
  const industryBenchmarks = benchmarkData.map((b) => ({
    metric: b.metric,
    yourValue: b.value,
    industryAvg: b.industry,
    topQuartile: null as number | null,
    bottomQuartile: null as number | null,
    unit: b.metric.includes('Revenue') ? 'currency' : '%',
    performance: b.performance,
    percentile: null as number | null,
    trend: b.performance === 'above' ? 'up' : b.performance === 'below' ? 'down' : 'stable'
  }));
  const formatBenchmarkValue = (value: number | null, unit: string) =>
    value === null ? '—' : unit === 'currency' ? formatCurrency(value) : `${value}${unit}`;
  const aboveCount = industryBenchmarks.filter((b) => b.performance === 'above').length;
  const belowCount = industryBenchmarks.filter((b) => b.performance === 'below').length;
  const overallAbove = aboveCount >= Math.ceil(industryBenchmarks.length / 2);

  // Strengths / weaknesses — your metrics above or below the targets you set.
  const describeGap = (b: typeof industryBenchmarks[number]) => {
    const gap = b.industryAvg !== 0 ? ((b.yourValue - b.industryAvg) / Math.abs(b.industryAvg)) * 100 : 0;
    return `${gap >= 0 ? '+' : ''}${gap.toFixed(1)}%`;
  };
  const strengths = industryBenchmarks.filter((b) => b.performance === 'above' || b.performance === 'equal');
  const weaknesses = industryBenchmarks.filter((b) => b.performance === 'below');

  // Branch rankings — the real per-branch snapshot (only returned in All Branches mode).
  const branchRankings = [...live.branchComparison].sort((a, b) => b.month_revenue - a.month_revenue);

  // Comparison Radar Data — each metric as a % of your target (target = 100).
  const RADAR_LABELS: Record<string, string> = {
    'Revenue per Member': 'Revenue',
    'Member Retention': 'Retention',
    'Class Utilization': 'Utilization',
    'Staff Efficiency': 'Efficiency',
    'Operating Margin': 'Margin'
  };
  const radarComparisonData = benchmarkData.map((b) => ({
    metric: RADAR_LABELS[b.metric] ?? b.metric,
    you: b.industry > 0 ? Math.min(150, Math.round((b.value / b.industry) * 100)) : 0,
    industry: 100
  }));

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case 'above':
        return 'text-green-600';
      case 'below':
        return 'text-red-600';
      case 'equal':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPerformanceBadge = (performance: string) => {
    switch (performance) {
      case 'above':
        return 'bg-green-100 text-green-800';
      case 'below':
        return 'bg-red-100 text-red-800';
      case 'equal':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-700" />;
    return <Flag className="h-5 w-5 text-gray-400" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-bios-ui="" className="max-w-7xl sm:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Target className="h-6 w-6 text-[#2B7A78]" />
            <span>Benchmarking - {getCurrentPeriod()}</span>
          </DialogTitle>
          <DialogDescription>
            Compare your performance against the targets you set in BiOS Configuration, and across your branches
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="industry">Targets</TabsTrigger>
            <TabsTrigger value="rankings">Branches</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          {/* Industry Benchmarks Tab */}
          <TabsContent value="industry" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Overall Performance</p>
                      <p className={`text-2xl font-bold ${overallAbove ? 'text-green-600' : 'text-orange-600'}`}>{overallAbove ? 'Above Target' : 'Needs Review'}</p>
                      <div className="flex items-center mt-1">
                        <Award className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-xs text-green-600">vs your BiOS targets</span>
                      </div>
                    </div>
                    <Trophy className="h-10 w-10 text-green-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Metrics Above Target</p>
                      <p className="text-2xl font-bold text-blue-600">{aboveCount} of {industryBenchmarks.length}</p>
                      <div className="flex items-center mt-1">
                        <CheckCircle className="h-4 w-4 text-blue-500 mr-1" />
                        <span className="text-xs text-blue-600">
                          {industryBenchmarks.length > 0 ? ((aboveCount / industryBenchmarks.length) * 100).toFixed(1) : '0.0'}% success rate
                        </span>
                      </div>
                    </div>
                    <CheckCircle className="h-10 w-10 text-blue-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Areas for Improvement</p>
                      <p className="text-2xl font-bold text-orange-600">{belowCount}</p>
                      <div className="flex items-center mt-1">
                        <AlertTriangle className="h-4 w-4 text-orange-500 mr-1" />
                        <span className="text-xs text-orange-600">{belowCount > 0 ? 'Focus needed' : 'All on target'}</span>
                      </div>
                    </div>
                    <AlertTriangle className="h-10 w-10 text-orange-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span>Benchmark Comparison</span>
                  <Button size="sm" variant="outline" onClick={live.onConfigure}>Set Targets</Button>
                </CardTitle>
                <CardDescription>Your performance vs. the comparison targets you set in BiOS Configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">Your Value</TableHead>
                      <TableHead className="text-right">Your Target</TableHead>
                      <TableHead className="text-right">Top 25%</TableHead>
                      <TableHead className="text-center">Performance</TableHead>
                      <TableHead className="text-center">Percentile</TableHead>
                      <TableHead className="text-center">Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {industryBenchmarks.map((benchmark, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{benchmark.metric}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatBenchmarkValue(benchmark.yourValue, benchmark.unit)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatBenchmarkValue(benchmark.industryAvg, benchmark.unit)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatBenchmarkValue(benchmark.topQuartile, benchmark.unit)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={getPerformanceBadge(benchmark.performance)}>
                            {benchmark.performance === 'above' ? (
                              <ArrowUp className="h-3 w-3 mr-1" />
                            ) : benchmark.performance === 'below' ? (
                              <ArrowDown className="h-3 w-3 mr-1" />
                            ) : null}
                            {benchmark.performance === 'above' ? 'Above' : benchmark.performance === 'below' ? 'Below' : 'On Target'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {benchmark.percentile === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className={`font-medium ${benchmark.percentile >= 70 ? 'text-green-600' : benchmark.percentile >= 50 ? 'text-blue-600' : 'text-orange-600'}`}>
                              {benchmark.percentile}th
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {getTrendIcon(benchmark.trend)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance Radar Comparison</CardTitle>
                <CardDescription>Each metric as a percentage of your target (target = 100)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={radarComparisonData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis angle={90} domain={[0, 150]} />
                    <Radar name="Your Gym" dataKey="you" stroke="#0F766E" fill="#0F766E" fillOpacity={0.6} />
                    <Radar name="Your Target" dataKey="industry" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branch Rankings Tab */}
          <TabsContent value="rankings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Branch Rankings</CardTitle>
                <CardDescription>Ranked by this month's revenue</CardDescription>
              </CardHeader>
              <CardContent>
                {branchRankings.length === 0 && (
                  <NoData>Switch to All Branches (with two or more branches) to compare them here.</NoData>
                )}
                {branchRankings.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead className="text-right">Revenue (month)</TableHead>
                        <TableHead className="text-right">Active Members</TableHead>
                        <TableHead className="text-right">Retention</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branchRankings.map((branch, index) => (
                        <TableRow key={branch.branch_id}>
                          <TableCell className="font-medium">#{index + 1}</TableCell>
                          <TableCell>{branch.branch_name}</TableCell>
                          <TableCell className="text-right">{formatCurrency(branch.month_revenue)}</TableCell>
                          <TableCell className="text-right">{branch.active_members} of {branch.total_members}</TableCell>
                          <TableCell className="text-right">{branch.retention_percent}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center space-x-2">
                    <ThumbsUp className="h-5 w-5 text-green-600" />
                    <span>Key Strengths</span>
                  </CardTitle>
                  <CardDescription>Metrics at or above your targets</CardDescription>
                </CardHeader>
                <CardContent>
                  {strengths.length === 0 && <NoData>No metrics are at target yet.</NoData>}
                  <div className="space-y-3">
                    {strengths.map((strength) => (
                      <div key={strength.metric} className="border rounded-lg p-3 flex justify-between items-start">
                        <div>
                          <p className="font-medium">{strength.metric}</p>
                          <p className="text-sm text-muted-foreground">
                            You: {formatBenchmarkValue(strength.yourValue, strength.unit)} vs target {formatBenchmarkValue(strength.industryAvg, strength.unit)}
                          </p>
                        </div>
                        <Badge className="bg-green-100 text-green-800">{describeGap(strength)}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <span>Areas for Improvement</span>
                  </CardTitle>
                  <CardDescription>Metrics below your targets</CardDescription>
                </CardHeader>
                <CardContent>
                  {weaknesses.length === 0 && <NoData>Every metric is at or above target.</NoData>}
                  <div className="space-y-3">
                    {weaknesses.map((weakness) => (
                      <div key={weakness.metric} className="border rounded-lg p-3 flex justify-between items-start">
                        <div>
                          <p className="font-medium">{weakness.metric}</p>
                          <p className="text-sm text-muted-foreground">
                            You: {formatBenchmarkValue(weakness.yourValue, weakness.unit)} vs target {formatBenchmarkValue(weakness.industryAvg, weakness.unit)}
                          </p>
                        </div>
                        <Badge className="bg-orange-100 text-orange-800">{describeGap(weakness)}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            <Button variant="outline" size="sm" onClick={live.onConfigure}>Adjust targets</Button>
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
            Generate PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
