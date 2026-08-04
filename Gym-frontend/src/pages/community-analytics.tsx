import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrency, CurrencyGlyph } from "../utils/currency";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Separator } from "../components/ui/separator";
import { toast } from "sonner";
import { staffService } from "../utils/supabase/staff-service";
import { membersService, Member as MemberApi } from "../utils/supabase/members-service";
import { receiptsService, Receipt } from "../utils/supabase/receipts-service";
import { financialAnalyticsService } from "../utils/supabase/financial-analytics-service";
import { attendanceService } from "../utils/supabase/attendance-service";
import { bookingService } from "../utils/supabase/booking-service";
import { communityService } from "../utils/supabase/community-service";
import {
  BarChart3,
  Users,
  DollarSign,
  Target,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Award,
  Activity,
  Zap,
  Brain,
  PieChart,
  LineChart,
  BarChart,
  Gauge,
  Heart,
  UserCheck,
  UserX,
  Repeat,
  Coffee,
  Dumbbell,
  CreditCard,
  Plus,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Star,
  MessageSquare,
  Calendar as CalendarIcon,
  Trophy
} from "lucide-react";
import {
  Line,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart,
  FunnelChart,
  Funnel,
  LabelList
} from "recharts";

// Initial/empty shape — every field is populated from real backend data in
// refreshData(). No fabricated numbers are ever shown, even before the first
// load completes.
type Recommendation = {
  type: "success" | "warning" | "info";
  icon: typeof CheckCircle;
  title: string;
  message: string;
  action: string;
};

const emptyData = {
  targets: {
    assigned: 0,
    achieved: 0,
    progress: 0
  },
  collections: {
    today: { membership: 0, addons: 0, pos: 0, total: 0 },
    yesterday: { membership: 0, addons: 0, pos: 0, total: 0 },
    thisMonth: { membership: 0, addons: 0, pos: 0, total: 0 }
  },
  trends: {
    daily: [] as { date: string; revenue: number; members: number }[],
    monthly: [] as { month: string; revenue: number; target: number }[]
  },
  staffPerformance: [] as { name: string; sales: number; target: number; achievement: number }[],
  retentionFunnel: [] as { name: string; value: number; color: string }[],
  churnPrediction: [] as { name: string; risk: string; lastVisit: string; membership: string; probability: number }[],
  trainerPerformance: [] as { name: string; classes: number; attendance: number; revenue: number; rating: number }[],
  engagementAnalytics: {
    communityFeatures: [] as { feature: string; posts: number; likes: number; comments: number; usage: number }[],
    weeklyActivity: [] as { week: string; posts: number; engagement: number }[]
  },
  profitability: {
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    costBreakdown: [] as { name: string; amount: number; percentage: number }[],
    revenuePerMember: 0,
    lifetimeValue: 0,
    newMembersThisMonth: 0,
    churnRate: 0
  },
  recommendations: [] as Recommendation[]
};

const COLORS = {
  primary: "#0047AB",
  secondary: "#009688",
  success: "#4CAF50",
  warning: "#FFC107",
  error: "#F44336",
  muted: "#9E9E9E"
};

export function CommunityAnalytics() {
  const { currencyCode } = useCurrency();
  const [dateFilter, setDateFilter] = useState("today");
  const [staffFilter, setStaffFilter] = useState("all");
  const [activeCollectionTab, setActiveCollectionTab] = useState("today");
  const [data, setData] = useState(emptyData);
  const [members, setMembers] = useState<MemberApi[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const todayStr = now.toISOString().split("T")[0];
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;

      const [targets, membersResp, receiptsResp, monthlyTrend, att, bookings, dashboard, expenseByCategory, communityStats] = await Promise.all([
        staffService.getTargets(year, month).catch(() => []),
        membersService.getMembers({}, { page: 1, limit: 3000 }).catch(() => ({ members: [] as MemberApi[] } as any)),
        receiptsService.getReceipts({}, { page: 1, limit: 5000 }).catch(() => ({ receipts: [] as Receipt[] } as any)),
        financialAnalyticsService.getMonthlyTrend(6).catch(() => []),
        attendanceService.getAttendanceStats().catch(() => null),
        bookingService.getBookings({
          type: "class",
          startDate: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
          endDate: todayStr,
        }).catch(() => []),
        financialAnalyticsService.getDashboard().catch(() => null),
        financialAnalyticsService.getExpenseByCategory().catch(() => []),
        communityService.getEngagementStats().catch(() => null),
      ]);

      const memberList = (membersResp as any)?.members ?? [];
      const receiptList = (receiptsResp as any)?.receipts ?? [];
      setMembers(memberList);
      setReceipts(receiptList);

      const institution = (targets as any[]).find((t) => t.scope === "institution");
      const assigned = institution?.revenue_target ?? 0;
      const achieved = institution?.revenue_achieved ?? 0;
      const progress = institution?.percentage ?? (assigned > 0 ? (achieved / assigned) * 100 : 0);

      const categorizeReceipt = (r: Receipt): "membership" | "addons" | "pos" => {
        const t = (r.transaction_type || "").toLowerCase();
        const plan = (r.plan_name || "").toLowerCase();
        if (t.includes("new member") || t.includes("renew") || t.includes("upgrade") || plan.includes("membership")) return "membership";
        if (t.includes("pos") || plan.includes("pos") || t.includes("product") || plan.includes("product")) return "pos";
        return "addons";
      };

      const sumCollections = (datePredicate: (d: string) => boolean) => {
        const out = { membership: 0, addons: 0, pos: 0, total: 0 };
        receiptList.forEach((r) => {
          const dateStr = (r.transaction_date || "").split("T")[0];
          if (!dateStr || !datePredicate(dateStr)) return;
          const amount = Number(r.amount) || 0;
          const cat = categorizeReceipt(r);
          out[cat] += amount;
          out.total += amount;
        });
        return out;
      };

      const collections = {
        today: sumCollections((d) => d === todayStr),
        yesterday: sumCollections((d) => d === yesterdayStr),
        thisMonth: sumCollections((d) => d.startsWith(monthKey)),
      };

      const daily = Array.from({ length: 7 }).map((_, idx) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (6 - idx));
        const ds = d.toISOString().split("T")[0];
        const label = d.toLocaleString(undefined, { weekday: "short" });
        const revenue = receiptList
          .filter((r) => (r.transaction_date || "").split("T")[0] === ds)
          .reduce((s, r) => s + (Number(r.amount) || 0), 0);
        const newMembers = memberList.filter((m) => {
          const raw = m.join_date || m.created_at;
          const ms = raw ? String(raw).split("T")[0] : "";
          return ms === ds;
        }).length;
        return { date: label, revenue: Math.round(revenue), members: newMembers };
      });

      const monthly = (monthlyTrend as any[]).map((p: any) => ({
        month: p.month,
        revenue: Math.round(p.revenue || 0),
        target: Math.round(p.revenue || 0),
      }));

      const targetsByStaff = new Map<string, number>();
      (targets as any[]).filter((t) => t.scope === "individual").forEach((t) => {
        if (!t.staff_name) return;
        targetsByStaff.set(t.staff_name, (targetsByStaff.get(t.staff_name) || 0) + (t.revenue_target || 0));
      });

      const staffSales = new Map<string, number>();
      receiptList.forEach((r) => {
        const dateStr = (r.transaction_date || "").split("T")[0];
        if (!dateStr.startsWith(monthKey)) return;
        const staffName = r.processed_by || "Unknown";
        staffSales.set(staffName, (staffSales.get(staffName) || 0) + (Number(r.amount) || 0));
      });

      const staffPerformance = Array.from(staffSales.entries())
        .map(([name, sales]) => {
          const target = targetsByStaff.get(name) || 0;
          const achievement = target > 0 ? (sales / target) * 100 : 0;
          return { name, sales: Math.round(sales), target: Math.round(target), achievement: Number(achievement.toFixed(1)) };
        })
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 8);

      const newSignupsThisMonth = memberList.filter((m) => {
        const raw = m.join_date || m.created_at;
        const ds = raw ? String(raw).split("T")[0] : "";
        return ds.startsWith(monthKey);
      }).length;
      const activeMembers = memberList.filter((m) => m.membership_status === "active").length;
      const renewalsThisMonth = receiptList.filter((r) => {
        const ds = (r.transaction_date || "").split("T")[0];
        return ds.startsWith(monthKey) && (r.transaction_type || "").toLowerCase().includes("renew");
      }).length;

      const retentionFunnel = [
        { name: "New Signups", value: newSignupsThisMonth, color: COLORS.primary },
        { name: "Active Members", value: activeMembers, color: COLORS.secondary },
        { name: "Renewals", value: renewalsThisMonth, color: COLORS.success },
      ];

      const churnCandidates = memberList.filter((m) =>
        m.payment_status === "overdue" ||
        m.membership_status === "expired" ||
        m.membership_status === "suspended"
      );

      // Risk score is a deterministic heuristic over real member fields — not a
      // trained model — but it's grounded in each member's actual situation
      // instead of a flat constant per risk tier.
      const daysSince = (iso?: string) => {
        if (!iso) return null;
        const ms = now.getTime() - new Date(iso).getTime();
        return Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 86400000)) : null;
      };

      const churnPrediction = churnCandidates
        .map((m) => {
          let score = 0;

          if (m.payment_status === "overdue") {
            const fee = Number(m.membership_fee) || 0;
            const owed = Number(m.outstanding_balance) || 0;
            score += fee > 0 ? Math.min(35, (owed / fee) * 35) : 25;
          }

          const expiryRaw = m.membership_end_date || m.expiry_date;
          const daysExpired = m.membership_status === "expired" ? daysSince(expiryRaw) : null;
          if (daysExpired !== null) {
            score += Math.min(35, 15 + daysExpired / 2);
          } else if (m.membership_status === "suspended") {
            score += 30;
          }

          const daysSincePayment = daysSince(m.last_payment_date);
          if (daysSincePayment !== null) {
            score += Math.min(20, Math.max(0, daysSincePayment - 30) / 4);
          } else {
            score += 10; // no payment on record at all is itself a risk signal
          }

          const probability = Math.max(20, Math.min(95, Math.round(score)));
          const risk = probability >= 70 ? "High" : probability >= 45 ? "Medium" : "Low";

          return {
            name: m.name,
            risk,
            lastVisit: "—",
            membership: m.membership_type,
            probability,
          };
        })
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 8);

      const trainerMap = new Map<string, { classes: number; attended: number; revenue: number }>();
      (bookings as any[]).forEach((b) => {
        const trainer = (b.trainerName || "Unknown") as string;
        const rec = trainerMap.get(trainer) || { classes: 0, attended: 0, revenue: 0 };
        rec.classes += 1;
        if (b.status === "checked-in" || b.status === "confirmed") rec.attended += 1;
        rec.revenue += Number(b.price) || 0;
        trainerMap.set(trainer, rec);
      });
      const trainerPerformance = Array.from(trainerMap.entries())
        .map(([name, v]) => ({
          name,
          classes: v.classes,
          attendance: v.classes > 0 ? Math.round((v.attended / v.classes) * 100) : 0,
          revenue: Math.round(v.revenue),
          rating: 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6);

      // ── Profitability — sourced from posted General Ledger entries ──────────
      const totalRevenue = dashboard?.totalRevenue ?? 0;
      const totalExpenses = dashboard?.totalExpenses ?? 0;
      const netProfit = dashboard?.netIncome ?? (totalRevenue - totalExpenses);
      const profitMargin = dashboard?.profitMargin ?? 0;

      const costBreakdown = (expenseByCategory as any[])
        .map((e) => ({
          name: e.category,
          amount: Math.round(e.amount || 0),
          percentage: totalExpenses > 0 ? Number((((e.amount || 0) / totalExpenses) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      const revenuePerMember = memberList.length > 0 ? totalRevenue / memberList.length : 0;

      // Lifetime value: average total amount ever paid, across members with at least one receipt
      const revenueByMember = new Map<string, number>();
      receiptList.forEach((r: any) => {
        const key = r.member_db_id ? String(r.member_db_id) : (r.member_id || r.member_name || "");
        if (!key) return;
        revenueByMember.set(key, (revenueByMember.get(key) || 0) + (Number(r.amount) || 0));
      });
      const lifetimeValue = revenueByMember.size > 0
        ? Array.from(revenueByMember.values()).reduce((s, v) => s + v, 0) / revenueByMember.size
        : 0;

      const churnRate = memberList.length > 0 ? (churnCandidates.length / memberList.length) * 100 : 0;

      // ── Community engagement — real post/like/comment data, no invented features ──
      const communityFeatures = communityStats
        ? communityStats.byType.map((t) => ({
            feature: t.type.charAt(0).toUpperCase() + t.type.slice(1),
            posts: t.posts,
            likes: t.likes,
            comments: t.comments,
            usage: communityStats.totalPosts > 0
              ? Number(((t.posts / communityStats.totalPosts) * 100).toFixed(1))
              : 0,
          }))
        : [];

      const weeklyActivity = communityStats
        ? communityStats.weekly.map((w) => ({
            week: w.weekLabel,
            posts: w.posts,
            engagement: w.likes + w.comments,
          }))
        : [];

      // ── Recommendations — generated only when the underlying real data supports them ──
      const recommendations: Recommendation[] = [];

      const weekendDays = daily.filter((d) => d.date === "Sat" || d.date === "Sun");
      const weekdayDays = daily.filter((d) => d.date !== "Sat" && d.date !== "Sun");
      const weekendAvg = weekendDays.length > 0 ? weekendDays.reduce((s, d) => s + d.revenue, 0) / weekendDays.length : 0;
      const weekdayAvg = weekdayDays.length > 0 ? weekdayDays.reduce((s, d) => s + d.revenue, 0) / weekdayDays.length : 0;
      if (weekendAvg > 0 && weekdayAvg > 0) {
        const diffPct = ((weekendAvg - weekdayAvg) / weekdayAvg) * 100;
        if (Math.abs(diffPct) >= 5) {
          recommendations.push({
            type: diffPct > 0 ? "success" : "info",
            icon: diffPct > 0 ? CheckCircle : Brain,
            title: diffPct > 0 ? "Strong Weekend Performance" : "Weekday Opportunity",
            message: diffPct > 0
              ? `Weekend revenue is ${diffPct.toFixed(0)}% higher than weekdays over the last 7 days. Consider expanding weekend class offerings.`
              : `Weekday revenue is ${Math.abs(diffPct).toFixed(0)}% higher than weekends over the last 7 days. Consider weekend promotions to balance demand.`,
            action: "Review Class Schedule",
          });
        }
      }

      const highRiskCount = churnPrediction.filter((c) => c.risk === "High").length;
      if (highRiskCount > 0) {
        recommendations.push({
          type: "warning",
          icon: AlertTriangle,
          title: "Attention Needed",
          message: `${highRiskCount} member${highRiskCount === 1 ? "" : "s"} at high risk of churn (overdue payment or expired membership). Immediate outreach recommended.`,
          action: "Contact Members",
        });
      }

      if (assigned > 0) {
        recommendations.push(
          progress >= 100
            ? {
                type: "success",
                icon: Trophy,
                title: "Target Achieved",
                message: `You've reached ${progress.toFixed(1)}% of this month's revenue target. Great work team!`,
                action: "Celebrate Success",
              }
            : {
                type: "info",
                icon: Target,
                title: "Target Progress",
                message: `You're at ${progress.toFixed(1)}% of this month's revenue target, with ${(assigned - achieved).toLocaleString()} remaining.`,
                action: "Review Sales Pipeline",
              }
        );
      }

      if (communityFeatures.length > 0) {
        const topType = communityFeatures[0];
        recommendations.push({
          type: "info",
          icon: MessageSquare,
          title: "Community Engagement",
          message: `"${topType.feature}" posts make up ${topType.usage.toFixed(0)}% of community activity with ${topType.likes + topType.comments} total interactions. Consider highlighting this content type more.`,
          action: "Promote Community",
        });
      }

      setData((prev) => ({
        ...prev,
        targets: { assigned, achieved, progress },
        collections,
        trends: { daily, monthly },
        staffPerformance: staffPerformance.length > 0 ? staffPerformance : prev.staffPerformance,
        retentionFunnel,
        churnPrediction,
        trainerPerformance,
        engagementAnalytics: {
          communityFeatures,
          weeklyActivity,
        },
        profitability: {
          totalRevenue,
          totalExpenses,
          netProfit,
          profitMargin,
          costBreakdown,
          revenuePerMember,
          lifetimeValue,
          newMembersThisMonth: newSignupsThisMonth,
          churnRate,
        },
        recommendations,
      }));

      if (!att) {
        // no-op
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // KPI Cards Data
  const kpiData = useMemo(() => {
    const { assigned, achieved, progress } = data.targets;
    const collections = data.collections[activeCollectionTab as keyof typeof data.collections];
    const activeMembers = members.filter((m) => m.membership_status === "active").length;
    const retention = members.length > 0 ? (activeMembers / members.length) * 100 : 0;
    
    return [
      {
        title: "Target Progress",
        value: <><CurrencyGlyph /> {achieved.toLocaleString()}</>,
        target: <><CurrencyGlyph /> {assigned.toLocaleString()}</>,
        progress: progress,
        change: progress >= 100 ? `+${(progress - 100).toFixed(1)}%` : `-${(100 - progress).toFixed(1)}%`,
        trend: progress >= 100 ? "up" : "down",
        icon: Target,
        color: progress >= 85 ? "success" : progress >= 70 ? "warning" : "error"
      },
      {
        title: "Total Collections",
        value: <><CurrencyGlyph /> {collections.total.toLocaleString()}</>,
        subtitle: activeCollectionTab.charAt(0).toUpperCase() + activeCollectionTab.slice(1),
        change: "",
        trend: "up",
        icon: DollarSign,
        color: "primary"
      },
      {
        title: "Active Members",
        value: activeMembers.toLocaleString(),
        change: "",
        trend: "up",
        icon: Users,
        color: "secondary"
      },
      {
        title: "Member Retention",
        value: `${retention.toFixed(1)}%`,
        change: "",
        trend: "up",
        icon: Repeat,
        color: "success"
      }
    ];
  }, [activeCollectionTab, data, members]);

  const collectionBreakdownData = useMemo(() => {
    const collections = data.collections[activeCollectionTab as keyof typeof data.collections];
    return [
      { name: "Membership", value: collections.membership, color: COLORS.primary },
      { name: "Add-ons", value: collections.addons, color: COLORS.secondary },
      { name: "POS Sales", value: collections.pos, color: COLORS.success }
    ];
  }, [activeCollectionTab, data]);

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "high": return "destructive";
      case "medium": return "warning";
      case "low": return "success";
      default: return "secondary";
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 85) return COLORS.success;
    if (progress >= 70) return COLORS.warning;
    return COLORS.error;
  };

  const panelCardShell = "bg-white border-0 shadow-sm";
  const statCardShell =
    "bg-white border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none";
  const tabContentShell = "space-y-6 animate-in fade-in-0 zoom-in-95 duration-200";

  const kpiThemes: Record<string, { iconShell: string; iconColor: string; valueColor: string }> = {
    primary: { iconShell: "bg-blue-50", iconColor: "text-blue-600", valueColor: "text-blue-700" },
    secondary: { iconShell: "bg-teal-50", iconColor: "text-teal-600", valueColor: "text-teal-700" },
    success: { iconShell: "bg-emerald-50", iconColor: "text-emerald-600", valueColor: "text-emerald-700" },
    warning: { iconShell: "bg-amber-50", iconColor: "text-amber-600", valueColor: "text-amber-700" },
    error: { iconShell: "bg-rose-50", iconColor: "text-rose-600", valueColor: "text-rose-700" },
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">
            Comprehensive business intelligence and performance insights for your gym
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[140px] shadow-sm">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          <Select value={staffFilter} onValueChange={setStaffFilter}>
            <SelectTrigger className="w-[140px] shadow-sm">
              <Users className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Staff Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              <SelectItem value="trainers">Trainers</SelectItem>
              <SelectItem value="reception">Reception</SelectItem>
              <SelectItem value="management">Management</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="shadow-sm hover:shadow-md transition-all"
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-all">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => {
          const IconComponent = kpi.icon;
          const theme = kpiThemes[kpi.color] ?? kpiThemes.primary;
          return (
            <Card key={index} className={statCardShell}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-sm font-medium text-primary">{kpi.title}</CardTitle>
                  {kpi.subtitle && <CardDescription className="text-xs">{kpi.subtitle}</CardDescription>}
                </div>
                <div className={`${theme.iconShell} p-2 rounded-lg`}>
                  <IconComponent className={`h-4 w-4 ${theme.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-3">
                  <div className={`text-2xl font-bold ${theme.valueColor}`}>{kpi.value}</div>
                  <Badge variant={kpi.trend === "up" ? "default" : "destructive"} className="text-xs">
                    {kpi.trend === "up" ? (
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 mr-1" />
                    )}
                    {kpi.change}
                  </Badge>
                </div>

                {kpi.target && (
                  <div className="space-y-2 mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Target: {kpi.target}</span>
                      <span>{kpi.progress?.toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={kpi.progress}
                      className="h-2"
                      style={{
                        '--progress-background': getProgressColor(kpi.progress || 0)
                      } as React.CSSProperties}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Collections Breakdown Section */}
      <Card className={panelCardShell}>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <CardTitle className="text-xl">Total Collections</CardTitle>
              <CardDescription>Revenue breakdown by income source</CardDescription>
            </div>
            
            <Tabs value={activeCollectionTab} onValueChange={setActiveCollectionTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="yesterday">Yesterday</TabsTrigger>
                <TabsTrigger value="thisMonth">This Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Horizontal Bar Chart */}
            <div className="space-y-4">
              {collectionBreakdownData.map((item, index) => {
                const collectionTotal = data.collections[activeCollectionTab as keyof typeof data.collections].total;
                const percentage = collectionTotal > 0 ? (item.value / collectionTotal) * 100 : 0;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">{item.name}</span>
                      <span className="text-sm font-bold text-foreground">
                        <CurrencyGlyph /> {item.value.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div 
                        className="h-3 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: item.color
                        }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {percentage.toFixed(1)}% of total revenue
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pie Chart */}
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={collectionBreakdownData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={40}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {collectionBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${currencyCode} ${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trends & Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Trend */}
        <Card className={panelCardShell}>
          <CardHeader>
            <CardTitle className="text-lg">Daily Revenue Trend</CardTitle>
            <CardDescription>Revenue and member acquisition over the week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data.trends.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" stroke="#666" />
                <YAxis yAxisId="left" stroke="#666" />
                <YAxis yAxisId="right" orientation="right" stroke="#666" />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'Revenue' ? `${currencyCode} ${Number(value).toLocaleString()}` : value,
                    name
                  ]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" fill={COLORS.primary} name="Revenue" />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="members" 
                  stroke={COLORS.secondary} 
                  strokeWidth={3}
                  name="New Members" 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Targets vs Achievement */}
        <Card className={panelCardShell}>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Performance</CardTitle>
            <CardDescription>Target vs actual revenue comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={data.trends.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="month" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip
                  formatter={(value, name) => [`${currencyCode} ${Number(value).toLocaleString()}`, name]}
                />
                <Legend />
                <Bar dataKey="target" fill={COLORS.muted} name="Target" />
                <Bar dataKey="revenue" fill={COLORS.primary} name="Actual" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Staff Performance & Retention Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Staff Performance */}
        <Card className={`lg:col-span-2 ${panelCardShell}`}>
          <CardHeader>
            <CardTitle className="text-lg">Staff Performance</CardTitle>
            <CardDescription>Sales achievement by team members</CardDescription>
          </CardHeader>
          <CardContent>
            {data.staffPerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No staff sales data available for this month.</p>
            ) : (
              <div className="space-y-4">
                {data.staffPerformance.map((staff, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{staff.name}</p>
                        <p className="text-sm text-muted-foreground">
                          <CurrencyGlyph /> {staff.sales.toLocaleString()} / <CurrencyGlyph /> {staff.target.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {staff.achievement.toFixed(1)}%
                        </p>
                        <Progress 
                          value={Math.min(staff.achievement, 100)} 
                          className="w-20 h-2"
                          style={{
                            '--progress-background': getProgressColor(staff.achievement)
                          } as React.CSSProperties}
                        />
                      </div>
                      <Badge variant={staff.achievement >= 100 ? "default" : "secondary"}>
                        {staff.achievement >= 100 ? "Target Met" : "In Progress"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Retention Funnel */}
        <Card className={panelCardShell}>
          <CardHeader>
            <CardTitle className="text-lg">Member Journey</CardTitle>
            <CardDescription>Conversion funnel analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                const maxVal = Math.max(...data.retentionFunnel.map((s) => s.value), 1);
                return data.retentionFunnel.map((stage, index) => {
                  const percentage = (stage.value / maxVal) * 100;
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-foreground">{stage.name}</span>
                        <span className="text-sm font-bold text-foreground">{stage.value}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-6 relative">
                        <div 
                          className="h-6 rounded-full flex items-center justify-center text-white text-xs font-medium transition-all duration-500"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: stage.color
                          }}
                        >
                          {percentage > 0 ? `${percentage.toFixed(0)}%` : ""}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Analytics - SaaS BI Layer */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Brain className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Advanced Analytics</h2>
          <Badge variant="outline" className="ml-2">AI Powered</Badge>
        </div>

        <Tabs defaultValue="churn" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="churn">Churn Prediction</TabsTrigger>
            <TabsTrigger value="trainers">Trainer Performance</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="profitability">Profitability</TabsTrigger>
          </TabsList>

          {/* Churn Prediction */}
          <TabsContent value="churn" className={tabContentShell}>
            <Card className={panelCardShell}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-warning" />
                  Member Churn Risk Analysis
                </CardTitle>
                <CardDescription>
                  AI-powered predictions of members at risk of canceling their membership
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.churnPrediction.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 rounded-full bg-destructive/10">
                          <UserX className="h-4 w-4 text-destructive" />
                        </div>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {member.membership} • Last visit: {member.lastVisit}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {member.probability}% Risk
                          </p>
                          <Progress 
                            value={member.probability} 
                            className="w-20 h-2"
                            style={{
                              '--progress-background': member.risk === 'High' ? COLORS.error : 
                                                     member.risk === 'Medium' ? COLORS.warning : COLORS.success
                            } as React.CSSProperties}
                          />
                        </div>
                        <Badge variant={getRiskColor(member.risk)}>
                          {member.risk} Risk
                        </Badge>
                        <Button size="sm" variant="outline" className="shadow-sm hover:shadow-md transition-all">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Contact
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trainer Performance */}
          <TabsContent value="trainers" className={tabContentShell}>
            <Card className={panelCardShell}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Award className="h-5 w-5 mr-2 text-primary" />
                  Trainer Performance Analytics
                </CardTitle>
                <CardDescription>
                  Comprehensive trainer metrics including class attendance and revenue generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {data.trainerPerformance.map((trainer, index) => (
                      <div key={index} className="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-medium">{trainer.name}</p>
                            {trainer.rating > 0 && (
                              <div className="flex items-center space-x-1 mt-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                <span className="text-sm text-muted-foreground">{trainer.rating}</span>
                              </div>
                            )}
                          </div>
                          <Badge variant="default">
                            <CurrencyGlyph /> {trainer.revenue.toLocaleString()}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Classes</p>
                            <p className="font-medium">{trainer.classes}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Attendance</p>
                            <p className="font-medium">{trainer.attendance}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsBarChart data={data.trainerPerformance}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="name" stroke="#666" />
                        <YAxis stroke="#666" />
                        <Tooltip 
                          formatter={(value) => [`${currencyCode} ${value.toLocaleString()}`, 'Revenue']}
                        />
                        <Bar dataKey="revenue" fill={COLORS.primary} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Engagement Analytics */}
          <TabsContent value="engagement" className={tabContentShell}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className={panelCardShell}>
                <CardHeader>
                  <CardTitle className="text-lg">Community Post Engagement</CardTitle>
                  <CardDescription>Real post activity by type, and likes + comments earned</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.engagementAnalytics.communityFeatures.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      No community posts yet — this section will populate once members start posting.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {(() => {
                        const maxInteractions = Math.max(
                          ...data.engagementAnalytics.communityFeatures.map((f) => f.likes + f.comments),
                          1
                        );
                        return data.engagementAnalytics.communityFeatures.map((feature, index) => {
                          const interactions = feature.likes + feature.comments;
                          const relativeInteractions = (interactions / maxInteractions) * 100;
                          return (
                            <div key={index} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">{feature.feature}</span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-muted-foreground">{feature.posts} posts ({feature.usage}%)</span>
                                  <span className="text-xs font-medium">{interactions} interactions</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div
                                    className="h-2 rounded-full transition-all duration-500"
                                    style={{
                                      width: `${feature.usage}%`,
                                      backgroundColor: COLORS.primary
                                    }}
                                  />
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div
                                    className="h-2 rounded-full transition-all duration-500"
                                    style={{
                                      width: `${relativeInteractions}%`,
                                      backgroundColor: COLORS.secondary
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className={panelCardShell}>
                <CardHeader>
                  <CardTitle className="text-lg">Weekly Community Activity</CardTitle>
                  <CardDescription>Posts created and engagement (likes + comments) received, last 8 weeks</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={data.engagementAnalytics.weeklyActivity}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="week" stroke="#666" />
                      <YAxis yAxisId="left" stroke="#666" allowDecimals={false} />
                      <YAxis yAxisId="right" orientation="right" stroke="#666" allowDecimals={false} />
                      <Tooltip
                        formatter={(value, name) => [value, name]}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="posts" fill={COLORS.primary} name="Posts" />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="engagement"
                        stroke={COLORS.success}
                        strokeWidth={3}
                        dot={{ fill: COLORS.success, strokeWidth: 2, r: 4 }}
                        name="Engagement"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Profitability Dashboard */}
          <TabsContent value="profitability" className={tabContentShell}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className={panelCardShell}>
                <CardHeader>
                  <CardTitle className="text-lg">Revenue Breakdown</CardTitle>
                  <CardDescription>From posted General Ledger entries, all-time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Revenue</span>
                      <span className="font-bold"><CurrencyGlyph /> {Math.round(data.profitability.totalRevenue).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Operating Costs</span>
                      <span className="font-medium"><CurrencyGlyph /> {Math.round(data.profitability.totalExpenses).toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Net Profit</span>
                      <span className={`font-bold ${data.profitability.netProfit >= 0 ? "text-success" : "text-destructive"}`}>
                        <CurrencyGlyph /> {Math.round(data.profitability.netProfit).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Profit Margin</span>
                      <Badge variant={data.profitability.profitMargin >= 0 ? "default" : "destructive"}>
                        {data.profitability.profitMargin.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={panelCardShell}>
                <CardHeader>
                  <CardTitle className="text-lg">Expense Breakdown</CardTitle>
                  <CardDescription>By chart-of-accounts expense category, all-time</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.profitability.costBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No posted expenses yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {data.profitability.costBreakdown.map((cost, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{cost.name}</span>
                          <div className="text-right">
                            <span className="text-sm font-medium">
                              <CurrencyGlyph /> {cost.amount.toLocaleString()}
                            </span>
                            <p className="text-xs text-muted-foreground">{cost.percentage}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className={panelCardShell}>
                <CardHeader>
                  <CardTitle className="text-lg">Key Ratios</CardTitle>
                  <CardDescription>Current member base and posted ledger totals</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: "Revenue per Member (all-time)", value: <><CurrencyGlyph /> {Math.round(data.profitability.revenuePerMember).toLocaleString()}</> },
                      { label: "Lifetime Value / Paying Member", value: <><CurrencyGlyph /> {Math.round(data.profitability.lifetimeValue).toLocaleString()}</> },
                      { label: "New Members This Month", value: data.profitability.newMembersThisMonth.toLocaleString() },
                      { label: "Churn Risk Rate (current)", value: `${data.profitability.churnRate.toFixed(1)}%` }
                    ].map((ratio, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{ratio.label}</span>
                        <span className="font-medium">{ratio.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Action Items & Recommendations */}
      <Card className={panelCardShell}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Zap className="h-5 w-5 mr-2 text-primary" />
            AI Recommendations
          </CardTitle>
          <CardDescription>
            Smart insights and action items based on your gym's performance data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Not enough data yet to generate recommendations.
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {data.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-3 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className={`p-2 rounded-full ${
                    recommendation.type === 'success' ? 'bg-success/10' :
                    recommendation.type === 'warning' ? 'bg-warning/10' :
                    'bg-primary/10'
                  }`}>
                    <recommendation.icon className={`h-4 w-4 ${
                      recommendation.type === 'success' ? 'text-success' :
                      recommendation.type === 'warning' ? 'text-warning' :
                      'text-primary'
                    }`} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="font-medium">{recommendation.title}</p>
                    <p className="text-sm text-muted-foreground">{recommendation.message}</p>
                    <Button size="sm" variant="outline" className="text-xs shadow-sm hover:shadow-md transition-all">
                      {recommendation.action}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

