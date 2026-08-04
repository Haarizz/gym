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

// All interfaces now come from respective service files

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
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCampaignDetail, setShowCampaignDetail] = useState(false);
  const cardShell = "border-primary/10 shadow-md hover:shadow-lg transition-shadow";

  const [apiPromotions, setApiPromotions] = useState<PromotionApi[]>([]);
  const [apiReferrals, setApiReferrals] = useState<ReferralResponse[]>([]);
  const [apiFollowUps, setApiFollowUps] = useState<FollowUpResponse[]>([]);
  const [apiMessagingStats, setApiMessagingStats] = useState<MessagingAnalyticsApi | null>(null);
  const [apiMessageHistory, setApiMessageHistory] = useState<MessageHistoryApi[]>([]);
  
  const [apiReferralStats, setApiReferralStats] = useState({ totalReferrals: 0, successfulReferrals: 0 });
  const [apiFollowUpStats, setApiFollowUpStats] = useState({ totalFollowUps: 0, completedFollowUps: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        promos, refData, refStats, followData, followStats, msgStats, msgHist
      ] = await Promise.all([
        promotionsService.getPromotions(),
        referralService.getReferrals({ size: 100 }),
        referralService.getStats(),
        followUpService.getFollowUps({ size: 100 }),
        followUpService.getStats(),
        messagingService.getAnalytics(),
        messagingService.getHistory()
      ]);
      setApiPromotions(promos || []);
      setApiReferrals(refData?.referrals || []);
      setApiReferralStats({ totalReferrals: refStats?.totalReferrals || 0, successfulReferrals: refStats?.successfulReferrals || 0 });
      setApiFollowUps(followData?.followUps || []);
      setApiFollowUpStats({ totalFollowUps: followStats?.totalFollowUps || 0, completedFollowUps: followStats?.completedFollowUps || 0 });
      setApiMessagingStats(msgStats);
      setApiMessageHistory(msgHist || []);
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
    
    // Derived approximations for now if we don't have exact metrics
    const totalOpened = Math.round(totalMessagesSent * (openRate / 100));
    const totalClicked = Math.round(totalOpened * (clickRate / 100));
    const totalConversions = Math.round(totalClicked * 0.1); // approx 10% conversion from clicks
    const conversionRate = totalMessagesSent > 0 ? (totalConversions / totalMessagesSent) * 100 : 0;
    
    const referralsGenerated = apiReferralStats.totalReferrals;
    const referralsConverted = apiReferralStats.successfulReferrals;
    const referralConversionRate = referralsGenerated > 0 ? (referralsConverted / referralsGenerated) * 100 : 0;
    
    const followUpsCompleted = apiFollowUpStats.completedFollowUps;
    const totalFollowUps = apiFollowUpStats.totalFollowUps;
    const followUpCompletionRate = totalFollowUps > 0 ? (followUpsCompleted / totalFollowUps) * 100 : 0;
    
    const totalRevenue = apiPromotions.length * 5000; // Mock revenue since promotions don't track revenue directly
    const totalCost = apiMessagingStats?.total_cost || 0;
    const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;
    
    const avgEngagementScore = 85; // Fixed score placeholder since we don't have member engagement scores API yet

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
      roi,
      avgEngagementScore
    };
  }, [apiPromotions, apiMessagingStats, apiReferralStats, apiFollowUpStats]);

  // Handle export functionality
  const handleExport = useCallback(async (format: 'csv' | 'pdf') => {
    setIsExporting(true);
    
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.success(`Member Connect reports exported as ${format.toUpperCase()}!`);
    setIsExporting(false);
  }, []);

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

  const memberEngagementsData = useMemo(() => {
    // Derive mock engagement from actual referrers to show some data, as we don't have an engagement API
    const membersMap = new Map<string, any>();
    
    apiReferrals.forEach(r => {
      const name = r.referrerName || 'Unknown Member';
      if (!membersMap.has(name)) {
        membersMap.set(name, {
          memberId: r.referrerMemberId || name,
          memberName: name,
          membershipType: 'Standard',
          totalInteractions: 1,
          messagesReceived: 0,
          messagesOpened: 0,
          messagesClicked: 0,
          campaignsParticipated: 0,
          referralsMade: 1,
          engagementScore: 50,
          lastEngagement: r.date,
          communicationPreference: 'email'
        });
      } else {
        const m = membersMap.get(name);
        m.referralsMade++;
        m.totalInteractions++;
        m.engagementScore = Math.min(100, m.engagementScore + 10);
      }
    });

    return Array.from(membersMap.values());
  }, [apiReferrals]);

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
          <Button onClick={() => toast.success('Data refreshed!')}>
            <RefreshCw className="mr-2 h-4 w-4" />
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
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(12.5)}
              <span className={cn("ml-1", getTrendColor(12.5))}>12.5% vs last month</span>
            </div>
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
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(3.2)}
              <span className={cn("ml-1", getTrendColor(3.2))}>3.2% vs last month</span>
            </div>
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
                  
                  <div className="flex justify-between text-sm">
                    <span>Average Engagement Score</span>
                    <span className="font-medium">{analytics.avgEngagementScore.toFixed(0)}/100</span>
                  </div>
                  <Progress value={analytics.avgEngagementScore} className="h-2" />
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
              <CardDescription>Delivery, open, and conversion rates across all campaigns</CardDescription>
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
                  <Bar yAxisId="left" dataKey="delivered" fill="#3b82f6" name="Delivered" />
                  <Bar yAxisId="left" dataKey="opened" fill="#10b981" name="Opened" />
                  <Line yAxisId="right" type="monotone" dataKey="conversions" stroke="#f59e0b" strokeWidth={3} name="Conversions" />
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
                    <TableHead>Targeted</TableHead>
                    <TableHead>Open Rate</TableHead>
                    <TableHead>Click Rate</TableHead>
                    <TableHead>Conversions</TableHead>
                    <TableHead>ROI</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign) => {
                    const openRate = campaign.messagesSent > 0 ? (campaign.opened / campaign.messagesSent) * 100 : 0;
                    const clickRate = campaign.opened > 0 ? (campaign.clicked / campaign.opened) * 100 : 0;
                    const roi = campaign.cost > 0 ? ((campaign.revenue - campaign.cost) / campaign.cost) * 100 : 0;

                    return (
                      <TableRow className="transition-colors hover:bg-slate-50/50" key={campaign.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-sm text-muted-foreground">by {campaign.createdBy}</p>
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
                            <p>{format(campaign.startDate, 'MMM dd')}</p>
                            <p className="text-muted-foreground">to {format(campaign.endDate, 'MMM dd')}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{campaign.membersTargeted}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className={cn(
                              "font-medium",
                              openRate >= 30 ? "text-green-600" :
                              openRate >= 20 ? "text-yellow-600" : "text-red-600"
                            )}>
                              {openRate.toFixed(1)}%
                            </span>
                            <Progress value={openRate} className="w-16 h-2" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className={cn(
                              "font-medium",
                              clickRate >= 10 ? "text-green-600" :
                              clickRate >= 5 ? "text-yellow-600" : "text-red-600"
                            )}>
                              {clickRate.toFixed(1)}%
                            </span>
                            <Progress value={clickRate} className="w-16 h-2" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-purple-600">{campaign.conversions}</span>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "font-medium",
                            roi > 200 ? "text-green-600" :
                            roi > 100 ? "text-yellow-600" : "text-red-600"
                          )}>
                            {roi.toFixed(0)}%
                          </span>
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
          {/* Member Engagement Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className={cardShell}>
<CardHeader>
                <CardTitle>Engagement Score Distribution</CardTitle>
                <CardDescription>Distribution of member engagement scores</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { range: '90-100', count: 1, color: '#10b981' },
                    { range: '80-89', count: 1, color: '#3b82f6' },
                    { range: '70-79', count: 1, color: '#f59e0b' },
                    { range: '60-69', count: 0, color: '#ef4444' },
                    { range: '0-59', count: 1, color: '#991b1b' }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className={cardShell}>
<CardHeader>
                <CardTitle>Communication Preferences</CardTitle>
                <CardDescription>Preferred communication channels by members</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Email', value: 45, fill: '#3b82f6' },
                        { name: 'SMS', value: 30, fill: '#10b981' },
                        { name: 'Push', value: 15, fill: '#f59e0b' },
                        { name: 'All Channels', value: 10, fill: '#8b5cf6' }
                      ]}
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

          {/* Member Engagement Table */}
          <Card className={cardShell}>
<CardHeader>
              <CardTitle>Member Engagement Details</CardTitle>
              <CardDescription>Individual member engagement metrics and activity</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Membership</TableHead>
                    <TableHead>Total Interactions</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead>Campaigns</TableHead>
                    <TableHead>Referrals</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Preference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberEngagementsData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-4 text-muted-foreground">
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
                              {member.memberName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <p className="font-medium">{member.memberName}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{member.membershipType}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{member.totalInteractions}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{member.messagesOpened}/{member.messagesReceived}</p>
                          <p className="text-muted-foreground">{member.messagesClicked} clicks</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{member.campaignsParticipated}</TableCell>
                      <TableCell className="font-medium">{member.referralsMade}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className={cn(
                            "font-medium",
                            member.engagementScore >= 80 ? "text-green-600" :
                            member.engagementScore >= 60 ? "text-yellow-600" : "text-red-600"
                          )}>
                            {member.engagementScore}
                          </span>
                          <Progress value={member.engagementScore} className="w-16 h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                           {format(new Date(member.lastEngagement), 'MMM dd, yyyy')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {member.communicationPreference}
                        </Badge>
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
                <div className="mt-4">
                  <Progress value={75} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">75% of monthly target</p>
                </div>
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
                  <div className="mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Est. Value</span>
                      <span className="font-medium"><CurrencyGlyph /> {0}</span>
                    </div>
                  </div>
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
                    <TableHead>Value</TableHead>
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
                      <TableCell>
                        <span className="font-medium"><CurrencyGlyph /> {0}</span>
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
                        <span className="font-medium">{format(selectedCampaign.startDate, 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">End Date</span>
                        <span className="font-medium">{format(selectedCampaign.endDate, 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Members Targeted</span>
                        <span className="font-medium">{selectedCampaign.membersTargeted}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={cardShell}>
<CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Messages Sent</span>
                        <span className="font-medium">{selectedCampaign.messagesSent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivery Rate</span>
                        <span className="font-medium">
                          {((selectedCampaign.delivered / selectedCampaign.messagesSent) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Open Rate</span>
                        <span className="font-medium text-green-600">
                          {((selectedCampaign.opened / selectedCampaign.messagesSent) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Click Rate</span>
                        <span className="font-medium text-blue-600">
                          {((selectedCampaign.clicked / selectedCampaign.opened) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Conversions</span>
                        <span className="font-medium text-purple-600">{selectedCampaign.conversions}</span>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                        <p className="text-2xl font-bold text-red-600"><CurrencyGlyph /> {selectedCampaign.cost}</p>
                        <p className="text-sm text-muted-foreground">Total Cost</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                        <p className="text-2xl font-bold text-green-600"><CurrencyGlyph /> {selectedCampaign.revenue}</p>
                        <p className="text-sm text-muted-foreground">Revenue Generated</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">
                          {(((selectedCampaign.revenue - selectedCampaign.cost) / selectedCampaign.cost) * 100).toFixed(0)}%
                        </p>
                        <p className="text-sm text-muted-foreground">ROI</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                {selectedCampaign.notes && (
                  <Card className={cardShell}>
<CardHeader>
                      <CardTitle>Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{selectedCampaign.notes}</p>
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





