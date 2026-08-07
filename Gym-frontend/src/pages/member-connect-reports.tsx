import React, { useState, useMemo, useCallback } from 'react';
import { CurrencyGlyph } from '../utils/currency';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
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
  ComposedChart
} from 'recharts';
import {
  MessageSquare,
  Send,
  Eye,
  MousePointer,
  Users,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar as CalendarIcon,
  Filter,
  Download,
  Search,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  RefreshCw,
  ExternalLink,
  Mail,
  Phone,
  Share,
  CheckCircle,
  Clock,
  AlertCircle,
  Star,
  ThumbsUp,
  ThumbsDown,
  Zap,
  Award,
  Gift,
  Bell,
  Hash,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  X,
  Info,
  FileText,
  ChevronRight,
  ChevronDown,
  Calendar as CalendarAlt,
  Activity,
  Megaphone,
  BookOpen,
  Sparkles,
  Loader2
} from 'lucide-react';
import { toast } from "sonner";
import { format, addDays, subDays, startOfMonth, endOfMonth, isWithinInterval, addMonths, subMonths, startOfWeek, endOfWeek, isToday, isYesterday, subWeeks } from "date-fns";
import { cn } from "../components/ui/utils";
import { promotionsService, type PromotionApi } from '../utils/supabase/promotions-service';
import { referralService, type ReferralResponse } from '../utils/supabase/referral-service';
import { followUpService, type FollowUpResponse } from '../utils/supabase/follow-up-service';
import { messagingService, type MessagingAnalyticsApi, type MessageHistoryApi } from '../utils/supabase/messaging-service';
import { membersService, type Member } from '../utils/supabase/members-service';

// All interfaces now come from respective service files

// Simple CSV field escaper - quotes fields containing commas, quotes, or newlines
const csvEscape = (value: any): string => {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export function MemberConnectReports() {
    const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('month');
  const [selectedCampaignType, setSelectedCampaignType] = useState('all');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>(undefined);
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<PromotionApi | null>(null);
  const [showCampaignDetail, setShowCampaignDetail] = useState(false);
  const cardShell = "border-primary/10 shadow-md hover:shadow-lg transition-shadow";

  const [apiPromotions, setApiPromotions] = useState<PromotionApi[]>([]);
  const [apiReferrals, setApiReferrals] = useState<ReferralResponse[]>([]);
  const [apiFollowUps, setApiFollowUps] = useState<FollowUpResponse[]>([]);
  const [apiMessagingStats, setApiMessagingStats] = useState<MessagingAnalyticsApi | null>(null);
  const [apiMessageHistory, setApiMessageHistory] = useState<MessageHistoryApi[]>([]);
  const [apiMembers, setApiMembers] = useState<Member[]>([]);

  const [apiReferralStats, setApiReferralStats] = useState({ totalReferrals: 0, successfulReferrals: 0 });
  const [apiFollowUpStats, setApiFollowUpStats] = useState({ totalFollowUps: 0, completedFollowUps: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        promos, refData, refStats, followData, followStats, msgStats, msgHist, membersData
      ] = await Promise.all([
        promotionsService.getPromotions(),
        referralService.getReferrals({ size: 100 }),
        referralService.getStats(),
        followUpService.getFollowUps({ size: 100 }),
        followUpService.getStats(),
        messagingService.getAnalytics(),
        messagingService.getHistory(),
        membersService.getMembers({}, { limit: 1000 })
      ]);
      setApiPromotions(promos || []);
      setApiReferrals(refData?.referrals || []);
      setApiReferralStats({ totalReferrals: refStats?.totalReferrals || 0, successfulReferrals: refStats?.successfulReferrals || 0 });
      setApiFollowUps(followData?.followUps || []);
      setApiFollowUpStats({ totalFollowUps: followStats?.totalFollowUps || 0, completedFollowUps: followStats?.completedFollowUps || 0 });
      setApiMessagingStats(msgStats);
      setApiMessageHistory(msgHist || []);
      setApiMembers(membersData?.members || []);
    } catch (e) {
      console.error('Error loading report data:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => { loadData(); }, [loadData]);

  // Calculate key metrics
  const analytics = useMemo(() => {
    const totalMembersEngaged = apiMessagingStats?.total_recipients || 0;
    const totalCampaigns = apiPromotions.length;
    const activeCampaigns = apiPromotions.filter(c => c.status === 'active' || c.status === 'scheduled').length;
    
    const totalMessagesSent = apiMessagingStats?.sent_today || 0;
    const openRate = apiMessagingStats?.open_rate || 0;
    const clickRate = apiMessagingStats?.click_rate || 0;
    
    // Derived approximations from real messaging stats (open/click rate come from the API)
    const totalOpened = Math.round(totalMessagesSent * (openRate / 100));
    const totalClicked = Math.round(totalOpened * (clickRate / 100));

    // Real conversion rate, averaged from each promotion's actual conversionRate field
    // (tracked by the backend on redemption) rather than an invented click-to-conversion ratio.
    const promoConversionRates = apiPromotions
      .map(p => p.conversionRate)
      .filter((v): v is number => typeof v === 'number');
    const conversionRate = promoConversionRates.length > 0
      ? promoConversionRates.reduce((sum, v) => sum + v, 0) / promoConversionRates.length
      : 0;

    const referralsGenerated = apiReferralStats.totalReferrals;
    const referralsConverted = apiReferralStats.successfulReferrals;
    const referralConversionRate = referralsGenerated > 0 ? (referralsConverted / referralsGenerated) * 100 : 0;

    const followUpsCompleted = apiFollowUpStats.completedFollowUps;
    const totalFollowUps = apiFollowUpStats.totalFollowUps;
    const followUpCompletionRate = totalFollowUps > 0 ? (followUpsCompleted / totalFollowUps) * 100 : 0;

    // Real revenue: sum of each promotion's actual totalRevenue, incremented server-side on redemption
    const totalRevenue = apiPromotions.reduce((sum, p) => sum + (p.totalRevenue ?? 0), 0);
    const totalCost = apiMessagingStats?.total_cost || 0;
    const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

    return {
      totalMembersEngaged,
      totalCampaigns,
      activeCampaigns,
      totalMessagesSent,
      totalOpened,
      openRate,
      clickRate,
      conversionRate,
      referralsGenerated,
      referralConversionRate,
      followUpsCompleted,
      followUpCompletionRate,
      totalRevenue,
      totalCost,
      roi
    };
  }, [apiPromotions, apiMessagingStats, apiReferralStats, apiFollowUpStats]);

  // Real period-over-period trends (current calendar month vs previous), derived from
  // actual message history timestamps. null when there's no prior-period data to compare.
  const periodTrends = useMemo(() => {
    const now = new Date();
    const currentStart = startOfMonth(now);
    const currentEnd = endOfMonth(now);
    const prevMonth = subMonths(now, 1);
    const prevStart = startOfMonth(prevMonth);
    const prevEnd = endOfMonth(prevMonth);

    const inRange = (dateStr: string | null | undefined, start: Date, end: Date) => {
      if (!dateStr) return false;
      return isWithinInterval(new Date(dateStr), { start, end });
    };

    const currentMsgs = apiMessageHistory.filter(m => inRange(m.sent_date, currentStart, currentEnd));
    const prevMsgs = apiMessageHistory.filter(m => inRange(m.sent_date, prevStart, prevEnd));

    const sumRecipients = (msgs: MessageHistoryApi[]) => msgs.reduce((s, m) => s + (m.recipient_count || 0), 0);
    const avgClickRate = (msgs: MessageHistoryApi[]) => {
      const rates = msgs.map(m => m.click_rate).filter((v): v is number => typeof v === 'number');
      return rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
    };

    const currentRecipients = sumRecipients(currentMsgs);
    const prevRecipients = sumRecipients(prevMsgs);
    const membersEngagedDelta = prevMsgs.length > 0 && prevRecipients > 0
      ? ((currentRecipients - prevRecipients) / prevRecipients) * 100
      : null;

    const currentClickRate = avgClickRate(currentMsgs);
    const prevClickRate = avgClickRate(prevMsgs);
    const clickRateDelta = currentClickRate !== null && prevClickRate !== null
      ? currentClickRate - prevClickRate
      : null;

    return { membersEngagedDelta, clickRateDelta };
  }, [apiMessageHistory]);

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

  // Filter campaigns based on search and filters
  const filteredCampaigns = useMemo(() => {
    return apiPromotions.filter(campaign => {
      const matchesSearch = searchTerm === '' || 
        campaign.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = selectedCampaignType === 'all' || campaign.type === selectedCampaignType;
      const matchesChannel = selectedChannel === 'all' || campaign.type === selectedChannel;
      
      return matchesSearch && matchesType && matchesChannel;
    });
  }, [apiPromotions, searchTerm, selectedCampaignType, selectedChannel]);

  const communicationMetrics = useMemo(() => {
    // Aggregate message history into a monthly summary
    const buckets: Record<string, any> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = months[d.getMonth()];
      buckets[label] = { date: label, emailsOpened: 0, smsOpened: 0, pushOpened: 0 };
    }

    apiMessageHistory.forEach(msg => {
      if (!msg.sent_date) return;
      const d = new Date(msg.sent_date);
      const label = months[d.getMonth()];
      if (buckets[label]) {
        const opened = Math.round((msg.recipient_count || 1) * ((msg.open_rate || 0) / 100));
        if (msg.type === 'email') buckets[label].emailsOpened += opened;
        else if (msg.type === 'sms') buckets[label].smsOpened += opened;
        else if (msg.type === 'in-app') buckets[label].pushOpened += opened;
      }
    });

    return Object.values(buckets);
  }, [apiMessageHistory]);

  const messageStatusData = useMemo(() => {
    const counts: Record<string, number> = { sent: 0, delivered: 0, read: 0, failed: 0 };
    apiMessageHistory.forEach(m => {
      const s = m.status?.toLowerCase() || '';
      if (counts[s] !== undefined) counts[s]++;
    });
    return [
      { name: 'Sent', count: counts.sent, fill: '#3b82f6' },
      { name: 'Delivered', count: counts.delivered, fill: '#10b981' },
      { name: 'Read', count: counts.read, fill: '#8b5cf6' },
      { name: 'Failed', count: counts.failed, fill: '#ef4444' }
    ];
  }, [apiMessageHistory]);

  const campaignPerformanceData = useMemo(() => {
    let email = 0; let sms = 0; let push = 0; let social = 0;
    apiPromotions.forEach(p => {
      const t = p.type?.toLowerCase() || '';
      if (t.includes('email')) email++;
      else if (t.includes('sms')) sms++;
      else if (t.includes('push') || t.includes('in-app')) push++;
      else social++;
    });
    
    // If no data, provide a default skeleton
    const total = email + sms + push + social;
    if (total === 0) {
      return [
        { name: 'Email', value: 100, fill: '#e2e8f0' } // grey placeholder
      ];
    }
    
    return [
      { name: 'Email', value: Math.round((email/total)*100), fill: '#3b82f6' },
      { name: 'SMS', value: Math.round((sms/total)*100), fill: '#10b981' },
      { name: 'Push', value: Math.round((push/total)*100), fill: '#f59e0b' },
      { name: 'Social', value: Math.round((social/total)*100), fill: '#8b5cf6' }
    ].filter(d => d.value > 0);
  }, [apiPromotions]);

  // Real per-member engagement derived from referrers: actual referral counts and the
  // member's real membership plan/type (looked up from the members roster). There is no
  // engagement-score API anywhere in the backend, so no such score is fabricated here.
  const memberEngagementsData = useMemo(() => {
    const membersById = new Map(apiMembers.map(m => [m.id, m]));
    const membersMap = new Map<string, any>();

    apiReferrals.forEach(r => {
      const name = r.referrerName || 'Unknown Member';
      const matchedMember = r.referrerMemberId ? membersById.get(r.referrerMemberId) : undefined;

      if (!membersMap.has(name)) {
        membersMap.set(name, {
          memberId: r.referrerMemberId || name,
          memberName: name,
          membershipType: matchedMember?.membership_plan || matchedMember?.membership_type || 'Unknown',
          referralsMade: 1,
          lastEngagement: r.date
        });
      } else {
        const m = membersMap.get(name);
        m.referralsMade++;
        if (r.date && (!m.lastEngagement || new Date(r.date) > new Date(m.lastEngagement))) {
          m.lastEngagement = r.date;
        }
      }
    });

    return Array.from(membersMap.values());
  }, [apiReferrals, apiMembers]);

  // Sum of real rewardAmount for referrals whose reward hasn't been paid out yet
  const pendingReferralRewardValue = useMemo(() => {
    return apiReferrals
      .filter(r => !r.paymentDate)
      .reduce((sum, r) => sum + (r.rewardAmount || 0), 0);
  }, [apiReferrals]);

  // Build a CSV of whichever tab's real data is currently displayed
  const buildExportCsv = useCallback((): { filename: string; content: string } => {
    let header: string[] = [];
    let rows: string[][] = [];
    let filename = 'member-connect-overview.csv';

    switch (activeTab) {
      case 'campaigns':
        filename = 'campaigns-report.csv';
        header = ['Name', 'Type', 'Status', 'Start Date', 'End Date', 'Usage Count', 'Usage Limit', 'Redemption Rate (%)', 'Conversion Rate (%)', 'Total Revenue', 'Total Savings', 'Created By'];
        rows = filteredCampaigns.map(c => [
          c.name, c.type, c.status,
          c.startDate ? format(new Date(c.startDate), 'yyyy-MM-dd') : '',
          c.endDate ? format(new Date(c.endDate), 'yyyy-MM-dd') : '',
          String(c.usageCount ?? 0), c.usageLimit != null ? String(c.usageLimit) : '',
          String(c.redemptionRate ?? 0), String(c.conversionRate ?? 0),
          String(c.totalRevenue ?? 0), String(c.totalSavings ?? 0), c.createdBy || ''
        ].map(csvEscape));
        break;
      case 'engagement':
        filename = 'member-engagement-report.csv';
        header = ['Member', 'Membership Type', 'Referrals Made', 'Last Activity'];
        rows = memberEngagementsData.map((m: any) => [
          m.memberName, m.membershipType, String(m.referralsMade),
          m.lastEngagement ? format(new Date(m.lastEngagement), 'yyyy-MM-dd') : ''
        ].map(csvEscape));
        break;
      case 'referrals':
        filename = 'referrals-report.csv';
        header = ['Referrer', 'Referee', 'Referral Date', 'Status', 'Campaign', 'Reward Amount', 'Conversion Date'];
        rows = apiReferrals.map(r => [
          r.referrerName || '', r.refereeName || '',
          r.date ? format(new Date(r.date), 'yyyy-MM-dd') : '',
          r.status, r.ruleName || '', String(r.rewardAmount ?? 0),
          r.paymentDate ? format(new Date(r.paymentDate), 'yyyy-MM-dd') : ''
        ].map(csvEscape));
        break;
      case 'followups':
        filename = 'follow-ups-report.csv';
        header = ['Lead ID', 'Type', 'Scheduled', 'Completed', 'Status', 'Outcome', 'Assigned To', 'Notes'];
        rows = apiFollowUps.map(f => {
          const scheduled = f.dueDate || f.scheduledTime;
          return [
            String(f.leadId), f.type,
            scheduled ? format(new Date(scheduled), 'yyyy-MM-dd') : '',
            f.completedDate ? format(new Date(f.completedDate), 'yyyy-MM-dd') : '',
            f.status, f.outcome || '', f.assignedStaff || '', f.notes || ''
          ].map(csvEscape);
        });
        break;
      default:
        filename = 'member-connect-overview.csv';
        header = ['Metric', 'Value'];
        rows = [
          ['Active Members Engaged', String(analytics.totalMembersEngaged)],
          ['Campaigns Run', String(analytics.totalCampaigns)],
          ['Active Campaigns', String(analytics.activeCampaigns)],
          ['Messages Sent', String(analytics.totalMessagesSent)],
          ['Open Rate (%)', analytics.openRate.toFixed(1)],
          ['Click Rate (%)', analytics.clickRate.toFixed(1)],
          ['Referrals Generated', String(analytics.referralsGenerated)],
          ['Referral Conversion Rate (%)', analytics.referralConversionRate.toFixed(1)],
          ['Follow-Ups Completed', String(analytics.followUpsCompleted)],
          ['Follow-Up Completion Rate (%)', analytics.followUpCompletionRate.toFixed(1)],
          ['Total Revenue', String(analytics.totalRevenue)],
          ['Total Cost', String(analytics.totalCost)],
          ['ROI (%)', analytics.roi.toFixed(1)],
        ];
    }

    const content = [header.map(csvEscape).join(','), ...rows.map(r => r.join(','))].join('\n');
    return { filename, content };
  }, [activeTab, filteredCampaigns, memberEngagementsData, apiReferrals, apiFollowUps, analytics]);

  // Handle export functionality - CSV is a real client-side export of the active tab's data.
  // PDF generation isn't implemented (no PDF library in this codebase), so it's reported honestly
  // instead of faking a success toast.
  const handleExport = useCallback(async (exportFormat: 'csv' | 'pdf') => {
    setIsExporting(true);
    try {
      if (exportFormat === 'csv') {
        const { filename, content } = buildExportCsv();
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Member Connect report exported as CSV!');
      } else {
        toast.info('PDF export is not available yet - use Export CSV instead.');
      }
    } finally {
      setIsExporting(false);
    }
  }, [buildExportCsv]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Member Connect Reports</h1>
          <p className="text-muted-foreground mt-2">
            Detailed insights into member engagement, campaigns, referrals, follow-ups, and communication effectiveness
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => handleExport('csv')} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')} disabled={isExporting}>
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button onClick={async () => { await loadData(); toast.success('Data refreshed!'); }} disabled={isLoading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      <Card className={cardShell}>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns, members..."
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
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedCampaignType} onValueChange={setSelectedCampaignType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Campaign Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="push">Push</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="push">Push</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Advanced
                {showAdvancedFilters ? <ChevronDown className="ml-2 h-4 w-4" /> : <ChevronRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </div>

          {showAdvancedFilters && (
            <>
              <Separator className="my-4" />
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <Label>Member Segment</Label>
                  <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Members</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="new">New Members</SelectItem>
                      <SelectItem value="churned">At Risk</SelectItem>
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
                    setSelectedCampaignType('all');
                    setSelectedChannel('all');
                    setSelectedSegment('all');
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

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Active Members Engaged</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{analytics.totalMembersEngaged}</div>
            {periodTrends.membersEngagedDelta !== null && (
              <div className="flex items-center text-xs text-muted-foreground">
                {getTrendIcon(periodTrends.membersEngagedDelta)}
                <span className={cn("ml-1", getTrendColor(periodTrends.membersEngagedDelta))}>
                  {Math.abs(periodTrends.membersEngagedDelta).toFixed(1)}% vs last month
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Campaigns Run</CardTitle>
            <div className="bg-purple-50 p-2 rounded-lg">
              <Megaphone className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{analytics.totalCampaigns}</div>
            <p className="text-xs text-muted-foreground">{analytics.activeCampaigns} active</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Messages Sent</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <Send className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics.totalMessagesSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{analytics.openRate.toFixed(1)}% opened</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Click Rate</CardTitle>
            <div className="bg-orange-50 p-2 rounded-lg">
              <MousePointer className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{analytics.clickRate.toFixed(1)}%</div>
            {periodTrends.clickRateDelta !== null && (
              <div className="flex items-center text-xs text-muted-foreground">
                {getTrendIcon(periodTrends.clickRateDelta)}
                <span className={cn("ml-1", getTrendColor(periodTrends.clickRateDelta))}>
                  {Math.abs(periodTrends.clickRateDelta).toFixed(1)} pts vs last month
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Referrals Generated</CardTitle>
            <div className="bg-indigo-50 p-2 rounded-lg">
              <Share className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{analytics.referralsGenerated}</div>
            <p className="text-xs text-muted-foreground">{analytics.referralConversionRate.toFixed(1)}% converted</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Follow-Ups Completed</CardTitle>
            <div className="bg-teal-50 p-2 rounded-lg">
              <CheckCircle className="h-4 w-4 text-teal-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">{analytics.followUpsCompleted}</div>
            <p className="text-xs text-muted-foreground">{analytics.followUpCompletionRate.toFixed(1)}% completion rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="campaigns" className="flex-1">Campaigns</TabsTrigger>
          <TabsTrigger value="engagement" className="flex-1">Engagement</TabsTrigger>
          <TabsTrigger value="referrals" className="flex-1">Referrals</TabsTrigger>
          <TabsTrigger value="followups" className="flex-1">Follow-ups</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Communication Trends */}
            <Card className={cardShell}>
<CardHeader>
                <CardTitle className="flex items-center">
                  <LineChartIcon className="mr-2 h-5 w-5" />
                  Communication Trends
                </CardTitle>
                <CardDescription>Message performance across all channels over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={communicationMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="emailsOpened" stroke="#3b82f6" strokeWidth={2} name="Email Opens" />
                    <Line type="monotone" dataKey="smsOpened" stroke="#10b981" strokeWidth={2} name="SMS Opens" />
                    <Line type="monotone" dataKey="pushOpened" stroke="#f59e0b" strokeWidth={2} name="Push Opens" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Campaign Performance Distribution */}
            <Card className={cardShell}>
<CardHeader>
                <CardTitle className="flex items-center">
                  <PieChartIcon className="mr-2 h-5 w-5" />
                  Campaign Performance
                </CardTitle>
                <CardDescription>Response distribution across campaign types</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={campaignPerformanceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Message Status Distribution */}
            <Card className={cardShell}>
              <CardHeader>
                <CardTitle>Message Status Distribution</CardTitle>
                <CardDescription>Current status of all sent messages</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={messageStatusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" name="Messages" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* ROI Performance */}
            <Card className={cardShell}>
<CardHeader>
                <CardTitle>Campaign ROI Performance</CardTitle>
                <CardDescription>Return on investment for communication campaigns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <p className="text-2xl font-bold text-green-600"><CurrencyGlyph /> {analytics.totalRevenue.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600"><CurrencyGlyph /> {analytics.totalCost.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Total Cost</p>
                  </div>
                </div>

                <div className="text-center p-6 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <p className="text-3xl font-bold text-purple-600">{analytics.roi.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Return on Investment</p>
                  <div className="flex items-center justify-center mt-2">
                    {getTrendIcon(analytics.roi)}
                    <span className={cn("ml-1 text-sm", getTrendColor(analytics.roi))}>
                      Strong Performance
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Conversion Rate</span>
                    <span className="font-medium">{analytics.conversionRate.toFixed(2)}%</span>
                  </div>
                  <Progress value={analytics.conversionRate} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          {/* Campaign Performance Chart */}
          <Card className={cardShell}>
<CardHeader>
              <CardTitle>Campaign Performance Comparison</CardTitle>
              <CardDescription>Usage, clicks, and conversion rate across all campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={filteredCampaigns.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="usageCount" fill="#3b82f6" name="Usage Count" />
                  <Bar yAxisId="left" dataKey="clickCount" fill="#10b981" name="Clicks" />
                  <Line yAxisId="right" type="monotone" dataKey="conversionRate" stroke="#f59e0b" strokeWidth={3} name="Conversion Rate (%)" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Campaigns Table */}
          <Card className={cardShell}>
<CardHeader>
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>Detailed performance metrics for all communication campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Redemption Rate</TableHead>
                    <TableHead>Avg Order Value</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign) => {
                    const redemptionRate = campaign.redemptionRate ?? 0;

                    return (
                      <TableRow className="transition-colors hover:bg-slate-50/50" key={campaign.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-sm text-muted-foreground">by {campaign.createdBy || 'Unknown'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {campaign.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                            campaign.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          )}>
                            {campaign.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{campaign.startDate ? format(new Date(campaign.startDate), 'MMM dd') : '-'}</p>
                            <p className="text-muted-foreground">to {campaign.endDate ? format(new Date(campaign.endDate), 'MMM dd') : '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {campaign.usageCount ?? 0}{campaign.usageLimit != null ? ` / ${campaign.usageLimit}` : ''}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className={cn(
                              "font-medium",
                              redemptionRate >= 30 ? "text-green-600" :
                              redemptionRate >= 15 ? "text-yellow-600" : "text-red-600"
                            )}>
                              {redemptionRate.toFixed(1)}%
                            </span>
                            <Progress value={redemptionRate} className="w-16 h-2" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium"><CurrencyGlyph /> {(campaign.averageOrderValue ?? 0).toFixed(2)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-green-600"><CurrencyGlyph /> {(campaign.totalRevenue ?? 0).toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCampaign(campaign);
                              setShowCampaignDetail(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          {/* Member Engagement Table — there's no engagement-score/message-open/campaign-participation
              API anywhere in the backend, so this only shows what's genuinely derivable: real
              referral activity per member (see memberEngagementsData above). No score or chart
              is fabricated to fill the gap. */}
          <Card className={cardShell}>
<CardHeader>
              <CardTitle>Member Engagement Details</CardTitle>
              <CardDescription>Referral activity per member (the only engagement signal with real backend data)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Membership</TableHead>
                    <TableHead>Referrals Made</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberEngagementsData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No engagement data available.
                      </TableCell>
                    </TableRow>
                  )}
                  {memberEngagementsData.map((member) => (
                    <TableRow className="transition-colors hover:bg-slate-50/50" key={member.memberId}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {member.memberName.split(' ').map((n: string) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <p className="font-medium">{member.memberName}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{member.membershipType}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{member.referralsMade}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {member.lastEngagement ? format(new Date(member.lastEngagement), 'MMM dd, yyyy') : '—'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          {/* Referral Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className={cardShell}>
<CardHeader>
                <CardTitle className="flex items-center">
                  <Share className="mr-2 h-5 w-5 text-blue-600" />
                  Total Referrals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-blue-600">{apiReferrals.length}</p>
                  <Users className="h-8 w-8 text-blue-200" />
                </div>
                <p className="text-sm text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card className={cardShell}>
<CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                  Converted Referrals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-green-600">
                    {apiReferrals.filter(r => r.status === 'successful').length}
                  </p>
                  <Target className="h-8 w-8 text-green-200" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {analytics.referralConversionRate.toFixed(1)}% conversion rate
                </p>
                <div className="mt-4">
                  <Progress value={analytics.referralConversionRate} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card className={cardShell}>
<CardHeader>
                <CardTitle className="flex items-center">
                  <Gift className="mr-2 h-5 w-5 text-purple-600" />
                  Rewards Given
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">
                    <CurrencyGlyph /> {apiReferrals.reduce((sum, r) => sum + (r.rewardAmount || 0), 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total rewards</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Referrals Table */}
          <Card className={cardShell}>
<CardHeader>
              <CardTitle>Referral Details</CardTitle>
              <CardDescription>Track all referrals and their conversion status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Referee</TableHead>
                    <TableHead>Referral Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Reward Given</TableHead>
                    <TableHead>Conversion Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiReferrals.map((referral) => (
                    <TableRow className="transition-colors hover:bg-slate-50/50" key={referral.id}>
                      <TableCell className="font-medium">{referral.referrerName || '-'}</TableCell>
                      <TableCell>{referral.refereeName}</TableCell>
                      <TableCell>{format(new Date(referral.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <Badge className={cn(
                          referral.status === 'successful' ? 'bg-green-100 text-green-800' :
                          referral.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        )}>
                          {referral.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {referral.ruleName && (
                          <Badge variant="outline">{referral.ruleName}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium"><CurrencyGlyph /> {referral.rewardAmount || 0}</span>
                      </TableCell>
                      <TableCell>
                        {referral.paymentDate ? (
                          format(new Date(referral.paymentDate), 'MMM dd, yyyy')
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Follow-ups Tab */}
        <TabsContent value="followups" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          {/* Follow-up Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className={cardShell}>
<CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5 text-blue-600" />
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {apiFollowUps.filter(f => f.status === 'pending').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Follow-ups due</p>
                </div>
              </CardContent>
            </Card>

            <Card className={cardShell}>
<CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {apiFollowUps.filter(f => f.status === 'completed').length}
                  </p>
                  <p className="text-sm text-muted-foreground">This period</p>
                </div>
              </CardContent>
            </Card>

            <Card className={cardShell}>
<CardHeader>
                <CardTitle className="flex items-center">
                  <ThumbsUp className="mr-2 h-5 w-5 text-purple-600" />
                  Positive Outcomes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {apiFollowUps.filter(f => f.outcome === 'positive' || f.outcome?.toLowerCase() === 'interested').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Success rate</p>
                </div>
              </CardContent>
            </Card>

            <Card className={cardShell}>
<CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="mr-2 h-5 w-5 text-orange-600" />
                  Completion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {analytics.followUpCompletionRate.toFixed(0)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Overall completion</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Follow-ups Table */}
          <Card className={cardShell}>
<CardHeader>
              <CardTitle>Follow-up Details</CardTitle>
              <CardDescription>Track all member follow-ups and their outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiFollowUps.map((followUp) => (
                    <TableRow className="transition-colors hover:bg-slate-50/50" key={followUp.id}>
                      <TableCell className="font-medium">Lead #{followUp.leadId}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {followUp.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {followUp.type?.toLowerCase().includes('email') && <Mail className="h-4 w-4" />}
                          {followUp.type?.toLowerCase().includes('sms') && <MessageSquare className="h-4 w-4" />}
                          {followUp.type?.toLowerCase().includes('call') && <Phone className="h-4 w-4" />}
                          <span className="capitalize">{followUp.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(followUp.dueDate || followUp.scheduledTime || new Date()), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        {followUp.completedDate ? (
                          format(new Date(followUp.completedDate), 'MMM dd, yyyy')
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          followUp.status === 'completed' ? 'bg-green-100 text-green-800' :
                          followUp.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          followUp.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        )}>
                          {followUp.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {followUp.outcome ? (
                          <Badge variant="outline" className={cn(
                            followUp.outcome === 'positive' || followUp.outcome?.toLowerCase() === 'interested' ? 'text-green-600 border-green-600' :
                            followUp.outcome === 'negative' || followUp.outcome?.toLowerCase() === 'not interested' ? 'text-red-600 border-red-600' :
                            'text-yellow-600 border-yellow-600'
                          )}>
                            {followUp.outcome}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{followUp.assignedStaff || '-'}</TableCell>
                      <TableCell>
                        {followUp.notes ? (
                          <div className="max-w-xs truncate" title={followUp.notes}>
                            {followUp.notes}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Campaign Detail Dialog */}
      <Dialog open={showCampaignDetail} onOpenChange={setShowCampaignDetail}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedCampaign && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{selectedCampaign.name}</span>
                  <Badge className={cn(
                    selectedCampaign.status === 'active' ? 'bg-green-100 text-green-800' :
                    selectedCampaign.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    selectedCampaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  )}>
                    {selectedCampaign.status}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Campaign details and performance metrics
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Campaign Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className={cardShell}>
<CardHeader>
                      <CardTitle>Campaign Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type</span>
                        <Badge variant="outline" className="capitalize">{selectedCampaign.type}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created by</span>
                        <span className="font-medium">{selectedCampaign.createdBy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Start Date</span>
                        <span className="font-medium">{selectedCampaign.startDate ? format(new Date(selectedCampaign.startDate), 'MMM dd, yyyy') : '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">End Date</span>
                        <span className="font-medium">{selectedCampaign.endDate ? format(new Date(selectedCampaign.endDate), 'MMM dd, yyyy') : '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Times Redeemed</span>
                        <span className="font-medium">
                          {(selectedCampaign.usageCount ?? 0).toLocaleString()}{selectedCampaign.usageLimit ? ` / ${selectedCampaign.usageLimit}` : ''}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={cardShell}>
<CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Redemption Rate</span>
                        <span className="font-medium">
                          {selectedCampaign.usageLimit ? `${selectedCampaign.redemptionRate ?? 0}%` : '— (no usage limit set)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Order Value</span>
                        <span className="font-medium text-green-600"><CurrencyGlyph /> {(selectedCampaign.averageOrderValue ?? 0).toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Financial Performance */}
                <Card className={cardShell}>
<CardHeader>
                    <CardTitle>Financial Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                        <p className="text-2xl font-bold text-green-600"><CurrencyGlyph /> {(selectedCampaign.totalRevenue ?? 0).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                        <p className="text-2xl font-bold text-orange-600"><CurrencyGlyph /> {(selectedCampaign.totalSavings ?? 0).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Total Savings (member discounts)</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Click count and conversion rate aren't shown — this promotion has no public tracking link, so there's nothing real to measure them from.
                    </p>
                  </CardContent>
                </Card>

                {/* Notes */}
                {selectedCampaign.description && (
                  <Card className={cardShell}>
<CardHeader>
                      <CardTitle>Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{selectedCampaign.description}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}





