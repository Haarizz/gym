import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useCurrency, CurrencyGlyph } from '../utils/currency';
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Separator } from "../components/ui/separator";
import { Progress } from "../components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts';
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Award,
  Calendar as CalendarIcon,
  Filter,
  Download,
  Search,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Star,
  MessageSquare,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Zap,
  Gift,
  Share,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Hash,
  Percent,
  DollarSign,
  Calendar as CalendarAlt,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  X,
  Info
} from 'lucide-react';
import { toast } from "sonner";
import { format, addDays, subDays, startOfMonth, endOfMonth, isWithinInterval, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { cn } from "../components/ui/utils";
import { membersService, Member as ApiMember } from '../utils/supabase/members-service';
import { leadService, LeadStats } from '../utils/supabase/lead-service';
import { referralService, ReferralStats } from '../utils/supabase/referral-service';
import { promotionsService, PromotionApi } from '../utils/supabase/promotions-service';

export function MemberConnectAnalytics() {
  const { currencyCode } = useCurrency();
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('month');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedPlan, setSelectedPlan] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>(undefined);
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const cardShell = "border-primary/10 shadow-md hover:shadow-lg transition-shadow";

  // ── Real data, fetched from the backend ─────────────────────────────────
  const [members, setMembers] = useState<ApiMember[]>([]);
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [promotions, setPromotions] = useState<PromotionApi[]>([]);

  const fetchAnalyticsData = useCallback(async () => {
    const results = await Promise.allSettled([
      membersService.getMembers({}, { limit: 1000 }),
      leadService.getStats(),
      referralService.getStats(),
      promotionsService.getPromotions(),
    ]);

    const [membersRes, leadRes, referralRes, promoRes] = results;

    if (membersRes.status === 'fulfilled') setMembers(membersRes.value.members || []);
    if (leadRes.status === 'fulfilled') setLeadStats(leadRes.value);
    if (referralRes.status === 'fulfilled') setReferralStats(referralRes.value);
    if (promoRes.status === 'fulfilled') setPromotions(promoRes.value || []);

    const failedCount = results.filter(r => r.status === 'rejected').length;
    setLoadError(failedCount > 0 ? `${failedCount} of 4 data source(s) failed to load — showing partial data.` : null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      await fetchAnalyticsData();
      if (!cancelled) setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchAnalyticsData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchAnalyticsData();
      toast.success('Data refreshed!');
    } catch {
      toast.error('Failed to refresh some data');
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchAnalyticsData]);

  // ── Derived, real metrics (no fabricated data) ──────────────────────────

  // Monthly new-member counts + running total, bucketed from real join dates.
  const acquisitionTrend = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, idx) => subMonths(now, 5 - idx));
    const firstStart = startOfMonth(months[0]);
    let cumulative = members.filter(m => m.join_date && new Date(m.join_date) < firstStart).length;
    return months.map(d => {
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const newMembers = members.filter(m => {
        if (!m.join_date) return false;
        const jd = new Date(m.join_date);
        return jd >= start && jd <= end;
      }).length;
      cumulative += newMembers;
      return { month: format(d, 'MMM'), newMembers, totalMembers: cumulative };
    });
  }, [members]);

  // Real membership-plan (membership_type) distribution.
  const membershipDistribution = useMemo(() => {
    const palette = ['#2563eb', '#059669', '#dc2626', '#7c3aed', '#ea580c', '#0891b2', '#be185d'];
    const counts = new Map<string, number>();
    members.forEach(m => {
      const key = m.membership_type || 'Unspecified';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const total = members.length || 1;
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({
        name,
        value,
        percentage: Number(((value / total) * 100).toFixed(1)),
        color: palette[i % palette.length],
      }));
  }, [members]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { active: 0, inactive: 0, suspended: 0, expired: 0, frozen: 0 };
    members.forEach(m => {
      const key = (m.membership_status || '').toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [members]);

  const statusBreakdownChart = useMemo(() => (
    Object.entries(statusCounts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({ status: status.charAt(0).toUpperCase() + status.slice(1), count }))
  ), [statusCounts]);

  // Most recently joined members, real names/emails/join dates/fees.
  const recentMembers = useMemo(() => (
    [...members]
      .filter(m => !!m.join_date)
      .sort((a, b) => new Date(b.join_date).getTime() - new Date(a.join_date).getTime())
      .slice(0, 8)
  ), [members]);

  // Honest "retention" per signup cohort: of the members who joined in a given
  // month, what % are still marked active TODAY. This is a current-state
  // snapshot, not a true point-in-time month-0/1/2/3/6/12 retention curve
  // (we don't have historical status snapshots for that).
  const retentionCohorts = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, idx) => subMonths(now, 5 - idx)).map(d => {
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const cohortMembers = members.filter(m => {
        if (!m.join_date) return false;
        const jd = new Date(m.join_date);
        return jd >= start && jd <= end;
      });
      const active = cohortMembers.filter(m => (m.membership_status || '').toLowerCase() === 'active').length;
      return {
        cohort: format(d, 'MMM yyyy'),
        newMembers: cohortMembers.length,
        active,
        retentionPct: cohortMembers.length ? (active / cohortMembers.length) * 100 : 0,
      };
    });
  }, [members]);

  const bestCohort = useMemo(() => {
    const eligible = retentionCohorts.filter(c => c.newMembers >= 3);
    const pool = eligible.length ? eligible : retentionCohorts.filter(c => c.newMembers > 0);
    if (!pool.length) return null;
    return pool.reduce((best, c) => (c.retentionPct > best.retentionPct ? c : best), pool[0]);
  }, [retentionCohorts]);

  // Real churn-risk signal: active members whose real expiry_date falls within 14 days.
  const atRiskMembers = useMemo(() => {
    const now = new Date();
    const horizon = addDays(now, 14);
    return members
      .filter(m => (m.membership_status || '').toLowerCase() === 'active' && m.expiry_date && new Date(m.expiry_date) <= horizon)
      .sort((a, b) => new Date(a.expiry_date as string).getTime() - new Date(b.expiry_date as string).getTime());
  }, [members]);

  // Real per-member visit counts (Member.totalVisits, incremented on every check-in).
  const visitsDistribution = useMemo(() => {
    const buckets: { range: string; test: (v: number) => boolean }[] = [
      { range: '0', test: v => v === 0 },
      { range: '1-10', test: v => v >= 1 && v <= 10 },
      { range: '11-30', test: v => v >= 11 && v <= 30 },
      { range: '31-60', test: v => v >= 31 && v <= 60 },
      { range: '60+', test: v => v > 60 },
    ];
    return buckets.map(b => ({
      range: b.range,
      count: members.filter(m => b.test(m.total_visits ?? 0)).length,
    }));
  }, [members]);

  const avgVisitsByPlan = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    members.forEach(m => {
      const key = m.membership_type || 'Unspecified';
      const entry = map.get(key) || { sum: 0, count: 0 };
      entry.sum += m.total_visits ?? 0;
      entry.count += 1;
      map.set(key, entry);
    });
    return Array.from(map.entries()).map(([type, { sum, count }]) => ({
      type,
      avgVisits: count ? Number((sum / count).toFixed(1)) : 0,
    }));
  }, [members]);

  const topByVisits = useMemo(() => (
    [...members].sort((a, b) => (b.total_visits ?? 0) - (a.total_visits ?? 0)).slice(0, 8)
  ), [members]);

  const avgVisits = useMemo(() => {
    if (!members.length) return 0;
    return members.reduce((sum, m) => sum + (m.total_visits ?? 0), 0) / members.length;
  }, [members]);

  // Real promotion/campaign fields only — no invented reach/engagement/cost/ROI.
  const campaignCards = useMemo(() => (
    promotions.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      status: p.status,
      startDate: p.startDate ? new Date(p.startDate) : null,
      endDate: p.endDate ? new Date(p.endDate) : null,
      usageCount: p.usageCount ?? 0,
      usageLimit: p.usageLimit ?? null,
      conversionRate: p.conversionRate ?? 0,
      redemptionRate: p.redemptionRate ?? 0,
      totalRevenue: p.totalRevenue ?? 0,
      totalSavings: p.totalSavings ?? 0,
      averageOrderValue: p.averageOrderValue ?? 0,
    }))
  ), [promotions]);

  // Real lead-status counts from LeadStatsDTO.
  const funnelData = useMemo(() => {
    if (!leadStats) return [];
    return [
      { name: 'New', value: leadStats.newLeads, fill: '#2563eb' },
      { name: 'Contacted', value: leadStats.contactedLeads, fill: '#3b82f6' },
      { name: 'Follow-up', value: leadStats.followUpLeads, fill: '#60a5fa' },
      { name: 'Converted', value: leadStats.convertedLeads, fill: '#93c5fd' },
    ];
  }, [leadStats]);

  const analytics = useMemo(() => {
    const totalMembers = members.length;
    const activeCount = statusCounts.active || 0;
    const churnedCount = (statusCounts.expired || 0) + (statusCounts.suspended || 0) + (statusCounts.inactive || 0);
    const retentionRate = totalMembers ? (activeCount / totalMembers) * 100 : 0;
    const churnRate = totalMembers ? (churnedCount / totalMembers) * 100 : 0;

    const currentMonth = acquisitionTrend[acquisitionTrend.length - 1];
    const previousMonth = acquisitionTrend[acquisitionTrend.length - 2];
    const newMembersThisMonth = currentMonth?.newMembers ?? 0;
    const newMemberGrowth = previousMonth && previousMonth.newMembers > 0
      ? ((currentMonth.newMembers - previousMonth.newMembers) / previousMonth.newMembers) * 100
      : null;
    const memberGrowth = previousMonth && previousMonth.totalMembers > 0
      ? ((currentMonth.totalMembers - previousMonth.totalMembers) / previousMonth.totalMembers) * 100
      : null;

    return {
      totalMembers,
      newMembersThisMonth,
      retentionRate,
      churnRate,
      avgVisits,
      memberGrowth,
      newMemberGrowth,
      leadConversionRate: leadStats?.conversionRate ?? null,
    };
  }, [members, statusCounts, acquisitionTrend, avgVisits, leadStats]);

  // Real CSV export of whatever real data is currently loaded (mirrors leads.tsx's Blob pattern).
  const handleExportCSV = useCallback(() => {
    const lines: string[] = [];
    lines.push('Member Connect Analytics Export');
    lines.push(`Generated,${format(new Date(), 'yyyy-MM-dd HH:mm')}`);
    lines.push('');

    lines.push('KPI,Value');
    lines.push(`Total Members,${analytics.totalMembers}`);
    lines.push(`New Members This Month,${analytics.newMembersThisMonth}`);
    lines.push(`Retention Rate,${analytics.retentionRate.toFixed(1)}%`);
    lines.push(`Churn Rate,${analytics.churnRate.toFixed(1)}%`);
    lines.push(`Avg Visits per Member,${analytics.avgVisits.toFixed(1)}`);
    if (leadStats) lines.push(`Lead Conversion Rate,${leadStats.conversionRate.toFixed(1)}%`);
    if (referralStats) lines.push(`Referral Conversion Rate,${referralStats.conversionRate.toFixed(1)}%`);
    lines.push('');

    lines.push('Membership Distribution');
    lines.push('Plan Type,Members,Percentage');
    membershipDistribution.forEach(d => lines.push(`${d.name},${d.value},${d.percentage}%`));
    lines.push('');

    lines.push('Recent New Members');
    lines.push('Name,Email,Plan,Fee,Join Date,Status');
    recentMembers.forEach(m => {
      const fee = m.membership_fee ?? m.monthly_fee ?? 0;
      lines.push(`${m.name},${m.email},${m.membership_plan || m.membership_type || ''},${fee},${format(new Date(m.join_date), 'yyyy-MM-dd')},${m.membership_status}`);
    });
    lines.push('');

    lines.push('Retention by Signup Cohort');
    lines.push('Cohort,New Members,Currently Active,Retention %');
    retentionCohorts.forEach(c => lines.push(`${c.cohort},${c.newMembers},${c.active},${c.retentionPct.toFixed(1)}%`));
    lines.push('');

    lines.push('Lead Funnel');
    lines.push('Stage,Count');
    funnelData.forEach(f => lines.push(`${f.name},${f.value}`));
    lines.push('');

    if (campaignCards.length) {
      lines.push('Campaigns / Promotions');
      lines.push('Name,Type,Status,Usage,Conversion Rate,Redemption Rate,Total Revenue,Total Savings');
      campaignCards.forEach(c => lines.push(
        `${c.name},${c.type},${c.status},${c.usageCount}${c.usageLimit ? '/' + c.usageLimit : ''},${c.conversionRate}%,${c.redemptionRate}%,${c.totalRevenue},${c.totalSavings}`
      ));
    }

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `member-connect-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Analytics exported as CSV');
  }, [analytics, leadStats, referralStats, membershipDistribution, recentMembers, retentionCohorts, funnelData, campaignCards]);

  // Get trend indicator
  const getTrendIcon = (value: number, reverse = false) => {
    const isPositive = reverse ? value < 0 : value > 0;
    return isPositive ? (
      <ArrowUpRight className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDownRight className="h-4 w-4 text-red-600" />
    );
  };

  const getTrendColor = (value: number, reverse = false) => {
    const isPositive = reverse ? value < 0 : value > 0;
    return isPositive ? 'text-green-600' : 'text-red-600';
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Member Connect Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Real insights into member acquisition, retention, and engagement
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-900 px-4 py-2 text-sm text-yellow-800 dark:text-yellow-200 flex items-center">
          <AlertCircle className="mr-2 h-4 w-4 shrink-0" />
          {loadError}
        </div>
      )}

      {/* Filters Panel */}
      <Card className={cardShell}>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members, campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  <SelectItem value="downtown">Downtown</SelectItem>
                  <SelectItem value="westside">Westside</SelectItem>
                  <SelectItem value="northside">Northside</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Plan Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="premium-annual">Premium Annual</SelectItem>
                  <SelectItem value="premium-monthly">Premium Monthly</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Advanced
                {showAdvancedFilters ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </div>

          {showAdvancedFilters && (
            <>
              <Separator className="my-4" />
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <Label>Acquisition Source</Label>
                  <Select value={selectedSource} onValueChange={setSelectedSource}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="referral">Referrals</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="walk-in">Walk-in</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                      <SelectItem value="campaign">Campaigns</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Custom Date From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateFrom ? format(customDateFrom, 'MMM dd, yyyy') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start">
                      <Calendar
                        mode="single"
                        selected={customDateFrom}
                        onSelect={setCustomDateFrom}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Custom Date To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateTo ? format(customDateTo, 'MMM dd, yyyy') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start">
                      <Calendar
                        mode="single"
                        selected={customDateTo}
                        onSelect={setCustomDateTo}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-end">
                  <Button variant="outline" onClick={() => {
                    setCustomDateFrom(undefined);
                    setCustomDateTo(undefined);
                    setSelectedBranch('all');
                    setSelectedPlan('all');
                    setSelectedSource('all');
                    setSearchTerm('');
                  }}>
                    <X className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Members</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{analytics.totalMembers.toLocaleString()}</div>
            {analytics.memberGrowth !== null ? (
              <div className="flex items-center text-xs text-muted-foreground">
                {getTrendIcon(analytics.memberGrowth)}
                <span className={cn("ml-1", getTrendColor(analytics.memberGrowth))}>
                  {Math.abs(analytics.memberGrowth).toFixed(1)}% vs last month
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">All-time count</p>
            )}
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">New Members</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <UserPlus className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics.newMembersThisMonth}</div>
            {analytics.newMemberGrowth !== null ? (
              <div className="flex items-center text-xs text-muted-foreground">
                {getTrendIcon(analytics.newMemberGrowth)}
                <span className={cn("ml-1", getTrendColor(analytics.newMemberGrowth))}>
                  {Math.abs(analytics.newMemberGrowth).toFixed(1)}% vs last month
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">This calendar month</p>
            )}
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Retention Rate</CardTitle>
            <div className="bg-purple-50 p-2 rounded-lg">
              <UserCheck className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{analytics.retentionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{statusCounts.active || 0} active of {analytics.totalMembers}</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Churn Rate</CardTitle>
            <div className="bg-red-50 p-2 rounded-lg">
              <UserX className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{analytics.churnRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Expired, suspended or inactive</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Avg Visits / Member</CardTitle>
            <div className="bg-orange-50 p-2 rounded-lg">
              <Activity className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{analytics.avgVisits.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Lifetime check-ins, average</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Lead Conversion</CardTitle>
            <div className="bg-indigo-50 p-2 rounded-lg">
              <Target className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              {analytics.leadConversionRate !== null ? `${analytics.leadConversionRate.toFixed(1)}%` : '—'}
            </div>
            <p className="text-xs text-muted-foreground">Leads converted to members</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="acquisition" className="flex-1">Acquisition</TabsTrigger>
          <TabsTrigger value="retention" className="flex-1">Retention</TabsTrigger>
          <TabsTrigger value="engagement" className="flex-1">Engagement</TabsTrigger>
          <TabsTrigger value="campaigns" className="flex-1">Campaigns</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Member Growth Chart */}
            <Card className={cardShell}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChartIcon className="mr-2 h-5 w-5" />
                  Member Growth Trend
                </CardTitle>
                <CardDescription>New members and running total over the last 6 months (real join dates)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={acquisitionTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="newMembers" stroke="#10b981" strokeWidth={3} name="New Members" />
                    <Line type="monotone" dataKey="totalMembers" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" name="Total Members" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Membership Distribution */}
            <Card className={cardShell}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChartIcon className="mr-2 h-5 w-5" />
                  Membership Distribution
                </CardTitle>
                <CardDescription>Current members by plan type</CardDescription>
              </CardHeader>
              <CardContent>
                {membershipDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={membershipDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {membershipDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground py-16 text-center">
                    {isLoading ? 'Loading members…' : 'No members found.'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Referral Outcomes (real breakdown of referral results) */}
            <Card className={cardShell}>
              <CardHeader>
                <CardTitle>Referral Outcomes</CardTitle>
                <CardDescription>Real referral results — GymBios doesn't track a per-member acquisition channel, so this covers referrals only</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {referralStats ? (
                  <>
                    {[
                      { name: 'Successful', value: referralStats.successfulReferrals },
                      { name: 'Pending', value: referralStats.pendingReferrals },
                      { name: 'Expired', value: referralStats.expiredReferrals },
                    ].map((row) => {
                      const pct = referralStats.totalReferrals ? (row.value / referralStats.totalReferrals) * 100 : 0;
                      return (
                        <div key={row.name} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{row.name}</span>
                            <span className="text-muted-foreground">{row.value} ({pct.toFixed(1)}%)</span>
                          </div>
                          <Progress value={pct} className="h-2" />
                        </div>
                      );
                    })}
                    <Separator />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Referrals</p>
                        <p className="font-semibold">{referralStats.totalReferrals}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Conversion Rate</p>
                        <p className="font-semibold">{referralStats.conversionRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Rewards Paid</p>
                        <p className="font-semibold"><CurrencyGlyph /> {referralStats.totalRewards.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Active Reward Rules</p>
                        <p className="font-semibold">{referralStats.activeRules}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">{isLoading ? 'Loading referral data…' : 'Referral data unavailable.'}</p>
                )}
              </CardContent>
            </Card>

            {/* Membership Status Overview */}
            <Card className={cardShell}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Membership Status Overview
                </CardTitle>
                <CardDescription>Current members grouped by real membership status</CardDescription>
              </CardHeader>
              <CardContent>
                {statusBreakdownChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={statusBreakdownChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" fill="#3b82f6" name="Members" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground py-16 text-center">
                    {isLoading ? 'Loading members…' : 'No members found.'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Acquisition Tab */}
        <TabsContent value="acquisition" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lead Funnel */}
            <Card className={cardShell}>
              <CardHeader>
                <CardTitle>Lead Funnel</CardTitle>
                <CardDescription>Current lead pipeline by status (real counts from Leads)</CardDescription>
              </CardHeader>
              <CardContent>
                {funnelData.length > 0 && funnelData.some(f => f.value > 0) ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <FunnelChart>
                      <Tooltip />
                      <Funnel
                        dataKey="value"
                        data={funnelData}
                        isAnimationActive
                      >
                        <LabelList position="center" fill="#fff" stroke="none" />
                      </Funnel>
                    </FunnelChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground py-16 text-center">
                    {isLoading ? 'Loading leads…' : 'No lead data available.'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Acquisition Metrics */}
            <Card className={cardShell}>
              <CardHeader>
                <CardTitle>Acquisition Metrics</CardTitle>
                <CardDescription>Real lead and referral performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{leadStats ? leadStats.totalLeads : '—'}</p>
                    <p className="text-sm text-muted-foreground">Total Leads</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{leadStats ? `${leadStats.conversionRate.toFixed(1)}%` : '—'}</p>
                    <p className="text-sm text-muted-foreground">Lead Conversion Rate</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Referral Conversion Rate</span>
                    <span className="text-sm text-muted-foreground">{referralStats ? `${referralStats.conversionRate.toFixed(1)}%` : '—'}</span>
                  </div>
                  <Progress value={referralStats?.conversionRate ?? 0} className="h-2" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Lead Conversion Rate</span>
                    <span className="text-sm text-muted-foreground">{leadStats ? `${leadStats.conversionRate.toFixed(1)}%` : '—'}</span>
                  </div>
                  <Progress value={leadStats?.conversionRate ?? 0} className="h-2" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Member Retention Rate</span>
                    <span className="text-sm text-muted-foreground">{analytics.retentionRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={analytics.retentionRate} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Acquisitions Table */}
          <Card className={cardShell}>
            <CardHeader>
              <CardTitle>Recent New Members</CardTitle>
              <CardDescription>Latest member signups, most recent join date first (real data)</CardDescription>
            </CardHeader>
            <CardContent>
              {recentMembers.length > 0 ? (
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Join Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentMembers.map((m) => {
                      const fee = m.membership_fee ?? m.monthly_fee ?? 0;
                      const initials = m.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                      return (
                        <TableRow className="transition-colors hover:bg-slate-50/50" key={m.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>{initials}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{m.name}</p>
                                <p className="text-sm text-muted-foreground">{m.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{m.membership_plan || m.membership_type || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell><CurrencyGlyph /> {Number(fee).toLocaleString()}</TableCell>
                          <TableCell>{format(new Date(m.join_date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            <Badge className={cn(
                              m.membership_status === 'active' ? 'bg-green-100 text-green-800' :
                              m.membership_status === 'frozen' ? 'bg-blue-100 text-blue-800' :
                              (m.membership_status === 'expired' || m.membership_status === 'suspended') ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            )}>
                              {m.membership_status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  {isLoading ? 'Loading members…' : 'No members found.'}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retention Tab */}
        <TabsContent value="retention" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Retention Cohort Analysis */}
            <Card className={`lg:col-span-2 ${cardShell}`}>
              <CardHeader>
                <CardTitle>Retention by Signup Cohort</CardTitle>
                <CardDescription>
                  Of the members who joined in a given month, the % still marked active today — a current-state
                  snapshot from real join dates and statuses, not a historical month-by-month retention curve.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Cohort</th>
                        <th className="text-center p-2 font-medium">New Members</th>
                        <th className="text-center p-2 font-medium">Currently Active</th>
                        <th className="text-center p-2 font-medium">Retention</th>
                      </tr>
                    </thead>
                    <tbody>
                      {retentionCohorts.map((cohort) => (
                        <tr key={cohort.cohort} className="border-b">
                          <td className="p-2 font-medium">{cohort.cohort}</td>
                          <td className="p-2 text-center">{cohort.newMembers}</td>
                          <td className="p-2 text-center">{cohort.active}</td>
                          <td className="p-2 text-center">
                            {cohort.newMembers > 0 ? (
                              <div className={cn(
                                "inline-block px-2 py-1 rounded text-sm",
                                cohort.retentionPct >= 80 ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200" :
                                cohort.retentionPct >= 50 ? "bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200" :
                                "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200"
                              )}>
                                {cohort.retentionPct.toFixed(0)}%
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Retention Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className={cardShell}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="mr-2 h-5 w-5 text-yellow-600" />
                  Best Performing Cohort
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bestCohort ? (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{bestCohort.cohort}</p>
                    <p className="text-sm text-muted-foreground">{bestCohort.retentionPct.toFixed(0)}% still active today</p>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Joined that month</span>
                        <span className="font-medium">{bestCohort.newMembers} members</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Still Active</span>
                        <span className="font-medium text-green-600">{bestCohort.active} members</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Not enough signup data yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className={cardShell}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="mr-2 h-5 w-5 text-red-600" />
                  At-Risk Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{atRiskMembers.length}</p>
                  <p className="text-sm text-muted-foreground">Active members expiring within 14 days</p>
                  <div className="mt-4 space-y-2">
                    {atRiskMembers.slice(0, 4).map((m) => (
                      <div key={m.id} className="flex justify-between text-sm">
                        <span className="truncate mr-2">{m.name}</span>
                        <span className="font-medium shrink-0">{m.expiry_date ? format(new Date(m.expiry_date), 'MMM dd') : '-'}</span>
                      </div>
                    ))}
                    {atRiskMembers.length === 0 && (
                      <p className="text-xs text-muted-foreground">No members expiring soon</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cardShell}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserX className="mr-2 h-5 w-5 text-blue-600" />
                  Frozen &amp; Suspended
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Frozen Memberships</span>
                    <Badge className="bg-blue-100 text-blue-800">{statusCounts.frozen || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Suspended</span>
                    <Badge className="bg-orange-100 text-orange-800">{statusCounts.suspended || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Expired</span>
                    <Badge className="bg-red-100 text-red-800">{statusCounts.expired || 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visits Distribution (real, from Member.totalVisits) */}
            <Card className={cardShell}>
              <CardHeader>
                <CardTitle>Visits Distribution</CardTitle>
                <CardDescription>Real lifetime check-in counts across all members</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={visitsDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#3b82f6" name="Members" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Avg Visits by Plan */}
            <Card className={cardShell}>
              <CardHeader>
                <CardTitle>Avg Visits by Plan</CardTitle>
                <CardDescription>Average lifetime check-ins per member, grouped by membership type</CardDescription>
              </CardHeader>
              <CardContent>
                {avgVisitsByPlan.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={avgVisitsByPlan}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="avgVisits" fill="#8b5cf6" name="Avg Visits" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground py-16 text-center">
                    {isLoading ? 'Loading members…' : 'No members found.'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Members by Visits */}
          <Card className={cardShell}>
            <CardHeader>
              <CardTitle>Top Members by Visits</CardTitle>
              <CardDescription>Real check-in counts — highest lifetime visits first</CardDescription>
            </CardHeader>
            <CardContent>
              {topByVisits.length > 0 ? (
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Total Visits</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topByVisits.map((m) => (
                      <TableRow className="transition-colors hover:bg-slate-50/50" key={m.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{m.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{m.name}</p>
                              <p className="text-sm text-muted-foreground">{m.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{m.membership_plan || m.membership_type || 'N/A'}</TableCell>
                        <TableCell className="font-medium">{m.total_visits ?? 0}</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            m.membership_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          )}>
                            {m.membership_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  {isLoading ? 'Loading members…' : 'No members found.'}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Campaign Performance Cards (real PromotionApi fields only) */}
            {campaignCards.map((campaign) => (
              <Card key={campaign.id} className={cardShell}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <Badge className={cn(
                      campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                      campaign.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    )}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    {campaign.startDate && campaign.endDate
                      ? `${format(campaign.startDate, 'MMM dd')} - ${format(campaign.endDate, 'MMM dd, yyyy')}`
                      : campaign.type}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <p className="text-xl font-bold text-blue-600">
                        {campaign.usageCount}{campaign.usageLimit ? ` / ${campaign.usageLimit}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">Redemptions</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <p className="text-xl font-bold text-green-600">{campaign.conversionRate.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">Conversion Rate</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Redemption Rate</span>
                      <span className="font-medium">{campaign.redemptionRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={campaign.redemptionRate} className="h-2" />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Revenue</span>
                      <span className="font-medium text-green-600"><CurrencyGlyph /> {campaign.totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Savings Given</span>
                      <span className="font-medium"><CurrencyGlyph /> {campaign.totalSavings.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Avg Order Value</span>
                      <span className="font-medium"><CurrencyGlyph /> {campaign.averageOrderValue.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {campaignCards.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center lg:col-span-3">
                {isLoading ? 'Loading campaigns…' : 'No promotions/campaigns found.'}
              </p>
            )}
          </div>

          {/* Campaign Comparison Chart */}
          <Card className={cardShell}>
            <CardHeader>
              <CardTitle>Campaign Performance Comparison</CardTitle>
              <CardDescription>Real revenue and redemption counts across all campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {campaignCards.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={campaignCards}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="totalRevenue" fill="#10b981" name={`Revenue (${currencyCode})`} />
                    <Bar yAxisId="right" dataKey="usageCount" fill="#3b82f6" name="Redemptions" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">No campaign data available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
