import React, { useCallback, useEffect, useState } from 'react';
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
import { toast } from 'sonner';
import { aiService, type AIInsight, type GymDataContext } from '../utils/ai-service';
import { attendanceService } from '../utils/supabase/attendance-service';
import { expensesService } from '../utils/supabase/expenses-service';
import { financialAnalyticsService } from '../utils/supabase/financial-analytics-service';
import { membersService } from '../utils/supabase/members-service';
import { useBranch } from '../utils/branch-context';
import { useCurrency, CurrencyValue, CurrencyGlyph } from '../utils/currency';

type RevenueChartPoint = {
  month: string;
  revenue: number;
  target: number;
};

type MemberChartPoint = {
  month: string;
  members: number;
  retention: number;
  churn: number;
};

type RevenueSourcePoint = {
  source: string;
  amount: number;
  percentage: number;
  color: string;
};

type PerformanceMetricPoint = {
  metric: string;
  current: number;
  target: number;
  trend: 'up' | 'down' | 'neutral';
  change: number;
};

type BenchmarkPoint = {
  metric: string;
  value: number;
  industry: number;
  performance: 'above' | 'below' | 'equal';
};

type MemberSegmentPoint = {
  segment: string;
  count: number;
  percentage: number;
};

// Sample data for top-level KPIs
const topKPIs = {
  totalRevenue: 125750,
  activeMembers: 847,
  retentionRate: 89.5,
  monthlyGrowth: 12.3
};

// Sample data for revenue trends
const revenueData: RevenueChartPoint[] = [
  { month: 'Jan', revenue: 98500, target: 95000 },
  { month: 'Feb', revenue: 105200, target: 100000 },
  { month: 'Mar', revenue: 112800, target: 110000 },
  { month: 'Apr', revenue: 118900, target: 115000 },
  { month: 'May', revenue: 125750, target: 120000 },
  { month: 'Jun', revenue: 132100, target: 125000 }
];

const membershipData: MemberChartPoint[] = [
  { month: 'Jan', members: 789, retention: 87.2, churn: 12.8 },
  { month: 'Feb', members: 801, retention: 88.1, churn: 11.9 },
  { month: 'Mar', members: 823, retention: 89.5, churn: 10.5 },
  { month: 'Apr', members: 835, retention: 88.9, churn: 11.1 },
  { month: 'May', members: 847, retention: 89.5, churn: 10.5 },
  { month: 'Jun', members: 862, retention: 90.2, churn: 9.8 }
];

const revenueBySource: RevenueSourcePoint[] = [
  { source: 'Memberships', amount: 85200, percentage: 67.8, color: '#3b82f6' },
  { source: 'Personal Training', amount: 22400, percentage: 17.8, color: '#10b981' },
  { source: 'Group Classes', amount: 12300, percentage: 9.8, color: '#f59e0b' },
  { source: 'Retail & Supplements', amount: 4850, percentage: 3.9, color: '#ef4444' },
  { source: 'Other Services', amount: 1000, percentage: 0.8, color: '#8b5cf6' }
];

const performanceMetrics: PerformanceMetricPoint[] = [
  { metric: 'Daily Check-ins', current: 245, target: 280, trend: 'up', change: 8.2 },
  { metric: 'Class Occupancy', current: 78, target: 85, trend: 'up', change: 5.1 },
  { metric: 'Staff Efficiency', current: 92, target: 90, trend: 'up', change: 2.3 },
  { metric: 'Equipment Utilization', current: 67, target: 75, trend: 'down', change: -3.4 }
];

const predictiveInsights: AIInsight[] = [
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

const benchmarkData: BenchmarkPoint[] = [
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

const REVENUE_SOURCE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const INDUSTRY_BENCHMARKS = {
  revenuePerMember: 135.2,
  memberRetention: 82.1,
  classUtilization: 74.8,
  staffEfficiency: 88.5,
  operatingMargin: 26.4
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const calculateGrowthRate = (current: number, previous: number) => {
  if (previous <= 0) {
    return 0;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
};

const formatSignedPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

const getMetricState = (
  current: number,
  target: number
): Pick<PerformanceMetricPoint, 'trend' | 'change'> => {
  if (target <= 0) {
    return { trend: 'neutral', change: 0 };
  }

  const change = Number((((current - target) / target) * 100).toFixed(1));

  if (change === 0) {
    return { trend: 'neutral', change };
  }

  return {
    trend: change > 0 ? 'up' : 'down',
    change
  };
};

const getBenchmarkPerformance = (value: number, industry: number): BenchmarkPoint['performance'] => {
  if (Math.abs(value - industry) < 0.1) {
    return 'equal';
  }

  return value > industry ? 'above' : 'below';
};

const parseDateValue = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getRollingMonths = (count: number) => {
  const now = new Date();

  return Array.from({ length: count }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - (count - index - 1), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);

    return {
      label: month.toLocaleDateString('en-GB', { month: 'short' }),
      end
    };
  });
};

const formatSegmentLabel = (value: string) =>
  `${value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase())} Segment`;

export function BiOS() {
  const { formatCurrency, currencyCode } = useCurrency();
  const { activeBranchId } = useBranch();
  const [gymData, setGymData] = useState<GymDataContext | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [revenueChartData, setRevenueChartData] = useState<RevenueChartPoint[]>(revenueData);
  const [memberChartData, setMemberChartData] = useState<MemberChartPoint[]>(membershipData);
  const [aiPredictions, setAiPredictions] = useState<AIInsight[]>(predictiveInsights);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [revenueSourceData, setRevenueSourceData] = useState<RevenueSourcePoint[]>(revenueBySource);

  const loadRealData = useCallback(async () => {
    setDataLoading(true);

    try {
      const [membersResp, attStats, finDash, monthlyTrend, revBySource, expStats] = await Promise.all([
        membersService.getMembers({}, { page: 1, limit: 5000 }).catch(() => ({
          members: [],
          pagination: { page: 1, limit: 5000, total: 0, totalPages: 0 }
        })),
        attendanceService.getAttendanceStats().catch(() => null),
        financialAnalyticsService.getDashboard().catch(() => null),
        financialAnalyticsService.getMonthlyTrend(6).catch(() => []),
        financialAnalyticsService.getRevenueBySource().catch(() => []),
        expensesService.getStats().catch(() => null)
      ]);

      const memberList = membersResp.members;
      const currentMonthKey = getMonthKey(new Date());

      const membershipTypes = memberList.reduce<Record<string, number>>((accumulator, member) => {
        const membershipType = member.membership_type || 'Unknown';
        accumulator[membershipType] = (accumulator[membershipType] || 0) + 1;
        return accumulator;
      }, {});

      const recentJoins = memberList.filter((member) => {
        const joinedAt = parseDateValue(member.join_date || member.membership_start_date || member.created_at);
        return joinedAt ? getMonthKey(joinedAt) === currentMonthKey : false;
      }).length;

      const context: GymDataContext = {
        totalRevenue: finDash?.totalRevenue ?? 0,
        totalExpenses: finDash?.totalExpenses ?? 0,
        netIncome: finDash?.netIncome ?? 0,
        profitMargin: finDash?.profitMargin ?? 0,
        monthlyTrend: monthlyTrend.map((point) => ({
          month: point.month,
          revenue: point.revenue,
          expenses: point.expenses,
          profit: point.profit
        })),
        revenueBySource: revBySource.map((entry) => ({
          source: entry.source,
          amount: entry.amount
        })),
        totalMembers: memberList.length,
        activeMembers: memberList.filter((member) => member.membership_status === 'active').length,
        expiredMembers: memberList.filter((member) => member.membership_status === 'expired').length,
        overdueMembers: memberList.filter((member) => member.payment_status === 'overdue').length,
        suspendedMembers: memberList.filter((member) => member.membership_status === 'suspended').length,
        membershipTypes,
        recentJoins,
        todayCheckIns: attStats?.totalToday ?? 0,
        avgSessionMinutes: attStats?.averageDuration ?? 0,
        peakHours: attStats?.peakHours ?? {},
        expensesByCategory: expStats?.byCategory ?? {},
        currencyCode
      };

      setGymData(context);

      const rollingMonths = getRollingMonths(6);
      const liveRevenueChart = monthlyTrend.length > 0
        ? monthlyTrend.map((point) => ({
            month: point.month,
            revenue: Math.round(point.revenue),
            target: Math.round(point.revenue * 0.92)
          }))
        : rollingMonths.map(({ label }) => ({
            month: label,
            revenue: 0,
            target: 0
          }));

      setRevenueChartData(liveRevenueChart);

      const liveMemberChart = rollingMonths.map(({ label, end }) => {
        const membersInPeriod = memberList.filter((member) => {
          const joinedAt = parseDateValue(member.join_date || member.membership_start_date || member.created_at);
          return joinedAt ? joinedAt <= end : false;
        });

        const activeMembersInPeriod = membersInPeriod.filter((member) => member.membership_status === 'active').length;
        const retention = membersInPeriod.length > 0
          ? Number(((activeMembersInPeriod / membersInPeriod.length) * 100).toFixed(1))
          : 0;

        return {
          month: label,
          members: membersInPeriod.length,
          retention,
          churn: Number((100 - retention).toFixed(1))
        };
      });

      setMemberChartData(liveMemberChart);

      const sortedRevenueSources = [...revBySource].sort((first, second) => second.amount - first.amount);
      const liveRevenueSources = (sortedRevenueSources.length > 0
        ? sortedRevenueSources
        : revenueBySource.map((entry) => ({ source: entry.source, amount: 0 }))).map((entry, index) => ({
          source: entry.source,
          amount: entry.amount,
          percentage: context.totalRevenue > 0
            ? Number(((entry.amount / context.totalRevenue) * 100).toFixed(1))
            : 0,
          color: REVENUE_SOURCE_COLORS[index % REVENUE_SOURCE_COLORS.length]
        }));

      setRevenueSourceData(liveRevenueSources);
    } catch {
      toast.error('Failed to load BiOS data');
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRealData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);

  const handlePredict = async () => {
    if (!gymData) {
      return;
    }

    setPredictionsLoading(true);

    try {
      const insights = await aiService.generatePredictiveInsights(gymData);

      if (insights.length === 0) {
        toast.error('Prediction update failed');
        return;
      }

      setAiPredictions(insights);
      toast.success('Predictions updated');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Prediction update failed';
      toast.error(message);
    } finally {
      setPredictionsLoading(false);
    }
  };

  const getCurrentPeriod = () => {
    return new Date().toLocaleDateString('en-GB', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
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

  const hasGymData = gymData !== null;
  const totalRevenue = gymData?.totalRevenue ?? topKPIs.totalRevenue;
  const activeMembers = gymData?.activeMembers ?? topKPIs.activeMembers;
  const totalMembers = hasGymData ? gymData.totalMembers : topKPIs.activeMembers;
  const retentionRate = hasGymData
    ? (gymData.totalMembers > 0
        ? Number(((gymData.activeMembers / gymData.totalMembers) * 100).toFixed(1))
        : 0)
    : topKPIs.retentionRate;

  const lastRevenuePoint = hasGymData && revenueChartData.length > 0 ? revenueChartData[revenueChartData.length - 1] : null;
  const previousRevenuePoint = hasGymData && revenueChartData.length > 1 ? revenueChartData[revenueChartData.length - 2] : null;
  const revenueGrowthRate = hasGymData
    ? (lastRevenuePoint && previousRevenuePoint
        ? calculateGrowthRate(lastRevenuePoint.revenue, previousRevenuePoint.revenue)
        : 0)
    : topKPIs.monthlyGrowth;

  const lastMemberPoint = hasGymData && memberChartData.length > 0 ? memberChartData[memberChartData.length - 1] : null;
  const previousMemberPoint = hasGymData && memberChartData.length > 1 ? memberChartData[memberChartData.length - 2] : null;
  const memberGrowthRate = hasGymData
    ? (lastMemberPoint && previousMemberPoint
        ? calculateGrowthRate(lastMemberPoint.members, previousMemberPoint.members)
        : 0)
    : 8.7;
  const retentionDelta = hasGymData
    ? (lastMemberPoint && previousMemberPoint
        ? Number((lastMemberPoint.retention - previousMemberPoint.retention).toFixed(1))
        : 0)
    : 2.1;

  const revenueTrendPositive = revenueGrowthRate >= 0;
  const memberGrowthPositive = memberGrowthRate >= 0;
  const retentionDeltaPositive = retentionDelta >= 0;
  const recentJoinText = hasGymData ? `+${gymData.recentJoins} new this month` : '+15 new this week';
  const dataSourceCount = hasGymData ? 6 : 8;

  const sortedPeakHours = hasGymData
    ? Object.entries(gymData.peakHours).sort((first, second) => second[1] - first[1])
    : [];
  const topPeakHour = sortedPeakHours[0]?.[0] ?? 'N/A';

  const todayCheckIns = gymData?.todayCheckIns ?? 0;
  const avgSessionMinutes = gymData?.avgSessionMinutes ?? 0;
  const peakHourCounts = hasGymData ? Object.values(gymData.peakHours) : [];
  const peakHourShare = peakHourCounts.length > 0 && todayCheckIns > 0
    ? Number(((Math.max(...peakHourCounts) / todayCheckIns) * 100).toFixed(1))
    : 0;
  const classOccupancy = hasGymData && totalMembers > 0
    ? Number(((todayCheckIns / totalMembers) * 100).toFixed(1))
    : 0;
  const sessionEfficiency = hasGymData
    ? Number(clamp((avgSessionMinutes / 60) * 100, 0, 100).toFixed(1))
    : 0;
  const todayCheckInTarget = hasGymData
    ? Math.max(1, Math.round((gymData.activeMembers || 1) * 0.33))
    : performanceMetrics[0].target;

  const livePerformanceMetrics: PerformanceMetricPoint[] = hasGymData
    ? [
        {
          metric: 'Daily Check-ins',
          current: todayCheckIns,
          target: todayCheckInTarget,
          ...getMetricState(todayCheckIns, todayCheckInTarget)
        },
        {
          metric: 'Class Occupancy',
          current: classOccupancy,
          target: performanceMetrics[1].target,
          ...getMetricState(classOccupancy, performanceMetrics[1].target)
        },
        {
          metric: 'Staff Efficiency',
          current: sessionEfficiency,
          target: performanceMetrics[2].target,
          ...getMetricState(sessionEfficiency, performanceMetrics[2].target)
        },
        {
          metric: 'Equipment Utilization',
          current: peakHourShare,
          target: performanceMetrics[3].target,
          ...getMetricState(peakHourShare, performanceMetrics[3].target)
        }
      ]
    : performanceMetrics;

  const performanceScore = hasGymData
    ? clamp(
        Math.round(
          (livePerformanceMetrics.reduce((total, metric) => (
            total + (metric.target > 0 ? metric.current / metric.target : 0)
          ), 0) / Math.max(livePerformanceMetrics.length, 1)) * 100
        ),
        0,
        100
      )
    : 82;

  const liveSegments = hasGymData
    ? Object.entries(gymData.membershipTypes)
        .sort((first, second) => second[1] - first[1])
        .slice(0, 3)
        .map(([type, count]) => ({
          segment: formatSegmentLabel(type),
          count,
          percentage: gymData.totalMembers > 0 ? Math.round((count / gymData.totalMembers) * 100) : 0
        }))
    : [];

  const displayMemberSegments: MemberSegmentPoint[] = hasGymData
    ? (liveSegments.length > 0
        ? liveSegments
        : memberAnalytics.slice(0, 3).map((segment) => ({
            segment: segment.segment,
            count: 0,
            percentage: 0
          })))
    : memberAnalytics.slice(0, 3).map((segment) => ({
        segment: segment.segment,
        count: segment.count,
        percentage: Math.round((segment.count / topKPIs.activeMembers) * 100)
      }));

  const revenuePerMember = hasGymData
    ? (gymData.activeMembers > 0 ? Number((gymData.totalRevenue / gymData.activeMembers).toFixed(1)) : 0)
    : benchmarkData[0].value;

  const liveBenchmarks: BenchmarkPoint[] = hasGymData
    ? [
        {
          metric: 'Revenue per Member',
          value: revenuePerMember,
          industry: INDUSTRY_BENCHMARKS.revenuePerMember,
          performance: getBenchmarkPerformance(revenuePerMember, INDUSTRY_BENCHMARKS.revenuePerMember)
        },
        {
          metric: 'Member Retention',
          value: retentionRate,
          industry: INDUSTRY_BENCHMARKS.memberRetention,
          performance: getBenchmarkPerformance(retentionRate, INDUSTRY_BENCHMARKS.memberRetention)
        },
        {
          metric: 'Class Utilization',
          value: classOccupancy,
          industry: INDUSTRY_BENCHMARKS.classUtilization,
          performance: getBenchmarkPerformance(classOccupancy, INDUSTRY_BENCHMARKS.classUtilization)
        },
        {
          metric: 'Staff Efficiency',
          value: sessionEfficiency,
          industry: INDUSTRY_BENCHMARKS.staffEfficiency,
          performance: getBenchmarkPerformance(sessionEfficiency, INDUSTRY_BENCHMARKS.staffEfficiency)
        },
        {
          metric: 'Operating Margin',
          value: Number((gymData.profitMargin ?? 0).toFixed(1)),
          industry: INDUSTRY_BENCHMARKS.operatingMargin,
          performance: getBenchmarkPerformance(gymData.profitMargin ?? 0, INDUSTRY_BENCHMARKS.operatingMargin)
        }
      ]
    : benchmarkData;

  const aboveBenchmarkCount = liveBenchmarks.filter((benchmark) => benchmark.performance === 'above').length;
  const benchmarkBadgeClass = hasGymData
    ? (aboveBenchmarkCount >= 3 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')
    : 'bg-green-100 text-green-800';
  const benchmarkBadgeText = hasGymData
    ? (aboveBenchmarkCount >= 3 ? 'Above Average' : 'Needs Review')
    : 'Above Average';

  const confidenceAverage = Number(
    (
      aiPredictions.reduce((sum, insight) => sum + insight.confidence, 0) /
      Math.max(aiPredictions.length, 1)
    ).toFixed(1)
  );

  const overallHealthScore = hasGymData
    ? clamp(
        Math.round(
          retentionRate * 0.5 +
          clamp((gymData.profitMargin ?? 0) * 2.2, 0, 100) * 0.3 +
          clamp(revenueGrowthRate * 4 + 50, 0, 100) * 0.2
        ),
        0,
        100
      )
    : 89;
  const overallHealthLabel = overallHealthScore >= 85
    ? 'Excellent'
    : overallHealthScore >= 70
      ? 'Good'
      : 'Needs Attention';

  const displayExports = hasGymData
    ? recentExports.map((exportItem, index) => (
        index === 0 ? { ...exportItem, records: gymData.totalMembers } : exportItem
      ))
    : recentExports;

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
          <Button variant="outline" size="sm" onClick={loadRealData} disabled={dataLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
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
                  <CurrencyValue amount={totalRevenue} />
                </p>
                <div className="flex items-center mt-2">
                  {revenueTrendPositive ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm ${revenueTrendPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {formatSignedPercent(revenueGrowthRate)} this month
                  </span>
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
                  {activeMembers.toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  <Users className="h-4 w-4 text-blue-500 mr-1" />
                  <span className="text-sm text-blue-600">{recentJoinText}</span>
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
                  {retentionRate}%
                </p>
                <div className="flex items-center mt-2">
                  <UserCheck className="h-4 w-4 text-purple-500 mr-1" />
                  <span className={`text-sm ${retentionDeltaPositive ? 'text-purple-600' : 'text-red-600'}`}>
                    {formatSignedPercent(retentionDelta)} vs last month
                  </span>
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
                <p className={`text-2xl font-bold ${revenueTrendPositive ? 'text-orange-600' : 'text-red-600'}`}>
                  {formatSignedPercent(revenueGrowthRate)}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingIcon className={`h-4 w-4 mr-1 ${revenueTrendPositive ? 'text-orange-500' : 'text-red-500'}`} />
                  <span className={`text-sm ${revenueTrendPositive ? 'text-orange-600' : 'text-red-600'}`}>Revenue increase</span>
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
                <span className={`font-semibold ${revenueTrendPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {formatSignedPercent(revenueGrowthRate)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Member Growth</span>
                <span className={`font-semibold ${memberGrowthPositive ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatSignedPercent(memberGrowthRate)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Profit Margin</span>
                <span className="font-semibold text-purple-600">{hasGymData ? gymData.profitMargin.toFixed(1) : '23.8'}%</span>
              </div>
              <Progress value={overallHealthScore} className="h-2" />
              <p className="text-xs text-gray-500">Overall business health: {overallHealthLabel}</p>
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
                <Badge className="bg-green-100 text-green-800">{dataSourceCount} Active</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Latest Insights</span>
                <span className="text-sm">{hasGymData ? 'Just refreshed' : '2 hours ago'}</span>
              </div>
              <div className="space-y-2">
                <div className="text-sm p-2 bg-blue-50 rounded">
                  <div className="font-medium text-blue-800">
                    {hasGymData ? `Peak Hours: ${topPeakHour}` : 'Peak Hours Identified'}
                  </div>
                  <div className="text-blue-600 text-xs">
                    {hasGymData ? `${todayCheckIns} check-ins today` : '6-8 PM shows 40% higher engagement'}
                  </div>
                </div>
                <div className="text-sm p-2 bg-green-50 rounded">
                  <div className="font-medium text-green-800">{hasGymData ? 'Revenue Health' : 'Revenue Opportunity'}</div>
                  <div className="text-green-600 text-xs">
                    {hasGymData
                      ? `Net income ${formatCurrency(gymData.netIncome)} - ${gymData.profitMargin.toFixed(1)}% margin`
                      : 'Personal training has 25% growth potential'}
                  </div>
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
              {livePerformanceMetrics.slice(0, 3).map((metric, index) => (
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
                  <span>{performanceScore}%</span>
                </div>
                <Progress value={performanceScore} className="h-2" />
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
              <Button variant="outline" size="sm" onClick={handlePredict} disabled={predictionsLoading || !gymData}>
                {predictionsLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Predict'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">AI Predictions</span>
                <Badge className="bg-blue-100 text-blue-800">{aiPredictions.length} Active</Badge>
              </div>
              <div className="space-y-2">
                {aiPredictions.slice(0, 2).map((insight, index) => (
                  <div key={index} className="text-sm p-2 bg-orange-50 rounded">
                    <div className="font-medium text-orange-800">{insight.insight}</div>
                    <div className="text-orange-600 text-xs">{insight.prediction}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Confidence Avg.</span>
                <span className="text-sm font-medium">{confidenceAverage}%</span>
              </div>
              <Progress value={confidenceAverage} className="h-2" />
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
                <span className="font-semibold text-green-600"><CurrencyValue amount={totalRevenue} /></span>
              </div>
              <div className="space-y-2">
                {revenueSourceData.slice(0, 3).map((source, index) => (
                  <div key={`${source.source}-${index}`} className="flex justify-between text-sm">
                    <span>{source.source}</span>
                    <span>{source.percentage}%</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Growth Rate</span>
                <div className="flex items-center">
                  {revenueTrendPositive ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm ${revenueTrendPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {formatSignedPercent(revenueGrowthRate)}
                  </span>
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
                <span className="font-semibold text-blue-600">{totalMembers.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Retention Rate</span>
                <span className="font-semibold text-green-600">{retentionRate}%</span>
              </div>
              <div className="space-y-2">
                {displayMemberSegments.map((segment, index) => (
                  <div key={`${segment.segment}-${index}`} className="flex justify-between text-sm">
                    <span>{segment.segment}</span>
                    <span>{segment.count} ({segment.percentage}%)</span>
                  </div>
                ))}
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
                <Badge className={benchmarkBadgeClass}>{benchmarkBadgeText}</Badge>
              </div>
              <div className="space-y-2">
                {liveBenchmarks.slice(0, 3).map((benchmark, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{benchmark.metric}</span>
                    <div className="flex items-center">
                      {benchmark.performance === 'above' ? (
                        <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                      ) : benchmark.performance === 'below' ? (
                        <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
                      ) : (
                        <Minus className="h-4 w-4 text-blue-500 mr-1" />
                      )}
                      <span className={`text-sm ${getPerformanceColor(benchmark.performance)}`}>
                        {benchmark.metric.includes('Revenue') ? (
                          <><CurrencyGlyph />{benchmark.value}</>
                        ) : (
                          `${benchmark.value}%`
                        )}
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
                <span className="font-semibold">{hasGymData ? gymData.totalMembers.toLocaleString() : '2,417'}</span>
              </div>
              <div className="space-y-2">
                {displayExports.slice(0, 2).map((export_, index) => (
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
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => [`${(value/1000).toFixed(0)}K ${currencyCode}`, '']} />
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
              <AreaChart data={memberChartData}>
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



