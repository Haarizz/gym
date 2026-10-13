import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Separator } from "../ui/separator";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart } from 'recharts';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Download,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Calendar,
  Target,
  Eye,
  Filter,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
  UserCheck,
  UserX,
  UserPlus,
  Award,
  Activity,
  Heart,
  DollarSign,
  MapPin,
  Mail,
  Phone,
  Cake,
  Briefcase,
  GraduationCap,
  Home,
  Star,
  ThumbsUp,
  Zap,
  TrendingUpDown
} from 'lucide-react';
import { type BiosLiveData, formatSignedPercent, useBiosInsights, InsightsStatus, NoData, shareOf } from './bios-live';
import { biosInsightsService } from '../../utils/supabase/bios-insights-service';

interface MemberAnalyticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: string;
  memberAnalytics: Array<{
    segment: string;
    count: number;
    engagement: number | null;
    ltv: number | null;
  }>;
  formatCurrency: (amount: number) => string;
  getCurrentPeriod: () => string;
  live: BiosLiveData;
}

export function MemberAnalyticsDialog({
  open,
  onOpenChange,
  defaultTab = 'segments',
  memberAnalytics,
  formatCurrency,
  getCurrentPeriod,
  live
}: MemberAnalyticsDialogProps) {
  const [selectedSegment, setSelectedSegment] = React.useState('all');
  const [timeRange, setTimeRange] = React.useState('6months');

  // Real member figures, loaded when the dialog opens.
  const { data: insights, loading: insightsLoading, error: insightsError } =
    useBiosInsights(() => biosInsightsService.getMembers(), open, live.branchKey);
  const segmentFacts = new Map((insights?.segments ?? []).map((row) => [row.membership_type, row]));

  // Member Segments — one per membership type.
  const SEGMENT_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
  const toSegmentName = (type: string) =>
    `${type.replace(/[_-]+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase())} Members`;
  const memberSegments: Array<{
    segment: string; count: number; percentage: number; ltv: number | null;
    retention: number; churnRate: number; avgAge: number | null; monthlyFee: number | null; avgVisits: number | null;
    classBookings: number | null; ptBookings: number | null; avgTenure: number | null; color: string;
  }> = Object.entries(live.membershipTypeStats)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([type, stats], index) => {
      const facts = segmentFacts.get(type);
      return {
        segment: toSegmentName(type),
        count: stats.total,
        percentage: live.totalMembers > 0 ? Number(((stats.total / live.totalMembers) * 100).toFixed(1)) : 0,
        ltv: facts?.avg_ltv ?? null,
        retention: stats.total > 0 ? Number(((stats.active / stats.total) * 100).toFixed(1)) : 0,
        churnRate: stats.total > 0 ? Number(((stats.expired / stats.total) * 100).toFixed(1)) : 0,
        avgAge: facts?.avg_age ?? null,
        monthlyFee: facts?.avg_monthly_fee ?? null,
        avgVisits: facts ? facts.avg_visits30 : null,
        classBookings: facts ? facts.class_bookings_per_active30 : null,
        ptBookings: facts ? facts.pt_bookings_per_active30 : null,
        avgTenure: facts?.avg_tenure_months ?? null,
        color: SEGMENT_COLORS[index % SEGMENT_COLORS.length]
      };
    });

  // Retention Trends
  const retentionTrends = live.memberTrend.map((p) => ({
    month: p.month,
    retained: p.retention,
    churned: p.churn,
    newMembers: p.newMembers
  }));
  const currentChurn = live.memberTrend.length > 0 ? live.memberTrend[live.memberTrend.length - 1].churn : 0;
  const previousChurn = live.memberTrend.length > 1 ? live.memberTrend[live.memberTrend.length - 2].churn : currentChurn;
  const churnDelta = Number((currentChurn - previousChurn).toFixed(1));
  const membersAtRisk = live.overdueMembers + live.suspendedMembers;

  // Engagement by Segment — per active member over the last 30 days.
  const engagementBySegment = (insights?.segments ?? []).filter((row) => row.active_members > 0).map((row) => ({
    segment: row.membership_type,
    checkIns: row.avg_visits30,
    classes: row.class_bookings_per_active30,
    pt: row.pt_bookings_per_active30
  }));
  const engagement = insights?.engagement;
  const noVisitMembers = insights?.activity_levels.find((level) => level.label === 'No visits')?.count ?? 0;

  // Member Growth Over Time (member counts only grow in this history, so churn isn't charted)
  const memberGrowth = live.memberTrend.map((p) => ({
    month: p.month,
    total: p.members,
    new: p.newMembers,
    churned: null as number | null,
    net: p.newMembers
  }));
  const newThisMonth = live.memberTrend.length > 0 ? live.memberTrend[live.memberTrend.length - 1].newMembers : live.recentJoins;
  const newLastMonth = live.memberTrend.length > 1 ? live.memberTrend[live.memberTrend.length - 2].newMembers : 0;
  const newMembersChange = newLastMonth > 0 ? Number((((newThisMonth - newLastMonth) / newLastMonth) * 100).toFixed(1)) : null;

  // Demographics
  const ageDistribution = (insights?.age_bands ?? []).map((band) => ({
    ageGroup: band.label,
    count: band.count,
    percentage: shareOf(band.count, insights?.members_with_birth_date ?? 0),
    avgSpend: band.avg_ltv
  }));
  const GENDER_COLORS: Record<string, string> = { Male: '#3b82f6', Female: '#ec4899', 'Not recorded': '#9ca3af' };
  const genderTotal = (insights?.genders ?? []).reduce((sum, g) => sum + g.count, 0);
  const genderDistribution = (insights?.genders ?? []).map((g, index) => ({
    gender: g.label,
    count: g.count,
    percentage: shareOf(g.count, genderTotal),
    color: GENDER_COLORS[g.label] ?? SEGMENT_COLORS[index % SEGMENT_COLORS.length]
  }));
  const topNationality = insights?.nationalities[0] ?? null;

  // Lifetime Value — everything a member has paid on receipts.
  const ltvAnalysis = (insights?.segments ?? []).filter((row) => row.avg_ltv != null).map((row) => ({
    segment: row.membership_type,
    avgLTV: row.avg_ltv as number,
    avgTenure: row.avg_tenure_months,
    monthlyRevenue: row.avg_monthly_fee,
    activeMembers: row.active_members
  })).sort((a, b) => b.avgLTV - a.avgLTV);
  const highestLtv = ltvAnalysis[0] ?? null;
  const lowestLtv = ltvAnalysis.length > 1 ? ltvAnalysis[ltvAnalysis.length - 1] : null;

  // Acquisition Channels — leads by source over the last 12 months.
  const acquisitionChannels = (insights?.acquisition ?? []).map((row) => ({
    channel: row.source,
    leads: row.leads,
    members: row.converted,
    conversion: shareOf(row.converted, row.leads),
    ltv: row.avg_ltv_converted
  }));
  const totalLeads = acquisitionChannels.reduce((sum, c) => sum + c.leads, 0);
  const totalConverted = acquisitionChannels.reduce((sum, c) => sum + c.members, 0);
  const bestConverting = [...acquisitionChannels].filter((c) => c.leads >= 3).sort((a, b) => b.conversion - a.conversion)[0] ?? null;

  // Member Activity Levels — check-ins in the last 30 days, effectively active members.
  const ACTIVITY_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280'];
  const ACTIVITY_NAMES = ['Highly Active', 'Active', 'Moderate', 'Low Activity', 'Inactive'];
  const activityTotal = (insights?.activity_levels ?? []).reduce((sum, level) => sum + level.count, 0);
  const activityLevels = (insights?.activity_levels ?? []).map((level, index) => ({
    level: ACTIVITY_NAMES[index] ?? level.label,
    count: level.count,
    percentage: shareOf(level.count, activityTotal),
    visits: `${level.label} in the last 30 days`,
    color: ACTIVITY_COLORS[index % ACTIVITY_COLORS.length]
  }));

  // Risk Segmentation — from membership and payment status.
  const riskSegmentation = [
    {
      risk: 'High Risk',
      count: live.overdueMembers,
      indicators: 'Payment overdue',
      action: 'Immediate outreach',
      priority: 'High'
    },
    {
      risk: 'Medium Risk',
      count: live.suspendedMembers,
      indicators: 'Membership suspended',
      action: 'Retention campaign',
      priority: 'Medium'
    },
    {
      risk: 'Low Risk',
      count: Math.max(0, live.activeMembers - live.overdueMembers),
      indicators: 'Active, payments up to date',
      action: 'Regular check-ins',
      priority: 'Low'
    }
  ];

  // Member Satisfaction — post-workout feedback from the member app (1-5 stars), last 90 days.
  const satisfaction = insights?.satisfaction;
  const satisfactionScores = satisfaction ? [
    { category: 'Overall Experience', score: satisfaction.overall, trend: satisfaction.previous_overall == null || satisfaction.overall == null ? 'stable'
      : satisfaction.overall > satisfaction.previous_overall ? 'up' : satisfaction.overall < satisfaction.previous_overall ? 'down' : 'stable' },
    { category: 'Trainers', score: satisfaction.trainer, trend: 'stable' },
    { category: 'Equipment', score: satisfaction.equipment, trend: 'stable' },
    { category: 'Facilities', score: satisfaction.facility, trend: 'stable' },
    { category: 'App Reviews', score: satisfaction.reviews.average, trend: 'stable' }
  ].filter((row): row is { category: string; score: number; trend: string } => row.score != null) : [];

  // Member Journey Stages — members by time since joining, and how many are still active.
  const stageTotal = (insights?.tenure_stages ?? []).reduce((sum, stage) => sum + stage.members, 0);
  const journeyStages = (insights?.tenure_stages ?? []).map((stage) => ({
    stage: stage.label,
    count: stage.members,
    percentage: shareOf(stage.members, stageTotal),
    retention: shareOf(stage.active_members, stage.members)
  }));

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'High Risk':
        return 'bg-red-100 text-red-800';
      case 'Medium Risk':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low Risk':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-bios-ui="" className="max-w-7xl sm:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-6 w-6 text-[#2B7A78]" />
            <span>Member Analytics - {getCurrentPeriod()}</span>
          </DialogTitle>
          <DialogDescription>
            Comprehensive member insights, segmentation, and retention analysis
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="segments">Segments</TabsTrigger>
            <TabsTrigger value="retention">Retention</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="demographics">Demographics</TabsTrigger>
            <TabsTrigger value="ltv">Lifetime Value</TabsTrigger>
            <TabsTrigger value="growth">Growth</TabsTrigger>
          </TabsList>

          {/* Segments Tab */}
          <TabsContent value="segments" className="space-y-4">
            {memberSegments.length === 0 && (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {memberSegments.map((segment, index) => (
                <Card key={index} className="border-l-4" style={{ borderLeftColor: segment.color }}>
                  <CardHeader>
                    <CardTitle className="text-base">{segment.segment}</CardTitle>
                    <CardDescription>{segment.count} members • {segment.percentage}%</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Monthly Fee</p>
                        <p className="text-lg font-bold">{segment.monthlyFee === null ? '—' : formatCurrency(segment.monthlyFee)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Avg LTV</p>
                        <p className="text-lg font-bold">{segment.ltv === null ? '—' : formatCurrency(segment.ltv)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Retention</p>
                        <p className="text-lg font-bold text-green-600">{segment.retention}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Churn Rate</p>
                        <p className="text-lg font-bold text-red-600">{segment.churnRate}%</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Visits / active member (30d)</span>
                      <span className="font-medium">{segment.avgVisits ?? '—'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Class / PT bookings (30d)</span>
                      <span className="font-medium">{segment.classBookings == null ? '—' : `${segment.classBookings} / ${segment.ptBookings}`}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Avg Tenure</span>
                      <span className="font-medium">{segment.avgTenure == null ? '—' : `${segment.avgTenure} months`}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Avg Age</span>
                      <span className="font-medium">{segment.avgAge === null ? '—' : `${segment.avgAge} years`}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Member Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={memberSegments}
                      dataKey="count"
                      nameKey="segment"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ segment, percentage }) => `${segment}: ${percentage}%`}
                    >
                      {memberSegments.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Activity Level Distribution</CardTitle>
                <CardDescription>Check-ins in the last 30 days, active members</CardDescription>
              </CardHeader>
              <CardContent>
                <InsightsStatus loading={insightsLoading} error={insightsError} />
                <div className="space-y-3">
                  {activityLevels.map((level, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: level.color }} />
                          <span className="text-sm font-medium">{level.level}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium">{level.count} members</span>
                          <span className="text-xs text-muted-foreground ml-2">({level.percentage}%)</span>
                        </div>
                      </div>
                      <Progress value={level.percentage} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">{level.visits}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Retention Tab */}
          <TabsContent value="retention" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Retention Rate</p>
                      <p className="text-2xl font-bold text-green-600">{live.retentionRate}%</p>
                      <div className="flex items-center mt-1">
                        {live.retentionDelta >= 0
                          ? <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                          : <TrendingDown className="h-4 w-4 text-red-500 mr-1" />}
                        <span className={`text-xs ${live.retentionDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatSignedPercent(live.retentionDelta)} vs last month</span>
                      </div>
                    </div>
                    <UserCheck className="h-10 w-10 text-green-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Churn Rate</p>
                      <p className="text-2xl font-bold text-red-600">{currentChurn}%</p>
                      <div className="flex items-center mt-1">
                        {churnDelta <= 0
                          ? <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                          : <TrendingUp className="h-4 w-4 text-red-500 mr-1" />}
                        <span className={`text-xs ${churnDelta <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatSignedPercent(churnDelta)} {churnDelta <= 0 ? 'improvement' : 'vs last month'}
                        </span>
                      </div>
                    </div>
                    <UserX className="h-10 w-10 text-red-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Members at Risk</p>
                      <p className="text-2xl font-bold text-orange-600">{membersAtRisk}</p>
                      <div className="flex items-center mt-1">
                        <AlertTriangle className="h-4 w-4 text-orange-500 mr-1" />
                        <span className="text-xs text-orange-600">{membersAtRisk > 0 ? 'Overdue or suspended' : 'None right now'}</span>
                      </div>
                    </div>
                    <AlertTriangle className="h-10 w-10 text-orange-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Retention & Churn Trends</CardTitle>
                <CardDescription>{live.memberTrend.length}-month retention performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={retentionTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="retained" fill="#10b981" stroke="#10b981" fillOpacity={0.6} name="Retention %" />
                    <Line type="monotone" dataKey="churned" stroke="#ef4444" strokeWidth={2} name="Churn %" />
                    <Bar dataKey="newMembers" fill="#3b82f6" name="New Members" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Risk Segmentation</CardTitle>
                <CardDescription>Members categorized by churn risk</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Risk Level</TableHead>
                      <TableHead className="text-right">Members</TableHead>
                      <TableHead>Indicators</TableHead>
                      <TableHead>Recommended Action</TableHead>
                      <TableHead>Priority</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {riskSegmentation.map((risk, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge className={getRiskColor(risk.risk)}>
                            {risk.risk}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{risk.count}</TableCell>
                        <TableCell className="text-sm">{risk.indicators}</TableCell>
                        <TableCell className="text-sm">{risk.action}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            risk.priority === 'High' ? 'border-red-300 text-red-700' :
                            risk.priority === 'Medium' ? 'border-yellow-300 text-yellow-700' :
                            'border-green-300 text-green-700'
                          }>
                            {risk.priority}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Member Journey Stages</CardTitle>
                <CardDescription>Members by time since joining, and the share still active</CardDescription>
              </CardHeader>
              <CardContent>
                <InsightsStatus loading={insightsLoading} error={insightsError} />
                <div className="space-y-3">
                  {journeyStages.map((stage, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">{stage.stage}</span>
                        <div className="text-right">
                          <span className="text-sm font-medium">{stage.count} members</span>
                          <span className="text-xs text-green-600 ml-2">({stage.retention}% still active)</span>
                        </div>
                      </div>
                      <Progress value={stage.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Engagement Tab */}
          <TabsContent value="engagement" className="space-y-4">
            <InsightsStatus loading={insightsLoading} error={insightsError} />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Engagement by Member Segment</CardTitle>
                <CardDescription>Per active member, last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                {insights && engagementBySegment.length === 0 && <NoData>No active members yet.</NoData>}
                {engagementBySegment.length > 0 && (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={engagementBySegment}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="segment" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="checkIns" fill="#10b981" name="Check-ins" />
                      <Bar dataKey="classes" fill="#3b82f6" name="Class bookings" />
                      <Bar dataKey="pt" fill="#8b5cf6" name="PT bookings" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Average Engagement Metrics</CardTitle>
                  <CardDescription>Active members, last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  {engagement && (
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-sm">Check-ins per active member</span>
                        <span className="text-sm font-medium">{engagement.avg_visits_per_active30}</span>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Booked at least one class</span>
                          <span className="text-sm font-medium">{engagement.class_uptake_percent}%</span>
                        </div>
                        <Progress value={engagement.class_uptake_percent} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Booked at least one PT session</span>
                          <span className="text-sm font-medium">{engagement.pt_uptake_percent}%</span>
                        </div>
                        <Progress value={engagement.pt_uptake_percent} className="h-2" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Member Satisfaction</CardTitle>
                  <CardDescription>
                    {satisfaction ? `${satisfaction.responses} post-workout ratings in the last 90 days, ${satisfaction.reviews.count} app reviews` : 'Member app feedback'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {satisfaction && satisfactionScores.length === 0 && <NoData>No member feedback yet.</NoData>}
                  <div className="space-y-3">
                    {satisfactionScores.map((item, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm">{item.category}</span>
                          <div className="flex items-center space-x-2">
                            {getTrendIcon(item.trend)}
                            <span className="text-sm font-medium">{item.score}/5</span>
                          </div>
                        </div>
                        <Progress value={(item.score / 5) * 100} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {engagement && engagement.active_members > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Engagement Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2 p-3 bg-yellow-50 rounded">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-900">{noVisitMembers} active {noVisitMembers === 1 ? "member hasn't" : "members haven't"} visited in 30 days</p>
                        <p className="text-xs text-yellow-700">{shareOf(noVisitMembers, engagement.active_members)}% of active members — worth a check-in before they lapse.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded">
                      <Activity className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Class uptake {engagement.class_uptake_percent}%, PT uptake {engagement.pt_uptake_percent}%</p>
                        <p className="text-xs text-blue-700">Share of active members who booked at least once in the last 30 days.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Demographics Tab */}
          <TabsContent value="demographics" className="space-y-4">
            <InsightsStatus loading={insightsLoading} error={insightsError} />
            {insights && insights.members_with_birth_date === 0 && (
              <NoData>No member birth dates are recorded yet, so age figures are empty.</NoData>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Age Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ageDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="ageGroup" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#3b82f6" name="Members" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Gender Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={genderDistribution}
                        dataKey="count"
                        nameKey="gender"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ gender, percentage }) => `${gender}: ${percentage}%`}
                      >
                        {genderDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Age Group Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Age Group</TableHead>
                      <TableHead className="text-right">Members</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                      <TableHead className="text-right">Avg Lifetime Spend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ageDistribution.map((age, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{age.ageGroup}</TableCell>
                        <TableCell className="text-right">{age.count}</TableCell>
                        <TableCell className="text-right">{age.percentage}%</TableCell>
                        <TableCell className="text-right">{age.avgSpend != null ? formatCurrency(age.avgSpend) : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <Cake className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Average Age</p>
                    <p className="text-2xl font-bold">{insights?.average_age != null ? `${insights.average_age} years` : '—'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Birth Dates Recorded</p>
                    <p className="text-2xl font-bold">{insights ? `${shareOf(insights.members_with_birth_date, live.totalMembers)}%` : '—'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <MapPin className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Top Nationality</p>
                    <p className="text-2xl font-bold">{topNationality ? topNationality.label : '—'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <Briefcase className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nationalities</p>
                    <p className="text-2xl font-bold">{insights ? insights.nationalities.length : '—'}{insights && insights.nationalities.length >= 6 ? '+' : ''}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Lifetime Value Tab */}
          <TabsContent value="ltv" className="space-y-4">
            <InsightsStatus loading={insightsLoading} error={insightsError} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Average LTV</p>
                      <p className="text-2xl font-bold text-green-600">{insights?.ltv.average != null ? formatCurrency(insights.ltv.average) : '—'}</p>
                      <p className="text-xs text-green-600 mt-1">{insights ? `Across ${insights.ltv.paying_members} paying members` : 'Lifetime paid per member'}</p>
                    </div>
                    <DollarSign className="h-10 w-10 text-green-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Highest LTV</p>
                      <p className="text-2xl font-bold text-purple-600">{highestLtv ? formatCurrency(highestLtv.avgLTV) : '—'}</p>
                      <p className="text-xs text-purple-600 mt-1">{highestLtv ? highestLtv.segment : 'By membership type'}</p>
                    </div>
                    <Award className="h-10 w-10 text-purple-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Tenure</p>
                      <p className="text-2xl font-bold text-blue-600">{insights?.ltv.avg_tenure_months != null ? `${insights.ltv.avg_tenure_months} months` : '—'}</p>
                      <p className="text-xs text-blue-600 mt-1">Joining to lapse, or to today</p>
                    </div>
                    <Clock className="h-10 w-10 text-blue-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lifetime Value by Segment</CardTitle>
                <CardDescription>Everything members have paid on receipts, averaged per membership type</CardDescription>
              </CardHeader>
              <CardContent>
                {insights && ltvAnalysis.length === 0 && <NoData>No member payments recorded yet.</NoData>}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membership Type</TableHead>
                      <TableHead className="text-right">Avg LTV</TableHead>
                      <TableHead className="text-right">Avg Tenure</TableHead>
                      <TableHead className="text-right">Avg Monthly Fee</TableHead>
                      <TableHead className="text-right">Active Members</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ltvAnalysis.map((segment, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{segment.segment}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(segment.avgLTV)}</TableCell>
                        <TableCell className="text-right">{segment.avgTenure != null ? `${segment.avgTenure} months` : '—'}</TableCell>
                        <TableCell className="text-right">{segment.monthlyRevenue != null ? formatCurrency(segment.monthlyRevenue) : '—'}</TableCell>
                        <TableCell className="text-right">{segment.activeMembers}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {ltvAnalysis.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">LTV by Segment Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ltvAnalysis}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="segment" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Bar dataKey="avgLTV" fill="#10b981" name="Average LTV" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {highestLtv && lowestLtv && engagement && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">LTV Observations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2 p-3 bg-purple-50 rounded">
                      <Star className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-purple-900">{highestLtv.segment} members are worth the most</p>
                        <p className="text-xs text-purple-700">{formatCurrency(highestLtv.avgLTV)} on average vs {formatCurrency(lowestLtv.avgLTV)} for {lowestLtv.segment}.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded">
                      <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">PT uptake is {engagement.pt_uptake_percent}%</p>
                        <p className="text-xs text-blue-700">Share of active members who booked a PT session in the last 30 days.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Growth Tab */}
          <TabsContent value="growth" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">New Members (MTD)</p>
                      <p className="text-2xl font-bold text-green-600">{newThisMonth}</p>
                      <div className="flex items-center mt-1">
                        <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-xs text-green-600">{formatSignedPercent(newMembersChange)} vs last month</span>
                      </div>
                    </div>
                    <UserPlus className="h-10 w-10 text-green-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Net Growth</p>
                      <p className="text-2xl font-bold text-blue-600">+{newThisMonth}</p>
                      <p className="text-xs text-blue-600 mt-1">Members this month</p>
                    </div>
                    <TrendingUpDown className="h-10 w-10 text-blue-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Growth Rate</p>
                      <p className="text-2xl font-bold text-purple-600">{formatSignedPercent(live.memberGrowthRate)}</p>
                      <p className="text-xs text-purple-600 mt-1">Monthly growth</p>
                    </div>
                    <Activity className="h-10 w-10 text-purple-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Member Growth Trends</CardTitle>
                <CardDescription>New members, churned members, and net growth</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={memberGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="new" fill="#10b981" name="New Members" />
                    <Bar dataKey="churned" fill="#ef4444" name="Churned" />
                    <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={3} name="Net Growth" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Acquisition Channels Performance</CardTitle>
                <CardDescription>Leads by source over the last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                <InsightsStatus loading={insightsLoading} error={insightsError} />
                {insights && acquisitionChannels.length === 0 && <NoData>No leads recorded in the last 12 months.</NoData>}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Became Members</TableHead>
                      <TableHead className="text-right">Conversion</TableHead>
                      <TableHead className="text-right">Avg LTV</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {acquisitionChannels.map((channel, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{channel.channel}</TableCell>
                        <TableCell className="text-right">{channel.leads}</TableCell>
                        <TableCell className="text-right">{channel.members}</TableCell>
                        <TableCell className="text-right">
                          <Badge className="bg-green-100 text-green-800">{channel.conversion}%</Badge>
                        </TableCell>
                        <TableCell className="text-right">{channel.ltv != null ? formatCurrency(channel.ltv) : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {totalLeads > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Growth Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2 p-3 bg-green-50 rounded">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-900">{totalConverted} of {totalLeads} leads became members</p>
                        <p className="text-xs text-green-700">{shareOf(totalConverted, totalLeads)}% overall conversion over the last 12 months.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded">
                      <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">{acquisitionChannels[0].channel} brings the most leads</p>
                        <p className="text-xs text-blue-700">{acquisitionChannels[0].leads} leads, {acquisitionChannels[0].conversion}% converted.</p>
                      </div>
                    </div>
                    {bestConverting && (
                      <div className="flex items-start space-x-2 p-3 bg-purple-50 rounded">
                        <Award className="h-5 w-5 text-purple-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-purple-900">{bestConverting.channel} converts best</p>
                          <p className="text-xs text-purple-700">{bestConverting.conversion}% of its {bestConverting.leads} leads became members.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button className="bg-[#2B7A78] hover:bg-[#236663]" onClick={live.onExportData}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button className="bg-[#E63946] hover:bg-[#d32f3f]" onClick={() => window.print()}>
            <FileText className="h-4 w-4 mr-2" />
            Generate PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
