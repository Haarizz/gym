import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { 
  Brain,
  Monitor,
  Gauge,
  TrendingUpDown,
  DollarSign,
  Users,
  Activity,
  Target,
  Download,
  TrendingUp,
  TrendingDown,
  Eye,
  Settings,
  Filter,
  RefreshCw,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Globe,
  Building2,
  UserCheck,
  CreditCard,
  FileText,
  ArrowUp,
  ArrowDown,
  Minus,
  Plus,
  Star,
  Award,
  Briefcase,
  TrendingUpDown as TrendingIcon,
  Database,
  FileSpreadsheet,
  FileBarChart,
  Package,
  ShoppingCart,
  Calendar as CalendarIcon,
  Users as UsersIcon,
  Bell
} from 'lucide-react';

// Sample data for top-level KPIs
const topKPIs = {
  totalRevenue: 125750,
  activeMembers: 847,
  retentionRate: 89.5,
  monthlyGrowth: 12.3
};

// Sample data for revenue trends
const revenueData = [
  { month: 'Jan', revenue: 98500, target: 95000 },
  { month: 'Feb', revenue: 105200, target: 100000 },
  { month: 'Mar', revenue: 112800, target: 110000 },
  { month: 'Apr', revenue: 118900, target: 115000 },
  { month: 'May', revenue: 125750, target: 120000 },
  { month: 'Jun', revenue: 132100, target: 125000 }
];

const membershipData = [
  { month: 'Jan', members: 789, retention: 87.2, churn: 12.8 },
  { month: 'Feb', members: 801, retention: 88.1, churn: 11.9 },
  { month: 'Mar', members: 823, retention: 89.5, churn: 10.5 },
  { month: 'Apr', members: 835, retention: 88.9, churn: 11.1 },
  { month: 'May', members: 847, retention: 89.5, churn: 10.5 },
  { month: 'Jun', members: 862, retention: 90.2, churn: 9.8 }
];

const revenueBySource = [
  { source: 'Memberships', amount: 85200, percentage: 67.8, color: '#3b82f6' },
  { source: 'Personal Training', amount: 22400, percentage: 17.8, color: '#10b981' },
  { source: 'Group Classes', amount: 12300, percentage: 9.8, color: '#f59e0b' },
  { source: 'Retail & Supplements', amount: 4850, percentage: 3.9, color: '#ef4444' },
  { source: 'Other Services', amount: 1000, percentage: 0.8, color: '#8b5cf6' }
];

const performanceMetrics = [
  { metric: 'Daily Check-ins', current: 245, target: 280, trend: 'up', change: 8.2 },
  { metric: 'Class Occupancy', current: 78, target: 85, trend: 'up', change: 5.1 },
  { metric: 'Staff Efficiency', current: 92, target: 90, trend: 'up', change: 2.3 },
  { metric: 'Equipment Utilization', current: 67, target: 75, trend: 'down', change: -3.4 }
];

const predictiveInsights = [
  {
    insight: 'Member Churn Risk',
    prediction: '23 members at high risk',
    confidence: 87,
    timeframe: 'Next 30 days',
    action: 'Schedule retention calls',
    priority: 'High'
  },
  {
    insight: 'Revenue Forecast',
    prediction: '138,500 AED next month',
    confidence: 92,
    timeframe: 'June 2024',
    action: 'Increase marketing spend',
    priority: 'Medium'
  },
  {
    insight: 'Peak Hours Prediction',
    prediction: '6-8 PM will be 15% busier',
    confidence: 89,
    timeframe: 'Next week',
    action: 'Schedule extra staff',
    priority: 'Medium'
  },
  {
    insight: 'Equipment Maintenance',
    prediction: '3 machines need service',
    confidence: 95,
    timeframe: 'Next 2 weeks',
    action: 'Schedule maintenance',
    priority: 'High'
  }
];

const memberAnalytics = [
  { segment: 'Premium Members', count: 156, engagement: 95, ltv: 4500 },
  { segment: 'Regular Members', count: 423, engagement: 78, ltv: 2800 },
  { segment: 'Basic Members', count: 268, engagement: 65, ltv: 1600 },
  { segment: 'Student Members', count: 89, engagement: 72, ltv: 1200 }
];

const benchmarkData = [
  { metric: 'Revenue per Member', value: 148.5, industry: 135.2, performance: 'above' },
  { metric: 'Member Retention', value: 89.5, industry: 82.1, performance: 'above' },
  { metric: 'Class Utilization', value: 78.2, industry: 74.8, performance: 'above' },
  { metric: 'Staff Efficiency', value: 92.1, industry: 88.5, performance: 'above' },
  { metric: 'Operating Margin', value: 23.8, industry: 26.4, performance: 'below' }
];

const recentReports = [
  {
    report: 'Monthly Financial Summary',
    type: 'Financial',
    generated: '2024-09-25',
    downloads: 12,
    status: 'Available'
  },
  {
    report: 'Member Engagement Analysis',
    type: 'Analytics',
    generated: '2024-09-24',
    downloads: 8,
    status: 'Available'
  },
  {
    report: 'Equipment Utilization Report',
    type: 'Operational',
    generated: '2024-09-23',
    downloads: 15,
    status: 'Available'
  },
  {
    report: 'Staff Performance Review',
    type: 'HR',
    generated: '2024-09-22',
    downloads: 6,
    status: 'Available'
  }
];

const recentExports = [
  {
    dataset: 'Member Data Export',
    format: 'CSV',
    exported: '2024-09-25 14:30',
    size: '2.3 MB',
    records: 847
  },
  {
    dataset: 'Revenue Analytics',
    format: 'Excel',
    exported: '2024-09-24 16:45',
    size: '1.8 MB',
    records: 1250
  },
  {
    dataset: 'Class Schedule Data',
    format: 'JSON',
    exported: '2024-09-23 10:15',
    size: '0.9 MB',
    records: 320
  }
];

export function BiOS() {
  const getCurrentPeriod = () => {
    return new Date().toLocaleDateString('en-GB', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} AED`;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case 'above': return 'text-green-600';
      case 'below': return 'text-red-600';
      case 'equal': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">BiOS</h1>
          <p className="text-gray-600 mt-1">
            Business Intelligence Operating System - Advanced Analytics & Strategic Insights for {getCurrentPeriod()}
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Dashboard
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Top-Level KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(topKPIs.totalRevenue)}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+{topKPIs.monthlyGrowth}% this month</span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Members</p>
                <p className="text-2xl font-bold text-blue-600">
                  {topKPIs.activeMembers.toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  <Users className="h-4 w-4 text-blue-500 mr-1" />
                  <span className="text-sm text-blue-600">+15 new this week</span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Retention Rate</p>
                <p className="text-2xl font-bold text-purple-600">
                  {topKPIs.retentionRate}%
                </p>
                <div className="flex items-center mt-2">
                  <UserCheck className="h-4 w-4 text-purple-500 mr-1" />
                  <span className="text-sm text-purple-600">+2.1% vs last month</span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Growth</p>
                <p className="text-2xl font-bold text-orange-600">
                  +{topKPIs.monthlyGrowth}%
                </p>
                <div className="flex items-center mt-2">
                  <TrendingIcon className="h-4 w-4 text-orange-500 mr-1" />
                  <span className="text-sm text-orange-600">Revenue increase</span>
                </div>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BiOS Sub-Head Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Executive Dashboard */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Monitor className="h-5 w-5 text-blue-600" />
                <CardTitle>Executive Dashboard</CardTitle>
              </div>
              <Button variant="outline" size="sm">View Details</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Revenue Growth</span>
                <span className="font-semibold text-green-600">+12.3%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Member Growth</span>
                <span className="font-semibold text-blue-600">+8.7%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Profit Margin</span>
                <span className="font-semibold text-purple-600">23.8%</span>
              </div>
              <Progress value={89} className="h-2" />
              <p className="text-xs text-gray-500">Overall business health: Excellent</p>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm">
                  <BarChart3 className="h-4 w-4 mr-1" />
                  KPI Report
                </Button>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Intelligence */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-purple-600" />
                <CardTitle>Business Intelligence</CardTitle>
              </div>
              <Button variant="outline" size="sm">Analyze</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Data Sources</span>
                <Badge className="bg-green-100 text-green-800">8 Active</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Latest Insights</span>
                <span className="text-sm">2 hours ago</span>
              </div>
              <div className="space-y-2">
                <div className="text-sm p-2 bg-blue-50 rounded">
                  <div className="font-medium text-blue-800">Peak Hours Identified</div>
                  <div className="text-blue-600 text-xs">6-8 PM shows 40% higher engagement</div>
                </div>
                <div className="text-sm p-2 bg-green-50 rounded">
                  <div className="font-medium text-green-800">Revenue Opportunity</div>
                  <div className="text-green-600 text-xs">Personal training has 25% growth potential</div>
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  View Insights
                </Button>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4 mr-1" />
                  Configure
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Gauge className="h-5 w-5 text-green-600" />
                <CardTitle>Performance Metrics</CardTitle>
              </div>
              <Button variant="outline" size="sm">Monitor</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {performanceMetrics.slice(0, 3).map((metric, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{metric.metric}</span>
                  <div className="flex items-center space-x-2">
                    {getTrendIcon(metric.trend)}
                    <span className="text-sm font-medium">{metric.current}{metric.metric.includes('Rate') || metric.metric.includes('Efficiency') || metric.metric.includes('Occupancy') || metric.metric.includes('Utilization') ? '%' : ''}</span>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Overall Performance</span>
                  <span>82%</span>
                </div>
                <Progress value={82} className="h-2" />
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm">
                  <Activity className="h-4 w-4 mr-1" />
                  Live View
                </Button>
                <Button variant="ghost" size="sm">
                  <Calendar className="h-4 w-4 mr-1" />
                  Schedule
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Predictive Analytics */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUpDown className="h-5 w-5 text-orange-600" />
                <CardTitle>Predictive Analytics</CardTitle>
              </div>
              <Button variant="outline" size="sm">Predict</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">AI Predictions</span>
                <Badge className="bg-blue-100 text-blue-800">4 Active</Badge>
              </div>
              <div className="space-y-2">
                {predictiveInsights.slice(0, 2).map((insight, index) => (
                  <div key={index} className="text-sm p-2 bg-orange-50 rounded">
                    <div className="font-medium text-orange-800">{insight.insight}</div>
                    <div className="text-orange-600 text-xs">{insight.prediction}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Confidence Avg.</span>
                <span className="text-sm font-medium">89.5%</span>
              </div>
              <Progress value={89.5} className="h-2" />
              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm">
                  <Zap className="h-4 w-4 mr-1" />
                  Auto-Alert
                </Button>
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  View All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Analytics */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <CardTitle>Revenue Analytics</CardTitle>
              </div>
              <Button variant="outline" size="sm">Analyze</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Monthly Revenue</span>
                <span className="font-semibold text-green-600">{formatCurrency(topKPIs.totalRevenue)}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Memberships</span>
                  <span>67.8%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Personal Training</span>
                  <span>17.8%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Group Classes</span>
                  <span>9.8%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Growth Rate</span>
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+12.3%</span>
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm">
                  <PieChartIcon className="h-4 w-4 mr-1" />
                  Breakdown
                </Button>
                <Button variant="ghost" size="sm">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Trends
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Member Analytics */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <CardTitle>Member Analytics</CardTitle>
              </div>
              <Button variant="outline" size="sm">Segment</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Members</span>
                <span className="font-semibold text-blue-600">{topKPIs.activeMembers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Retention Rate</span>
                <span className="font-semibold text-green-600">{topKPIs.retentionRate}%</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Premium Segment</span>
                  <span>156 (18%)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Regular Segment</span>
                  <span>423 (50%)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Basic Segment</span>
                  <span>268 (32%)</span>
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm">
                  <UsersIcon className="h-4 w-4 mr-1" />
                  Segments
                </Button>
                <Button variant="ghost" size="sm">
                  <Target className="h-4 w-4 mr-1" />
                  Retention
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operational Reports */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-cyan-600" />
                <CardTitle>Operational Reports</CardTitle>
              </div>
              <Button variant="outline" size="sm">Generate</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Reports Generated</span>
                <span className="font-semibold">24 this month</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Last Generated</span>
                <span className="text-sm">2 hours ago</span>
              </div>
              <div className="space-y-2">
                {recentReports.slice(0, 2).map((report, index) => (
                  <div key={index} className="text-sm p-2 bg-cyan-50 rounded">
                    <div className="font-medium text-cyan-800">{report.report}</div>
                    <div className="text-cyan-600 text-xs">{report.type} • {report.downloads} downloads</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm">
                  <FileText className="h-4 w-4 mr-1" />
                  View All
                </Button>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benchmarking */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-red-600" />
                <CardTitle>Benchmarking</CardTitle>
              </div>
              <Button variant="outline" size="sm">Compare</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Industry Comparison</span>
                <Badge className="bg-green-100 text-green-800">Above Average</Badge>
              </div>
              <div className="space-y-2">
                {benchmarkData.slice(0, 3).map((benchmark, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{benchmark.metric}</span>
                    <div className="flex items-center">
                      {benchmark.performance === 'above' ? (
                        <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm ${getPerformanceColor(benchmark.performance)}`}>
                        {benchmark.value}{benchmark.metric.includes('Revenue') ? ' AED' : '%'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm">
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Full Report
                </Button>
                <Button variant="ghost" size="sm">
                  <Globe className="h-4 w-4 mr-1" />
                  Industry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Export */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Download className="h-5 w-5 text-gray-600" />
                <CardTitle>Data Export</CardTitle>
              </div>
              <Button variant="outline" size="sm">Export</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Recent Exports</span>
                <span className="font-semibold">3 this week</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Records</span>
                <span className="font-semibold">2,417</span>
              </div>
              <div className="space-y-2">
                {recentExports.slice(0, 2).map((export_, index) => (
                  <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                    <div className="font-medium text-gray-800">{export_.dataset}</div>
                    <div className="text-gray-600 text-xs">{export_.format} • {export_.size} • {export_.records} records</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm">
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Quick Export
                </Button>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4 mr-1" />
                  Configure
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section - Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trends Chart */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span>Revenue vs Target Trends</span>
                </CardTitle>
                <CardDescription>Monthly performance against targets</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`${(value/1000).toFixed(0)}K AED`, '']} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Actual Revenue" strokeWidth={2} />
                <Line type="monotone" dataKey="target" stroke="#6b7280" name="Target" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Member Analytics Chart */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span>Member Growth & Retention</span>
                </CardTitle>
                <CardDescription>Member metrics over the last 6 months</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={membershipData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="members" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Total Members" />
                <Line type="monotone" dataKey="retention" stroke="#10b981" name="Retention %" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Section */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-purple-600" />
            <span>Quick Analytics Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Button variant="outline" className="h-16 flex-col space-y-1">
              <FileBarChart className="h-6 w-6" />
              <span className="text-xs">Generate Report</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col space-y-1">
              <Download className="h-6 w-6" />
              <span className="text-xs">Export Data</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col space-y-1">
              <Target className="h-6 w-6" />
              <span className="text-xs">Set Targets</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col space-y-1">
              <CalendarIcon className="h-6 w-6" />
              <span className="text-xs">Schedule Report</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col space-y-1">
              <Bell className="h-6 w-6" />
              <span className="text-xs">Set Alerts</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col space-y-1">
              <Settings className="h-6 w-6" />
              <span className="text-xs">Configure</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

