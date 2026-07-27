import React, { useState, useCallback, useEffect } from 'react';
import { useCurrency, CurrencyGlyph } from '../utils/currency';
import { referralService, type ReferralResponse, type RewardRuleResponse } from '../utils/supabase/referral-service';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { Separator } from "../components/ui/separator";
import { Progress } from "../components/ui/progress";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { 
  Share2, 
  Copy, 
  QrCode, 
  Gift, 
  Trophy, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Mail, 
  MessageSquare, 
  ExternalLink, 
  Settings, 
  Plus, 
  Edit, 
  Eye, 
  BarChart3, 
  Target, 
  Wallet, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  X, 
  Star, 
  Crown, 
  Zap, 
  Send, 
  Download, 
  Filter,
  Search,
  Calendar,
  Info,
  AlertCircle,
  Bell
} from 'lucide-react';
import { toast } from "sonner";

interface ReferralData {
  id: string;
  memberName: string;
  memberEmail: string;
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalRewardsEarned: number;
  rewardBalance: number;
  joinDate: string;
  lastActivity: string;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  avatar?: string;
}

interface ReferralActivity {
  id: string;
  referrerName: string;
  refereeName: string;
  refereeEmail: string;
  status: 'pending' | 'successful' | 'expired';
  reward: number;
  date: string;
  signupDate?: string;
  paymentDate?: string;
}

interface RewardRule {
  id: string;
  name: string;
  type: 'discount' | 'credit' | 'points' | 'free_session';
  value: number;
  unit: string;
  eligibility: 'referrer' | 'referee' | 'both';
  condition: 'signup' | 'payment' | 'both';
  isActive: boolean;
  expiryDays?: number;
}

// New Interface for Reward Tracking
interface ReferralReward {
  id: string;
  referrerId: string;
  referrerName: string;
  referredMemberId: string;
  referredMemberName: string;
  rewardAmount: number;
  status: 'pending' | 'earned' | 'redeemed';
  earnedDate: Date;
  redeemedDate?: Date;
  expiryDate: Date;
  ruleId: string;
  ruleName: string;
}

export function Referrals() {
  const { currencyCode } = useCurrency();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [showAddRule, setShowAddRule] = useState(false);
  const [showAddReferral, setShowAddReferral] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState('7d');

  // API state
  const [apiReferrals, setApiReferrals] = useState<ReferralResponse[]>([]);
  const [apiStats, setApiStats] = useState({ totalReferrals: 0, successfulReferrals: 0, conversionRate: 0, totalRewards: 0, activeRules: 0 });
  const [apiRules, setApiRules] = useState<RewardRuleResponse[]>([]);

  // New referral form state
  const [newReferral, setNewReferral] = useState({ referrerName: '', refereeName: '', refereeEmail: '', refereePhone: '', date: new Date().toISOString().split('T')[0], status: 'pending', notes: '' });
  // New rule form state
  const [newRule, setNewRule] = useState({ name: '', type: 'credit', value: '', unit: currencyCode as string, eligibility: 'referrer', conditionTrigger: 'payment', expiryDays: '90' });
  const [editingReferral, setEditingReferral] = useState<ReferralResponse | null>(null);
  const [showEditReferral, setShowEditReferral] = useState(false);
  const [editReferral, setEditReferral] = useState({ referrerName: '', refereeName: '', refereeEmail: '', refereePhone: '', date: '', status: 'pending', notes: '' });
  const [editingRule, setEditingRule] = useState<RewardRuleResponse | null>(null);
  const [showEditRule, setShowEditRule] = useState(false);
  const [editRule, setEditRule] = useState({ name: '', type: 'credit', value: '', unit: currencyCode as string, eligibility: 'referrer', conditionTrigger: 'payment', expiryDays: '90' });
  const [viewingReferral, setViewingReferral] = useState<ReferralResponse | null>(null);
  const [showViewReferral, setShowViewReferral] = useState(false);

  const cardShell = "border-primary/10 shadow-md hover:shadow-lg transition-shadow";

  const loadData = useCallback(async () => {
    try {
      const [statsData, referralsData, rulesData] = await Promise.all([
        referralService.getStats(),
        referralService.getReferrals({ size: 100, status: filterStatus !== 'all' ? filterStatus : undefined, search: searchTerm || undefined }),
        referralService.getRules(),
      ]);
      setApiStats({ totalReferrals: statsData.totalReferrals, successfulReferrals: statsData.successfulReferrals, conversionRate: statsData.conversionRate, totalRewards: Number(statsData.totalRewards), activeRules: statsData.activeRules });
      setApiReferrals(referralsData.referrals);
      setApiRules(rulesData);
    } catch {
      // keep existing display on error
    }
  }, [filterStatus, searchTerm]);

  useEffect(() => { loadData(); }, [loadData]);

  const referralStats = {
    totalReferrals: apiStats.totalReferrals,
    successfulReferrals: apiStats.successfulReferrals,
    conversionRate: apiStats.conversionRate,
    totalRewards: apiStats.totalRewards,
    activePrograms: apiStats.activeRules,
    avgRewardValue: apiStats.successfulReferrals > 0 ? Math.round(apiStats.totalRewards / apiStats.successfulReferrals) : 0,
  };




  const rewardRulesState: RewardRule[] = apiRules.map(r => ({ id: String(r.id), name: r.name, type: r.type as any, value: r.value, unit: r.unit, eligibility: r.eligibility as any, condition: r.conditionTrigger as any, isActive: r.isActive, expiryDays: r.expiryDays }));

  const topReferrers = Object.values(apiReferrals.reduce<Record<string, { id: string; memberName: string; memberEmail: string; referralCode: string; referralLink: string; totalReferrals: number; successfulReferrals: number; pendingReferrals: number; totalRewardsEarned: number; rewardBalance: number; joinDate: string; lastActivity: string; tier: 'Bronze'|'Silver'|'Gold'|'Platinum' }>>((acc, r) => {
      const key = r.referrerName || 'Unknown';
      if (!acc[key]) acc[key] = { id: key, memberName: r.referrerName || '', memberEmail: '', referralCode: r.referralCode, referralLink: r.referralLink, totalReferrals: 0, successfulReferrals: 0, pendingReferrals: 0, totalRewardsEarned: 0, rewardBalance: 0, joinDate: r.createdAt, lastActivity: r.createdAt, tier: 'Bronze' };
      acc[key].totalReferrals++;
      if (r.status === 'successful') { acc[key].successfulReferrals++; acc[key].totalRewardsEarned += Number(r.rewardAmount || 0); }
      if (r.status === 'pending') acc[key].pendingReferrals++;
      const s = acc[key].successfulReferrals;
      acc[key].tier = s >= 11 ? 'Platinum' : s >= 6 ? 'Gold' : s >= 3 ? 'Silver' : 'Bronze';
      return acc;
    }, {})).sort((a, b) => b.successfulReferrals - a.successfulReferrals).slice(0, 5);

  const handleToggleRewardRule = useCallback(async (ruleId: string, nextValue: boolean) => {
    try {
      await referralService.toggleRule(Number(ruleId));
      await loadData();
    } catch {
      toast.error('Failed to toggle rule');
    }
  }, [loadData]);

  const handleCopyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Referral code copied!', {
      description: 'The referral code has been copied to your clipboard.',
    });
  }, []);

  const handleCopyLink = useCallback((link: string) => {
    navigator.clipboard.writeText(`https://${link}`);
    toast.success('Referral link copied!', {
      description: 'The referral link has been copied to your clipboard.',
    });
  }, []);

  const handleShareWhatsApp = useCallback((code: string, memberName: string) => {
    const message = `Join our amazing gym with my referral code: ${code}! Get exclusive benefits and let's achieve our fitness goals together! ??`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    toast.success('WhatsApp share opened!', {
      description: 'Share your referral code with friends on WhatsApp.',
    });
  }, []);

  const handleShareEmail = useCallback((code: string, link: string, memberName: string) => {
    const subject = 'Join Our Gym - Exclusive Invitation!';
    const body = `Hi there!\n\nI'd love to invite you to join our amazing gym! Use my referral code "${code}" or click this link: https://${link}\n\nYou'll get exclusive benefits and we can achieve our fitness goals together!\n\nBest regards,\n${memberName}`;
    const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(emailUrl);
    
    toast.success('Email client opened!', {
      description: 'Share your referral via email.',
    });
  }, []);

  const handleGenerateQR = useCallback((link: string) => {
    // In a real app, you'd generate a QR code
    toast.info('QR Code Generator', {
      description: 'QR code generation feature coming soon!',
    });
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'successful': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Platinum': return 'bg-purple-100 text-purple-800';
      case 'Gold': return 'bg-yellow-100 text-yellow-800';
      case 'Silver': return 'bg-gray-100 text-gray-800';
      case 'Bronze': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'Platinum': return <Crown className="h-4 w-4" />;
      case 'Gold': return <Trophy className="h-4 w-4" />;
      case 'Silver': return <Star className="h-4 w-4" />;
      case 'Bronze': return <Target className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Referrals Management</h1>
          <p className="text-muted-foreground mt-2">
            Track and manage member referral programs and rewards
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => setShowBulkActions(true)}>
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Button 
            onClick={() => setShowAddReferral(true)}
            className="bg-[#2B7A78] hover:bg-[#236763] text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add a Referral
          </Button>
          <Button 
            onClick={() => setShowAddRule(true)}
            className="bg-[#E63946] hover:bg-[#c92e3a] text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Reward Rule
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Referrals</CardTitle>
            <div className="bg-gradient-light p-2 rounded-lg">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{referralStats.totalReferrals}</div>
            <p className="text-xs text-muted-foreground">All referrals recorded</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Successful</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{referralStats.successfulReferrals}</div>
            <p className="text-xs text-muted-foreground">Converted referrals</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Conversion</CardTitle>
            <div className="bg-purple-50 p-2 rounded-lg">
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{referralStats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">Referral success rate</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Rewards</CardTitle>
            <div className="bg-orange-50 p-2 rounded-lg">
              <Gift className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600"><CurrencyGlyph /> {referralStats.totalRewards}</div>
            <p className="text-xs text-muted-foreground">Rewards distributed</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Active Programs</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <Zap className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{referralStats.activePrograms}</div>
            <p className="text-xs text-muted-foreground">Running referral programs</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Avg Reward</CardTitle>
            <div className="bg-teal-50 p-2 rounded-lg">
              <DollarSign className="h-4 w-4 text-teal-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600"><CurrencyGlyph /> {referralStats.avgRewardValue}</div>
            <p className="text-xs text-muted-foreground">Average per referral</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full flex">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="members" className="flex-1">Members</TabsTrigger>
          <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
          <TabsTrigger value="rewards" className="flex-1">Rewards</TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1">Analytics</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Referrers Leaderboard */}
            <Card className={cardShell}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  <span>Top Referrers</span>
                </CardTitle>
                <CardDescription>
                  Members with the highest successful referrals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topReferrers.map((member, index) => (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50/60">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full font-bold text-sm">
                          {index + 1}
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>
                            {member.memberName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.memberName}</p>
                          <p className="text-sm text-muted-foreground">{member.memberEmail}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">{member.successfulReferrals} referrals</p>
                        <Badge variant="outline" className={getTierColor(member.tier)}>
                          {getTierIcon(member.tier)}
                          <span className="ml-1">{member.tier}</span>
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className={cardShell}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-blue-600" />
                  <span>Recent Activity</span>
                </CardTitle>
                <CardDescription>
                  Latest referral activities and rewards
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {apiReferrals.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50/60">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div>
                          <p className="font-medium">{activity.referrerName}</p>
                          <p className="text-sm text-muted-foreground">
                            Referred {activity.refereeName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(activity.status)}>
                          {activity.status}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          <CurrencyGlyph /> {activity.rewardAmount}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className={cardShell}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-purple-600" />
                <span>Quick Actions</span>
              </CardTitle>
              <CardDescription>
                Common referral management tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button variant="secondary" className="h-20 flex-col space-y-2 bg-white/80 shadow-sm hover:shadow-md" onClick={() => { setShowAddReferral(true); }}>
                  <Send className="h-6 w-6 text-blue-600" />
                  <span>Add Referral</span>
                </Button>
                <Button variant="secondary" className="h-20 flex-col space-y-2 bg-white/80 shadow-sm hover:shadow-md" onClick={async () => { toast.loading('Processing...'); try { await loadData(); toast.success('Data refreshed'); } catch { toast.error('Refresh failed'); } }}>
                  <Gift className="h-6 w-6 text-green-600" />
                  <span>Refresh Data</span>
                </Button>
                <Button variant="secondary" className="h-20 flex-col space-y-2 bg-white/80 shadow-sm hover:shadow-md" onClick={() => { const csv = ['Referrer,Referee,Email,Status,Reward,Date', ...apiReferrals.map(r => `${r.referrerName},${r.refereeName},${r.refereeEmail || ''},${r.status},${r.rewardAmount || 0},${r.date || r.createdAt}`)].join('\n'); const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'referrals.csv'; a.click(); URL.revokeObjectURL(url); toast.success('Report downloaded'); }}>
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                  <span>Export CSV</span>
                </Button>
                <Button variant="secondary" className="h-20 flex-col space-y-2 bg-white/80 shadow-sm hover:shadow-md" onClick={() => setActiveTab('settings')}>
                  <Settings className="h-6 w-6 text-gray-600" />
                  <span>Program Settings</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          {/* Filters */}
          <Card className={cardShell}>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="search">Search Members</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="tier">Filter by Tier</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger id="tier" className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="platinum">Platinum</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="silver">Silver</SelectItem>
                      <SelectItem value="bronze">Bronze</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date">Date Range</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger id="date" className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Members List */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {topReferrers.map((member) => (
              <Card key={member.id} className={cardShell}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                          {member.memberName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-sm">{member.memberName}</h3>
                        <p className="text-xs text-muted-foreground">{member.memberEmail}</p>
                      </div>
                    </div>
                    <Badge className={getTierColor(member.tier)} variant="outline">
                      {getTierIcon(member.tier)}
                      <span className="ml-1">{member.tier}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Referral Code */}
                  <div>
                    <Label className="text-xs">Referral Code</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input value={member.referralCode} readOnly className="flex-1 h-9 text-xs" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyCode(member.referralCode)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Referral Link */}
                  <div>
                    <Label className="text-xs">Referral Link</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input value={member.referralLink} readOnly className="flex-1 h-9 text-[11px]" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyLink(member.referralLink)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <p className="text-[11px] text-muted-foreground">Successful</p>
                      <p className="text-base font-bold text-green-600">{member.successfulReferrals}</p>
                    </div>
                    <div className="text-center p-2 bg-yellow-50 rounded-lg">
                      <p className="text-[11px] text-muted-foreground">Pending</p>
                      <p className="text-base font-bold text-yellow-600">{member.pendingReferrals}</p>
                    </div>
                  </div>

                  {/* Rewards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-purple-50 rounded-lg">
                      <p className="text-[11px] text-muted-foreground">Total Earned</p>
                      <p className="text-sm font-bold text-purple-600"><CurrencyGlyph /> {member.totalRewardsEarned}</p>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <p className="text-[11px] text-muted-foreground">Balance</p>
                      <p className="text-sm font-bold text-blue-600"><CurrencyGlyph /> {member.rewardBalance}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-2">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleShareWhatsApp(member.referralCode, member.memberName)}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleShareEmail(member.referralCode, member.referralLink, member.memberName)}
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Email
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGenerateQR(member.referralLink)}
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <Card className={cardShell}>
            <CardHeader>
              <CardTitle>Referral Activity Log</CardTitle>
              <CardDescription>
                Detailed tracking of all referral activities and status updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Referrer</TableHead>
                    <TableHead>Referee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Signup Date</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiReferrals.map((activity) => (
                    <TableRow key={activity.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-medium">{activity.referrerName}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{activity.refereeName}</p>
                          <p className="text-sm text-muted-foreground">{activity.refereeEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(activity.status)}>
                          {activity.status === 'successful' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {activity.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                          {activity.status === 'expired' && <X className="h-3 w-3 mr-1" />}
                          {activity.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium"><CurrencyGlyph /> {activity.rewardAmount}</span>
                      </TableCell>
                      <TableCell>
                        {activity.signupDate || '-'}
                      </TableCell>
                      <TableCell>
                        {activity.paymentDate || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" onClick={() => { setViewingReferral(activity); setShowViewReferral(true); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setEditingReferral(activity); setEditReferral({ referrerName: activity.referrerName || '', refereeName: activity.refereeName || '', refereeEmail: activity.refereeEmail || '', refereePhone: activity.refereePhone || '', date: activity.date || activity.createdAt, status: activity.status, notes: '' }); setShowEditReferral(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={async () => { if (!window.confirm('Delete this referral?')) return; try { await referralService.delete(Number(activity.id)); toast.success('Referral deleted'); loadData(); } catch { toast.error('Failed to delete'); } }}>
                            <X className="h-4 w-4" />
                          </Button>
                          {activity.status === 'pending' && (
                            <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700" onClick={async () => { try { await referralService.markSuccessful(Number(activity.id)); toast.success('Referral marked successful'); loadData(); } catch { toast.error('Failed to update'); } }}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Reward Rules</h2>
              <p className="text-muted-foreground">Configure and manage referral reward programs</p>
            </div>
            <Button onClick={() => setShowAddRule(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Rule
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {rewardRulesState.map((rule) => (
              <Card
                key={rule.id}
                className={`${rule.isActive ? 'border-green-200 bg-green-50/30' : 'border-gray-200'} shadow-md hover:shadow-lg transition-shadow`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{rule.name}</CardTitle>
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={(checked) => handleToggleRewardRule(rule.id, checked === true)}
                    />
                  </div>
                  <CardDescription className="text-xs">
                    {rule.type === 'discount' && 'Percentage discount'}
                    {rule.type === 'credit' && 'Account credit'}
                    {rule.type === 'points' && 'Loyalty points'}
                    {rule.type === 'free_session' && 'Free training session'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Reward Value</Label>
                      <p className="text-lg font-bold text-green-600">
                        {rule.value} {rule.unit}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs">Eligibility</Label>
                      <Badge variant="outline" className="capitalize">
                        {rule.eligibility}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Condition</Label>
                      <Badge variant="outline" className="capitalize">
                        {rule.condition}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-xs">Expires in</Label>
                      <p className="text-xs font-medium">
                        {rule.expiryDays} days
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => { const apiRule = apiRules.find(r => String(r.id) === rule.id); if (apiRule) { setEditingRule(apiRule); setEditRule({ name: apiRule.name, type: apiRule.type, value: String(apiRule.value), unit: apiRule.unit, eligibility: apiRule.eligibility, conditionTrigger: apiRule.conditionTrigger, expiryDays: String(apiRule.expiryDays || 90) }); setShowEditRule(true); } }}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={async () => { if (!window.confirm(`Delete rule "${rule.name}"?`)) return; try { await referralService.deleteRule(Number(rule.id)); toast.success('Rule deleted'); loadData(); } catch { toast.error('Failed to delete rule'); } }}>
                    <X className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conversion Funnel */}
            <Card className={cardShell}>
              <CardHeader>
                <CardTitle>Referral Conversion Funnel</CardTitle>
                <CardDescription>Track referral progress through the conversion funnel</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Referral Links Shared</span>
                    <span className="font-bold">245</span>
                  </div>
                  <Progress value={100} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span>Clicks Received</span>
                    <span className="font-bold">198</span>
                  </div>
                  <Progress value={80.8} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span>Signups Completed</span>
                    <span className="font-bold">156</span>
                  </div>
                  <Progress value={63.7} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span>Payments Made</span>
                    <span className="font-bold">123</span>
                  </div>
                  <Progress value={50.2} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Monthly Trends */}
            <Card className={cardShell}>
              <CardHeader>
                <CardTitle>Monthly Performance</CardTitle>
                <CardDescription>Referral program performance over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">This Month</p>
                      <p className="text-2xl font-bold text-blue-600">45</p>
                      <p className="text-xs text-green-600">+12% from last month</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Rewards Paid</p>
                      <p className="text-2xl font-bold text-purple-600"><CurrencyGlyph /> 2,250</p>
                      <p className="text-xs text-green-600">+8% from last month</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Avg. Value</p>
                      <p className="text-2xl font-bold text-green-600"><CurrencyGlyph /> 50</p>
                      <p className="text-xs text-gray-600">per referral</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">ROI</p>
                      <p className="text-2xl font-bold text-orange-600">340%</p>
                      <p className="text-xs text-green-600">+25% improvement</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Insights */}
          <Card className={cardShell}>
            <CardHeader>
              <CardTitle>Performance Insights</CardTitle>
              <CardDescription>AI-powered insights and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Alert>
                  <TrendingUp className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Peak Activity:</strong> Most referrals happen on weekends. Consider weekend-specific promotions.
                  </AlertDescription>
                </Alert>
                <Alert>
                  <Users className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Top Performers:</strong> Gold tier members have 3x higher referral rates.
                  </AlertDescription>
                </Alert>
                <Alert>
                  <Gift className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Reward Optimization:</strong> <CurrencyGlyph /> 50 credit shows highest conversion rate.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <Card className={cardShell}>
            <CardHeader>
              <CardTitle>Referral Program Settings</CardTitle>
              <CardDescription>Configure global referral program parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">General Settings</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Referral Program</Label>
                      <p className="text-sm text-muted-foreground">Turn the entire referral system on/off</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-generate Codes</Label>
                      <p className="text-sm text-muted-foreground">Automatically create codes for new members</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Send email updates for referral activities</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div>
                    <Label htmlFor="codePrefix">Referral Code Prefix</Label>
                    <Input id="codePrefix" defaultValue="GYM123" className="mt-1" />
                  </div>

                  <div>
                    <Label htmlFor="linkDomain">Referral Link Domain</Label>
                    <Input id="linkDomain" defaultValue="gymbios.app/ref" className="mt-1" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Reward Settings</h3>

                  <div>
                    <Label htmlFor="maxRewards">Maximum Rewards per Member</Label>
                    <Input id="maxRewards" type="number" defaultValue="1000" className="mt-1" />
                    <p className="text-sm text-muted-foreground mt-1">Monthly limit in <CurrencyGlyph /></p>
                  </div>

                  <div>
                    <Label htmlFor="expiryDays">Default Reward Expiry</Label>
                    <Input id="expiryDays" type="number" defaultValue="90" className="mt-1" />
                    <p className="text-sm text-muted-foreground mt-1">Days until rewards expire</p>
                  </div>

                  <div>
                    <Label htmlFor="minAmount">Minimum Transaction Amount</Label>
                    <Input id="minAmount" type="number" defaultValue="100" className="mt-1" />
                    <p className="text-sm text-muted-foreground mt-1">Minimum <CurrencyGlyph /> amount to trigger rewards</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-process Rewards</Label>
                      <p className="text-sm text-muted-foreground">Automatically credit rewards when conditions are met</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Tier System</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="border-orange-200 bg-orange-50">
                    <CardContent className="p-4 text-center">
                      <Target className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                      <h4 className="font-semibold">Bronze</h4>
                      <p className="text-sm text-muted-foreground">0-2 referrals</p>
                    </CardContent>
                  </Card>
                  <Card className="border-gray-200 bg-gray-50">
                    <CardContent className="p-4 text-center">
                      <Star className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                      <h4 className="font-semibold">Silver</h4>
                      <p className="text-sm text-muted-foreground">3-5 referrals</p>
                    </CardContent>
                  </Card>
                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="p-4 text-center">
                      <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                      <h4 className="font-semibold">Gold</h4>
                      <p className="text-sm text-muted-foreground">6-10 referrals</p>
                    </CardContent>
                  </Card>
                  <Card className="border-purple-200 bg-purple-50">
                    <CardContent className="p-4 text-center">
                      <Crown className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <h4 className="font-semibold">Platinum</h4>
                      <p className="text-sm text-muted-foreground">11+ referrals</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="ml-auto">
                <RefreshCw className="mr-2 h-4 w-4" />
                Save Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Referral Dialog */}
      <Dialog open={showViewReferral} onOpenChange={setShowViewReferral}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Referral Details</DialogTitle>
          </DialogHeader>
          {viewingReferral && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">Referrer</Label><p className="font-medium">{viewingReferral.referrerName}</p></div>
                <div><Label className="text-xs text-muted-foreground">Referee</Label><p className="font-medium">{viewingReferral.refereeName}</p></div>
                <div><Label className="text-xs text-muted-foreground">Email</Label><p className="text-sm">{viewingReferral.refereeEmail || '—'}</p></div>
                <div><Label className="text-xs text-muted-foreground">Phone</Label><p className="text-sm">{viewingReferral.refereePhone || '—'}</p></div>
                <div><Label className="text-xs text-muted-foreground">Status</Label><Badge className={getStatusColor(viewingReferral.status)}>{viewingReferral.status}</Badge></div>
                <div><Label className="text-xs text-muted-foreground">Reward</Label><p className="font-medium"><CurrencyGlyph /> {viewingReferral.rewardAmount || 0}</p></div>
                <div><Label className="text-xs text-muted-foreground">Referral Code</Label><p className="text-sm font-mono">{viewingReferral.referralCode}</p></div>
                <div><Label className="text-xs text-muted-foreground">Date</Label><p className="text-sm">{viewingReferral.date || viewingReferral.createdAt}</p></div>
              </div>
              {viewingReferral.status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="flex-1" onClick={async () => { try { await referralService.markSuccessful(Number(viewingReferral.id)); toast.success('Marked successful'); setShowViewReferral(false); loadData(); } catch { toast.error('Failed'); } }}>Mark Successful</Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={async () => { try { await referralService.markExpired(Number(viewingReferral.id)); toast.success('Marked expired'); setShowViewReferral(false); loadData(); } catch { toast.error('Failed'); } }}>Mark Expired</Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewReferral(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Referral Dialog */}
      <Dialog open={showEditReferral} onOpenChange={setShowEditReferral}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#2B7A78]">Edit Referral</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Referrer Name</Label>
              <Input className="mt-1" value={editReferral.referrerName} onChange={e => setEditReferral(p => ({ ...p, referrerName: e.target.value }))} />
            </div>
            <div>
              <Label>Referee Name</Label>
              <Input className="mt-1" value={editReferral.refereeName} onChange={e => setEditReferral(p => ({ ...p, refereeName: e.target.value }))} />
            </div>
            <div>
              <Label>Referee Email</Label>
              <Input type="email" className="mt-1" value={editReferral.refereeEmail} onChange={e => setEditReferral(p => ({ ...p, refereeEmail: e.target.value }))} />
            </div>
            <div>
              <Label>Referee Phone</Label>
              <Input className="mt-1" value={editReferral.refereePhone} onChange={e => setEditReferral(p => ({ ...p, refereePhone: e.target.value }))} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editReferral.status} onValueChange={v => setEditReferral(p => ({ ...p, status: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="successful">Successful</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input className="mt-1" value={editReferral.notes} onChange={e => setEditReferral(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowEditReferral(false)}>Cancel</Button>
            <Button className="bg-[#2B7A78] hover:bg-[#236763] text-white" onClick={async () => {
              if (!editingReferral) return;
              try {
                await referralService.update(Number(editingReferral.id), { referrerName: editReferral.referrerName, refereeName: editReferral.refereeName, refereeEmail: editReferral.refereeEmail || undefined, refereePhone: editReferral.refereePhone || undefined, date: editReferral.date, status: editReferral.status, notes: editReferral.notes || undefined });
                toast.success('Referral updated');
                setShowEditReferral(false);
                loadData();
              } catch { toast.error('Failed to update referral'); }
            }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rule Dialog */}
      <Dialog open={showEditRule} onOpenChange={setShowEditRule}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#2B7A78]">Edit Reward Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Rule Name</Label>
              <Input className="mt-1" value={editRule.name} onChange={e => setEditRule(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label>Reward Type</Label>
              <Select value={editRule.type} onValueChange={v => setEditRule(p => ({ ...p, type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Cash Credit</SelectItem>
                  <SelectItem value="discount">Membership Discount</SelectItem>
                  <SelectItem value="points">Loyalty Points</SelectItem>
                  <SelectItem value="free_session">Free Session</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Value</Label>
              <Input type="number" className="mt-1" value={editRule.value} onChange={e => setEditRule(p => ({ ...p, value: e.target.value }))} />
            </div>
            <div>
              <Label>Unit</Label>
              <Input className="mt-1" value={editRule.unit} onChange={e => setEditRule(p => ({ ...p, unit: e.target.value }))} />
            </div>
            <div>
              <Label>Eligibility</Label>
              <Select value={editRule.eligibility} onValueChange={v => setEditRule(p => ({ ...p, eligibility: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="referrer">Referrer Only</SelectItem>
                  <SelectItem value="referee">Referee Only</SelectItem>
                  <SelectItem value="both">Both Parties</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Condition</Label>
              <Select value={editRule.conditionTrigger} onValueChange={v => setEditRule(p => ({ ...p, conditionTrigger: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="signup">On Signup</SelectItem>
                  <SelectItem value="payment">On Payment</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Expiry Days</Label>
              <Input type="number" className="mt-1" value={editRule.expiryDays} onChange={e => setEditRule(p => ({ ...p, expiryDays: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowEditRule(false)}>Cancel</Button>
            <Button className="bg-[#E63946] hover:bg-[#c92e3a] text-white" onClick={async () => {
              if (!editingRule) return;
              try {
                await referralService.updateRule(Number(editingRule.id), { name: editRule.name, type: editRule.type, value: Number(editRule.value), unit: editRule.unit, eligibility: editRule.eligibility, conditionTrigger: editRule.conditionTrigger, expiryDays: Number(editRule.expiryDays), isActive: editingRule.isActive });
                toast.success('Rule updated');
                setShowEditRule(false);
                loadData();
              } catch { toast.error('Failed to update rule'); }
            }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Add Reward Rule Modal ---------------- */}
      <Dialog open={showAddRule} onOpenChange={setShowAddRule}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#2B7A78]">
              Add Reward Rule
            </DialogTitle>
            <DialogDescription>
              Define a new reward policy for referrals or achievements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label>Rule Name</Label>
              <Input placeholder="e.g., 10% discount on next month" className="mt-1" value={newRule.name} onChange={e => setNewRule(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label>Reward Type</Label>
              <Select value={newRule.type} onValueChange={v => setNewRule(p => ({ ...p, type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Cash Credit</SelectItem>
                  <SelectItem value="discount">Membership Discount</SelectItem>
                  <SelectItem value="points">Loyalty Points</SelectItem>
                  <SelectItem value="free_session">Free Session</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reward Value</Label>
              <Input placeholder="e.g., 25" type="number" className="mt-1" value={newRule.value} onChange={e => setNewRule(p => ({ ...p, value: e.target.value }))} />
            </div>
            <div>
              <Label>Unit</Label>
              <Input placeholder={`${currencyCode} / % / session`} className="mt-1" value={newRule.unit} onChange={e => setNewRule(p => ({ ...p, unit: e.target.value }))} />
            </div>
            <div>
              <Label>Eligibility</Label>
              <Select value={newRule.eligibility} onValueChange={v => setNewRule(p => ({ ...p, eligibility: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="referrer">Referrer Only</SelectItem>
                  <SelectItem value="referee">Referee Only</SelectItem>
                  <SelectItem value="both">Both Parties</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Condition</Label>
              <Select value={newRule.conditionTrigger} onValueChange={v => setNewRule(p => ({ ...p, conditionTrigger: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="signup">On Signup</SelectItem>
                  <SelectItem value="payment">On Payment</SelectItem>
                  <SelectItem value="both">Both Signup & Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Expiry Days</Label>
              <Input placeholder="e.g., 90" type="number" className="mt-1" value={newRule.expiryDays} onChange={e => setNewRule(p => ({ ...p, expiryDays: e.target.value }))} />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowAddRule(false)} className="border-[#2B7A78] text-[#2B7A78] hover:bg-[#2B7A78]/10">
              Cancel
            </Button>
            <Button
              className="bg-[#E63946] hover:bg-[#c92e3a] text-white"
              onClick={async () => {
                try {
                  await referralService.createRule({ name: newRule.name, type: newRule.type, value: Number(newRule.value), unit: newRule.unit, eligibility: newRule.eligibility, conditionTrigger: newRule.conditionTrigger, expiryDays: Number(newRule.expiryDays), isActive: true });
                  toast.success('Reward Rule Created!', { description: 'The new reward rule has been added.' });
                  setNewRule({ name: '', type: 'credit', value: '', unit: currencyCode as string, eligibility: 'referrer', conditionTrigger: 'payment', expiryDays: '90' });
                  setShowAddRule(false);
                  await loadData();
                } catch { toast.error('Failed to create rule'); }
              }}
            >
              Save Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Add Referral Modal ---------------- */}
      <Dialog open={showAddReferral} onOpenChange={setShowAddReferral}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#2B7A78]">Add a Referral</DialogTitle>
            <DialogDescription>
              Register a new member referral to track and reward later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label>Referrer Name (Existing Member)</Label>
              <Input placeholder="e.g., Sarah Johnson" className="mt-1" value={newReferral.referrerName} onChange={e => setNewReferral(p => ({ ...p, referrerName: e.target.value }))} />
            </div>
            <div>
              <Label>Referred Person Name</Label>
              <Input placeholder="New person's full name" className="mt-1" value={newReferral.refereeName} onChange={e => setNewReferral(p => ({ ...p, refereeName: e.target.value }))} />
            </div>
            <div>
              <Label>Referred Person Email</Label>
              <Input placeholder="email@example.com" type="email" className="mt-1" value={newReferral.refereeEmail} onChange={e => setNewReferral(p => ({ ...p, refereeEmail: e.target.value }))} />
            </div>
            <div>
              <Label>Referred Person Phone</Label>
              <Input placeholder="+971 XX XXX XXXX" type="tel" className="mt-1" value={newReferral.refereePhone} onChange={e => setNewReferral(p => ({ ...p, refereePhone: e.target.value }))} />
            </div>
            <div>
              <Label>Referral Date</Label>
              <Input type="date" className="mt-1" value={newReferral.date} onChange={e => setNewReferral(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={newReferral.status} onValueChange={v => setNewReferral(p => ({ ...p, status: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="successful">Successful</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (Optional)</Label>
              <Input placeholder="Additional notes about this referral" className="mt-1" value={newReferral.notes} onChange={e => setNewReferral(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowAddReferral(false)} className="border-[#2B7A78] text-[#2B7A78] hover:bg-[#2B7A78]/10">
              Cancel
            </Button>
            <Button
              className="bg-[#2B7A78] hover:bg-[#236763] text-white"
              onClick={async () => {
                try {
                  await referralService.create({ referrerName: newReferral.referrerName, refereeName: newReferral.refereeName, refereeEmail: newReferral.refereeEmail || undefined, refereePhone: newReferral.refereePhone || undefined, date: newReferral.date, status: newReferral.status, notes: newReferral.notes || undefined });
                  toast.success('Referral Added!', { description: 'The new referral has been registered.' });
                  setNewReferral({ referrerName: '', refereeName: '', refereeEmail: '', refereePhone: '', date: new Date().toISOString().split('T')[0], status: 'pending', notes: '' });
                  setShowAddReferral(false);
                  await loadData();
                } catch { toast.error('Failed to create referral'); }
              }}
            >
              Save Referral
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

