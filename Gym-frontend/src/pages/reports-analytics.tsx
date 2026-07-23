import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrency, CurrencyGlyph } from "../utils/currency";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Users, Calendar, DollarSign, Download, Filter, RefreshCw, BarChart3, FileText, TrendingUp, Activity } from 'lucide-react';
import { toast } from "sonner";
import { membersService, Member as MemberApi } from "../utils/supabase/members-service";
import { receiptsService, Receipt } from "../utils/supabase/receipts-service";
import { attendanceService, AttendanceStats } from "../utils/supabase/attendance-service";
import { dashboardService, ClassAttendance as DashboardClassAttendance } from "../utils/supabase/dashboard-service";

interface ReportsAnalyticsProps {
  onNavigate?: (section: string) => void;
}

type MembershipTrendPoint = { month: string; monthKey: string; newMembers: number; cancelledMembers: number; totalMembers: number };
type RevenueBucket = { name: string; value: number; amount: number; color: string };
type PeakHourPoint = { hour: string; usage: number };
type DemographicPoint = { ageGroup: string; count: number; percentage: number };

export function ReportsAnalytics({ onNavigate }: ReportsAnalyticsProps = {}) {
  const { currencyCode } = useCurrency();
  const statCardShell =
    "bg-white border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none";
  const panelCardShell = "bg-white border-0 shadow-sm";
  const tabContentShell = "space-y-6 animate-in fade-in-0 zoom-in-95 duration-200";

  const [members, setMembers] = useState<MemberApi[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [classAttendance, setClassAttendance] = useState<DashboardClassAttendance[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersResp, receiptsResp, att, classAttResp] = await Promise.all([
        membersService.getMembers({}, { page: 1, limit: 2000 }),
        receiptsService.getReceipts({}, { page: 1, limit: 5000 }),
        attendanceService.getAttendanceStats(),
        dashboardService.getClassAttendance().catch(() => ({ success: true, data: [] as any[] })),
      ]);

      setMembers(membersResp.members ?? []);
      setReceipts(receiptsResp.receipts ?? []);
      setAttendanceStats(att);

      const raw = (classAttResp as any)?.data ?? classAttResp;
      setClassAttendance(Array.isArray(raw) ? raw : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load reports data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const membershipTrends: MembershipTrendPoint[] = useMemo(() => {
    const now = new Date();
    const months: { label: string; key: string; start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString(undefined, { month: "short" });
      months.push({ label, key, start, end });
    }

    const parseMemberDate = (m: MemberApi) => {
      const raw = m.join_date || m.created_at;
      const dt = raw ? new Date(raw) : null;
      return dt && !Number.isNaN(dt.getTime()) ? dt : null;
    };

    const parseUpdatedDate = (m: MemberApi) => {
      const dt = m.updated_at ? new Date(m.updated_at) : null;
      return dt && !Number.isNaN(dt.getTime()) ? dt : null;
    };

    const isCancelledStatus = (s: string | undefined) =>
      s === "inactive" || s === "expired" || s === "suspended" || s === "frozen";

    return months.map(({ label, key, start, end }) => {
      const newMembers = members.filter((m) => {
        const dt = parseMemberDate(m);
        return dt ? dt >= start && dt <= end : false;
      }).length;

      const cancelledMembers = members.filter((m) => {
        if (!isCancelledStatus(m.membership_status)) return false;
        const dt = parseUpdatedDate(m);
        return dt ? dt >= start && dt <= end : false;
      }).length;

      const totalMembers = members.filter((m) => {
        const dt = parseMemberDate(m);
        return dt ? dt <= end : false;
      }).length;

      return { month: label, monthKey: key, newMembers, cancelledMembers, totalMembers };
    });
  }, [members]);

  const revenueBreakdown: RevenueBucket[] = useMemo(() => {
    const buckets: Record<string, number> = {};
    const total = receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const normalizeCategory = (r: Receipt) => {
      const t = (r.transaction_type || "").toLowerCase();
      const plan = (r.plan_name || "").toLowerCase();
      if (t.includes("renew") || t.includes("upgrade") || t.includes("new member") || plan.includes("membership")) return "Memberships";
      if (t.includes("training") || plan.includes("pt") || plan.includes("personal")) return "Personal Training";
      if (t.includes("class") || plan.includes("class")) return "Group Classes";
      if (t.includes("pos") || t.includes("product") || plan.includes("product")) return "Merchandise";
      if (t.includes("add-on") || t.includes("addon") || plan.includes("add")) return "Other Services";
      return "Other Services";
    };

    receipts.forEach((r) => {
      const cat = normalizeCategory(r);
      buckets[cat] = (buckets[cat] || 0) + (Number(r.amount) || 0);
    });

    const colors: Record<string, string> = {
      Memberships: "#2B7A78",
      "Personal Training": "#3b82f6",
      "Group Classes": "#f59e0b",
      Merchandise: "#8b5cf6",
      "Other Services": "#64748b",
    };

    return Object.entries(buckets)
      .map(([name, amount]) => ({
        name,
        amount,
        value: total > 0 ? Math.round((amount / total) * 100) : 0,
        color: colors[name] ?? "#64748b",
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [receipts]);

  const revenueTrend = useMemo(() => {
    const sums: Record<string, number> = {};
    receipts.forEach((r) => {
      const raw = r.transaction_date;
      const dt = raw ? new Date(raw) : null;
      if (!dt || Number.isNaN(dt.getTime())) return;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      sums[key] = (sums[key] || 0) + (Number(r.amount) || 0);
    });
    return membershipTrends.map((m) => ({
      month: m.month,
      revenue: Math.round(sums[m.monthKey] || 0),
    }));
  }, [receipts, membershipTrends]);

  const peakHours: PeakHourPoint[] = useMemo(() => {
    const peak = attendanceStats?.peakHours ?? {};
    const entries = Object.entries(peak);
    const sorted = entries.sort((a, b) => {
      const ah = Number.parseInt(a[0], 10);
      const bh = Number.parseInt(b[0], 10);
      return (Number.isNaN(ah) ? 0 : ah) - (Number.isNaN(bh) ? 0 : bh);
    });
    return sorted.map(([hour, usage]) => ({ hour, usage }));
  }, [attendanceStats]);

  const memberDemographics: DemographicPoint[] = useMemo(() => {
    const ages: number[] = [];
    const now = new Date();
    members.forEach((m) => {
      const dob = (m as any).date_of_birth;
      if (!dob) return;
      const dt = new Date(dob);
      if (Number.isNaN(dt.getTime())) return;
      const age = Math.floor((now.getTime() - dt.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age > 0 && age < 100) ages.push(age);
    });
    if (ages.length === 0) return [];
    const groups = [
      { label: "18-25", min: 18, max: 25 },
      { label: "26-35", min: 26, max: 35 },
      { label: "36-45", min: 36, max: 45 },
      { label: "46-55", min: 46, max: 55 },
      { label: "55+", min: 56, max: 120 },
    ];
    return groups.map((g) => {
      const count = ages.filter((a) => a >= g.min && a <= g.max).length;
      const percentage = Math.round((count / ages.length) * 100);
      return { ageGroup: g.label, count, percentage };
    });
  }, [members]);

  const kpiData = useMemo(() => {
    const totalMembers = members.length;
    const activeMembers = members.filter((m) => m.membership_status === "active").length;
    const retention = totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0;
    const totalRevenue = receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const arpm = activeMembers > 0 ? totalRevenue / activeMembers : 0;
    const classUtil = classAttendance.length > 0
      ? classAttendance.reduce((s, x) => s + (x.percentage || 0), 0) / classAttendance.length
      : 0;
    const todayAttendance = attendanceStats?.totalToday ?? 0;

    return [
      {
        title: "Member Retention",
        value: `${retention.toFixed(1)}%`,
        change: "",
        trend: "up",
        description: `${activeMembers.toLocaleString()} active members`,
        icon: Users,
        iconShell: "bg-emerald-50",
        iconColor: "text-emerald-600",
        valueColor: "text-emerald-700",
      },
      {
        title: "Avg Revenue / Member",
        value: `${currencyCode} ${Math.round(arpm).toLocaleString()}`,
        change: "",
        trend: "up",
        description: "From receipts data",
        icon: DollarSign,
        iconShell: "bg-blue-50",
        iconColor: "text-blue-600",
        valueColor: "text-blue-700",
      },
      {
        title: "Class Utilization",
        value: `${classUtil.toFixed(0)}%`,
        change: "",
        trend: "up",
        description: "Avg across classes",
        icon: Activity,
        iconShell: "bg-amber-50",
        iconColor: "text-amber-600",
        valueColor: "text-amber-700",
      },
      {
        title: "Today's Attendance",
        value: todayAttendance.toLocaleString(),
        change: "",
        trend: "up",
        description: "Check-ins today",
        icon: TrendingUp,
        iconShell: "bg-slate-50",
        iconColor: "text-slate-600",
        valueColor: "text-slate-700",
      },
    ];
  }, [members, receipts, classAttendance, attendanceStats]);

  const membershipMetrics = useMemo(() => {
    const total = members.length;
    const active = members.filter((m) => m.membership_status === "active").length;
    const retention = total > 0 ? (active / total) * 100 : 0;

    const avgVisitMinutes = attendanceStats?.averageDuration ?? 0;

    const lengths: number[] = [];
    members.forEach((m) => {
      const startRaw = (m as any).membership_start_date || m.join_date || m.created_at;
      const endRaw = (m as any).membership_end_date || m.expiry_date;
      if (!startRaw || !endRaw) return;
      const start = new Date(startRaw);
      const end = new Date(endRaw);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
      const months = Math.max(0, (end.getTime() - start.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
      if (months > 0 && months < 240) lengths.push(months);
    });
    const avgMembershipMonths = lengths.length > 0
      ? lengths.reduce((s, x) => s + x, 0) / lengths.length
      : 0;

    return {
      total,
      active,
      retention,
      avgVisitMinutes,
      avgMembershipMonths,
    };
  }, [members, attendanceStats]);

  if (loading && members.length === 0 && receipts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive business intelligence and performance metrics.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            size="sm"
            className="btn-primary shadow-sm hover:shadow-md transition-all"
            onClick={() => onNavigate?.('custom-reports')}
          >
            <FileText className="mr-2 h-4 w-4" />
            Custom Reports
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="shadow-sm hover:shadow-md transition-all"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
          <Button size="sm" variant="outline" className="shadow-sm hover:shadow-md transition-all">
            <Filter className="mr-2 h-4 w-4" />
            Custom Filter
          </Button>
          <Button size="sm" className="shadow-sm hover:shadow-md transition-all">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => (
          <Card key={index} className={statCardShell}>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-primary">{kpi.title}</CardTitle>
              <div className={`${kpi.iconShell} p-2 rounded-lg`}>
                <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${kpi.valueColor}`}>{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className={kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                  {kpi.change}
                </span>{' '}
                {kpi.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="membership">Membership</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="custom">Custom Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className={tabContentShell}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className={panelCardShell}>
              <CardHeader>
                <CardTitle>Membership Growth Trend</CardTitle>
                <CardDescription>Member acquisition and retention over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={membershipTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="totalMembers" stackId="1" stroke="#8884d8" fill="#8884d8" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className={panelCardShell}>
              <CardHeader>
                <CardTitle>Revenue Distribution</CardTitle>
                <CardDescription>Revenue breakdown by service type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={revenueBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {revenueBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className={panelCardShell}>
            <CardHeader>
              <CardTitle>Peak Usage Hours</CardTitle>
              <CardDescription>Gym utilization throughout the day</CardDescription>
            </CardHeader>
            <CardContent>
              {peakHours.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                  No attendance data available yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={peakHours}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="usage" fill="#2B7A78" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="membership" className={tabContentShell}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className={panelCardShell}>
              <CardHeader>
                <CardTitle>Member Acquisition vs Churn</CardTitle>
                <CardDescription>Monthly new members vs cancellations</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={membershipTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="newMembers" fill="#82ca9d" name="New Members" />
                    <Bar dataKey="cancelledMembers" fill="#ff7c7c" name="Cancelled" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className={panelCardShell}>
              <CardHeader>
                <CardTitle>Member Demographics</CardTitle>
                <CardDescription>Age distribution of members</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {memberDemographics.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-8 text-center">
                    Add member date-of-birth to see demographics.
                  </div>
                ) : (
                  memberDemographics.map((demo, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium">{demo.ageGroup}</span>
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${demo.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{demo.count}</span>
                        <Badge variant="secondary">{demo.percentage}%</Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card className={panelCardShell}>
            <CardHeader>
              <CardTitle>Membership Metrics</CardTitle>
              <CardDescription>Key membership performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{membershipMetrics.retention.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Retention Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{membershipMetrics.active.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Active Members</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {membershipMetrics.avgMembershipMonths > 0 ? `${membershipMetrics.avgMembershipMonths.toFixed(1)} mo` : "—"}
                  </div>
                  <div className="text-sm text-muted-foreground">Avg. Membership Length</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className={tabContentShell}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className={panelCardShell}>
                <CardHeader>
                  <CardTitle>Revenue Trends</CardTitle>
                  <CardDescription>Monthly revenue by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="revenue" stroke="#2B7A78" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className={panelCardShell}>
              <CardHeader>
                <CardTitle>Revenue Summary</CardTitle>
                <CardDescription>This month's performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {revenueBreakdown.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-8 text-center">
                    No receipts found yet.
                  </div>
                ) : (
                  revenueBreakdown.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{item.name}</span>
                      <div className="text-right">
                        <div className="font-medium"><CurrencyGlyph /> {Math.round(item.amount).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">{item.value}%</div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations" className={tabContentShell}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className={panelCardShell}>
              <CardHeader>
                <CardTitle>Class Attendance</CardTitle>
                <CardDescription>Latest attendance distribution by class</CardDescription>
              </CardHeader>
              <CardContent>
                {classAttendance.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                    No class attendance data available yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={classAttendance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="class" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="percentage" fill="#2B7A78" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className={panelCardShell}>
              <CardHeader>
                <CardTitle>Operational Metrics</CardTitle>
                <CardDescription>Live stats from attendance and receipts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Today Attendance</span>
                    <span className="text-sm font-medium">{attendanceStats?.totalToday ?? 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${membershipMetrics.total > 0 ? Math.min(100, ((attendanceStats?.totalToday ?? 0) / membershipMetrics.total) * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Avg Visit Duration</span>
                    <span className="text-sm font-medium">{membershipMetrics.avgVisitMinutes ? `${membershipMetrics.avgVisitMinutes} min` : "—"}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (membershipMetrics.avgVisitMinutes / 120) * 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Receipts Loaded</span>
                    <span className="text-sm font-medium">{receipts.length.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (receipts.length / 5000) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="custom" className={tabContentShell}>
          <Card className={panelCardShell}>
            <CardHeader>
              <CardTitle>Custom Report Builder</CardTitle>
              <CardDescription>Create custom reports and analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <Select defaultValue="month">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Last 7 days</SelectItem>
                      <SelectItem value="month">Last 30 days</SelectItem>
                      <SelectItem value="quarter">Last 3 months</SelectItem>
                      <SelectItem value="year">Last 12 months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Report Type</label>
                  <Select defaultValue="revenue">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Revenue Analysis</SelectItem>
                      <SelectItem value="membership">Membership Report</SelectItem>
                      <SelectItem value="attendance">Class Attendance</SelectItem>
                      <SelectItem value="equipment">Equipment Usage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Format</label>
                  <Select defaultValue="pdf">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Report</SelectItem>
                      <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                      <SelectItem value="csv">CSV Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <Button className="shadow-sm hover:shadow-md transition-all" onClick={() => onNavigate?.("custom-reports")}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Generate Report
                </Button>
                <Button variant="outline" className="shadow-sm hover:shadow-md transition-all">
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Report
                </Button>
              </div>

              <div className="mt-8 text-center py-8 text-muted-foreground bg-gray-50 rounded-xl">
                <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Advanced Report Builder</h3>
                <p>Create custom reports with drag-and-drop functionality and advanced filtering options. This feature is under development.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

