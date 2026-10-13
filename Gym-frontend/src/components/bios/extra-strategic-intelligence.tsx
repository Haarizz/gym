import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Separator } from "../ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, ScatterChart, Scatter } from 'recharts';
import {
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  MapPin,
  Users,
  Award,
  Crown,
  Medal,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Tag,
  Percent,
  Package,
  ShoppingBag,
  Coffee,
  Dumbbell,
  TrendingUpDown,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Map,
  Globe,
  Zap,
  Megaphone,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Star,
  MessageSquare,
  AlertCircle,
  XCircle,
  Smile,
  Frown,
  Meh,
  TrendingUpIcon,
  ChevronRight,
  Eye,
  Download,
  Share2,
  Filter,
  Search,
  Calendar,
  Clock,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Send,
  BarChart2,
  LineChart as LineChartIcon
} from 'lucide-react';
import { type BiosLiveData, useBiosInsights, InsightsStatus, NoData, shareOf } from './bios-live';
import { biosInsightsService } from '../../utils/supabase/bios-insights-service';

interface ExtraStrategicIntelligenceProps {
  formatCurrency: (amount: number) => string;
  getCurrentPeriod: () => string;
  live: BiosLiveData;
}

export function ExtraStrategicIntelligence({ formatCurrency, getCurrentPeriod, live }: ExtraStrategicIntelligenceProps) {
  // Real per-branch snapshot (only returned while viewing "All Branches").
  const liveBranches = [...live.branchComparison].sort((a, b) => b.month_revenue - a.month_revenue);
  const [activeModule, setActiveModule] = useState('branch-comparison');

  // Marketing (last 12 months) and member feedback, loaded when this view is shown.
  const { data: marketing, loading: marketingLoading, error: marketingError } =
    useBiosInsights(() => biosInsightsService.getMarketing(365), true, live.branchKey);
  const { data: memberInsights, loading: membersLoading, error: membersError } =
    useBiosInsights(() => biosInsightsService.getMembers(), true, live.branchKey);
  const leadSources = marketing?.lead_sources ?? [];
  const totalLeads = leadSources.reduce((sum, row) => sum + row.leads, 0);
  const totalConverted = leadSources.reduce((sum, row) => sum + row.converted, 0);
  const promotions = marketing?.promotions ?? [];
  const referrals = marketing?.referrals;
  const satisfaction = memberInsights?.satisfaction;
  const returnScore = satisfaction?.return_score;
  const ratingRows = satisfaction ? [
    { label: 'Overall experience', value: satisfaction.overall },
    { label: 'Trainers', value: satisfaction.trainer },
    { label: 'Equipment', value: satisfaction.equipment },
    { label: 'Facilities', value: satisfaction.facility },
    { label: 'App reviews', value: satisfaction.reviews.average }
  ].filter((row): row is { label: string; value: number } => row.value != null) : [];

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-orange-500" />;
      default:
        return <Award className="h-5 w-5 text-blue-500" />;
    }
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <ArrowUpRight className="h-4 w-4" />;
    if (trend < 0) return <ArrowDownRight className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getOpportunityColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 70) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getPerformanceBadge = (performance: string) => {
    switch (performance) {
      case 'Outstanding':
        return <Badge className="bg-purple-100 text-purple-800">Outstanding</Badge>;
      case 'Excellent':
        return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
      case 'Good':
        return <Badge className="bg-blue-100 text-blue-800">Good</Badge>;
      default:
        return <Badge variant="outline">Average</Badge>;
    }
  };

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment >= 90) return <Smile className="h-5 w-5 text-green-600" />;
    if (sentiment >= 70) return <Meh className="h-5 w-5 text-yellow-600" />;
    return <Frown className="h-5 w-5 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Module Navigation */}
      <Tabs value={activeModule} onValueChange={setActiveModule} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 gap-1 h-auto p-1 bg-white shadow-sm">
          <TabsTrigger value="branch-comparison" className="text-xs">
            <Building2 className="h-4 w-4 mr-1" />
            Branch Comparison
          </TabsTrigger>
          <TabsTrigger value="marketing" className="text-xs">
            <Megaphone className="h-4 w-4 mr-1" />
            Marketing & Leads
          </TabsTrigger>
          <TabsTrigger value="nps" className="text-xs">
            <Heart className="h-4 w-4 mr-1" />
            NPS & Satisfaction
          </TabsTrigger>
        </TabsList>

        {/* 1. Branch-to-Branch Comparison */}
        <TabsContent value="branch-comparison" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-[#2B7A78]" />
                Your Branches — This Month
              </CardTitle>
              <CardDescription>
                {liveBranches.length > 0
                  ? 'Live snapshot across your branches, ranked by revenue'
                  : 'Switch the branch selector to "All Branches" to compare your locations'}
              </CardDescription>
            </CardHeader>
            {liveBranches.length > 0 && (
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead className="text-right">Total Members</TableHead>
                      <TableHead className="text-right">Active Members</TableHead>
                      <TableHead className="text-right">Retention</TableHead>
                      <TableHead className="text-right">Revenue (Month)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liveBranches.map((row, index) => (
                      <TableRow key={row.branch_id}>
                        <TableCell>{getRankBadge(index + 1)}</TableCell>
                        <TableCell className="font-medium">
                          {row.branch_name} <span className="text-xs text-muted-foreground">({row.branch_code})</span>
                        </TableCell>
                        <TableCell className="text-right">{row.total_members.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{row.active_members.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{row.retention_percent}%</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(row.month_revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>

        </TabsContent>

        {/* Marketing & Leads */}
        <TabsContent value="marketing" className="space-y-6">
          <InsightsStatus loading={marketingLoading} error={marketingError} />
          {marketing && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Leads (12 months)</p>
                  <p className="text-2xl font-bold">{totalLeads}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Became Members</p>
                  <p className="text-2xl font-bold text-green-600">{totalConverted}</p>
                  <p className="text-xs text-muted-foreground mt-1">{shareOf(totalConverted, totalLeads)}% conversion</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Promotion Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(promotions.reduce((sum, p) => sum + p.revenue, 0))}</p>
                  <p className="text-xs text-muted-foreground mt-1">{promotions.reduce((sum, p) => sum + p.redemptions, 0)} redemptions</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Successful Referrals</p>
                  <p className="text-2xl font-bold">{referrals?.successful ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">of {referrals?.total ?? 0} referrals</p>
                </CardContent></Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#2B7A78]" />
                    Lead Sources
                  </CardTitle>
                  <CardDescription>Where leads came from in the last 12 months, and how many joined</CardDescription>
                </CardHeader>
                <CardContent>
                  {leadSources.length === 0 && <NoData>No leads recorded in the last 12 months.</NoData>}
                  {leadSources.length > 0 && (
                    <>
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
                          {leadSources.map((row) => (
                            <TableRow key={row.source}>
                              <TableCell className="font-medium">{row.source}</TableCell>
                              <TableCell className="text-right">{row.leads}</TableCell>
                              <TableCell className="text-right">{row.converted}</TableCell>
                              <TableCell className="text-right">{shareOf(row.converted, row.leads)}%</TableCell>
                              <TableCell className="text-right">{row.avg_ltv_converted != null ? formatCurrency(row.avg_ltv_converted) : '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={leadSources}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="source" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="leads" fill="#3b82f6" name="Leads" />
                          <Bar dataKey="converted" fill="#10b981" name="Became members" />
                        </BarChart>
                      </ResponsiveContainer>
                    </>
                  )}
                  <p className="text-xs text-muted-foreground mt-3">Ad spend isn't recorded in GymBios, so cost per lead and ROI can't be shown.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-[#E63946]" />
                    Promotions
                  </CardTitle>
                  <CardDescription>Campaigns running in the last 12 months, with redemptions in that period</CardDescription>
                </CardHeader>
                <CardContent>
                  {promotions.length === 0 && <NoData>No promotions in the last 12 months.</NoData>}
                  {promotions.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Promotion</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Redemptions</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Discount Given</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {promotions.map((promotion, index) => (
                          <TableRow key={`${promotion.name}-${index}`}>
                            <TableCell className="font-medium">{promotion.name}</TableCell>
                            <TableCell><Badge variant="outline">{promotion.status}</Badge></TableCell>
                            <TableCell className="text-right">{promotion.redemptions}</TableCell>
                            <TableCell className="text-right">{formatCurrency(promotion.revenue)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(promotion.savings)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {referrals && referrals.total > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Referral Program</CardTitle>
                    <CardDescription>Last 12 months</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><p className="text-muted-foreground">Successful</p><p className="text-xl font-bold text-green-600">{referrals.successful}</p></div>
                      <div><p className="text-muted-foreground">Pending</p><p className="text-xl font-bold">{referrals.pending}</p></div>
                      <div><p className="text-muted-foreground">Rewards Earned</p><p className="text-xl font-bold">{formatCurrency(referrals.rewards)}</p></div>
                      <div><p className="text-muted-foreground">Referred Purchases</p><p className="text-xl font-bold">{formatCurrency(referrals.purchase_value)}</p></div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* NPS & Customer Satisfaction */}
        <TabsContent value="nps" className="space-y-6">
          <InsightsStatus loading={membersLoading} error={membersError} />
          {satisfaction && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-[#E63946]" />
                      Return-Likelihood Score
                    </CardTitle>
                    <CardDescription>NPS method on members' "how likely are you to come back?" (1–10), last 90 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {returnScore && returnScore.responses === 0 && <NoData>No post-workout feedback in the last 90 days.</NoData>}
                    {returnScore && returnScore.responses > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-end gap-3">
                          <p className="text-5xl font-bold text-[#2B7A78]">{returnScore.score}</p>
                          <p className="text-sm text-muted-foreground pb-2">
                            {returnScore.previous_score != null
                              ? `${(returnScore.score ?? 0) - returnScore.previous_score >= 0 ? '+' : ''}${((returnScore.score ?? 0) - returnScore.previous_score).toFixed(1)} vs previous 90 days`
                              : `${returnScore.responses} responses`}
                          </p>
                        </div>
                        {[
                          { label: 'Promoters (9–10)', count: returnScore.promoters, color: 'text-green-600' },
                          { label: 'Passives (7–8)', count: returnScore.passives, color: 'text-yellow-600' },
                          { label: 'Detractors (1–6)', count: returnScore.detractors, color: 'text-red-600' }
                        ].map((band) => (
                          <div key={band.label}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className={band.color}>{band.label}</span>
                              <span className="font-medium">{band.count} ({shareOf(band.count, returnScore.responses)}%)</span>
                            </div>
                            <Progress value={shareOf(band.count, returnScore.responses)} className="h-2" />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      Satisfaction Ratings
                    </CardTitle>
                    <CardDescription>{satisfaction.responses} post-workout ratings (90 days) · {satisfaction.reviews.count} app reviews</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {ratingRows.length === 0 && <NoData>No ratings yet.</NoData>}
                    <div className="space-y-3">
                      {ratingRows.map((row) => (
                        <div key={row.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{row.label}</span>
                            <span className="font-medium">{row.value}/5</span>
                          </div>
                          <Progress value={(row.value / 5) * 100} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {satisfaction.reviews.count > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">App Review Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={satisfaction.reviews.distribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#f59e0b" name="Reviews" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-[#2B7A78]" />
                    Recent Comments
                  </CardTitle>
                  <CardDescription>Latest written feedback from post-workout ratings</CardDescription>
                </CardHeader>
                <CardContent>
                  {satisfaction.recent_comments.length === 0 && <NoData>No written feedback yet.</NoData>}
                  <div className="space-y-3">
                    {satisfaction.recent_comments.map((comment, index) => (
                      <div key={index} className="p-3 border rounded">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{new Date(`${comment.date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          {comment.rating != null && <span>{comment.rating}/5</span>}
                        </div>
                        <p className="text-sm">{comment.comment}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
