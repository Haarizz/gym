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

interface BIEngineDashboardV2Props {
  formatCurrency: (amount: number) => string;
  getCurrentPeriod: () => string;
}

export function BIEngineDashboardV2({ formatCurrency, getCurrentPeriod }: BIEngineDashboardV2Props) {
  const [timeFilter, setTimeFilter] = useState('monthly');
  const [activeModule, setActiveModule] = useState('overview');

  // 1. Business Overview KPIs
  const businessOverviewKPIs = {
    totalRevenue: { mtd: 125750, qtd: 368500, ytd: 1425800, growth: 12.3 },
    netProfit: { value: 89025, margin: 23.8, growth: 15.7 },
    cashFlow: { value: 45850, status: 'healthy', days: 45 },
    activeMembers: 847,
    inactiveMembers: 124,
    retentionRate: 89.5,
    churnRate: 10.5,
    arpm: 148.5,
    engagementScore: 78.5
  };

  // 2. Revenue Intelligence - Source-wise
  const revenueBySource = [
    {
      category: 'Memberships',
      total: 85200,
      breakdown: {
        new: 28400,
        renewal: 42800,
        upgrade: 8900,
        addons: 3500,
        creditReceipts: 1600
      },
      cash: 32400,
      card: 52800,
      percentage: 67.8,
      trend: 8.5,
      color: '#3b82f6'
    },
    {
      category: 'PT & Services',
      total: 22400,
      breakdown: {
        oneOnOne: 15800,
        smallGroup: 4200,
        assessments: 2400
      },
      cash: 6800,
      card: 15600,
      percentage: 17.8,
      trend: 18.2,
      color: '#10b981'
    },
    {
      category: 'Merchandise & Retail',
      total: 8500,
      breakdown: {
        supplements: 4200,
        apparel: 2800,
        accessories: 1500
      },
      cash: 2800,
      card: 5700,
      percentage: 6.8,
      trend: 5.3,
      color: '#f59e0b'
    },
    {
      category: 'Events & Workshops',
      total: 3200,
      breakdown: {
        workshops: 2100,
        competitions: 1100
      },
      cash: 1200,
      card: 2000,
      percentage: 2.5,
      trend: -12.5,
      color: '#8b5cf6'
    },
    {
      category: 'Café & F&B',
      total: 4850,
      breakdown: {
        beverages: 2800,
        snacks: 1650,
        meals: 400
      },
      cash: 2200,
      card: 2650,
      percentage: 3.9,
      trend: 22.1,
      color: '#ec4899'
    },
    {
      category: 'Equipment Rentals',
      total: 800,
      cash: 400,
      card: 400,
      percentage: 0.6,
      trend: 0,
      color: '#6366f1'
    },
    {
      category: 'Facilities & Lockers',
      total: 800,
      cash: 300,
      card: 500,
      percentage: 0.6,
      trend: 3.2,
      color: '#14b8a6'
    }
  ];

  // Member Lifetime Value
  const mltv = 2967;

  // 3. Expense Intelligence
  const expenseData = [
    {
      category: 'Salaries & HR',
      amount: 19500,
      percentage: 53.1,
      trend: 2.5,
      budget: 20000,
      status: 'within',
      vendors: null
    },
    {
      category: 'Utilities',
      amount: 4400,
      percentage: 12.0,
      trend: 15.8,
      budget: 4000,
      status: 'over',
      vendors: null
    },
    {
      category: 'Inventory Purchases',
      amount: 6300,
      percentage: 17.2,
      trend: -5.2,
      budget: 6500,
      status: 'within',
      vendors: ['Supplier A', 'Supplier B', 'Supplier C']
    },
    {
      category: 'Maintenance',
      amount: 2100,
      percentage: 5.7,
      trend: 8.5,
      budget: 2500,
      status: 'within',
      vendors: null
    },
    {
      category: 'Marketing & Ads',
      amount: 3100,
      percentage: 8.4,
      trend: 12.3,
      budget: 3500,
      status: 'within',
      vendors: null
    },
    {
      category: 'Rent & Admin',
      amount: 8000,
      percentage: 21.8,
      trend: 0,
      budget: 8000,
      status: 'within',
      vendors: null
    }
  ];

  const totalExpenses = expenseData.reduce((sum, exp) => sum + exp.amount, 0);
  const monthlyBurnRate = totalExpenses / 30;

  // 4. Inventory & Purchase Optimization
  const inventoryInsights = [
    {
      item: 'Protein Bars - Chocolate',
      currentSupplier: 'Supplier A',
      currentCost: 12.5,
      previousCost: 11.5,
      inflation: 8.7,
      alternativeSupplier: 'Supplier B',
      alternativeCost: 11.2,
      potentialSaving: 10.4,
      recommendation: 'Switch to Supplier B'
    },
    {
      item: 'Pre-Workout Powder',
      currentSupplier: 'Supplier A',
      currentCost: 45.0,
      previousCost: 45.0,
      inflation: 0,
      alternativeSupplier: null,
      alternativeCost: null,
      potentialSaving: 0,
      recommendation: 'Maintain current supplier'
    },
    {
      item: 'Energy Drinks',
      currentSupplier: 'Supplier C',
      currentCost: 3.5,
      previousCost: 3.2,
      inflation: 9.4,
      alternativeSupplier: 'Supplier B',
      alternativeCost: 3.0,
      potentialSaving: 14.3,
      recommendation: 'Switch to Supplier B'
    }
  ];

  const deadStock = [
    { item: 'Yoga Mats - Purple', quantity: 45, value: 1350, daysStagnant: 67, recommendation: '30% discount' },
    { item: 'Resistance Bands Set', quantity: 28, value: 840, daysStagnant: 52, recommendation: 'Bundle with PT packages' },
    { item: 'Gym Bags - Small', quantity: 35, value: 1050, daysStagnant: 45, recommendation: 'Free with new memberships' }
  ];

  // 5. Staff Performance
  const staffPerformance = [
    {
      name: 'Rahul Sharma',
      role: 'Senior PT',
      attendance: 98.5,
      punctuality: 97.2,
      ptSessions: 44,
      memberFeedback: 4.9,
      revenueContribution: 15800,
      commission: 2370,
      performance: 'excellent',
      attritionRisk: 'low'
    },
    {
      name: 'Sarah Johnson',
      role: 'PT',
      attendance: 96.8,
      punctuality: 94.5,
      ptSessions: 38,
      memberFeedback: 4.7,
      revenueContribution: 13200,
      commission: 1980,
      performance: 'good',
      attritionRisk: 'low'
    },
    {
      name: 'Mia Chen',
      role: 'Front Desk',
      attendance: 100,
      punctuality: 100,
      ptSessions: 0,
      memberFeedback: 4.8,
      revenueContribution: 8500,
      commission: 425,
      performance: 'excellent',
      attritionRisk: 'medium'
    },
    {
      name: 'David Lee',
      role: 'PT',
      attendance: 88.2,
      punctuality: 85.5,
      ptSessions: 28,
      memberFeedback: 4.2,
      revenueContribution: 9800,
      commission: 1470,
      performance: 'needs improvement',
      attritionRisk: 'high'
    }
  ];

  // 6. Member Behavior & Retention
  const memberSegments = [
    {
      segment: 'High Engagement',
      count: 245,
      checkInFreq: 4.8,
      classParticipation: 85,
      purchases: 12,
      renewalLikelihood: 95,
      churnRisk: 5,
      ltv: 4200
    },
    {
      segment: 'Medium Engagement',
      count: 412,
      checkInFreq: 2.8,
      classParticipation: 58,
      purchases: 6,
      renewalLikelihood: 78,
      churnRisk: 22,
      ltv: 2800
    },
    {
      segment: 'Low Engagement',
      count: 190,
      checkInFreq: 0.9,
      classParticipation: 22,
      purchases: 2,
      renewalLikelihood: 45,
      churnRisk: 55,
      ltv: 1400
    }
  ];

  const churnPredictions = [
    {
      member: 'Sara Ahmed',
      lastVisit: '14 days ago',
      churnProbability: 71,
      recommendation: 'Send re-engagement offer: 15% off PT package',
      priority: 'high'
    },
    {
      member: 'John Miller',
      lastVisit: '21 days ago',
      churnProbability: 84,
      recommendation: 'Urgent call + complimentary session',
      priority: 'critical'
    },
    {
      member: 'Lisa Wong',
      lastVisit: '9 days ago',
      churnProbability: 45,
      recommendation: 'Send motivational email + new class schedule',
      priority: 'medium'
    }
  ];

  // 7. Revenue Prediction & Forecasting
  const revenueForecast = [
    {
      month: 'Jul 2024',
      predicted: 132500,
      lower: 126800,
      upper: 138200,
      confidence: 89
    },
    {
      month: 'Aug 2024',
      predicted: 138200,
      lower: 131500,
      upper: 144900,
      confidence: 85
    },
    {
      month: 'Sep 2024',
      predicted: 142800,
      lower: 135200,
      upper: 150400,
      confidence: 82
    },
    {
      month: 'Q3 2024',
      predicted: 413500,
      lower: 393500,
      upper: 433500,
      confidence: 87
    }
  ];

  const expenseForecast = [
    {
      month: 'Jul 2024',
      predicted: 42500,
      reason: 'Seasonal energy usage increase expected'
    },
    {
      month: 'Aug 2024',
      predicted: 39800,
      reason: 'Normal operations'
    }
  ];

  // 8. Business Positioning
  const businessScore = {
    overall: 8.2,
    revenueConsistency: 8.5,
    marketGrowth: 7.8,
    customerSentiment: 8.9,
    pricingCompetitiveness: 7.5,
    memberAcquisition: 8.0,
    stabilityIndex: 8.3,
    scalabilityReadiness: 7.2
  };

  const swotAnalysis = {
    strengths: [
      'High member retention (89.5%)',
      'Strong PT revenue growth (+18%)',
      'Excellent customer satisfaction (4.7/5)',
      'Diverse revenue streams'
    ],
    weaknesses: [
      'Low events revenue (-12.5%)',
      'High utility costs (+15.8%)',
      'Underperforming staff member identified',
      'Dead stock accumulation'
    ],
    opportunities: [
      'Expand F&B offerings (22% growth)',
      'Launch corporate wellness programs',
      'Introduce premium membership tier',
      'Weekend workshop series'
    ],
    threats: [
      'Rising operating costs',
      'Competitor opening nearby',
      'Seasonal membership drops',
      'Economic uncertainty'
    ]
  };

  // 9. Asset & Equipment Management
  const assetData = [
    {
      asset: 'Treadmill #004',
      utilizationRate: 118,
      lastService: '45 days ago',
      nextService: 'Overdue',
      repairCost: 850,
      status: 'needs-service',
      recommendation: 'Schedule maintenance immediately'
    },
    {
      asset: 'Rowing Machine #002',
      utilizationRate: 95,
      lastService: '28 days ago',
      nextService: 'In 32 days',
      repairCost: 0,
      status: 'good',
      recommendation: 'Continue monitoring'
    },
    {
      asset: 'Leg Press #001',
      utilizationRate: 105,
      lastService: '60 days ago',
      nextService: 'Overdue',
      repairCost: 1200,
      status: 'needs-service',
      recommendation: 'Service within 7 days'
    }
  ];

  const assetDepreciation = {
    total: 285000,
    currentValue: 198500,
    annualDepreciation: 28500
  };

  // 10. Liabilities & Financial Health
  const financialHealth = {
    loans: [
      { type: 'Equipment Loan', outstanding: 45000, monthly: 2500, remaining: 18 },
      { type: 'Business Loan', outstanding: 120000, monthly: 5000, remaining: 24 }
    ],
    vendorPayables: 8500,
    memberPending: 12400,
    creditReceipts: 1600,
    dtiRatio: 0.28,
    cashReserveDays: 45,
    financialRiskScore: 2.8
  };

  // 11. AI-LIVE Strategic Recommendations
  const aiRecommendations = [
    {
      priority: 'critical',
      category: 'Cost Optimization',
      title: 'Reduce Inventory Purchase Costs',
      insight: 'Supplier A has increased costs by 9% for 3 consecutive months on Protein Bars',
      action: 'Switch to Supplier B',
      impact: formatCurrency(850),
      savings: 'monthly',
      icon: Package
    },
    {
      priority: 'high',
      category: 'Revenue Growth',
      title: 'Launch Refer & Renew Campaign',
      insight: 'Renewals down 12% this month. Member referrals at 18.5% (industry avg: 22.3%)',
      action: 'Create incentive program: 1 month free for 3 referrals',
      impact: '42 new members',
      savings: 'projected monthly',
      icon: Users
    },
    {
      priority: 'high',
      category: 'Operations',
      title: 'Optimize F&B Inventory for Peak Hours',
      insight: 'Café sales peak between 4-9 PM on weekdays (75% of daily revenue)',
      action: 'Increase weekend stock by 30%, adjust staffing',
      impact: formatCurrency(2400),
      savings: 'monthly revenue increase',
      icon: Coffee
    },
    {
      priority: 'medium',
      category: 'Revenue Opportunity',
      title: 'Launch Events & Workshops',
      insight: 'Events revenue is zero this quarter. Member survey shows 67% interest in nutrition workshops',
      action: 'Schedule monthly workshops, charge 150 AED per participant',
      impact: formatCurrency(4500),
      savings: 'monthly potential',
      icon: GraduationCap
    },
    {
      priority: 'medium',
      category: 'Expense Control',
      title: 'Reduce Utility Burn Rate',
      insight: 'Electricity costs up 15.8%. Equipment running during low-traffic hours',
      action: 'Implement smart scheduling, optimize HVAC usage',
      impact: formatCurrency(1200),
      savings: 'monthly',
      icon: Lightbulb
    },
    {
      priority: 'low',
      category: 'Retention',
      title: 'Re-engage Low Activity Members',
      insight: '67 members at high churn risk (no visit in 14+ days)',
      action: 'Send personalized re-engagement offers',
      impact: '85%',
      savings: 'retention success rate',
      icon: Heart
    }
  ];

  // 12. Business Growth Strategy
  const growthStrategy = {
    growingAreas: [
      'PT & Services (+18.2%)',
      'Café & F&B (+22.1%)',
      'Member Retention (+2.1%)'
    ],
    decliningAreas: [
      'Events & Workshops (-12.5%)',
      'Equipment Rentals (stagnant)'
    ],
    opportunities: [
      'Corporate wellness partnerships',
      'Premium tier memberships',
      'Online coaching platform'
    ],
    inefficiencies: [
      'High dead stock value (3,240 AED)',
      'Underutilized equipment',
      'Peak hour staffing gaps'
    ],
    expansionReadiness: 'Medium - Improve profitability by 5% before expansion'
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
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button className="bg-[#2B7A78] hover:bg-[#236663]" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <Tabs value={activeModule} onValueChange={setActiveModule} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:grid-cols-12 gap-1 h-auto p-1 bg-white shadow-sm">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="revenue" className="text-xs">Revenue</TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs">Expenses</TabsTrigger>
          <TabsTrigger value="inventory" className="text-xs">Inventory</TabsTrigger>
          <TabsTrigger value="staff" className="text-xs">Staff</TabsTrigger>
          <TabsTrigger value="members" className="text-xs">Members</TabsTrigger>
          <TabsTrigger value="forecast" className="text-xs">Forecast</TabsTrigger>
          <TabsTrigger value="positioning" className="text-xs">Positioning</TabsTrigger>
          <TabsTrigger value="assets" className="text-xs">Assets</TabsTrigger>
          <TabsTrigger value="financial" className="text-xs">Financial Health</TabsTrigger>
          <TabsTrigger value="ai-live" className="text-xs">AI-LIVE™</TabsTrigger>
          <TabsTrigger value="strategy" className="text-xs">Strategy</TabsTrigger>
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
                    +{businessOverviewKPIs.totalRevenue.growth}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Total Revenue (MTD)</p>
                <p className="text-2xl font-bold">{formatCurrency(businessOverviewKPIs.totalRevenue.mtd)}</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  <p>QTD: {formatCurrency(businessOverviewKPIs.totalRevenue.qtd)}</p>
                  <p>YTD: {formatCurrency(businessOverviewKPIs.totalRevenue.ytd)}</p>
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
                  +{businessOverviewKPIs.netProfit.growth}% growth
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
                <p className="text-2xl font-bold">{businessOverviewKPIs.activeMembers}</p>
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
                  <p>Engagement: {businessOverviewKPIs.engagementScore}%</p>
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
                    <Progress value={businessOverviewKPIs.retentionRate} className="mt-2" />
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
                      <p className="text-3xl font-bold text-blue-600">{formatCurrency(businessOverviewKPIs.cashFlow.value)}</p>
                      <Wallet className="h-8 w-8 text-blue-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{businessOverviewKPIs.cashFlow.days} days reserve</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Member Lifetime Value</p>
                    <div className="flex items-center justify-between">
                      <p className="text-3xl font-bold text-purple-600">{formatCurrency(mltv)}</p>
                      <Star className="h-8 w-8 text-purple-500" />
                    </div>
                    <p className="text-xs text-green-600 mt-2">Above industry average</p>
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
                    <span className="font-bold text-green-600">+{businessOverviewKPIs.totalRevenue.growth}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <span className="text-sm">Profit Margin</span>
                    <span className="font-bold text-blue-600">{businessOverviewKPIs.netProfit.margin}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                    <span className="text-sm">Engagement Score</span>
                    <span className="font-bold text-purple-600">{businessOverviewKPIs.engagementScore}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                    <span className="text-sm">Cash Reserve</span>
                    <span className="font-bold text-orange-600">{businessOverviewKPIs.cashFlow.days} days</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. Revenue Intelligence Module */}
        <TabsContent value="revenue" className="space-y-6">
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
                        <div className={`flex items-center ${getTrendColor(source.trend)}`}>
                          {getTrendIcon(source.trend)}
                          <span className="text-sm ml-1">{source.trend > 0 ? '+' : ''}{source.trend}%</span>
                        </div>
                      </div>
                      <p className="text-3xl font-bold">{formatCurrency(source.total)}</p>
                    </div>
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
                <p className="text-sm text-muted-foreground mb-1">Budget Status</p>
                <p className="text-3xl font-bold text-green-600">Within</p>
                <p className="text-xs text-muted-foreground mt-2">2 categories over budget</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">Highest Expense</p>
                <p className="text-3xl font-bold text-blue-600">Salaries</p>
                <p className="text-xs text-muted-foreground mt-2">53.1% of total expenses</p>
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
                        <div className={`flex items-center justify-end ${getTrendColor(expense.trend)}`}>
                          {getTrendIcon(expense.trend)}
                          <span className="ml-1">{expense.trend > 0 ? '+' : ''}{expense.trend}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(expense.budget)}</TableCell>
                      <TableCell>{getStatusBadge(expense.status)}</TableCell>
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
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-white rounded border border-orange-200">
                  <p className="font-medium text-orange-900">Utilities Cost Spike</p>
                  <p className="text-sm text-orange-700">Electricity costs increased by 15.8% this month. Investigate equipment usage patterns.</p>
                </div>
                <div className="p-3 bg-white rounded border border-orange-200">
                  <p className="font-medium text-orange-900">Marketing Over Budget</p>
                  <p className="text-sm text-orange-700">Marketing expenses at 88.6% of budget with 5 days remaining in the month.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Inventory & Purchase Optimization Module */}
        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-[#2B7A78]" />
                Supplier Cost Comparison & Optimization
              </CardTitle>
              <CardDescription>Identify cost inflation and switch to better suppliers</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Current Supplier</TableHead>
                    <TableHead className="text-right">Current Cost</TableHead>
                    <TableHead className="text-right">Cost Change</TableHead>
                    <TableHead>Alternative</TableHead>
                    <TableHead className="text-right">Alt. Cost</TableHead>
                    <TableHead className="text-right">Saving</TableHead>
                    <TableHead>Recommendation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryInsights.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.item}</TableCell>
                      <TableCell>{item.currentSupplier}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.currentCost)}</TableCell>
                      <TableCell className="text-right">
                        {item.inflation > 0 ? (
                          <Badge className="bg-red-100 text-red-800">+{item.inflation}%</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">No change</Badge>
                        )}
                      </TableCell>
                      <TableCell>{item.alternativeSupplier || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        {item.alternativeCost ? formatCurrency(item.alternativeCost) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.potentialSaving > 0 ? (
                          <span className="text-green-600 font-semibold">-{item.potentialSaving}%</span>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={item.recommendation.includes('Switch') ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}>
                          {item.recommendation}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                Dead Stock Alert
              </CardTitle>
              <CardDescription className="text-red-700">Items not moving for 45+ days</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Days Stagnant</TableHead>
                    <TableHead>Recommendation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deadStock.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.item}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">{formatCurrency(item.value)}</TableCell>
                      <TableCell className="text-right">{item.daysStagnant} days</TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-800">{item.recommendation}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 p-3 bg-white rounded border border-red-200">
                <p className="font-semibold text-red-900">Total Dead Stock Value: {formatCurrency(deadStock.reduce((sum, item) => sum + item.value, 0))}</p>
                <p className="text-sm text-red-700 mt-1">Immediate action required to recover capital</p>
              </div>
            </CardContent>
          </Card>
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
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Attendance</p>
                          <p className="font-semibold">{staff.attendance}%</p>
                          <Progress value={staff.attendance} className="h-1 mt-1" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Punctuality</p>
                          <p className="font-semibold">{staff.punctuality}%</p>
                          <Progress value={staff.punctuality} className="h-1 mt-1" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">PT Sessions</p>
                          <p className="font-semibold">{staff.ptSessions}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Member Rating</p>
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                            <p className="font-semibold">{staff.memberFeedback}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Commission</p>
                          <p className="font-semibold">{formatCurrency(staff.commission)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Attrition Risk</p>
                          <Badge className={`${staff.attritionRisk === 'low' ? 'bg-green-100 text-green-800' : staff.attritionRisk === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                            {staff.attritionRisk}
                          </Badge>
                        </div>
                      </div>

                      {staff.performance === 'excellent' && (
                        <div className="mt-3 p-2 bg-green-100 rounded">
                          <p className="text-xs text-green-800">
                            <strong>AI Recommendation:</strong> {staff.name} is a top performer. Consider promotion or increased PT incentives.
                          </p>
                        </div>
                      )}
                      {staff.performance === 'needs improvement' && (
                        <div className="mt-3 p-2 bg-orange-100 rounded">
                          <p className="text-xs text-orange-800">
                            <strong>AI Recommendation:</strong> Schedule performance review and provide additional training support.
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {memberSegments.map((segment, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-base">{segment.segment}</CardTitle>
                  <CardDescription>{segment.count} members</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Check-in Freq</span>
                      <span className="font-semibold">{segment.checkInFreq}/week</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Class Participation</span>
                      <span className="font-semibold">{segment.classParticipation}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg Purchases</span>
                      <span className="font-semibold">{segment.purchases}/month</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-sm">Renewal Likelihood</span>
                      <Badge className={`${segment.renewalLikelihood > 80 ? 'bg-green-100 text-green-800' : segment.renewalLikelihood > 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {segment.renewalLikelihood}%
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Churn Risk</span>
                      <Badge className={`${segment.churnRisk < 20 ? 'bg-green-100 text-green-800' : segment.churnRisk < 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {segment.churnRisk}%
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Lifetime Value</span>
                      <span className="font-bold text-green-600">{formatCurrency(segment.ltv)}</span>
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
                Churn Risk Predictions
              </CardTitle>
              <CardDescription className="text-red-700">AI-identified members at risk of cancellation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {churnPredictions.map((prediction, index) => (
                  <div key={index} className="p-4 bg-white rounded border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-red-900">{prediction.member}</h4>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(prediction.priority)}>
                          {prediction.priority}
                        </Badge>
                        <Badge className="bg-red-100 text-red-800">
                          {prediction.churnProbability}% risk
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">Last visit: {prediction.lastVisit}</p>
                    <div className="p-2 bg-blue-50 rounded">
                      <p className="text-sm text-blue-900">
                        <strong>AI Recommendation:</strong> {prediction.recommendation}
                      </p>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" className="bg-[#2B7A78] hover:bg-[#236663]">
                        <Send className="h-3 w-3 mr-1" />
                        Send Offer
                      </Button>
                      <Button size="sm" variant="outline">
                        <Phone className="h-3 w-3 mr-1" />
                        Call Member
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. Revenue Prediction & Forecasting Module */}
        <TabsContent value="forecast" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUpDown className="h-5 w-5 text-[#2B7A78]" />
                Revenue Forecast (Next 90 Days + Q3)
              </CardTitle>
              <CardDescription>AI-powered predictions based on historical data and trends</CardDescription>
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
                          {forecast.confidence}% confidence
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
                  <Area type="monotone" dataKey="upper" fill="#2B7A78" fillOpacity={0.1} stroke="none" name="Upper Bound" />
                  <Area type="monotone" dataKey="lower" fill="#2B7A78" fillOpacity={0.1} stroke="none" name="Lower Bound" />
                  <Line type="monotone" dataKey="predicted" stroke="#2B7A78" strokeWidth={3} name="Predicted Revenue" />
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
                <CardTitle className="text-base text-green-900">AI Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-white rounded border border-green-200">
                    <p className="text-sm text-green-900">
                      <Sparkles className="h-4 w-4 inline mr-1" />
                      <strong>Q3 Revenue Projection:</strong> Based on current trends, Q3 revenue is likely to increase by 12% compared to Q2.
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded border border-green-200">
                    <p className="text-sm text-green-900">
                      <AlertTriangle className="h-4 w-4 inline mr-1 text-orange-600" />
                      <strong>Expense Alert:</strong> Prepare for higher expenses in July due to seasonal energy usage patterns.
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded border border-green-200">
                    <p className="text-sm text-green-900">
                      <TrendingUp className="h-4 w-4 inline mr-1" />
                      <strong>Profit Forecast:</strong> Net profit expected to exceed monthly target by 14% if current trends continue.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 8. Business Positioning Module */}
        <TabsContent value="positioning" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-[#2B7A78]" />
                Business Position Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <p className="text-6xl font-bold text-[#2B7A78]">{businessScore.overall}</p>
                <p className="text-xl text-muted-foreground">out of 10</p>
                <Progress value={businessScore.overall * 10} className="h-3 mt-4" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 border rounded">
                  <p className="text-xs text-muted-foreground mb-1">Revenue Consistency</p>
                  <p className="text-2xl font-bold">{businessScore.revenueConsistency}</p>
                </div>
                <div className="text-center p-3 border rounded">
                  <p className="text-xs text-muted-foreground mb-1">Market Growth</p>
                  <p className="text-2xl font-bold">{businessScore.marketGrowth}</p>
                </div>
                <div className="text-center p-3 border rounded">
                  <p className="text-xs text-muted-foreground mb-1">Customer Sentiment</p>
                  <p className="text-2xl font-bold">{businessScore.customerSentiment}</p>
                </div>
                <div className="text-center p-3 border rounded">
                  <p className="text-xs text-muted-foreground mb-1">Pricing</p>
                  <p className="text-2xl font-bold">{businessScore.pricingCompetitiveness}</p>
                </div>
                <div className="text-center p-3 border rounded">
                  <p className="text-xs text-muted-foreground mb-1">Acquisition</p>
                  <p className="text-2xl font-bold">{businessScore.memberAcquisition}</p>
                </div>
                <div className="text-center p-3 border rounded">
                  <p className="text-xs text-muted-foreground mb-1">Stability</p>
                  <p className="text-2xl font-bold">{businessScore.stabilityIndex}</p>
                </div>
                <div className="text-center p-3 border rounded">
                  <p className="text-xs text-muted-foreground mb-1">Scalability</p>
                  <p className="text-2xl font-bold">{businessScore.scalabilityReadiness}</p>
                </div>
                <div className="text-center p-3 border rounded bg-green-50">
                  <p className="text-xs text-muted-foreground mb-1">Overall</p>
                  <p className="text-2xl font-bold text-green-600">{businessScore.overall}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {swotAnalysis.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <AlertCircle className="h-5 w-5" />
                  Weaknesses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {swotAnalysis.weaknesses.map((weakness, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <XCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                      <span>{weakness}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <Lightbulb className="h-5 w-5" />
                  Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {swotAnalysis.opportunities.map((opportunity, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <ChevronRight className="h-5 w-5 text-blue-500 mt-0.5" />
                      <span>{opportunity}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Shield className="h-5 w-5" />
                  Threats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {swotAnalysis.threats.map((threat, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                      <span>{threat}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 9. Asset & Equipment Management Module */}
        <TabsContent value="assets" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">Total Asset Value</p>
                <p className="text-3xl font-bold">{formatCurrency(assetDepreciation.total)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">Current Value</p>
                <p className="text-3xl font-bold text-blue-600">{formatCurrency(assetDepreciation.currentValue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">Annual Depreciation</p>
                <p className="text-3xl font-bold text-orange-600">{formatCurrency(assetDepreciation.annualDepreciation)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-[#2B7A78]" />
                Equipment Status & Maintenance Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {assetData.map((asset, index) => (
                  <Card key={index} className={asset.status === 'needs-service' ? 'border-orange-300 bg-orange-50' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold">{asset.asset}</h4>
                        <Badge className={asset.status === 'good' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                          {asset.status === 'good' ? 'Good' : 'Needs Service'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 mb-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Utilization</p>
                          <p className="font-semibold">{asset.utilizationRate}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Last Service</p>
                          <p className="font-semibold">{asset.lastService}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Next Service</p>
                          <p className={`font-semibold ${asset.nextService === 'Overdue' ? 'text-red-600' : ''}`}>
                            {asset.nextService}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Repair Cost</p>
                          <p className="font-semibold">{asset.repairCost > 0 ? formatCurrency(asset.repairCost) : 'N/A'}</p>
                        </div>
                      </div>

                      <div className="p-2 bg-blue-50 rounded">
                        <p className="text-xs text-blue-900">
                          <strong>AI Recommendation:</strong> {asset.recommendation}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 10. Financial Health Module */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">DTI Ratio</p>
                <p className="text-3xl font-bold text-green-600">{financialHealth.dtiRatio}</p>
                <p className="text-xs text-muted-foreground mt-1">Healthy (below 0.35)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">Cash Reserve</p>
                <p className="text-3xl font-bold text-blue-600">{financialHealth.cashReserveDays} days</p>
                <p className="text-xs text-muted-foreground mt-1">Adequate (30+ days)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">Financial Risk Score</p>
                <p className="text-3xl font-bold text-green-600">{financialHealth.financialRiskScore}/10</p>
                <p className="text-xs text-muted-foreground mt-1">Low Risk (below 4.0)</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Loans & Liabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {financialHealth.loans.map((loan, index) => (
                  <div key={index} className="p-4 border rounded">
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">{loan.type}</span>
                      <span className="font-bold text-orange-600">{formatCurrency(loan.outstanding)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Monthly Payment: {formatCurrency(loan.monthly)}</span>
                      <span>{loan.remaining} months remaining</span>
                    </div>
                    <Progress value={(1 - loan.remaining / 36) * 100} className="h-1 mt-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between p-3 border rounded">
                    <span>Vendor Payables</span>
                    <span className="font-bold text-orange-600">{formatCurrency(financialHealth.vendorPayables)}</span>
                  </div>
                  <div className="flex justify-between p-3 border rounded">
                    <span>Member Pending Payments</span>
                    <span className="font-bold text-blue-600">{formatCurrency(financialHealth.memberPending)}</span>
                  </div>
                  <div className="flex justify-between p-3 border rounded">
                    <span>Credit Receipts</span>
                    <span className="font-bold text-green-600">{formatCurrency(financialHealth.creditReceipts)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-base text-green-900">Financial Health Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <p className="text-sm">Debt-to-income ratio is healthy at 0.28</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <p className="text-sm">Cash reserves can cover 45 days of operations</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <p className="text-sm">Financial risk score is low (2.8/10)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                    <p className="text-sm">Recommendation: Continue maintaining healthy cash flow</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 11. AI-LIVE Strategic Recommendations Module */}
        <TabsContent value="ai-live" className="space-y-6">
          <Card className="border-2 border-[#2B7A78] bg-gradient-to-r from-[#2B7A78]/5 to-[#2B7A78]/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#2B7A78]">
                <Sparkles className="h-6 w-6" />
                AI-LIVE™ Strategic Recommendations Engine
              </CardTitle>
              <CardDescription>Intelligent business consultant providing actionable insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {aiRecommendations.map((rec, index) => {
                  const Icon = rec.icon;
                  return (
                    <Card key={index} className={`border-2 ${getPriorityColor(rec.priority)}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-3 rounded-lg ${rec.priority === 'critical' ? 'bg-red-100' : rec.priority === 'high' ? 'bg-orange-100' : rec.priority === 'medium' ? 'bg-yellow-100' : 'bg-green-100'}`}>
                            <Icon className={`h-6 w-6 ${rec.priority === 'critical' ? 'text-red-600' : rec.priority === 'high' ? 'text-orange-600' : rec.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'}`} />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-bold text-lg">{rec.title}</h3>
                              <Badge className={getPriorityColor(rec.priority)}>
                                {rec.priority.toUpperCase()} PRIORITY
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2">
                              <strong>Category:</strong> {rec.category}
                            </p>
                            
                            <div className="p-3 bg-blue-50 rounded-lg mb-3">
                              <p className="text-sm font-medium text-blue-900">📊 Insight:</p>
                              <p className="text-sm text-blue-800">{rec.insight}</p>
                            </div>
                            
                            <div className="p-3 bg-green-50 rounded-lg mb-3">
                              <p className="text-sm font-medium text-green-900">✅ Recommended Action:</p>
                              <p className="text-sm text-green-800">{rec.action}</p>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">Projected Impact</p>
                                <p className="text-xl font-bold text-[#2B7A78]">{rec.impact}</p>
                                <p className="text-xs text-muted-foreground">{rec.savings}</p>
                              </div>
                              
                              <div className="flex gap-2">
                                <Button className="bg-[#2B7A78] hover:bg-[#236663]">
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Implement
                                </Button>
                                <Button variant="outline">
                                  <Eye className="h-4 w-4 mr-1" />
                                  Details
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-900">💡 Quick Wins Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-purple-800">
                  <strong>Total Potential Monthly Savings:</strong> {formatCurrency(850 + 1200)}
                </p>
                <p className="text-sm text-purple-800">
                  <strong>Total Potential Monthly Revenue Increase:</strong> {formatCurrency(2400 + 4500)}
                </p>
                <p className="text-sm text-purple-800">
                  <strong>Members at Risk Identified:</strong> 67 (immediate action required)
                </p>
                <p className="text-sm text-purple-800">
                  <strong>Projected New Members:</strong> 42 from referral campaign
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 12. Business Growth Strategy Module */}
        <TabsContent value="strategy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-[#2B7A78]" />
                Business Growth Strategy Report
              </CardTitle>
              <CardDescription>Auto-generated quarterly strategic analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2 text-green-600">
                      <TrendingUp className="h-5 w-5" />
                      Growing Areas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {growthStrategy.growingAreas.map((area, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          <span>{area}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2 text-red-600">
                      <TrendingDown className="h-5 w-5" />
                      Declining Areas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {growthStrategy.decliningAreas.map((area, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-red-500" />
                          <span>{area}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2 text-blue-600">
                      <Lightbulb className="h-5 w-5" />
                      Market Opportunities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {growthStrategy.opportunities.map((opp, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <ChevronRight className="h-5 w-5 text-blue-500" />
                          <span>{opp}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2 text-orange-600">
                      <AlertCircle className="h-5 w-5" />
                      Internal Inefficiencies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {growthStrategy.inefficiencies.map((issue, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-500" />
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Separator className="my-6" />

              <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                <CardHeader>
                  <CardTitle className="text-purple-900">🚀 Expansion Readiness Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-purple-800 mb-4">{growthStrategy.expansionReadiness}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-white rounded border border-purple-200">
                      <p className="text-sm font-medium text-purple-900">Financial Readiness</p>
                      <Progress value={70} className="h-2 mt-2" />
                      <p className="text-xs text-purple-700 mt-1">70% - Good</p>
                    </div>
                    <div className="p-3 bg-white rounded border border-purple-200">
                      <p className="text-sm font-medium text-purple-900">Operational Capacity</p>
                      <Progress value={65} className="h-2 mt-2" />
                      <p className="text-xs text-purple-700 mt-1">65% - Needs Improvement</p>
                    </div>
                    <div className="p-3 bg-white rounded border border-purple-200">
                      <p className="text-sm font-medium text-purple-900">Market Positioning</p>
                      <Progress value={82} className="h-2 mt-2" />
                      <p className="text-xs text-purple-700 mt-1">82% - Excellent</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline">
              <Share2 className="h-4 w-4 mr-2" />
              Share Report
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button className="bg-[#E63946] hover:bg-[#d32f3f]">
              <Send className="h-4 w-4 mr-2" />
              Email to Board
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
