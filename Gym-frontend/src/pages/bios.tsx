import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
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
import { biosService, type BiosSettings, type BiosActivityLogEntry, type BiosBranchComparisonRow } from '../utils/supabase/bios-service';
import { staffService, type StaffTarget } from '../utils/supabase/staff-service';
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

const REVENUE_SOURCE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// Fallback values shown only until the admin sets their own comparison targets
// in BiOS Configuration — these are NOT sourced from any real industry data
// feed (there is no such integration in this app).
const DEFAULT_BENCHMARKS = {
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

const downloadBlob = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const toCsvCell = (value: unknown) => {
  const s = value == null ? '' : String(value);
  return `"${s.replaceAll('"', '""')}"`;
};

const exportAsCsv = (filename: string, header: string[], rows: Array<Array<unknown>>) => {
  const csv = [
    header.map(toCsvCell).join(','),
    ...rows.map((r) => r.map(toCsvCell).join(',')),
  ].join('\n');
  downloadBlob(filename, new Blob([csv], { type: 'text/csv;charset=utf-8' }));
};

const DetailRows = ({ rows }: { rows: Array<{ label: string; value: React.ReactNode }> }) => (
  <div className="divide-y">
    {rows.map((row, index) => (
      <div key={index} className="flex justify-between items-center text-sm py-2">
        <span className="text-gray-600">{row.label}</span>
        <span className="font-medium text-gray-900">{row.value}</span>
      </div>
    ))}
  </div>
);

const DetailTable = ({ columns, rows }: { columns: string[]; rows: Array<Array<React.ReactNode>> }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b">
          {columns.map((column, index) => (
            <th key={index} className="text-left py-2 pr-4 text-gray-500 font-medium">{column}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className="border-b last:border-0">
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="py-2 pr-4">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export function BiOS() {
  const { formatCurrency, currencyCode } = useCurrency();
  const { activeBranchId, isAllBranches, accessibleBranches } = useBranch();
  const [gymData, setGymData] = useState<GymDataContext | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [revenueChartData, setRevenueChartData] = useState<RevenueChartPoint[]>(revenueData);
  const [memberChartData, setMemberChartData] = useState<MemberChartPoint[]>(membershipData);
  const [aiPredictions, setAiPredictions] = useState<AIInsight[]>(predictiveInsights);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [revenueSourceData, setRevenueSourceData] = useState<RevenueSourcePoint[]>(revenueBySource);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [monthlyRevenueTarget, setMonthlyRevenueTarget] = useState('');
  const [dailyCheckInTargetPercent, setDailyCheckInTargetPercent] = useState('33');
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [alertEmail, setAlertEmail] = useState('');
  const [alertRetentionThreshold, setAlertRetentionThreshold] = useState('80');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleEmail, setScheduleEmail] = useState('');
  const [scheduleFrequency, setScheduleFrequency] = useState('WEEKLY');
  const [revenueAlertEnabled, setRevenueAlertEnabled] = useState(false);
  const [revenueAlertThresholdPercent, setRevenueAlertThresholdPercent] = useState('90');
  const [benchmarkRevenuePerMember, setBenchmarkRevenuePerMember] = useState('');
  const [benchmarkRetentionPercent, setBenchmarkRetentionPercent] = useState('');
  const [benchmarkClassUtilizationPercent, setBenchmarkClassUtilizationPercent] = useState('');
  const [benchmarkStaffEfficiencyPercent, setBenchmarkStaffEfficiencyPercent] = useState('');
  const [benchmarkOperatingMarginPercent, setBenchmarkOperatingMarginPercent] = useState('');

  const [trendMonths, setTrendMonths] = useState(6);
  const [detailsDialog, setDetailsDialog] = useState<{ title: string; description?: string; content: React.ReactNode } | null>(null);

  // Real "Recent Reports" / "Recent Exports" activity log — replaces the
  // previously hardcoded sample rows.
  const [recentReportsLog, setRecentReportsLog] = useState<BiosActivityLogEntry[]>([]);
  const [recentExportsLog, setRecentExportsLog] = useState<BiosActivityLogEntry[]>([]);
  const [reportsThisMonth, setReportsThisMonth] = useState(0);
  const [exportsThisWeek, setExportsThisWeek] = useState(0);

  // Per-branch snapshot — only fetched/shown in "All Branches" mode.
  const [branchComparison, setBranchComparison] = useState<BiosBranchComparisonRow[]>([]);

  // Top staff by revenue achieved this month, for the Executive Dashboard detail view.
  const [topStaffTargets, setTopStaffTargets] = useState<StaffTarget[]>([]);

  const loadRealData = useCallback(async (months: number = 6) => {
    setDataLoading(true);

    try {
      const [membersResp, attStats, finDash, monthlyTrend, revBySource, expStats] = await Promise.all([
        membersService.getMembers({}, { page: 1, limit: 5000 }).catch(() => ({
          members: [],
          pagination: { page: 1, limit: 5000, total: 0, totalPages: 0 }
        })),
        attendanceService.getAttendanceStats().catch(() => null),
        financialAnalyticsService.getDashboard().catch(() => null),
        financialAnalyticsService.getMonthlyTrend(months).catch(() => []),
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

      aiService.generatePredictiveInsights(context)
        .then((insights) => {
          if (insights.length > 0) {
            setAiPredictions(insights);
          }
        })
        .catch(() => {});

      const rollingMonths = getRollingMonths(months);
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
    loadRealData(trendMonths);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId, trendMonths]);

  useEffect(() => {
    biosService.getSettings()
      .then((settings) => {
        setMonthlyRevenueTarget(settings.monthly_revenue_target != null ? String(settings.monthly_revenue_target) : '');
        setDailyCheckInTargetPercent(settings.daily_checkin_target_percent != null ? String(settings.daily_checkin_target_percent) : '33');
        setAlertEnabled(settings.alert_enabled);
        setAlertEmail(settings.alert_email || '');
        setAlertRetentionThreshold(settings.alert_retention_threshold != null ? String(settings.alert_retention_threshold) : '80');
        setScheduleEnabled(settings.schedule_enabled);
        setScheduleEmail(settings.schedule_email || '');
        setScheduleFrequency(settings.schedule_frequency || 'WEEKLY');
        setRevenueAlertEnabled(!!settings.revenue_alert_enabled);
        setRevenueAlertThresholdPercent(settings.revenue_alert_threshold_percent != null ? String(settings.revenue_alert_threshold_percent) : '90');
        setBenchmarkRevenuePerMember(settings.benchmark_revenue_per_member != null ? String(settings.benchmark_revenue_per_member) : '');
        setBenchmarkRetentionPercent(settings.benchmark_retention_percent != null ? String(settings.benchmark_retention_percent) : '');
        setBenchmarkClassUtilizationPercent(settings.benchmark_class_utilization_percent != null ? String(settings.benchmark_class_utilization_percent) : '');
        setBenchmarkStaffEfficiencyPercent(settings.benchmark_staff_efficiency_percent != null ? String(settings.benchmark_staff_efficiency_percent) : '');
        setBenchmarkOperatingMarginPercent(settings.benchmark_operating_margin_percent != null ? String(settings.benchmark_operating_margin_percent) : '');
      })
      .catch(() => {});
  }, []);

  const loadActivityLogs = useCallback(() => {
    biosService.getRecentActivity('REPORT', 20)
      .then((entries) => {
        setRecentReportsLog(entries.slice(0, 4));
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        setReportsThisMonth(entries.filter((e) => e.created_at && new Date(e.created_at) >= monthStart).length);
      })
      .catch(() => {});
    biosService.getRecentActivity('EXPORT', 20)
      .then((entries) => {
        setRecentExportsLog(entries.slice(0, 4));
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        setExportsThisWeek(entries.filter((e) => e.created_at && new Date(e.created_at) >= weekStart).length);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadActivityLogs();
  }, [loadActivityLogs]);

  // Branch comparison only makes sense — and only returns cross-branch data —
  // while viewing "All Branches" (see BiosController.getBranchComparison).
  useEffect(() => {
    if (!isAllBranches || accessibleBranches.length < 2) {
      setBranchComparison([]);
      return;
    }
    biosService.getBranchComparison().then(setBranchComparison).catch(() => setBranchComparison([]));
  }, [isAllBranches, accessibleBranches.length]);

  useEffect(() => {
    const now = new Date();
    staffService.getTargets(now.getFullYear(), now.getMonth() + 1, 'individual')
      .then((targets) => {
        const sorted = [...targets].sort((a, b) => (b.revenue_achieved || 0) - (a.revenue_achieved || 0));
        setTopStaffTargets(sorted.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  const handleSaveSettings = async () => {
    if (alertEnabled && !alertEmail.trim()) {
      toast.error('Enter an alert email first');
      return;
    }
    if (scheduleEnabled && !scheduleEmail.trim()) {
      toast.error('Enter a recipient email first');
      return;
    }
    if (revenueAlertEnabled && !alertEmail.trim()) {
      toast.error('Enter an alert email first (shared with retention alerts)');
      return;
    }
    if (revenueAlertEnabled && !monthlyRevenueTarget.trim()) {
      toast.error('Set a monthly revenue target first');
      return;
    }

    setSavingSettings(true);
    try {
      const payload: Partial<BiosSettings> = {
        monthly_revenue_target: monthlyRevenueTarget.trim() ? Number(monthlyRevenueTarget) : undefined,
        daily_checkin_target_percent: dailyCheckInTargetPercent.trim() ? Number(dailyCheckInTargetPercent) : undefined,
        alert_enabled: alertEnabled,
        alert_email: alertEmail.trim() || undefined,
        alert_retention_threshold: alertRetentionThreshold.trim() ? Number(alertRetentionThreshold) : undefined,
        schedule_enabled: scheduleEnabled,
        schedule_email: scheduleEmail.trim() || undefined,
        schedule_frequency: scheduleFrequency,
        revenue_alert_enabled: revenueAlertEnabled,
        revenue_alert_threshold_percent: revenueAlertThresholdPercent.trim() ? Number(revenueAlertThresholdPercent) : undefined,
        benchmark_revenue_per_member: benchmarkRevenuePerMember.trim() ? Number(benchmarkRevenuePerMember) : undefined,
        benchmark_retention_percent: benchmarkRetentionPercent.trim() ? Number(benchmarkRetentionPercent) : undefined,
        benchmark_class_utilization_percent: benchmarkClassUtilizationPercent.trim() ? Number(benchmarkClassUtilizationPercent) : undefined,
        benchmark_staff_efficiency_percent: benchmarkStaffEfficiencyPercent.trim() ? Number(benchmarkStaffEfficiencyPercent) : undefined,
        benchmark_operating_margin_percent: benchmarkOperatingMarginPercent.trim() ? Number(benchmarkOperatingMarginPercent) : undefined,
      };
      await biosService.updateSettings(payload);
      toast.success('BiOS settings saved');
      setSettingsOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save settings';
      toast.error(message);
    } finally {
      setSavingSettings(false);
    }
  };

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
  const monthlyRevenueTargetValue = monthlyRevenueTarget.trim() ? Number(monthlyRevenueTarget) : null;
  const dailyCheckInTargetPercentValue = dailyCheckInTargetPercent.trim() ? Number(dailyCheckInTargetPercent) : 33;
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
    ? Math.max(1, Math.round((gymData.activeMembers || 1) * (dailyCheckInTargetPercentValue / 100)))
    : performanceMetrics[0].target;

  const displayedRevenueChartData = monthlyRevenueTargetValue != null
    ? revenueChartData.map((point) => ({ ...point, target: monthlyRevenueTargetValue }))
    : revenueChartData;

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

  // The admin's own comparison targets (BiOS Configuration), falling back to
  // DEFAULT_BENCHMARKS only until they've been set.
  const currentBenchmarks = {
    revenuePerMember: benchmarkRevenuePerMember.trim() ? Number(benchmarkRevenuePerMember) : DEFAULT_BENCHMARKS.revenuePerMember,
    memberRetention: benchmarkRetentionPercent.trim() ? Number(benchmarkRetentionPercent) : DEFAULT_BENCHMARKS.memberRetention,
    classUtilization: benchmarkClassUtilizationPercent.trim() ? Number(benchmarkClassUtilizationPercent) : DEFAULT_BENCHMARKS.classUtilization,
    staffEfficiency: benchmarkStaffEfficiencyPercent.trim() ? Number(benchmarkStaffEfficiencyPercent) : DEFAULT_BENCHMARKS.staffEfficiency,
    operatingMargin: benchmarkOperatingMarginPercent.trim() ? Number(benchmarkOperatingMarginPercent) : DEFAULT_BENCHMARKS.operatingMargin,
  };

  const liveBenchmarks: BenchmarkPoint[] = hasGymData
    ? [
        {
          metric: 'Revenue per Member',
          value: revenuePerMember,
          industry: currentBenchmarks.revenuePerMember,
          performance: getBenchmarkPerformance(revenuePerMember, currentBenchmarks.revenuePerMember)
        },
        {
          metric: 'Member Retention',
          value: retentionRate,
          industry: currentBenchmarks.memberRetention,
          performance: getBenchmarkPerformance(retentionRate, currentBenchmarks.memberRetention)
        },
        {
          metric: 'Class Utilization',
          value: classOccupancy,
          industry: currentBenchmarks.classUtilization,
          performance: getBenchmarkPerformance(classOccupancy, currentBenchmarks.classUtilization)
        },
        {
          metric: 'Staff Efficiency',
          value: sessionEfficiency,
          industry: currentBenchmarks.staffEfficiency,
          performance: getBenchmarkPerformance(sessionEfficiency, currentBenchmarks.staffEfficiency)
        },
        {
          metric: 'Operating Margin',
          value: Number((gymData.profitMargin ?? 0).toFixed(1)),
          industry: currentBenchmarks.operatingMargin,
          performance: getBenchmarkPerformance(gymData.profitMargin ?? 0, currentBenchmarks.operatingMargin)
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

  const formatRelativeTime = (iso?: string | null) => {
    if (!iso) return 'Never';
    const then = new Date(iso).getTime();
    const diffMinutes = Math.max(0, Math.round((Date.now() - then) / 60000));
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  };

  const handleGenerateReport = () => {
    const dateLabel = new Date().toISOString().slice(0, 10);
    const header = ['Metric', 'Value'];
    const rows: Array<[string, string | number]> = [
      ['Report Period', getCurrentPeriod()],
      ['Total Revenue', totalRevenue],
      ['Active Members', activeMembers],
      ['Total Members', totalMembers],
      ['Retention Rate (%)', retentionRate],
      ['Monthly Revenue Growth (%)', revenueGrowthRate],
      ['Member Growth (%)', memberGrowthRate],
      ['Overall Health Score', overallHealthScore],
      ...livePerformanceMetrics.map((metric) => [`${metric.metric} (current)`, metric.current] as [string, number]),
      ...liveBenchmarks.map((benchmark) => [`${benchmark.metric} vs your target`, `${benchmark.value} vs ${benchmark.industry}`] as [string, string]),
    ];
    exportAsCsv(`bios-report_${dateLabel}.csv`, header, rows);
    const title = `Business Summary — ${getCurrentPeriod()}`;
    biosService.logActivity('REPORT', title, 'CSV', rows.length)
      .then(loadActivityLogs)
      .catch(() => {});
    toast.success('Report generated');
  };

  const handleExportData = () => {
    const dateLabel = new Date().toISOString().slice(0, 10);
    const header = ['Category', 'Item', 'Value'];
    const rows: Array<[string, string, string | number]> = [
      ...revenueSourceData.map((source) => ['Revenue by Source', source.source, source.amount] as [string, string, number]),
      ...revenueChartData.map((point) => ['Monthly Revenue', point.month, point.revenue] as [string, string, number]),
      ...memberChartData.map((point) => ['Monthly Members', point.month, point.members] as [string, string, number]),
      ...displayMemberSegments.map((segment) => ['Member Segment', segment.segment, segment.count] as [string, string, number]),
    ];
    exportAsCsv(`bios-data-export_${dateLabel}.csv`, header, rows);
    biosService.logActivity('EXPORT', 'Full Data Export', 'CSV', rows.length)
      .then(loadActivityLogs)
      .catch(() => {});
    toast.success('Data export started');
  };

  const showExecutiveDetails = () => {
    setDetailsDialog({
      title: 'Executive Dashboard',
      description: `Business health summary for ${getCurrentPeriod()}`,
      content: (
        <div className="space-y-4">
          <DetailRows
            rows={[
              { label: 'Revenue Growth', value: formatSignedPercent(revenueGrowthRate) },
              { label: 'Member Growth', value: formatSignedPercent(memberGrowthRate) },
              { label: 'Profit Margin', value: `${hasGymData ? gymData.profitMargin.toFixed(1) : '23.8'}%` },
              { label: 'Overall Health Score', value: `${overallHealthScore}% (${overallHealthLabel})` }
            ]}
          />
          <DetailTable
            columns={['Month', 'Revenue', 'Target']}
            rows={displayedRevenueChartData.map((point) => [point.month, formatCurrency(point.revenue), formatCurrency(point.target)])}
          />
          {topStaffTargets.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Top Staff by Revenue This Month</h4>
              <DetailTable
                columns={['Staff', 'Revenue Achieved', 'Target', 'Progress']}
                rows={topStaffTargets.map((t) => [
                  t.staff_name || 'Unknown',
                  formatCurrency(t.revenue_achieved || 0),
                  formatCurrency(t.revenue_target || 0),
                  `${t.percentage || 0}%`
                ])}
              />
            </div>
          )}
        </div>
      )
    });
  };

  const showBiDetails = () => {
    setDetailsDialog({
      title: 'Business Intelligence',
      description: hasGymData ? 'Live insights from connected data sources' : 'Sample insights — connect data to see live figures',
      content: (
        <div className="space-y-4">
          <DetailRows
            rows={[
              { label: 'Data Sources', value: `${dataSourceCount} Active` },
              { label: 'Peak Hour', value: hasGymData ? topPeakHour : 'N/A' },
              { label: 'Check-ins Today', value: todayCheckIns },
              { label: 'Net Income', value: hasGymData ? formatCurrency(gymData.netIncome) : '-' },
              { label: 'Profit Margin', value: `${hasGymData ? gymData.profitMargin.toFixed(1) : '23.8'}%` }
            ]}
          />
          {hasGymData && sortedPeakHours.length > 0 && (
            <DetailTable
              columns={['Hour', 'Check-ins']}
              rows={sortedPeakHours.map(([hour, count]) => [hour, count])}
            />
          )}
        </div>
      )
    });
  };

  const showPerformanceDetails = () => {
    setDetailsDialog({
      title: 'Performance Metrics',
      description: `Overall performance score: ${performanceScore}%`,
      content: (
        <DetailTable
          columns={['Metric', 'Current', 'Target', 'Change']}
          rows={livePerformanceMetrics.map((metric) => [
            metric.metric,
            metric.current,
            metric.target,
            <span className={metric.trend === 'up' ? 'text-green-600' : metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'}>
              {formatSignedPercent(metric.change)}
            </span>
          ])}
        />
      )
    });
  };

  const showPredictionsAllDetails = () => {
    setDetailsDialog({
      title: 'AI Predictions',
      description: `Confidence average: ${confidenceAverage}%`,
      content: (
        <DetailTable
          columns={['Insight', 'Prediction', 'Confidence', 'Timeframe', 'Priority']}
          rows={aiPredictions.map((insight) => [
            insight.insight,
            insight.prediction,
            `${insight.confidence}%`,
            insight.timeframe,
            insight.priority
          ])}
        />
      )
    });
  };

  const showRevenueBreakdownDetails = () => {
    setDetailsDialog({
      title: 'Revenue Breakdown',
      description: `Total revenue: ${formatCurrency(totalRevenue)}`,
      content: (
        <DetailTable
          columns={['Source', 'Amount', 'Share']}
          rows={revenueSourceData.map((source) => [source.source, formatCurrency(source.amount), `${source.percentage}%`])}
        />
      )
    });
  };

  const showRevenueTrendsDetails = () => {
    setDetailsDialog({
      title: 'Revenue vs Target Trends',
      description: `Growth rate: ${formatSignedPercent(revenueGrowthRate)}`,
      content: (
        <DetailTable
          columns={['Month', 'Revenue', 'Target']}
          rows={displayedRevenueChartData.map((point) => [point.month, formatCurrency(point.revenue), formatCurrency(point.target)])}
        />
      )
    });
  };

  const showMemberSegmentDetails = () => {
    const fullSegments = hasGymData
      ? Object.entries(gymData.membershipTypes)
          .sort((first, second) => second[1] - first[1])
          .map(([type, count]) => ({
            segment: formatSegmentLabel(type),
            count,
            percentage: gymData.totalMembers > 0 ? Math.round((count / gymData.totalMembers) * 100) : 0
          }))
      : memberAnalytics.map((segment) => ({
          segment: segment.segment,
          count: segment.count,
          percentage: Math.round((segment.count / topKPIs.activeMembers) * 100)
        }));

    setDetailsDialog({
      title: 'Member Segments',
      description: `${totalMembers.toLocaleString()} total members`,
      content: (
        <DetailTable
          columns={['Segment', 'Members', 'Share']}
          rows={fullSegments.map((segment) => [segment.segment, segment.count, `${segment.percentage}%`])}
        />
      )
    });
  };

  const showMemberRetentionDetails = () => {
    setDetailsDialog({
      title: 'Member Growth & Retention',
      description: `Retention rate: ${retentionRate}% (${formatSignedPercent(retentionDelta)} vs last month)`,
      content: (
        <DetailTable
          columns={['Month', 'Members', 'Retention', 'Churn']}
          rows={memberChartData.map((point) => [point.month, point.members, `${point.retention}%`, `${point.churn}%`])}
        />
      )
    });
  };

  const showReportsAllDetails = () => {
    setDetailsDialog({
      title: 'Operational Reports',
      description: recentReportsLog.length > 0 ? 'Recently generated reports' : 'No reports generated yet',
      content: recentReportsLog.length > 0 ? (
        <DetailTable
          columns={['Report', 'Format', 'Generated By', 'Generated At']}
          rows={recentReportsLog.map((report) => [report.title, report.format, report.generated_by || 'Unknown', formatRelativeTime(report.created_at)])}
        />
      ) : (
        <p className="text-sm text-gray-500">Click "Generate" to create your first report.</p>
      )
    });
  };

  const showBenchmarkDetails = () => {
    setDetailsDialog({
      title: 'Your Benchmarks',
      description: `${benchmarkBadgeText} — compared against the targets you set in BiOS Configuration, not external industry data`,
      content: (
        <DetailTable
          columns={['Metric', 'Your Value', 'Your Target', 'Performance']}
          rows={liveBenchmarks.map((benchmark) => [
            benchmark.metric,
            benchmark.metric.includes('Revenue') ? formatCurrency(benchmark.value) : `${benchmark.value}%`,
            benchmark.metric.includes('Revenue') ? formatCurrency(benchmark.industry) : `${benchmark.industry}%`,
            <span className={getPerformanceColor(benchmark.performance)}>{benchmark.performance}</span>
          ])}
        />
      )
    });
  };

  const showFilterOptions = () => {
    setDetailsDialog({
      title: 'Filter Trend Period',
      description: 'Choose how many months of trend data to display',
      content: (
        <div className="flex gap-3">
          {[3, 6, 12].map((months) => (
            <Button
              key={months}
              variant={trendMonths === months ? 'default' : 'outline'}
              onClick={() => {
                setTrendMonths(months);
                setDetailsDialog(null);
              }}
            >
              {months} Months
            </Button>
          ))}
        </div>
      )
    });
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
          <Button variant="outline" size="sm" onClick={showFilterOptions}>
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm" onClick={handleGenerateReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Dashboard
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadRealData(trendMonths)} disabled={dataLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Executive Summary — a short rule-based narrative from real numbers (no
          external AI API required; works the same with or without VITE_CLAUDE_API_KEY). */}
      {hasGymData && (
        <Card className="bg-white border-0 shadow-sm border-l-4 border-l-purple-500">
          <CardContent className="p-4 flex items-start space-x-3">
            <Brain className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700">{aiService.generateExecutiveSummary(gymData)}</p>
          </CardContent>
        </Card>
      )}

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
              <Button variant="outline" size="sm" onClick={showExecutiveDetails}>View Details</Button>
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
                <Button variant="ghost" size="sm" onClick={handleGenerateReport}>
                  <BarChart3 className="h-4 w-4 mr-1" />
                  KPI Report
                </Button>
                <Button variant="ghost" size="sm" onClick={handleGenerateReport}>
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
              <Button variant="outline" size="sm" onClick={showBiDetails}>Analyze</Button>
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
                <Button variant="ghost" size="sm" onClick={showBiDetails}>
                  <Eye className="h-4 w-4 mr-1" />
                  View Insights
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
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
              <Button variant="outline" size="sm" onClick={showPerformanceDetails}>Monitor</Button>
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
                <Button variant="ghost" size="sm" onClick={showPerformanceDetails}>
                  <Activity className="h-4 w-4 mr-1" />
                  Live View
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
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
                <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
                  <Zap className="h-4 w-4 mr-1" />
                  Auto-Alert
                </Button>
                <Button variant="ghost" size="sm" onClick={showPredictionsAllDetails}>
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
              <Button variant="outline" size="sm" onClick={showRevenueBreakdownDetails}>Analyze</Button>
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
                <Button variant="ghost" size="sm" onClick={showRevenueBreakdownDetails}>
                  <PieChartIcon className="h-4 w-4 mr-1" />
                  Breakdown
                </Button>
                <Button variant="ghost" size="sm" onClick={showRevenueTrendsDetails}>
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
              <Button variant="outline" size="sm" onClick={showMemberSegmentDetails}>Segment</Button>
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
                <Button variant="ghost" size="sm" onClick={showMemberSegmentDetails}>
                  <UsersIcon className="h-4 w-4 mr-1" />
                  Segments
                </Button>
                <Button variant="ghost" size="sm" onClick={showMemberRetentionDetails}>
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
              <Button variant="outline" size="sm" onClick={handleGenerateReport}>Generate</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Reports Generated</span>
                <span className="font-semibold">{reportsThisMonth} this month</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Last Generated</span>
                <span className="text-sm">{formatRelativeTime(recentReportsLog[0]?.created_at)}</span>
              </div>
              <div className="space-y-2">
                {recentReportsLog.length === 0 ? (
                  <p className="text-xs text-gray-500">No reports generated yet.</p>
                ) : recentReportsLog.slice(0, 2).map((report, index) => (
                  <div key={index} className="text-sm p-2 bg-cyan-50 rounded">
                    <div className="font-medium text-cyan-800">{report.title}</div>
                    <div className="text-cyan-600 text-xs">{report.format} • {formatRelativeTime(report.created_at)}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={showReportsAllDetails}>
                  <FileText className="h-4 w-4 mr-1" />
                  View All
                </Button>
                <Button variant="ghost" size="sm" onClick={handleGenerateReport}>
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
              <Button variant="outline" size="sm" onClick={showBenchmarkDetails}>Compare</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">vs Your Targets</span>
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
                <Button variant="ghost" size="sm" onClick={showBenchmarkDetails}>
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Full Report
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
                  <Settings className="h-4 w-4 mr-1" />
                  Set Targets
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
              <Button variant="outline" size="sm" onClick={handleExportData}>Export</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Recent Exports</span>
                <span className="font-semibold">{exportsThisWeek} this week</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Records</span>
                <span className="font-semibold">{hasGymData ? gymData.totalMembers.toLocaleString() : '2,417'}</span>
              </div>
              <div className="space-y-2">
                {recentExportsLog.length === 0 ? (
                  <p className="text-xs text-gray-500">No exports yet.</p>
                ) : recentExportsLog.slice(0, 2).map((export_, index) => (
                  <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                    <div className="font-medium text-gray-800">{export_.title}</div>
                    <div className="text-gray-600 text-xs">{export_.format} • {export_.row_count ?? 0} records • {formatRelativeTime(export_.created_at)}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={handleExportData}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Quick Export
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
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
              <Button variant="outline" size="sm" onClick={showRevenueTrendsDetails}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={displayedRevenueChartData}>
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
                <CardDescription>Member metrics over the last {trendMonths} months</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={showMemberRetentionDetails}>
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

      {/* Branch Comparison — only fetched/shown while viewing "All Branches" */}
      {branchComparison.length > 0 && (
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-indigo-600" />
              <span>Branch Comparison</span>
            </CardTitle>
            <CardDescription>Current-month snapshot across all branches</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead>Total Members</TableHead>
                  <TableHead>Active Members</TableHead>
                  <TableHead>Retention</TableHead>
                  <TableHead>Revenue (Month)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branchComparison.map((row) => (
                  <TableRow key={row.branch_id}>
                    <TableCell className="font-medium">{row.branch_name} <span className="text-gray-400 text-xs">({row.branch_code})</span></TableCell>
                    <TableCell>{row.total_members.toLocaleString()}</TableCell>
                    <TableCell>{row.active_members.toLocaleString()}</TableCell>
                    <TableCell>{row.retention_percent}%</TableCell>
                    <TableCell>{formatCurrency(row.month_revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
            <Button variant="outline" className="h-16 flex-col space-y-1" onClick={handleGenerateReport}>
              <FileBarChart className="h-6 w-6" />
              <span className="text-xs">Generate Report</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col space-y-1" onClick={handleExportData}>
              <Download className="h-6 w-6" />
              <span className="text-xs">Export Data</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col space-y-1" onClick={() => setSettingsOpen(true)}>
              <Target className="h-6 w-6" />
              <span className="text-xs">Set Targets</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col space-y-1" onClick={() => setSettingsOpen(true)}>
              <CalendarIcon className="h-6 w-6" />
              <span className="text-xs">Schedule Report</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col space-y-1" onClick={() => setSettingsOpen(true)}>
              <Bell className="h-6 w-6" />
              <span className="text-xs">Set Alerts</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col space-y-1" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-6 w-6" />
              <span className="text-xs">Configure</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* BiOS Configuration Dialog — backs Set Targets / Schedule Report / Set Alerts / Configure */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-purple-600" />
              <span>BiOS Configuration</span>
            </DialogTitle>
            <DialogDescription>
              Set performance targets, alerts, scheduled report delivery, and your comparison benchmarks.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="targets" className="py-2">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="targets">Targets</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
            </TabsList>

            <TabsContent value="targets" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="bios-revenue-target">Monthly Revenue Target</Label>
                <Input
                  id="bios-revenue-target"
                  type="number"
                  min="0"
                  placeholder="e.g. 120000"
                  value={monthlyRevenueTarget}
                  onChange={(e) => setMonthlyRevenueTarget(e.target.value)}
                  disabled={savingSettings}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bios-checkin-target">Daily Check-in Target (% of active members)</Label>
                <Input
                  id="bios-checkin-target"
                  type="number"
                  min="1"
                  max="100"
                  value={dailyCheckInTargetPercent}
                  onChange={(e) => setDailyCheckInTargetPercent(e.target.value)}
                  disabled={savingSettings}
                />
              </div>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-6 pt-4">
              <div className="space-y-3 p-4 rounded-lg border bg-gray-50">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">Retention Alerts</h4>
                  <Switch checked={alertEnabled} onCheckedChange={setAlertEnabled} disabled={savingSettings} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bios-alert-email">Alert Email</Label>
                  <Input
                    id="bios-alert-email"
                    type="email"
                    placeholder="manager@example.com"
                    value={alertEmail}
                    onChange={(e) => setAlertEmail(e.target.value)}
                    disabled={savingSettings}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bios-alert-threshold">Alert if retention falls below (%)</Label>
                  <Input
                    id="bios-alert-threshold"
                    type="number"
                    min="1"
                    max="100"
                    value={alertRetentionThreshold}
                    onChange={(e) => setAlertRetentionThreshold(e.target.value)}
                    disabled={savingSettings}
                  />
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-lg border bg-gray-50">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">Revenue Shortfall Alert</h4>
                  <Switch checked={revenueAlertEnabled} onCheckedChange={setRevenueAlertEnabled} disabled={savingSettings} />
                </div>
                <p className="text-xs text-gray-500">Uses the alert email above. Requires a monthly revenue target (set under the Targets tab).</p>
                <div className="space-y-2">
                  <Label htmlFor="bios-revenue-alert-threshold">Alert if projected month-end revenue falls below (% of target)</Label>
                  <Input
                    id="bios-revenue-alert-threshold"
                    type="number"
                    min="1"
                    max="100"
                    value={revenueAlertThresholdPercent}
                    onChange={(e) => setRevenueAlertThresholdPercent(e.target.value)}
                    disabled={savingSettings}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reports" className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">Scheduled Reports</h4>
                <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} disabled={savingSettings} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bios-schedule-email">Recipient Email</Label>
                <Input
                  id="bios-schedule-email"
                  type="email"
                  placeholder="manager@example.com"
                  value={scheduleEmail}
                  onChange={(e) => setScheduleEmail(e.target.value)}
                  disabled={savingSettings}
                />
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={scheduleFrequency} onValueChange={setScheduleFrequency} disabled={savingSettings}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Weekly (every Monday)</SelectItem>
                    <SelectItem value="MONTHLY">Monthly (1st of month)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="benchmarks" className="space-y-4 pt-4">
              <p className="text-xs text-gray-500">
                Your own comparison targets for the Benchmarking card — not sourced from any external industry data.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bios-bm-revenue">Revenue / Member ({currencyCode})</Label>
                  <Input
                    id="bios-bm-revenue"
                    type="number"
                    min="0"
                    value={benchmarkRevenuePerMember}
                    onChange={(e) => setBenchmarkRevenuePerMember(e.target.value)}
                    disabled={savingSettings}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bios-bm-retention">Retention (%)</Label>
                  <Input
                    id="bios-bm-retention"
                    type="number"
                    min="0"
                    max="100"
                    value={benchmarkRetentionPercent}
                    onChange={(e) => setBenchmarkRetentionPercent(e.target.value)}
                    disabled={savingSettings}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bios-bm-class">Class Utilization (%)</Label>
                  <Input
                    id="bios-bm-class"
                    type="number"
                    min="0"
                    max="100"
                    value={benchmarkClassUtilizationPercent}
                    onChange={(e) => setBenchmarkClassUtilizationPercent(e.target.value)}
                    disabled={savingSettings}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bios-bm-staff">Staff Efficiency (%)</Label>
                  <Input
                    id="bios-bm-staff"
                    type="number"
                    min="0"
                    max="100"
                    value={benchmarkStaffEfficiencyPercent}
                    onChange={(e) => setBenchmarkStaffEfficiencyPercent(e.target.value)}
                    disabled={savingSettings}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="bios-bm-margin">Operating Margin (%)</Label>
                  <Input
                    id="bios-bm-margin"
                    type="number"
                    min="0"
                    max="100"
                    value={benchmarkOperatingMarginPercent}
                    onChange={(e) => setBenchmarkOperatingMarginPercent(e.target.value)}
                    disabled={savingSettings}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)} disabled={savingSettings}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings} disabled={savingSettings}>
              {savingSettings ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generic detail viewer — backs the View Details / Analyze / Monitor / Compare / etc. buttons */}
      <Dialog open={detailsDialog !== null} onOpenChange={(open) => { if (!open) setDetailsDialog(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailsDialog?.title}</DialogTitle>
            {detailsDialog?.description && <DialogDescription>{detailsDialog.description}</DialogDescription>}
          </DialogHeader>
          <div className="py-2">{detailsDialog?.content}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}



