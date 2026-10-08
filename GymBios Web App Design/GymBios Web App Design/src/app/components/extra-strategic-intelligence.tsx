import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, ScatterChart, Scatter } from 'recharts';
import {
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  MapPin,
  Users,
  Award,
  Crown,
  Medal,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Tag,
  Percent,
  Package,
  ShoppingBag,
  Coffee,
  Dumbbell,
  TrendingUpDown,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Map,
  Globe,
  Zap,
  Megaphone,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Star,
  MessageSquare,
  AlertCircle,
  XCircle,
  Smile,
  Frown,
  Meh,
  TrendingUpIcon,
  ChevronRight,
  Eye,
  Download,
  Share2,
  Filter,
  Search,
  Calendar,
  Clock,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Send,
  BarChart2,
  LineChart as LineChartIcon
} from 'lucide-react';

interface ExtraStrategicIntelligenceProps {
  formatCurrency: (amount: number) => string;
  getCurrentPeriod: () => string;
}

export function ExtraStrategicIntelligence({ formatCurrency, getCurrentPeriod }: ExtraStrategicIntelligenceProps) {
  const [activeModule, setActiveModule] = useState('branch-comparison');

  // 1. Branch-to-Branch Comparison Data
  const branchData = [
    {
      branch: 'Dubai Marina',
      location: 'Dubai Marina Mall, Dubai',
      totalRevenue: 145800,
      membershipGrowth: 15.8,
      ptSales: 28400,
      retailSales: 12300,
      cafeRevenue: 8900,
      expenses: 62400,
      profitMargin: 57.2,
      staffPerformance: 92,
      inventoryUsage: 78,
      memberEngagement: 88,
      churnRate: 8.5,
      activeMembers: 1245,
      rank: 1,
      score: 94.5,
      color: '#10b981'
    },
    {
      branch: 'Abu Dhabi Central',
      location: 'Al Wahda Mall, Abu Dhabi',
      totalRevenue: 118500,
      membershipGrowth: 11.2,
      ptSales: 22100,
      retailSales: 9800,
      cafeRevenue: 6400,
      expenses: 52800,
      profitMargin: 55.4,
      staffPerformance: 87,
      inventoryUsage: 72,
      memberEngagement: 82,
      churnRate: 10.2,
      activeMembers: 982,
      rank: 2,
      score: 87.3,
      color: '#3b82f6'
    },
    {
      branch: 'Sharjah City',
      location: 'City Center, Sharjah',
      totalRevenue: 98200,
      membershipGrowth: 9.5,
      ptSales: 18900,
      retailSales: 7600,
      cafeRevenue: 5200,
      expenses: 45600,
      profitMargin: 53.6,
      staffPerformance: 89,
      inventoryUsage: 68,
      memberEngagement: 79,
      churnRate: 11.8,
      activeMembers: 847,
      rank: 3,
      score: 82.1,
      color: '#f59e0b'
    },
    {
      branch: 'Al Ain',
      location: 'Bawadi Mall, Al Ain',
      totalRevenue: 76500,
      membershipGrowth: 7.2,
      ptSales: 14200,
      retailSales: 5400,
      cafeRevenue: 3800,
      expenses: 38900,
      profitMargin: 49.2,
      staffPerformance: 84,
      inventoryUsage: 65,
      memberEngagement: 75,
      churnRate: 13.5,
      activeMembers: 623,
      rank: 4,
      score: 76.8,
      color: '#8b5cf6'
    }
  ];

  // 2. Pricing Optimization Data
  const membershipPricing = [
    {
      tier: 'Basic',
      currentPrice: 299,
      suggestedPrice: 315,
      priceChange: 5.4,
      elasticity: 0.85,
      expectedImpact: '+12% revenue',
      conversionRate: 42,
      optimalRange: '310-325',
      recommendation: 'Increase recommended'
    },
    {
      tier: 'Premium',
      currentPrice: 499,
      suggestedPrice: 525,
      priceChange: 5.2,
      elasticity: 0.72,
      expectedImpact: '+8% revenue',
      conversionRate: 38,
      optimalRange: '515-540',
      recommendation: 'Gradual increase'
    },
    {
      tier: 'Elite',
      currentPrice: 799,
      suggestedPrice: 799,
      priceChange: 0,
      elasticity: 0.45,
      expectedImpact: 'Maintain',
      conversionRate: 22,
      optimalRange: '775-825',
      recommendation: 'Price optimal'
    }
  ];

  const ptPricing = {
    oneSession: { current: 350, suggested: 390, elasticity: 0.65, impact: 'No volume loss' },
    tenPack: { current: 3200, suggested: 3500, elasticity: 0.58, impact: '+9% revenue' },
    twentyPack: { current: 6000, suggested: 6400, elasticity: 0.52, impact: '+11% revenue' }
  };

  const dynamicPricingInsights = [
    {
      category: 'Memberships',
      peakPeriod: 'Jan-Feb',
      peakPrice: '+8%',
      offPeakPeriod: 'Jun-Aug',
      offPeakDiscount: '-12%',
      seasonalImpact: 'High'
    },
    {
      category: 'PT Sessions',
      peakPeriod: 'New Year',
      peakPrice: '+5%',
      offPeakPeriod: 'Summer',
      offPeakDiscount: '-10%',
      seasonalImpact: 'Medium'
    },
    {
      category: 'Retail',
      peakPeriod: 'Weekends',
      peakPrice: 'Standard',
      offPeakPeriod: 'Weekdays',
      offPeakDiscount: 'Bundle offers',
      seasonalImpact: 'Low'
    }
  ];

  // 3. Competitor & Regional Trends Data
  const regionalData = [
    {
      region: 'Al Nahda',
      fitnessSearchTrend: '+24%',
      populationGrowth: 8.5,
      gymDensity: 'Low',
      averagePrice: 380,
      marketSaturation: 35,
      opportunityScore: 92,
      competitors: 3,
      recommendation: 'High potential - Consider expansion',
      riskLevel: 'Low'
    },
    {
      region: 'Business Bay',
      fitnessSearchTrend: '+18%',
      populationGrowth: 12.3,
      gymDensity: 'Medium',
      averagePrice: 520,
      marketSaturation: 58,
      opportunityScore: 78,
      competitors: 7,
      recommendation: 'Medium potential - Monitor',
      riskLevel: 'Medium'
    },
    {
      region: 'JBR',
      fitnessSearchTrend: '+8%',
      populationGrowth: 4.2,
      gymDensity: 'High',
      averagePrice: 650,
      marketSaturation: 82,
      opportunityScore: 45,
      competitors: 12,
      recommendation: 'Saturated - Not recommended',
      riskLevel: 'High'
    },
    {
      region: 'Jumeirah Village',
      fitnessSearchTrend: '+31%',
      populationGrowth: 15.8,
      gymDensity: 'Low',
      averagePrice: 420,
      marketSaturation: 28,
      opportunityScore: 95,
      competitors: 2,
      recommendation: 'Excellent opportunity - Priority area',
      riskLevel: 'Low'
    }
  ];

  const competitorAnalysis = [
    {
      competitor: 'FitZone Fitness',
      location: 'Dubai Marina',
      membershipPrice: 450,
      ptPrice: 400,
      marketShare: 18.5,
      trend: 'Growing',
      strengths: ['24/7 access', 'Premium equipment'],
      weaknesses: ['No F&B', 'Limited parking']
    },
    {
      competitor: 'PowerHouse Gym',
      location: 'Business Bay',
      membershipPrice: 520,
      ptPrice: 450,
      marketShare: 15.2,
      trend: 'Stable',
      strengths: ['Group classes', 'Swimming pool'],
      weaknesses: ['Old equipment', 'High churn']
    },
    {
      competitor: 'Elite Wellness',
      location: 'JBR',
      membershipPrice: 680,
      ptPrice: 550,
      marketShare: 22.8,
      trend: 'Growing',
      strengths: ['Luxury facilities', 'Spa services'],
      weaknesses: ['Very expensive', 'Limited capacity']
    }
  ];

  // 4. Marketing ROI Data
  const marketingCampaigns = [
    {
      campaign: 'Instagram Fitness Challenge',
      platform: 'Instagram',
      spend: 8500,
      leads: 245,
      conversions: 67,
      revenue: 25800,
      roi: 203.5,
      cpl: 34.7,
      cpa: 126.9,
      conversionRate: 27.3,
      status: 'Active',
      performance: 'Excellent'
    },
    {
      campaign: 'Google Search Ads',
      platform: 'Google',
      spend: 12400,
      leads: 312,
      conversions: 52,
      revenue: 18200,
      roi: 46.8,
      cpl: 39.7,
      cpa: 238.5,
      conversionRate: 16.7,
      status: 'Active',
      performance: 'Good'
    },
    {
      campaign: 'Facebook Retargeting',
      platform: 'Facebook',
      spend: 5600,
      leads: 189,
      conversions: 48,
      revenue: 16900,
      roi: 201.8,
      cpl: 29.6,
      cpa: 116.7,
      conversionRate: 25.4,
      status: 'Active',
      performance: 'Excellent'
    },
    {
      campaign: 'TikTok Brand Awareness',
      platform: 'TikTok',
      spend: 4200,
      leads: 428,
      conversions: 38,
      revenue: 12800,
      roi: 204.8,
      cpl: 9.8,
      cpa: 110.5,
      conversionRate: 8.9,
      status: 'Completed',
      performance: 'Good'
    },
    {
      campaign: 'Referral Program',
      platform: 'Internal',
      spend: 3200,
      leads: 156,
      conversions: 89,
      revenue: 36500,
      roi: 1040.6,
      cpl: 20.5,
      cpa: 36.0,
      conversionRate: 57.1,
      status: 'Active',
      performance: 'Outstanding'
    }
  ];

  const channelPerformance = [
    { channel: 'Referrals', roi: 1040.6, arpm: 410, quality: 'Excellent' },
    { channel: 'Instagram', roi: 203.5, arpm: 385, quality: 'Excellent' },
    { channel: 'TikTok', roi: 204.8, arpm: 337, quality: 'Good' },
    { channel: 'Facebook', roi: 201.8, arpm: 352, quality: 'Excellent' },
    { channel: 'Google', roi: 46.8, arpm: 350, quality: 'Good' },
    { channel: 'Walk-in', roi: 0, arpm: 250, quality: 'Average' }
  ];

  // 5. Customer Satisfaction & NPS Data
  const npsData = {
    score: 67,
    promoters: 412,
    passives: 285,
    detractors: 150,
    totalResponses: 847,
    promotersPercent: 48.6,
    passivesPercent: 33.6,
    detractorsPercent: 17.7,
    trend: '+5.2',
    industryAverage: 52
  };

  const satisfactionMetrics = {
    overall: 4.3,
    trainers: 4.7,
    facilities: 4.1,
    cleanliness: 4.5,
    equipment: 4.2,
    classes: 4.4,
    staff: 4.6,
    valueForMoney: 3.9,
    location: 4.3,
    cafe: 4.0
  };

  const feedbackCategories = [
    {
      category: 'Trainer Quality',
      positive: 387,
      negative: 28,
      sentiment: 93.3,
      topIssue: null,
      topPraise: 'Professional and knowledgeable'
    },
    {
      category: 'Equipment',
      positive: 312,
      negative: 89,
      sentiment: 77.8,
      topIssue: 'Some machines need maintenance',
      topPraise: 'Wide variety available'
    },
    {
      category: 'Cleanliness',
      positive: 402,
      negative: 35,
      sentiment: 92.0,
      topIssue: 'Locker rooms need attention',
      topPraise: 'Always clean and well-maintained'
    },
    {
      category: 'Pricing',
      positive: 245,
      negative: 156,
      sentiment: 61.1,
      topIssue: 'PT sessions too expensive',
      topPraise: 'Good value for facilities'
    },
    {
      category: 'Customer Service',
      positive: 428,
      negative: 22,
      sentiment: 95.1,
      topIssue: null,
      topPraise: 'Friendly and helpful staff'
    }
  ];

  const recentComplaints = [
    {
      issue: 'Locker issues',
      count: 45,
      status: 'In Progress',
      avgResolutionTime: '2.3 days',
      priority: 'High'
    },
    {
      issue: 'Equipment breakdown',
      count: 28,
      status: 'Ongoing',
      avgResolutionTime: '1.5 days',
      priority: 'High'
    },
    {
      issue: 'Class booking problems',
      count: 19,
      status: 'Resolved',
      avgResolutionTime: '0.8 days',
      priority: 'Medium'
    },
    {
      issue: 'Billing errors',
      count: 12,
      status: 'Resolved',
      avgResolutionTime: '0.5 days',
      priority: 'Critical'
    }
  ];

  const trainerRatings = [
    { name: 'Rahul Sharma', rating: 4.9, reviews: 187, satisfaction: 98 },
    { name: 'Sarah Johnson', rating: 4.8, reviews: 156, satisfaction: 96 },
    { name: 'David Lee', rating: 4.5, reviews: 123, satisfaction: 90 },
    { name: 'Mia Chen', rating: 4.7, reviews: 142, satisfaction: 94 }
  ];

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-orange-500" />;
      default:
        return <Award className="h-5 w-5 text-blue-500" />;
    }
  };

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

  const getOpportunityColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 70) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getPerformanceBadge = (performance: string) => {
    switch (performance) {
      case 'Outstanding':
        return <Badge className="bg-purple-100 text-purple-800">Outstanding</Badge>;
      case 'Excellent':
        return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
      case 'Good':
        return <Badge className="bg-blue-100 text-blue-800">Good</Badge>;
      default:
        return <Badge variant="outline">Average</Badge>;
    }
  };

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment >= 90) return <Smile className="h-5 w-5 text-green-600" />;
    if (sentiment >= 70) return <Meh className="h-5 w-5 text-yellow-600" />;
    return <Frown className="h-5 w-5 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Module Navigation */}
      <Tabs value={activeModule} onValueChange={setActiveModule} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 gap-1 h-auto p-1 bg-white shadow-sm">
          <TabsTrigger value="branch-comparison" className="text-xs">
            <Building2 className="h-4 w-4 mr-1" />
            Branch Comparison
          </TabsTrigger>
          <TabsTrigger value="pricing" className="text-xs">
            <Tag className="h-4 w-4 mr-1" />
            Pricing Optimization
          </TabsTrigger>
          <TabsTrigger value="competitor" className="text-xs">
            <Globe className="h-4 w-4 mr-1" />
            Competitor Analysis
          </TabsTrigger>
          <TabsTrigger value="marketing" className="text-xs">
            <Megaphone className="h-4 w-4 mr-1" />
            Marketing ROI
          </TabsTrigger>
          <TabsTrigger value="nps" className="text-xs">
            <Heart className="h-4 w-4 mr-1" />
            NPS & Satisfaction
          </TabsTrigger>
        </TabsList>

        {/* 1. Branch-to-Branch Comparison */}
        <TabsContent value="branch-comparison" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-[#2B7A78]" />
                Branch-to-Branch Performance Comparison
              </CardTitle>
              <CardDescription>Compare performance metrics across all locations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Branch Rankings */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {branchData.map((branch, index) => (
                    <Card key={index} className="border-2" style={{ borderColor: branch.color }}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getRankBadge(branch.rank)}
                            <Badge style={{ backgroundColor: branch.color, color: 'white' }}>
                              Rank #{branch.rank}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Score</p>
                            <p className="text-xl font-bold" style={{ color: branch.color }}>
                              {branch.score}
                            </p>
                          </div>
                        </div>
                        
                        <h3 className="font-bold text-lg mb-1">{branch.branch}</h3>
                        <p className="text-xs text-muted-foreground mb-3">{branch.location}</p>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Revenue</span>
                            <span className="font-semibold">{formatCurrency(branch.totalRevenue)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Members</span>
                            <span className="font-semibold">{branch.activeMembers}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Profit Margin</span>
                            <span className="font-semibold text-green-600">{branch.profitMargin}%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Churn Rate</span>
                            <span className="font-semibold text-orange-600">{branch.churnRate}%</span>
                          </div>
                        </div>
                        
                        <Separator className="my-3" />
                        
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span>Staff Performance</span>
                              <span>{branch.staffPerformance}%</span>
                            </div>
                            <Progress value={branch.staffPerformance} className="h-1" />
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span>Member Engagement</span>
                              <span>{branch.memberEngagement}%</span>
                            </div>
                            <Progress value={branch.memberEngagement} className="h-1" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Separator />

                {/* Comparison Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Detailed Metrics Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Branch</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Growth %</TableHead>
                          <TableHead className="text-right">PT Sales</TableHead>
                          <TableHead className="text-right">Retail</TableHead>
                          <TableHead className="text-right">Café</TableHead>
                          <TableHead className="text-right">Expenses</TableHead>
                          <TableHead className="text-right">Margin %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {branchData.map((branch, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {getRankBadge(branch.rank)}
                                {branch.branch}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(branch.totalRevenue)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge className="bg-green-100 text-green-800">
                                +{branch.membershipGrowth}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(branch.ptSales)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(branch.retailSales)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(branch.cafeRevenue)}</TableCell>
                            <TableCell className="text-right text-red-600">
                              {formatCurrency(branch.expenses)}
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-semibold">
                              {branch.profitMargin}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* AI Insights */}
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-900">
                      <Sparkles className="h-5 w-5" />
                      AI Branch Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 bg-white rounded border border-blue-200">
                        <p className="text-sm text-blue-900">
                          <strong>Top Performer:</strong> Dubai Marina is outperforming Abu Dhabi Central by 27% in membership renewals and has 94.5% overall score.
                        </p>
                      </div>
                      <div className="p-3 bg-white rounded border border-blue-200">
                        <p className="text-sm text-blue-900">
                          <strong>PT Strategy:</strong> Sharjah branch has the highest PT upsell conversion rate at 89%. Use their strategy as baseline for other branches.
                        </p>
                      </div>
                      <div className="p-3 bg-white rounded border border-orange-200">
                        <p className="text-sm text-orange-900">
                          <strong>Action Required:</strong> Al Ain branch showing 13.5% churn rate (highest). Implement retention programs immediately.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Comparison Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Revenue & Profit Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={branchData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="branch" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Legend />
                        <Bar dataKey="totalRevenue" fill="#10b981" name="Total Revenue" />
                        <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Pricing Optimization Engine */}
        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-6 w-6 text-[#2B7A78]" />
                Pricing Optimization Engine
              </CardTitle>
              <CardDescription>AI-powered pricing recommendations based on elasticity and market data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Membership Pricing */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Membership Pricing Analysis
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {membershipPricing.map((pricing, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold">{pricing.tier}</h4>
                            <Badge className={pricing.recommendation === 'Price optimal' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                              {pricing.recommendation}
                            </Badge>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Current Price</p>
                              <p className="text-2xl font-bold">{formatCurrency(pricing.currentPrice)}</p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <ArrowUpRight className="h-4 w-4 text-green-600" />
                              <div>
                                <p className="text-xs text-muted-foreground">Suggested Price</p>
                                <p className="text-xl font-bold text-green-600">{formatCurrency(pricing.suggestedPrice)}</p>
                              </div>
                            </div>
                            
                            <Separator />
                            
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">Change</p>
                                <p className="font-semibold text-green-600">+{pricing.priceChange}%</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Elasticity</p>
                                <p className="font-semibold">{pricing.elasticity}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Conversion</p>
                                <p className="font-semibold">{pricing.conversionRate}%</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Optimal Range</p>
                                <p className="font-semibold text-blue-600">{pricing.optimalRange}</p>
                              </div>
                            </div>
                            
                            <div className="p-2 bg-blue-50 rounded">
                              <p className="text-xs text-blue-900">
                                <strong>Impact:</strong> {pricing.expectedImpact}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* PT Pricing */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Dumbbell className="h-5 w-5 text-green-600" />
                    Personal Training Pricing
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-3">Single Session</h4>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-muted-foreground">Current</span>
                          <span className="font-bold">{formatCurrency(ptPricing.oneSession.current)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-muted-foreground">Suggested</span>
                          <span className="font-bold text-green-600">{formatCurrency(ptPricing.oneSession.suggested)}</span>
                        </div>
                        <p className="text-xs text-blue-900 bg-blue-50 p-2 rounded mt-2">
                          {ptPricing.oneSession.impact}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-3">10-Session Pack</h4>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-muted-foreground">Current</span>
                          <span className="font-bold">{formatCurrency(ptPricing.tenPack.current)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-muted-foreground">Suggested</span>
                          <span className="font-bold text-green-600">{formatCurrency(ptPricing.tenPack.suggested)}</span>
                        </div>
                        <p className="text-xs text-blue-900 bg-blue-50 p-2 rounded mt-2">
                          {ptPricing.tenPack.impact}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-3">20-Session Pack</h4>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-muted-foreground">Current</span>
                          <span className="font-bold">{formatCurrency(ptPricing.twentyPack.current)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-muted-foreground">Suggested</span>
                          <span className="font-bold text-green-600">{formatCurrency(ptPricing.twentyPack.suggested)}</span>
                        </div>
                        <p className="text-xs text-blue-900 bg-blue-50 p-2 rounded mt-2">
                          {ptPricing.twentyPack.impact}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <Separator />

                {/* Dynamic Pricing Insights */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <TrendingUpDown className="h-5 w-5 text-orange-600" />
                    Dynamic Pricing Strategy
                  </h3>
                  <Card>
                    <CardContent className="p-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead>Peak Period</TableHead>
                            <TableHead>Peak Pricing</TableHead>
                            <TableHead>Off-Peak Period</TableHead>
                            <TableHead>Off-Peak Strategy</TableHead>
                            <TableHead>Impact</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dynamicPricingInsights.map((insight, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{insight.category}</TableCell>
                              <TableCell>{insight.peakPeriod}</TableCell>
                              <TableCell>
                                <Badge className="bg-green-100 text-green-800">{insight.peakPrice}</Badge>
                              </TableCell>
                              <TableCell>{insight.offPeakPeriod}</TableCell>
                              <TableCell>
                                <Badge className="bg-blue-100 text-blue-800">{insight.offPeakDiscount}</Badge>
                              </TableCell>
                              <TableCell>{insight.seasonalImpact}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                {/* AI Pricing Recommendations */}
                <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-900">
                      <Lightbulb className="h-5 w-5" />
                      AI Pricing Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 bg-white rounded border border-green-200">
                        <p className="text-sm text-green-900">
                          <strong>Membership Price Increase:</strong> Raising PT price from 350 AED → 390 AED will not affect sales volume based on elasticity of 0.65. Implement immediately.
                        </p>
                      </div>
                      <div className="p-3 bg-white rounded border border-green-200">
                        <p className="text-sm text-green-900">
                          <strong>Q1 Strategy:</strong> Membership price increase of 6% recommended for Q1 2025 based on seasonal demand patterns and competitor analysis.
                        </p>
                      </div>
                      <div className="p-3 bg-white rounded border border-blue-200">
                        <p className="text-sm text-blue-900">
                          <strong>Bundle Opportunity:</strong> Create Premium + PT combo at 25% discount. Expected to increase package uptake by 34%.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Competitor & Regional Analysis */}
        <TabsContent value="competitor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-6 w-6 text-[#2B7A78]" />
                Competitor Prediction & Regional Trends
              </CardTitle>
              <CardDescription>Market intelligence and expansion opportunities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Regional Opportunities */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Map className="h-5 w-5 text-blue-600" />
                    Regional Opportunity Analysis
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {regionalData.map((region, index) => (
                      <Card key={index} className={`border-2 ${getOpportunityColor(region.opportunityScore)}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-lg">{region.region}</h4>
                            <Badge className={getOpportunityColor(region.opportunityScore)}>
                              Score: {region.opportunityScore}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Fitness Search Trend</p>
                              <p className="font-semibold text-green-600">{region.fitnessSearchTrend}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Population Growth</p>
                              <p className="font-semibold">{region.populationGrowth}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Market Saturation</p>
                              <p className="font-semibold">{region.marketSaturation}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Avg Price</p>
                              <p className="font-semibold">{formatCurrency(region.averagePrice)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Gym Density</p>
                              <Badge variant="outline">{region.gymDensity}</Badge>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Competitors</p>
                              <p className="font-semibold">{region.competitors}</p>
                            </div>
                          </div>
                          
                          <div className="p-2 rounded" style={{
                            backgroundColor: region.opportunityScore >= 90 ? '#dcfce7' : region.opportunityScore >= 70 ? '#dbeafe' : region.opportunityScore >= 50 ? '#fef9c3' : '#fee2e2'
                          }}>
                            <p className="text-xs font-medium">{region.recommendation}</p>
                            <Badge className={`mt-1 ${region.riskLevel === 'Low' ? 'bg-green-100 text-green-800' : region.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                              Risk: {region.riskLevel}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Competitor Analysis */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-red-600" />
                    Competitor Intelligence
                  </h3>
                  <div className="space-y-4">
                    {competitorAnalysis.map((comp, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-bold text-lg">{comp.competitor}</h4>
                              <p className="text-sm text-muted-foreground">{comp.location}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Market Share</p>
                              <p className="text-xl font-bold text-blue-600">{comp.marketShare}%</p>
                              <Badge className={comp.trend === 'Growing' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}>
                                {comp.trend}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Membership</p>
                              <p className="font-semibold">{formatCurrency(comp.membershipPrice)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">PT Session</p>
                              <p className="font-semibold">{formatCurrency(comp.ptPrice)}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-2 bg-green-50 rounded">
                              <p className="text-xs font-medium text-green-900 mb-1">Strengths</p>
                              <ul className="text-xs text-green-800 space-y-1">
                                {comp.strengths.map((strength, i) => (
                                  <li key={i} className="flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {strength}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="p-2 bg-red-50 rounded">
                              <p className="text-xs font-medium text-red-900 mb-1">Weaknesses</p>
                              <ul className="text-xs text-red-800 space-y-1">
                                {comp.weaknesses.map((weakness, i) => (
                                  <li key={i} className="flex items-center gap-1">
                                    <XCircle className="h-3 w-3" />
                                    {weakness}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* AI Regional Insights */}
                <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-900">
                      <Sparkles className="h-5 w-5" />
                      AI Regional & Competitor Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 bg-white rounded border border-purple-200">
                        <p className="text-sm text-purple-900">
                          <strong>Expansion Priority:</strong> Jumeirah Village shows rising fitness demand (+31%) with low saturation (28%). Excellent opportunity - consider opening a new branch within Q2 2025.
                        </p>
                      </div>
                      <div className="p-3 bg-white rounded border border-purple-200">
                        <p className="text-sm text-purple-900">
                          <strong>Competitive Pricing:</strong> Competitor pricing is shifting downward in Business Bay. Adjust membership offers seasonally to maintain competitiveness.
                        </p>
                      </div>
                      <div className="p-3 bg-white rounded border border-orange-200">
                        <p className="text-sm text-orange-900">
                          <strong>Threat Alert:</strong> Elite Wellness in JBR is growing market share rapidly (22.8%). Monitor their premium service offerings and adjust value proposition.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Marketing ROI Analyzer */}
        <TabsContent value="marketing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-6 w-6 text-[#2B7A78]" />
                Marketing ROI Analyzer
              </CardTitle>
              <CardDescription>Track campaign performance and optimize marketing spend</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Campaign Performance */}
                <div>
                  <h3 className="text-lg font-bold mb-4">Campaign Performance Overview</h3>
                  <div className="space-y-3">
                    {marketingCampaigns.map((campaign, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded">
                                {campaign.platform === 'Instagram' && <Instagram className="h-5 w-5 text-pink-600" />}
                                {campaign.platform === 'Google' && <Search className="h-5 w-5 text-blue-600" />}
                                {campaign.platform === 'Facebook' && <Facebook className="h-5 w-5 text-blue-700" />}
                                {campaign.platform === 'TikTok' && <Activity className="h-5 w-5 text-gray-800" />}
                                {campaign.platform === 'Internal' && <Users className="h-5 w-5 text-green-600" />}
                              </div>
                              <div>
                                <h4 className="font-bold">{campaign.campaign}</h4>
                                <p className="text-xs text-muted-foreground">{campaign.platform}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getPerformanceBadge(campaign.performance)}
                              <Badge variant={campaign.status === 'Active' ? 'default' : 'outline'}>
                                {campaign.status}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Spend</p>
                              <p className="font-semibold text-red-600">{formatCurrency(campaign.spend)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Leads</p>
                              <p className="font-semibold">{campaign.leads}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Conversions</p>
                              <p className="font-semibold text-green-600">{campaign.conversions}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Revenue</p>
                              <p className="font-semibold text-green-600">{formatCurrency(campaign.revenue)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">ROI</p>
                              <p className="font-semibold text-blue-600">{campaign.roi}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">CPL</p>
                              <p className="font-semibold">{formatCurrency(campaign.cpl)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">CPA</p>
                              <p className="font-semibold">{formatCurrency(campaign.cpa)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Conv. Rate</p>
                              <p className="font-semibold">{campaign.conversionRate}%</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Channel Performance */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-green-600" />
                    Channel Performance Comparison
                  </h3>
                  <Card>
                    <CardContent className="p-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={channelPerformance}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="channel" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="roi" fill="#10b981" name="ROI %" />
                          <Bar dataKey="arpm" fill="#3b82f6" name="ARPM (AED)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Best ROI Channel</p>
                      <p className="text-xl font-bold text-green-600">Referrals</p>
                      <p className="text-sm text-muted-foreground">1,040.6% ROI</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Highest ARPM</p>
                      <p className="text-xl font-bold text-blue-600">Referrals</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(410)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Best Conv. Rate</p>
                      <p className="text-xl font-bold text-purple-600">Referrals</p>
                      <p className="text-sm text-muted-foreground">57.1%</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Total Spend</p>
                      <p className="text-xl font-bold text-red-600">{formatCurrency(33900)}</p>
                      <p className="text-sm text-muted-foreground">This month</p>
                    </CardContent>
                  </Card>
                </div>

                {/* AI Marketing Insights */}
                <Card className="bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-pink-900">
                      <Sparkles className="h-5 w-5" />
                      AI Marketing Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 bg-white rounded border border-pink-200">
                        <p className="text-sm text-pink-900">
                          <strong>Channel Optimization:</strong> Instagram ads yield 42% better ROI (203.5%) than Google Ads (46.8%) this quarter. Reallocate 30% of Google budget to Instagram.
                        </p>
                      </div>
                      <div className="p-3 bg-white rounded border border-pink-200">
                        <p className="text-sm text-pink-900">
                          <strong>Referral Success:</strong> Referral campaigns produce 410 AED ARPM vs normal 250 AED ARPM. Invest more in referral incentives - every 1 AED spent returns 10.4 AED.
                        </p>
                      </div>
                      <div className="p-3 bg-white rounded border border-blue-200">
                        <p className="text-sm text-blue-900">
                          <strong>Facebook Retargeting:</strong> 25.4% conversion rate and 201.8% ROI. Increase retargeting budget by 50% to capture abandoned leads.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. NPS & Customer Satisfaction */}
        <TabsContent value="nps" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-6 w-6 text-[#E63946]" />
                Customer Satisfaction & NPS Module
              </CardTitle>
              <CardDescription>Track member happiness, loyalty, and retention risk</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* NPS Score */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                    <CardContent className="p-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2">Net Promoter Score (NPS)</p>
                        <p className="text-6xl font-bold text-blue-600 mb-2">{npsData.score}</p>
                        <div className="flex items-center justify-center gap-2 mb-4">
                          <Badge className="bg-green-100 text-green-800">+{npsData.trend}%</Badge>
                          <span className="text-sm text-muted-foreground">vs last month</span>
                        </div>
                        <Progress value={(npsData.score + 100) / 2} className="h-3 mb-2" />
                        <p className="text-xs text-muted-foreground">
                          Industry Average: {npsData.industryAverage} (You are {npsData.score - npsData.industryAverage} points above)
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-4">NPS Distribution</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <ThumbsUp className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium">Promoters (9-10)</span>
                            </div>
                            <span className="font-bold text-green-600">{npsData.promoters} ({npsData.promotersPercent}%)</span>
                          </div>
                          <Progress value={npsData.promotersPercent} className="h-2 bg-green-100" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Meh className="h-4 w-4 text-yellow-600" />
                              <span className="text-sm font-medium">Passives (7-8)</span>
                            </div>
                            <span className="font-bold text-yellow-600">{npsData.passives} ({npsData.passivesPercent}%)</span>
                          </div>
                          <Progress value={npsData.passivesPercent} className="h-2 bg-yellow-100" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <ThumbsDown className="h-4 w-4 text-red-600" />
                              <span className="text-sm font-medium">Detractors (0-6)</span>
                            </div>
                            <span className="font-bold text-red-600">{npsData.detractors} ({npsData.detractorsPercent}%)</span>
                          </div>
                          <Progress value={npsData.detractorsPercent} className="h-2 bg-red-100" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                {/* Satisfaction Metrics */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Satisfaction Metrics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {Object.entries(satisfactionMetrics).map(([key, value]) => (
                      <Card key={key}>
                        <CardContent className="p-4 text-center">
                          <p className="text-xs text-muted-foreground mb-2 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </p>
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <p className="text-2xl font-bold">{value}</p>
                          </div>
                          <Progress value={value * 20} className="h-1" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Feedback Analysis */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    Feedback Category Analysis
                  </h3>
                  <div className="space-y-3">
                    {feedbackCategories.map((category, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {getSentimentIcon(category.sentiment)}
                              <div>
                                <h4 className="font-bold">{category.category}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {category.positive} positive • {category.negative} negative
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Sentiment</p>
                              <p className="text-2xl font-bold" style={{
                                color: category.sentiment >= 90 ? '#10b981' : category.sentiment >= 70 ? '#f59e0b' : '#ef4444'
                              }}>
                                {category.sentiment}%
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {category.topPraise && (
                              <div className="p-2 bg-green-50 rounded">
                                <p className="text-xs font-medium text-green-900 mb-1 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Top Praise
                                </p>
                                <p className="text-xs text-green-800">{category.topPraise}</p>
                              </div>
                            )}
                            {category.topIssue && (
                              <div className="p-2 bg-red-50 rounded">
                                <p className="text-xs font-medium text-red-900 mb-1 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Top Issue
                                </p>
                                <p className="text-xs text-red-800">{category.topIssue}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Recent Complaints */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Recent Complaints & Resolution
                  </h3>
                  <Card>
                    <CardContent className="p-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Issue</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Avg Resolution Time</TableHead>
                            <TableHead>Priority</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentComplaints.map((complaint, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{complaint.issue}</TableCell>
                              <TableCell className="text-right font-semibold">{complaint.count}</TableCell>
                              <TableCell>
                                <Badge className={complaint.status === 'Resolved' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                                  {complaint.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{complaint.avgResolutionTime}</TableCell>
                              <TableCell>
                                <Badge className={
                                  complaint.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                                  complaint.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }>
                                  {complaint.priority}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                {/* Trainer Ratings */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Award className="h-5 w-5 text-purple-600" />
                    Trainer Satisfaction Rankings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {trainerRatings.map((trainer, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className="flex justify-center mb-2">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < Math.floor(trainer.rating)
                                      ? 'text-yellow-500 fill-yellow-500'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <p className="font-bold">{trainer.name}</p>
                            <p className="text-2xl font-bold text-yellow-600 my-1">{trainer.rating}</p>
                            <p className="text-xs text-muted-foreground">{trainer.reviews} reviews</p>
                            <div className="mt-2">
                              <Progress value={trainer.satisfaction} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">
                                {trainer.satisfaction}% satisfaction
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* AI Satisfaction Insights */}
                <Card className="bg-gradient-to-r from-red-50 to-pink-50 border-red-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-900">
                      <Sparkles className="h-5 w-5" />
                      AI Customer Satisfaction Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 bg-white rounded border border-red-200">
                        <p className="text-sm text-red-900">
                          <strong>Top Driver:</strong> PT performance (4.7/5) is the highest contributor to customer happiness. Rahul Sharma leads with 4.9 rating - use his approach for trainer onboarding.
                        </p>
                      </div>
                      <div className="p-3 bg-white rounded border border-red-200">
                        <p className="text-sm text-red-900">
                          <strong>Action Required:</strong> Detractors (17.7%) are mostly due to locker issues (45 complaints). Prioritize locker maintenance and upgrade plan.
                        </p>
                      </div>
                      <div className="p-3 bg-white rounded border border-green-200">
                        <p className="text-sm text-green-900">
                          <strong>Strength:</strong> Customer Service satisfaction at 95.1% (428 positive). Staff friendliness is a key differentiator - maintain this standard.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
