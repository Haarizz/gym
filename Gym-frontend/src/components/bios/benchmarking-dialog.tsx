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
import { type BiosLiveData, SampleDataBadge } from './bios-live';

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
  const [selectedRegion, setSelectedRegion] = React.useState('uae');
  const [selectedSize, setSelectedSize] = React.useState('medium');

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

  // Competitor Analysis
  const competitors = [
    {
      name: 'Fitness First',
      location: 'Dubai',
      members: 1200,
      revenue: 185000,
      retention: 84.5,
      nps: 58,
      facilities: 'Excellent',
      pricing: 'Premium',
      marketShare: 18.5
    },
    {
      name: 'Gold\'s Gym',
      location: 'Dubai',
      members: 950,
      revenue: 142000,
      retention: 81.2,
      nps: 55,
      facilities: 'Good',
      pricing: 'High',
      marketShare: 14.2
    },
    {
      name: 'Your Gym',
      location: 'Dubai',
      members: 847,
      revenue: 125750,
      retention: 89.5,
      nps: 62,
      facilities: 'Excellent',
      pricing: 'Medium',
      marketShare: 12.6
    },
    {
      name: 'Gymbox',
      location: 'Dubai',
      members: 780,
      revenue: 115200,
      retention: 86.8,
      nps: 60,
      facilities: 'Very Good',
      pricing: 'Medium-High',
      marketShare: 11.6
    },
    {
      name: 'Warehouse Gym',
      location: 'Dubai',
      members: 650,
      revenue: 89500,
      retention: 79.3,
      nps: 52,
      facilities: 'Good',
      pricing: 'Low',
      marketShare: 9.7
    }
  ];

  // Regional Comparison
  const regionalData = [
    {
      region: 'UAE (National)',
      avgRevenue: 135200,
      avgMembers: 823,
      avgRetention: 82.1,
      avgNPS: 54,
      gymsCount: 245
    },
    {
      region: 'Dubai',
      avgRevenue: 148500,
      avgMembers: 892,
      avgRetention: 84.6,
      avgNPS: 57,
      gymsCount: 98
    },
    {
      region: 'Abu Dhabi',
      avgRevenue: 142800,
      avgMembers: 856,
      avgRetention: 83.2,
      avgNPS: 56,
      gymsCount: 67
    },
    {
      region: 'Sharjah',
      avgRevenue: 118900,
      avgMembers: 745,
      avgRetention: 80.5,
      avgNPS: 52,
      gymsCount: 45
    },
    {
      region: 'Northern Emirates',
      avgRevenue: 95600,
      avgMembers: 628,
      avgRetention: 78.9,
      avgNPS: 50,
      gymsCount: 35
    }
  ];

  // Performance Rankings
  const performanceRankings = [
    {
      category: 'Overall Performance',
      yourRank: 3,
      totalCompetitors: 15,
      percentile: 80,
      badge: 'Top 20%'
    },
    {
      category: 'Member Retention',
      yourRank: 1,
      totalCompetitors: 15,
      percentile: 93,
      badge: 'Top 10%'
    },
    {
      category: 'Revenue Growth',
      yourRank: 4,
      totalCompetitors: 15,
      percentile: 73,
      badge: 'Top 25%'
    },
    {
      category: 'Member Satisfaction',
      yourRank: 2,
      totalCompetitors: 15,
      percentile: 87,
      badge: 'Top 15%'
    },
    {
      category: 'Operational Efficiency',
      yourRank: 5,
      totalCompetitors: 15,
      percentile: 67,
      badge: 'Top 35%'
    },
    {
      category: 'Digital Engagement',
      yourRank: 6,
      totalCompetitors: 15,
      percentile: 60,
      badge: 'Top 40%'
    }
  ];

  // Key Strengths and Weaknesses
  const strengths = [
    {
      area: 'Member Retention',
      score: 89.5,
      benchmark: 82.1,
      advantage: '+9%',
      impact: 'High'
    },
    {
      area: 'Member Satisfaction (NPS)',
      score: 62,
      benchmark: 54,
      advantage: '+14.8%',
      impact: 'High'
    },
    {
      area: 'Revenue per Member',
      score: 148.5,
      benchmark: 135.2,
      advantage: '+9.8%',
      impact: 'Medium'
    },
    {
      area: 'Staff Efficiency',
      score: 92.1,
      benchmark: 88.5,
      advantage: '+4.1%',
      impact: 'Medium'
    }
  ];

  const weaknesses = [
    {
      area: 'Operating Margin',
      score: 23.8,
      benchmark: 26.4,
      gap: '-9.8%',
      impact: 'High'
    },
    {
      area: 'Digital Marketing ROI',
      score: 3.2,
      benchmark: 4.1,
      gap: '-22%',
      impact: 'Medium'
    },
    {
      area: 'Member Referral Rate',
      score: 18.5,
      benchmark: 22.3,
      gap: '-17%',
      impact: 'Medium'
    }
  ];

  // Growth Opportunities
  const opportunities = [
    {
      opportunity: 'Improve Operating Margin',
      currentGap: -2.6,
      potentialGain: formatCurrency(32850),
      difficulty: 'Medium',
      timeframe: '6-12 months',
      priority: 'High'
    },
    {
      opportunity: 'Increase Referral Rate',
      currentGap: -3.8,
      potentialGain: '42 new members/month',
      difficulty: 'Low',
      timeframe: '3-6 months',
      priority: 'High'
    },
    {
      opportunity: 'Expand Premium Segment',
      currentGap: -5.2,
      potentialGain: formatCurrency(28500),
      difficulty: 'Medium',
      timeframe: '6-9 months',
      priority: 'Medium'
    },
    {
      opportunity: 'Improve Class Utilization',
      currentGap: -7.4,
      potentialGain: formatCurrency(15200),
      difficulty: 'Low',
      timeframe: '2-4 months',
      priority: 'Medium'
    }
  ];

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

  // Trend Analysis
  const trendAnalysis = [
    { month: 'Jan', yourPerformance: 65, industryAvg: 68 },
    { month: 'Feb', yourPerformance: 68, industryAvg: 69 },
    { month: 'Mar', yourPerformance: 72, industryAvg: 70 },
    { month: 'Apr', yourPerformance: 74, industryAvg: 71 },
    { month: 'May', yourPerformance: 77, industryAvg: 72 },
    { month: 'Jun', yourPerformance: 80, industryAvg: 73 }
  ];

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
            <span>Benchmarking & Competitive Analysis - {getCurrentPeriod()}</span>
          </DialogTitle>
          <DialogDescription>
            Compare your performance against the targets you set and against competitors
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="industry">Industry</TabsTrigger>
            <TabsTrigger value="competitors">Competitors</TabsTrigger>
            <TabsTrigger value="regional">Regional</TabsTrigger>
            <TabsTrigger value="rankings">Rankings</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
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
                    <Radar name="Your Gym" dataKey="you" stroke="#2B7A78" fill="#2B7A78" fillOpacity={0.6} />
                    <Radar name="Your Target" dataKey="industry" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Competitors Tab */}
          <TabsContent value="competitors" className="space-y-4">
            <div className="flex justify-end">
              <SampleDataBadge />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Competitive Landscape</CardTitle>
                <CardDescription>Top 5 competitors in your market</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Competitor</TableHead>
                      <TableHead className="text-right">Members</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Retention</TableHead>
                      <TableHead className="text-right">NPS</TableHead>
                      <TableHead>Facilities</TableHead>
                      <TableHead>Pricing</TableHead>
                      <TableHead className="text-right">Market Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {competitors.map((competitor, index) => (
                      <TableRow key={index} className={competitor.name === 'Your Gym' ? 'bg-blue-50' : ''}>
                        <TableCell>
                          <div className="flex items-center">
                            {getRankIcon(index + 1)}
                            <span className="ml-2 font-medium">#{index + 1}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {competitor.name}
                          {competitor.name === 'Your Gym' && (
                            <Badge className="ml-2 bg-blue-100 text-blue-800">You</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{competitor.members}</TableCell>
                        <TableCell className="text-right">{formatCurrency(competitor.revenue)}</TableCell>
                        <TableCell className="text-right">{competitor.retention}%</TableCell>
                        <TableCell className="text-right">{competitor.nps}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{competitor.facilities}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{competitor.pricing}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{competitor.marketShare}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Competitive Position</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Market Position</span>
                        <span className="text-sm font-medium text-blue-600">#3 of 15</span>
                      </div>
                      <Progress value={80} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">Top 20% in your market</p>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Retention Leadership</span>
                        <span className="text-sm font-medium text-green-600">#1 of 15</span>
                      </div>
                      <Progress value={100} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">Best retention rate in market</p>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Member Satisfaction</span>
                        <span className="text-sm font-medium text-green-600">#2 of 15</span>
                      </div>
                      <Progress value={93} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">Second highest NPS score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Competitive Advantages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2 p-3 bg-green-50 rounded">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-900">Best Member Retention</p>
                        <p className="text-xs text-green-700">89.5% retention rate, 7.4 points above average</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 p-3 bg-green-50 rounded">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-900">Highest Member Satisfaction</p>
                        <p className="text-xs text-green-700">NPS of 62, significantly above market average</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded">
                      <Star className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Excellent Facilities</p>
                        <p className="text-xs text-blue-700">Top-rated equipment and amenities</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Regional Tab */}
          <TabsContent value="regional" className="space-y-4">
            <div className="flex justify-end">
              <SampleDataBadge />
            </div>
            <div className="flex items-center space-x-3 mb-4">
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uae">UAE (All)</SelectItem>
                  <SelectItem value="dubai">Dubai</SelectItem>
                  <SelectItem value="abudhabi">Abu Dhabi</SelectItem>
                  <SelectItem value="sharjah">Sharjah</SelectItem>
                  <SelectItem value="northern">Northern Emirates</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Regional Performance Comparison</CardTitle>
                <CardDescription>Compare your metrics across UAE regions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Region</TableHead>
                      <TableHead className="text-right">Avg Revenue</TableHead>
                      <TableHead className="text-right">Avg Members</TableHead>
                      <TableHead className="text-right">Avg Retention</TableHead>
                      <TableHead className="text-right">Avg NPS</TableHead>
                      <TableHead className="text-right">Gyms Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regionalData.map((region, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                            {region.region}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(region.avgRevenue)}</TableCell>
                        <TableCell className="text-right">{region.avgMembers}</TableCell>
                        <TableCell className="text-right">{region.avgRetention}%</TableCell>
                        <TableCell className="text-right">{region.avgNPS}</TableCell>
                        <TableCell className="text-right">{region.gymsCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Your Regional Position</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <MapPin className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Your Location</p>
                      <p className="text-xl font-bold">Dubai</p>
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">vs Dubai Average Revenue</span>
                        <Badge className="bg-red-100 text-red-800">-15.3%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">vs Dubai Average Members</span>
                        <Badge className="bg-red-100 text-red-800">-5.0%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">vs Dubai Average Retention</span>
                        <Badge className="bg-green-100 text-green-800">+5.8%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">vs Dubai Average NPS</span>
                        <Badge className="bg-green-100 text-green-800">+8.8%</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Regional Revenue Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={regionalData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="region" angle={-15} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Bar dataKey="avgRevenue" fill="#3b82f6" name="Avg Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Rankings Tab */}
          <TabsContent value="rankings" className="space-y-4">
            <div className="flex justify-end">
              <SampleDataBadge />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Overall Rank</p>
                    <p className="text-3xl font-bold">#3</p>
                    <p className="text-xs text-muted-foreground mt-1">of 15 competitors</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <Crown className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Best Performance</p>
                    <p className="text-3xl font-bold">#1</p>
                    <p className="text-xs text-muted-foreground mt-1">Member Retention</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <Award className="h-12 w-12 text-blue-500 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Top Percentile</p>
                    <p className="text-3xl font-bold">80th</p>
                    <p className="text-xs text-muted-foreground mt-1">Overall performance</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance Rankings by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceRankings.map((ranking, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          {getRankIcon(ranking.yourRank)}
                          <div>
                            <p className="font-medium">{ranking.category}</p>
                            <p className="text-sm text-muted-foreground">
                              Rank #{ranking.yourRank} of {ranking.totalCompetitors}
                            </p>
                          </div>
                        </div>
                        <Badge className={
                          ranking.percentile >= 85 ? 'bg-green-100 text-green-800' :
                          ranking.percentile >= 70 ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {ranking.badge}
                        </Badge>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Percentile</span>
                          <span>{ranking.percentile}th</span>
                        </div>
                        <Progress value={ranking.percentile} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            <div className="flex justify-end">
              <SampleDataBadge />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center space-x-2">
                    <ThumbsUp className="h-5 w-5 text-green-600" />
                    <span>Key Strengths</span>
                  </CardTitle>
                  <CardDescription>Areas where you excel vs industry</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {strengths.map((strength, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{strength.area}</p>
                            <p className="text-sm text-muted-foreground">
                              Your Score: {strength.score} vs Benchmark: {strength.benchmark}
                            </p>
                          </div>
                          <Badge className="bg-green-100 text-green-800">
                            {strength.advantage}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Impact: {strength.impact}</span>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
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
                  <CardDescription>Metrics below industry average</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {weaknesses.map((weakness, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{weakness.area}</p>
                            <p className="text-sm text-muted-foreground">
                              Your Score: {weakness.score} vs Benchmark: {weakness.benchmark}
                            </p>
                          </div>
                          <Badge className="bg-red-100 text-red-800">
                            {weakness.gap}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Impact: {weakness.impact}</span>
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance Trend Analysis</CardTitle>
                <CardDescription>Your improvement trajectory vs industry</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[60, 85]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="yourPerformance" stroke="#2B7A78" strokeWidth={3} name="Your Performance" />
                    <Line type="monotone" dataKey="industryAvg" stroke="#6b7280" strokeWidth={2} strokeDasharray="5 5" name="Industry Average" />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-4 p-3 bg-green-50 rounded">
                  <div className="flex items-start space-x-2">
                    <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Positive Trend</p>
                      <p className="text-xs text-green-700">Your performance has improved by 23% over 6 months, outpacing industry growth by 16 points</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Opportunities Tab */}
          <TabsContent value="opportunities" className="space-y-4">
            <div className="flex justify-end">
              <SampleDataBadge />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Growth Opportunities</CardTitle>
                <CardDescription>Actionable improvements to close gaps with industry leaders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {opportunities.map((opp, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Zap className="h-5 w-5 text-orange-500" />
                            <h4 className="font-semibold">{opp.opportunity}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Current gap: {Math.abs(opp.currentGap)} points below industry leaders
                          </p>
                        </div>
                        <Badge className={getPriorityColor(opp.priority)}>
                          {opp.priority} Priority
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Potential Gain</p>
                          <p className="font-medium text-green-600">{opp.potentialGain}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Difficulty</p>
                          <p className="font-medium">{opp.difficulty}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Timeframe</p>
                          <p className="font-medium">{opp.timeframe}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recommended Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded">
                    <Star className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Quick Win: Improve Referral Program</p>
                      <p className="text-xs text-blue-700">Launch enhanced member referral incentives to capture 42 additional members monthly. Low difficulty, high impact.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2 p-3 bg-purple-50 rounded">
                    <Activity className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-purple-900">Optimize Class Schedules</p>
                      <p className="text-xs text-purple-700">Adjust class timing to improve utilization from 78% to 85%, generating additional {formatCurrency(15200)} in revenue.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2 p-3 bg-green-50 rounded">
                    <DollarSign className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Focus on Operating Margin</p>
                      <p className="text-xs text-green-700">Analyze cost structure to improve margin from 23.8% to industry average 26.4%, unlocking {formatCurrency(32850)}.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
