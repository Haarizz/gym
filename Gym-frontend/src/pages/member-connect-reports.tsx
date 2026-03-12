import React, { useState, useMemo, useCallback } from 'react';
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

// Types and interfaces
interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push' | 'social' | 'referral';
  status: 'active' | 'completed' | 'draft' | 'paused';
  startDate: Date;
  endDate: Date;
  membersTargeted: number;
  messagesSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  responded: number;
  conversions: number;
  cost: number;
  revenue: number;
  createdBy: string;
  notes?: string;
}

interface MemberEngagement {
  memberId: string;
  memberName: string;
  membershipType: string;
  totalInteractions: number;
  messagesReceived: number;
  messagesOpened: number;
  messagesClicked: number;
  campaignsParticipated: number;
  referralsMade: number;
  followUpsCompleted: number;
  lastEngagement: Date;
  engagementScore: number;
  communicationPreference: 'email' | 'sms' | 'push' | 'all';
  avatar?: string;
}

interface CommunicationMetrics {
  date: string;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  smsSent: number;
  smsOpened: number;
  smsClicked: number;
  pushSent: number;
  pushOpened: number;
  pushClicked: number;
  totalEngagement: number;
}

interface ReferralReport {
  id: string;
  referrerName: string;
  referreeName: string;
  referralDate: Date;
  status: 'pending' | 'converted' | 'expired';
  campaignId?: string;
  rewardGiven: number;
  conversionDate?: Date;
  membershipValue: number;
}

interface FollowUpReport {
  id: string;
  memberName: string;
  followUpType: 'welcome' | 'retention' | 'reactivation' | 'feedback' | 'renewal';
  scheduledDate: Date;
  completedDate?: Date;
  method: 'email' | 'sms' | 'call' | 'in-person';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  outcome?: 'positive' | 'neutral' | 'negative';
  notes?: string;
  assignedTo: string;
}

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

  // Sample data - in real app this would come from your backend
  const campaigns: Campaign[] = [
    {
      id: '1',
      name: 'Summer Fitness Challenge',
      type: 'email',
      status: 'active',
      startDate: subDays(new Date(), 14),
      endDate: addDays(new Date(), 16),
      membersTargeted: 450,
      messagesSent: 1350,
      delivered: 1321,
      opened: 892,
      clicked: 234,
      responded: 87,
      conversions: 23,
      cost: 850,
      revenue: 5750,
      createdBy: 'Sarah Johnson',
      notes: 'Great engagement rates. Consider extending campaign.'
    },
    {
      id: '2',
      name: 'New Member Welcome Series',
      type: 'email',
      status: 'active',
      startDate: subDays(new Date(), 30),
      endDate: addDays(new Date(), 335),
      membersTargeted: 180,
      messagesSent: 720,
      delivered: 714,
      opened: 521,
      clicked: 156,
      responded: 89,
      conversions: 34,
      cost: 320,
      revenue: 8160,
      createdBy: 'Mike Chen'
    },
    {
      id: '3',
      name: 'Class Reminder SMS',
      type: 'sms',
      status: 'active',
      startDate: subDays(new Date(), 7),
      endDate: addDays(new Date(), 23),
      membersTargeted: 320,
      messagesSent: 960,
      delivered: 952,
      opened: 847,
      clicked: 203,
      responded: 145,
      conversions: 67,
      cost: 480,
      revenue: 3350,
      createdBy: 'Lisa Ahmed'
    },
    {
      id: '4',
      name: 'Referral Rewards Program',
      type: 'referral',
      status: 'completed',
      startDate: subDays(new Date(), 60),
      endDate: subDays(new Date(), 30),
      membersTargeted: 280,
      messagesSent: 840,
      delivered: 821,
      opened: 623,
      clicked: 187,
      responded: 142,
      conversions: 89,
      cost: 1200,
      revenue: 17800,
      createdBy: 'John Smith'
    },
    {
      id: '5',
      name: 'Winter Membership Promotion',
      type: 'social',
      status: 'completed',
      startDate: subDays(new Date(), 90),
      endDate: subDays(new Date(), 45),
      membersTargeted: 520,
      messagesSent: 1560,
      delivered: 1534,
      opened: 1021,
      clicked: 312,
      responded: 189,
      conversions: 67,
      cost: 980,
      revenue: 13400,
      createdBy: 'Emma Wilson'
    }
  ];

  const memberEngagements: MemberEngagement[] = [
    {
      memberId: '1',
      memberName: 'Ahmed Hassan',
      membershipType: 'Premium Annual',
      totalInteractions: 45,
      messagesReceived: 23,
      messagesOpened: 21,
      messagesClicked: 8,
      campaignsParticipated: 6,
      referralsMade: 3,
      followUpsCompleted: 4,
      lastEngagement: new Date(),
      engagementScore: 92,
      communicationPreference: 'email'
    },
    {
      memberId: '2',
      memberName: 'Sarah Johnson',
      membershipType: 'Premium Monthly',
      totalInteractions: 38,
      messagesReceived: 19,
      messagesOpened: 17,
      messagesClicked: 6,
      campaignsParticipated: 5,
      referralsMade: 2,
      followUpsCompleted: 3,
      lastEngagement: subDays(new Date(), 1),
      engagementScore: 78,
      communicationPreference: 'sms'
    },
    {
      memberId: '3',
      memberName: 'Mike Chen',
      membershipType: 'Standard Monthly',
      totalInteractions: 52,
      messagesReceived: 28,
      messagesOpened: 26,
      messagesClicked: 12,
      campaignsParticipated: 8,
      referralsMade: 5,
      followUpsCompleted: 6,
      lastEngagement: subDays(new Date(), 2),
      engagementScore: 96,
      communicationPreference: 'all'
    },
    {
      memberId: '4',
      memberName: 'Lisa Ahmed',
      membershipType: 'Basic',
      totalInteractions: 18,
      messagesReceived: 12,
      messagesOpened: 8,
      messagesClicked: 2,
      campaignsParticipated: 3,
      referralsMade: 0,
      followUpsCompleted: 1,
      lastEngagement: subDays(new Date(), 7),
      engagementScore: 34,
      communicationPreference: 'push'
    }
  ];

  const communicationMetrics: CommunicationMetrics[] = [
    { date: 'Jan', emailsSent: 1200, emailsOpened: 840, emailsClicked: 168, smsSent: 800, smsOpened: 720, smsClicked: 144, pushSent: 600, pushOpened: 480, pushClicked: 96, totalEngagement: 78 },
    { date: 'Feb', emailsSent: 1350, emailsOpened: 945, emailsClicked: 189, smsSent: 900, smsOpened: 810, smsClicked: 162, pushSent: 650, pushOpened: 520, pushClicked: 104, totalEngagement: 82 },
    { date: 'Mar', emailsSent: 1180, emailsOpened: 826, emailsClicked: 165, smsSent: 750, smsOpened: 675, smsClicked: 135, pushSent: 580, pushOpened: 464, pushClicked: 93, totalEngagement: 76 },
    { date: 'Apr', emailsSent: 1420, emailsOpened: 994, emailsClicked: 199, smsSent: 950, smsOpened: 855, smsClicked: 171, pushSent: 700, pushOpened: 560, pushClicked: 112, totalEngagement: 85 },
    { date: 'May', emailsSent: 1580, emailsOpened: 1106, emailsClicked: 221, smsSent: 1020, smsOpened: 918, smsClicked: 184, pushSent: 750, pushOpened: 600, pushClicked: 120, totalEngagement: 89 },
    { date: 'Jun', emailsSent: 1650, emailsOpened: 1155, emailsClicked: 231, smsSent: 1100, smsOpened: 990, smsClicked: 198, pushSent: 800, pushOpened: 640, pushClicked: 128, totalEngagement: 92 }
  ];

  const referralReports: ReferralReport[] = [
    {
      id: '1',
      referrerName: 'John Smith',
      referreeName: 'Mark Wilson',
      referralDate: subDays(new Date(), 5),
      status: 'converted',
      campaignId: '4',
      rewardGiven: 200,
      conversionDate: subDays(new Date(), 2),
      membershipValue: 2400
    },
    {
      id: '2',
      referrerName: 'Sarah Johnson',
      referreeName: 'Emily Brown',
      referralDate: subDays(new Date(), 12),
      status: 'pending',
      campaignId: '4',
      rewardGiven: 0,
      membershipValue: 0
    },
    {
      id: '3',
      referrerName: 'Ahmed Hassan',
      referreeName: 'David Lee',
      referralDate: subDays(new Date(), 8),
      status: 'converted',
      campaignId: '4',
      rewardGiven: 200,
      conversionDate: subDays(new Date(), 3),
      membershipValue: 1800
    }
  ];

  const followUpReports: FollowUpReport[] = [
    {
      id: '1',
      memberName: 'Lisa Chen',
      followUpType: 'retention',
      scheduledDate: new Date(),
      completedDate: new Date(),
      method: 'email',
      status: 'completed',
      outcome: 'positive',
      notes: 'Member renewed for another year',
      assignedTo: 'Sarah Johnson'
    },
    {
      id: '2',
      memberName: 'Mike Wilson',
      followUpType: 'welcome',
      scheduledDate: addDays(new Date(), 1),
      method: 'call',
      status: 'pending',
      assignedTo: 'Mike Chen'
    },
    {
      id: '3',
      memberName: 'Emma Davis',
      followUpType: 'reactivation',
      scheduledDate: subDays(new Date(), 2),
      completedDate: subDays(new Date(), 1),
      method: 'sms',
      status: 'completed',
      outcome: 'neutral',
      notes: 'Member showed interest but no commitment yet',
      assignedTo: 'Lisa Ahmed'
    }
  ];

  // Calculate key metrics
  const analytics = useMemo(() => {
    const totalMembersEngaged = memberEngagements.length;
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    
    const totalMessagesSent = campaigns.reduce((sum, c) => sum + c.messagesSent, 0);
    const totalOpened = campaigns.reduce((sum, c) => sum + c.opened, 0);
    const totalClicked = campaigns.reduce((sum, c) => sum + c.clicked, 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
    
    const openRate = totalMessagesSent > 0 ? (totalOpened / totalMessagesSent) * 100 : 0;
    const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;
    const conversionRate = totalMessagesSent > 0 ? (totalConversions / totalMessagesSent) * 100 : 0;
    
    const referralsGenerated = referralReports.length;
    const referralsConverted = referralReports.filter(r => r.status === 'converted').length;
    const referralConversionRate = referralsGenerated > 0 ? (referralsConverted / referralsGenerated) * 100 : 0;
    
    const followUpsCompleted = followUpReports.filter(f => f.status === 'completed').length;
    const totalFollowUps = followUpReports.length;
    const followUpCompletionRate = totalFollowUps > 0 ? (followUpsCompleted / totalFollowUps) * 100 : 0;
    
    const totalRevenue = campaigns.reduce((sum, c) => sum + c.revenue, 0);
    const totalCost = campaigns.reduce((sum, c) => sum + c.cost, 0);
    const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;
    
    const avgEngagementScore = memberEngagements.reduce((sum, m) => sum + m.engagementScore, 0) / memberEngagements.length;

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
  }, [campaigns, memberEngagements, referralReports, followUpReports]);

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
    return campaigns.filter(campaign => {
      const matchesSearch = searchTerm === '' || 
        campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.createdBy.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = selectedCampaignType === 'all' || campaign.type === selectedCampaignType;
      const matchesChannel = selectedChannel === 'all' || campaign.type === selectedChannel;
      
      return matchesSearch && matchesType && matchesChannel;
    });
  }, [campaigns, searchTerm, selectedCampaignType, selectedChannel]);

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
      <Card>
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
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Members Engaged</p>
                <p className="text-2xl font-bold">{analytics.totalMembersEngaged}</p>
                <div className="flex items-center text-sm">
                  {getTrendIcon(12.5)}
                  <span className={cn("ml-1", getTrendColor(12.5))}>
                    12.5%
                  </span>
                </div>
              </div>
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Campaigns Run</p>
                <p className="text-2xl font-bold text-purple-600">{analytics.totalCampaigns}</p>
                <div className="flex items-center text-sm">
                  <span className="text-muted-foreground">{analytics.activeCampaigns} active</span>
                </div>
              </div>
              <Megaphone className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Messages Sent</p>
                <p className="text-2xl font-bold text-green-600">{analytics.totalMessagesSent.toLocaleString()}</p>
                <div className="flex items-center text-sm">
                  <span className="text-muted-foreground">{analytics.openRate.toFixed(1)}% opened</span>
                </div>
              </div>
              <Send className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Click Rate</p>
                <p className="text-2xl font-bold text-orange-600">{analytics.clickRate.toFixed(1)}%</p>
                <div className="flex items-center text-sm">
                  {getTrendIcon(3.2)}
                  <span className={cn("ml-1", getTrendColor(3.2))}>
                    3.2%
                  </span>
                </div>
              </div>
              <MousePointer className="h-6 w-6 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Referrals Generated</p>
                <p className="text-2xl font-bold text-indigo-600">{analytics.referralsGenerated}</p>
                <div className="flex items-center text-sm">
                  <span className="text-muted-foreground">{analytics.referralConversionRate.toFixed(1)}% converted</span>
                </div>
              </div>
              <Share className="h-6 w-6 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Follow-Ups Completed</p>
                <p className="text-2xl font-bold text-teal-600">{analytics.followUpsCompleted}</p>
                <div className="flex items-center text-sm">
                  <span className="text-muted-foreground">{analytics.followUpCompletionRate.toFixed(1)}% completion rate</span>
                </div>
              </div>
              <CheckCircle className="h-6 w-6 text-teal-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Communication Trends */}
            <Card>
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
            <Card>
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
                      data={[
                        { name: 'Email', value: 65, fill: '#3b82f6' },
                        { name: 'SMS', value: 25, fill: '#10b981' },
                        { name: 'Push', value: 7, fill: '#f59e0b' },
                        { name: 'Social', value: 3, fill: '#8b5cf6' }
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Engagement by Membership Type */}
            <Card>
              <CardHeader>
                <CardTitle>Engagement by Membership Type</CardTitle>
                <CardDescription>Member engagement scores across different membership tiers</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { type: 'Premium Annual', score: 89, members: 186 },
                    { type: 'Premium Monthly', score: 82, members: 134 },
                    { type: 'Standard Monthly', score: 76, members: 89 },
                    { type: 'Basic', score: 64, members: 72 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="score" fill="#8b5cf6" name="Engagement Score" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* ROI Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign ROI Performance</CardTitle>
                <CardDescription>Return on investment for communication campaigns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">AED {analytics.totalRevenue.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">AED {analytics.totalCost.toLocaleString()}</p>
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
        <TabsContent value="campaigns" className="space-y-6">
          {/* Campaign Performance Chart */}
          <Card>
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
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>Detailed performance metrics for all communication campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
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
                      <TableRow key={campaign.id}>
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
        <TabsContent value="engagement" className="space-y-6">
          {/* Member Engagement Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
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

            <Card>
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
          <Card>
            <CardHeader>
              <CardTitle>Member Engagement Details</CardTitle>
              <CardDescription>Individual member engagement metrics and activity</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
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
                  {memberEngagements.map((member) => (
                    <TableRow key={member.memberId}>
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
                          {isToday(member.lastEngagement) ? 'Today' :
                           isYesterday(member.lastEngagement) ? 'Yesterday' :
                           format(member.lastEngagement, 'MMM dd')}
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
        <TabsContent value="referrals" className="space-y-6">
          {/* Referral Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Share className="mr-2 h-5 w-5 text-blue-600" />
                  Total Referrals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{referralReports.length}</p>
                  <p className="text-sm text-muted-foreground">This month</p>
                  <div className="mt-4">
                    <Progress value={75} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">75% of monthly target</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                  Converted Referrals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {referralReports.filter(r => r.status === 'converted').length}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {analytics.referralConversionRate.toFixed(1)}% conversion rate
                  </p>
                  <div className="mt-4">
                    <Progress value={analytics.referralConversionRate} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Gift className="mr-2 h-5 w-5 text-purple-600" />
                  Rewards Given
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">
                    AED {referralReports.reduce((sum, r) => sum + r.rewardGiven, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total rewards</p>
                  <div className="mt-4">
                    <p className="text-sm">
                      <span className="font-medium">AED {referralReports.reduce((sum, r) => sum + r.membershipValue, 0).toLocaleString()}</span>
                      <span className="text-muted-foreground"> revenue generated</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Referrals Table */}
          <Card>
            <CardHeader>
              <CardTitle>Referral Details</CardTitle>
              <CardDescription>Track all referrals and their conversion status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
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
                  {referralReports.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell className="font-medium">{referral.referrerName}</TableCell>
                      <TableCell>{referral.referreeName}</TableCell>
                      <TableCell>{format(referral.referralDate, 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <Badge className={cn(
                          referral.status === 'converted' ? 'bg-green-100 text-green-800' :
                          referral.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        )}>
                          {referral.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {referral.campaignId && (
                          <Badge variant="outline">Campaign #{referral.campaignId}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">AED {referral.rewardGiven}</span>
                      </TableCell>
                      <TableCell>
                        {referral.conversionDate ? (
                          format(referral.conversionDate, 'MMM dd, yyyy')
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">AED {referral.membershipValue.toLocaleString()}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Follow-ups Tab */}
        <TabsContent value="followups" className="space-y-6">
          {/* Follow-up Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5 text-blue-600" />
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {followUpReports.filter(f => f.status === 'pending').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Follow-ups due</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {followUpReports.filter(f => f.status === 'completed').length}
                  </p>
                  <p className="text-sm text-muted-foreground">This period</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ThumbsUp className="mr-2 h-5 w-5 text-purple-600" />
                  Positive Outcomes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {followUpReports.filter(f => f.outcome === 'positive').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Success rate</p>
                </div>
              </CardContent>
            </Card>

            <Card>
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
          <Card>
            <CardHeader>
              <CardTitle>Follow-up Details</CardTitle>
              <CardDescription>Track all member follow-ups and their outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
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
                  {followUpReports.map((followUp) => (
                    <TableRow key={followUp.id}>
                      <TableCell className="font-medium">{followUp.memberName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {followUp.followUpType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {followUp.method === 'email' && <Mail className="h-4 w-4" />}
                          {followUp.method === 'sms' && <MessageSquare className="h-4 w-4" />}
                          {followUp.method === 'call' && <Phone className="h-4 w-4" />}
                          {followUp.method === 'in-person' && <Users className="h-4 w-4" />}
                          <span className="capitalize">{followUp.method}</span>
                        </div>
                      </TableCell>
                      <TableCell>{format(followUp.scheduledDate, 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        {followUp.completedDate ? (
                          format(followUp.completedDate, 'MMM dd, yyyy')
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
                            followUp.outcome === 'positive' ? 'text-green-600 border-green-600' :
                            followUp.outcome === 'negative' ? 'text-red-600 border-red-600' :
                            'text-yellow-600 border-yellow-600'
                          )}>
                            {followUp.outcome}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{followUp.assignedTo}</TableCell>
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
                  <Card>
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

                  <Card>
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
                <Card>
                  <CardHeader>
                    <CardTitle>Financial Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">AED {selectedCampaign.cost}</p>
                        <p className="text-sm text-muted-foreground">Total Cost</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">AED {selectedCampaign.revenue}</p>
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
                  <Card>
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

