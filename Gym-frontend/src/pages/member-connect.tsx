import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import {
  Users,
  Target,
  Activity,
  ArrowUpRight,
  Eye,
  Share,
  Phone,
  Megaphone,
  CheckCircle,
  BarChart3,
  MessageSquare,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, BarChart, Bar, Pie, Legend } from 'recharts';
import { toast } from "sonner";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "../components/ui/utils";
import { membersService, Member } from '../utils/supabase/members-service';
import { leadService, LeadStats, LeadResponse } from '../utils/supabase/lead-service';
import { referralService, ReferralStats, ReferralResponse } from '../utils/supabase/referral-service';
import { followUpService, FollowUpStats, FollowUpResponse } from '../utils/supabase/follow-up-service';
import { messagingService, MessagingAnalyticsApi } from '../utils/supabase/messaging-service';
import { promotionsService, PromotionApi } from '../utils/supabase/promotions-service';

const SOURCE_LABELS: Record<string, string> = {
  website: 'Website',
  referral: 'Referral',
  'walk-in': 'Walk-in',
  'social-media': 'Social Media',
  'google-ads': 'Google Ads',
  'facebook-ads': 'Facebook Ads',
  instagram: 'Instagram',
  other: 'Other',
};
const SOURCE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#dd4477', '#22c55e', '#a855f7'];

// Where each dashboard tile/button should take the user — all real routes
// registered in App.tsx under the Member Connect section.
const SECTION_ROUTES: Record<string, string> = {
  campaigns: '/promotions-campaign',
  members: '/members',
  'promotions-campaign': '/promotions-campaign',
  referrals: '/referrals',
  leads: '/leads',
  'follow-ups': '/follow-ups',
  messaging: '/messaging',
  analytics: '/member-connect-analytics',
  trends: '/member-connect-analytics',
};

export function MemberConnect() {
  const navigate = useNavigate();
  const cardShell = "border-primary/10 shadow-md hover:shadow-lg transition-shadow";

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Real data, fetched from the backend ─────────────────────────────────
  const [members, setMembers] = useState<Member[]>([]);
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);
  const [leads, setLeads] = useState<LeadResponse[]>([]);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<ReferralResponse[]>([]);
  const [followUpStats, setFollowUpStats] = useState<FollowUpStats | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpResponse[]>([]);
  const [messagingAnalytics, setMessagingAnalytics] = useState<MessagingAnalyticsApi | null>(null);
  const [promotions, setPromotions] = useState<PromotionApi[]>([]);

  const fetchDashboardData = useCallback(async () => {
    const results = await Promise.allSettled([
      membersService.getMembers({}, { limit: 1000 }),
      leadService.getStats(),
      leadService.getLeads({ size: 500 }),
      referralService.getStats(),
      referralService.getReferrals({ size: 500 }),
      followUpService.getStats(),
      followUpService.getFollowUps({ size: 500 }),
      messagingService.getAnalytics(),
      promotionsService.getPromotions(),
    ]);

    const [
      membersRes, leadStatsRes, leadsRes, referralStatsRes, referralsRes,
      followUpStatsRes, followUpsRes, messagingRes, promotionsRes,
    ] = results;

    if (membersRes.status === 'fulfilled') setMembers(membersRes.value.members || []);
    if (leadStatsRes.status === 'fulfilled') setLeadStats(leadStatsRes.value);
    if (leadsRes.status === 'fulfilled') setLeads(leadsRes.value.leads || []);
    if (referralStatsRes.status === 'fulfilled') setReferralStats(referralStatsRes.value);
    if (referralsRes.status === 'fulfilled') setReferrals(referralsRes.value.referrals || []);
    if (followUpStatsRes.status === 'fulfilled') setFollowUpStats(followUpStatsRes.value);
    if (followUpsRes.status === 'fulfilled') setFollowUps(followUpsRes.value.followUps || []);
    if (messagingRes.status === 'fulfilled') setMessagingAnalytics(messagingRes.value);
    if (promotionsRes.status === 'fulfilled') setPromotions(promotionsRes.value || []);

    const failedCount = results.filter(r => r.status === 'rejected').length;
    setLoadError(failedCount > 0 ? `${failedCount} of ${results.length} data source(s) failed to load — showing partial data.` : null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      await fetchDashboardData();
      if (!cancelled) setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchDashboardData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchDashboardData();
      toast.success('Data refreshed!');
    } catch {
      toast.error('Failed to refresh some data');
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchDashboardData]);

  const handleViewDetails = (section: string) => {
    const route = SECTION_ROUTES[section];
    if (route) navigate(route);
  };

  // ── Real KPIs, derived from the fetched data ────────────────────────────

  const activeMembersCount = useMemo(
    () => members.filter(m => (m.membership_status || '').toLowerCase() === 'active').length,
    [members]
  );

  const campaignConversions = useMemo(() => {
    const promoRedemptions = promotions.reduce((sum, p) => sum + (p.usageCount ?? 0), 0);
    return promoRedemptions + (referralStats?.successfulReferrals ?? 0) + (leadStats?.convertedLeads ?? 0);
  }, [promotions, referralStats, leadStats]);

  const followUpCompletionRate = Math.round(followUpStats?.completionRate ?? 0);

  const messagingEffectiveness = useMemo(() => {
    if (!messagingAnalytics) return 0;
    const open = messagingAnalytics.open_rate ?? 0;
    const click = messagingAnalytics.click_rate ?? 0;
    return Math.round((open + click) / 2);
  }, [messagingAnalytics]);

  // Engagement Score: a weighted-average index across five real signals —
  // visit engagement, messaging response, referral conversion, follow-up
  // completion, and lead conversion.
  const checkInEngagementPct = useMemo(() => {
    if (!members.length) return 0;
    const withVisits = members.filter(m => (m.total_visits ?? 0) > 0).length;
    return Math.round((withVisits / members.length) * 100);
  }, [members]);
  const referralActivityPct = Math.round(referralStats?.conversionRate ?? 0);
  const leadConversionPct = Math.round(leadStats?.conversionRate ?? 0);

  const engagementScore = useMemo(() => {
    const parts = [checkInEngagementPct, messagingEffectiveness, referralActivityPct, followUpCompletionRate, leadConversionPct];
    return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
  }, [checkInEngagementPct, messagingEffectiveness, referralActivityPct, followUpCompletionRate, leadConversionPct]);

  const engagementLabel = engagementScore >= 80 ? 'Excellent Performance'
    : engagementScore >= 60 ? 'Good Performance'
    : engagementScore >= 40 ? 'Needs Attention'
    : 'Low Engagement';

  // ── Charts, derived from the same real records ──────────────────────────

  // 6-month trend of new leads created, referral conversions (by payment/signup
  // date), and follow-ups completed — all bucketed from real timestamps.
  const engagementTrendData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i));
    const inRange = (dateStr: string | undefined | null, start: Date, end: Date) => {
      if (!dateStr) return false;
      const t = new Date(dateStr);
      return t >= start && t <= end;
    };
    return months.map(d => {
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const newLeads = leads.filter(l => inRange(l.createdAt, start, end)).length;
      const conversions = referrals.filter(r => r.status === 'successful' && inRange(r.paymentDate || r.signupDate || r.createdAt, start, end)).length;
      const followUpsCompleted = followUps.filter(f => f.status === 'completed' && inRange(f.completedDate, start, end)).length;
      return { month: format(d, 'MMM'), newLeads, conversions, followUpsCompleted };
    });
  }, [leads, referrals, followUps]);

  // Real lead-source distribution (Lead.source), not fabricated percentages.
  const leadSourceData = useMemo(() => {
    const counts = new Map<string, number>();
    leads.forEach(l => {
      const key = l.source || 'other';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const total = leads.length || 1;
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key, value], i) => ({
        name: SOURCE_LABELS[key] || key,
        value,
        percent: Math.round((value / total) * 100),
        fill: SOURCE_COLORS[i % SOURCE_COLORS.length],
      }));
  }, [leads]);

  // Real lead funnel straight from LeadStatsDTO.
  const leadFunnelData = useMemo(() => {
    if (!leadStats) return [];
    return [
      { name: 'New', value: leadStats.newLeads, fill: '#2563eb' },
      { name: 'Contacted', value: leadStats.contactedLeads, fill: '#3b82f6' },
      { name: 'Follow-up', value: leadStats.followUpLeads, fill: '#60a5fa' },
      { name: 'Converted', value: leadStats.convertedLeads, fill: '#22c55e' },
    ];
  }, [leadStats]);

  return (
      <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Member Connect</h1>
          <p className="text-muted-foreground">Overall Performance Dashboard - Strategic insights across all connect features</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => handleViewDetails('campaigns')}>
            <ArrowUpRight className="mr-2 h-4 w-4" />
            View All Campaigns
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-900 px-4 py-2 text-sm text-yellow-800 dark:text-yellow-200 flex items-center">
          <AlertCircle className="mr-2 h-4 w-4 shrink-0" />
          {loadError}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Active Members</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{isLoading ? '—' : activeMembersCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mb-3">
              Members currently active out of {members.length.toLocaleString()} total
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start p-0 h-auto"
              onClick={() => handleViewDetails('members')}
            >
              <Eye className="mr-1 h-3 w-3" />
              View Details
            </Button>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Campaign Conversions</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <Target className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{isLoading ? '—' : campaignConversions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mb-3">
              Promotions + referrals + leads converted
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start p-0 h-auto"
              onClick={() => handleViewDetails('promotions-campaign')}
            >
              <Eye className="mr-1 h-3 w-3" />
              View Details
            </Button>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Follow-up Completion</CardTitle>
            <div className="bg-orange-50 p-2 rounded-lg">
              <CheckCircle className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{isLoading ? '—' : `${followUpCompletionRate}%`}</div>
            <p className="text-xs text-muted-foreground mb-3">
              Done vs pending across staff
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start p-0 h-auto"
              onClick={() => handleViewDetails('follow-ups')}
            >
              <Eye className="mr-1 h-3 w-3" />
              View Details
            </Button>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Messaging Effectiveness</CardTitle>
            <div className="bg-purple-50 p-2 rounded-lg">
              <MessageSquare className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{isLoading ? '—' : `${messagingEffectiveness}%`}</div>
            <p className="text-xs text-muted-foreground mb-3">
              Avg open/response rate across campaigns
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start p-0 h-auto"
              onClick={() => handleViewDetails('messaging')}
            >
              <Eye className="mr-1 h-3 w-3" />
              View Details
            </Button>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Engagement Score</CardTitle>
            <div className="bg-indigo-50 p-2 rounded-lg">
              <Activity className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-600">{isLoading ? '—' : `${engagementScore}/100`}</div>
            <p className="text-xs text-muted-foreground mb-3">
              Weighted index combining all metrics
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start p-0 h-auto"
              onClick={() => handleViewDetails('analytics')}
            >
              <Eye className="mr-1 h-3 w-3" />
              View Details
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Trends Chart */}
        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Engagement Trends</CardTitle>
              <CardDescription>New leads, referral conversions and completed follow-ups by month</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewDetails('trends')}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              View Details
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={engagementTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="newLeads"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="New Leads"
                />
                <Line
                  type="monotone"
                  dataKey="conversions"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Referral Conversions"
                />
                <Line
                  type="monotone"
                  dataKey="followUpsCompleted"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Follow-ups Completed"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lead Sources Pie Chart */}
        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Lead Sources</CardTitle>
              <CardDescription>Distribution of leads by acquisition source</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewDetails('leads')}
            >
              <Share className="mr-2 h-4 w-4" />
              View Details
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            {leadSourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={leadSourceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${percent}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {leadSourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-24 text-center">
                {isLoading ? 'Loading lead data…' : 'No lead data available yet.'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lead Funnel Chart */}
      <Card className={cardShell}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Lead Conversion Funnel</CardTitle>
            <CardDescription>Track prospects through the conversion journey</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails('leads')}
          >
            <Target className="mr-2 h-4 w-4" />
            View Details
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          {leadFunnelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={leadFunnelData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8">
                  {leadFunnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-24 text-center">
              {isLoading ? 'Loading lead data…' : 'No lead data available yet.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Engagement Score Gauge */}
      <Card className={cardShell}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Engagement Score Overview</CardTitle>
            <CardDescription>Weighted index combining visit engagement, messaging response, referral activity, follow-up completion, and lead conversion</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails('analytics')}
          >
            <Activity className="mr-2 h-4 w-4" />
            View Full Analytics
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Engagement Score Circle */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-40 h-40">
                <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 160 160">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-gray-200"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - engagementScore / 100)}`}
                    className="text-indigo-600 transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-indigo-600">{isLoading ? '—' : engagementScore}</div>
                    <div className="text-sm text-muted-foreground">Score</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <div className="font-medium">Overall Engagement</div>
                <div className="text-sm text-muted-foreground">{isLoading ? 'Loading…' : engagementLabel}</div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="col-span-2 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Member Check-ins</span>
                  <span className="text-sm text-muted-foreground">{checkInEngagementPct}%</span>
                </div>
                <Progress value={checkInEngagementPct} className="h-2" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Campaign Response Rate</span>
                  <span className="text-sm text-muted-foreground">{messagingEffectiveness}%</span>
                </div>
                <Progress value={messagingEffectiveness} className="h-2" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Referral Activity</span>
                  <span className="text-sm text-muted-foreground">{referralActivityPct}%</span>
                </div>
                <Progress value={referralActivityPct} className="h-2" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Follow-up Success</span>
                  <span className="text-sm text-muted-foreground">{followUpCompletionRate}%</span>
                </div>
                <Progress value={followUpCompletionRate} className="h-2" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Lead Conversion</span>
                  <span className="text-sm text-muted-foreground">{leadConversionPct}%</span>
                </div>
                <Progress value={leadConversionPct} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`${cardShell} p-4 cursor-pointer`} onClick={() => handleViewDetails('promotions-campaign')}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Megaphone className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="font-medium">Promotions</div>
              <div className="text-sm text-muted-foreground">Manage campaigns</div>
            </div>
          </div>
        </Card>

        <Card className={`${cardShell} p-4 cursor-pointer`} onClick={() => handleViewDetails('referrals')}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Share className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="font-medium">Referrals</div>
              <div className="text-sm text-muted-foreground">Track referrals</div>
            </div>
          </div>
        </Card>

        <Card className={`${cardShell} p-4 cursor-pointer`} onClick={() => handleViewDetails('leads')}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Target className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <div className="font-medium">Leads</div>
              <div className="text-sm text-muted-foreground">Manage prospects</div>
            </div>
          </div>
        </Card>

        <Card className={`${cardShell} p-4 cursor-pointer`} onClick={() => handleViewDetails('follow-ups')}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Phone className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="font-medium">Follow-ups</div>
              <div className="text-sm text-muted-foreground">Schedule calls</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
