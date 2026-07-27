import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Progress } from "../components/ui/progress";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Download,
  LineChart as LineChartIcon,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  ShoppingBag,
  BadgeCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { receiptsService, Receipt } from "../utils/supabase/receipts-service";
import { membersService, Member } from "../utils/supabase/members-service";
import { financialAnalyticsService } from "../utils/supabase/financial-analytics-service";

import { useCurrency } from "../utils/currency";

const CATEGORY_COLORS: Record<string, string> = {
  Memberships: "#2563eb",
  "PT Sessions": "#16a34a",
  Classes: "#f97316",
  Merchandise: "#7c3aed",
  Other: "#0891b2",
};

function categorizeReceipt(r: Receipt): string {
  const t = (r.transaction_type || "").toLowerCase();
  const plan = (r.plan_name || "").toLowerCase();
  if (t.includes("new member") || t.includes("renew") || t.includes("upgrade") || plan.includes("membership")) return "Memberships";
  if (t.includes("training") || plan.includes("pt") || plan.includes("personal")) return "PT Sessions";
  if (t.includes("class") || plan.includes("class")) return "Classes";
  if (t.includes("pos") || t.includes("product") || plan.includes("product") || plan.includes("merchandise")) return "Merchandise";
  return "Other";
}

export function SalesAnalytics() {
  const { currencyCode } = useCurrency();
  const formatAED = (value: number) => `${currencyCode} ${value.toLocaleString()}`;
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; revenue: number; expenses: number; profit: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [receiptsResp, membersResp, trend] = await Promise.all([
        receiptsService.getReceipts({}, { page: 1, limit: 5000 }).catch(() => ({ receipts: [] as Receipt[], pagination: {} as any })),
        membersService.getMembers({}, { page: 1, limit: 3000 }).catch(() => ({ members: [] as Member[] } as any)),
        financialAnalyticsService.getMonthlyTrend(6).catch(() => [] as any[]),
      ]);
      setReceipts((receiptsResp as any).receipts ?? []);
      setMembers((membersResp as any).members ?? []);
      setMonthlyTrend(Array.isArray(trend) ? trend : []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const now = new Date();

  // Build last-6-months skeleton for receipts-based charts
  const last6Months = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        month: d.toLocaleString(undefined, { month: "short" }),
      };
    });
  }, []);

  // Monthly performance: prefer API trend data, fall back to receipts
  const monthlyPerformance = useMemo(() => {
    if (monthlyTrend.length > 0) {
      return monthlyTrend.slice(-6).map(p => ({
        month: p.month,
        revenue: Math.round(p.revenue),
        target: Math.round(p.revenue * 0.9), // 90% of actual as indicative target if no target data
        orders: receipts
          .filter(r => (r.transaction_date || "").startsWith(p.month))
          .length,
      }));
    }
    // Compute from receipts
    return last6Months.map(({ month, key }) => {
      const monthReceipts = receipts.filter(r => (r.transaction_date || "").split("T")[0].startsWith(key));
      const revenue = monthReceipts.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      return { month, revenue: Math.round(revenue), target: Math.round(revenue * 0.9), orders: monthReceipts.length };
    });
  }, [monthlyTrend, receipts, last6Months]);

  // Customer mix: new vs returning by month (based on join date vs repeat transaction)
  const customerMix = useMemo(() => {
    return last6Months.map(({ month, key }) => {
      const newMembers = members.filter(m => {
        const raw = m.join_date || m.created_at;
        return raw ? String(raw).split("T")[0].startsWith(key) : false;
      }).length;
      // "Returning" = members who had a transaction this month but joined before this month
      const monthStart = new Date(parseInt(key.split("-")[0]), parseInt(key.split("-")[1]) - 1, 1);
      const transactingIds = new Set(
        receipts
          .filter(r => (r.transaction_date || "").split("T")[0].startsWith(key))
          .map(r => r.member_id)
          .filter(Boolean)
      );
      const returning = members.filter(m => {
        if (!transactingIds.has(m.id)) return false;
        const raw = m.join_date || m.created_at;
        if (!raw) return false;
        return new Date(String(raw)) < monthStart;
      }).length;
      return { month, newCustomers: newMembers, returning };
    });
  }, [last6Months, members, receipts]);

  // Product/category performance
  const productPerformance = useMemo(() => {
    const cats: Record<string, number> = {};
    receipts.forEach(r => {
      const cat = categorizeReceipt(r);
      cats[cat] = (cats[cat] || 0) + (Number(r.amount) || 0);
    });
    const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const maxRevenue = sorted[0]?.[1] ?? 1;
    return sorted.map(([name, revenue]) => ({
      name,
      revenue: Math.round(revenue),
      growth: 0, // would need prior period data
      margin: 0,
      color: CATEGORY_COLORS[name] ?? "#64748b",
      share: Math.round((revenue / Math.max(receipts.reduce((s, r) => s + (Number(r.amount) || 0), 0), 1)) * 100),
    }));
  }, [receipts]);

  // Channel performance: payment methods as proxy for channels
  const channelPerformance = useMemo(() => {
    const channels: Record<string, { revenue: number; orders: number }> = {};
    receipts.forEach(r => {
      const ch = r.payment_method || "Other";
      if (!channels[ch]) channels[ch] = { revenue: 0, orders: 0 };
      channels[ch].revenue += Number(r.amount) || 0;
      channels[ch].orders += 1;
    });
    return Object.entries(channels)
      .map(([channel, v]) => ({ channel, revenue: Math.round(v.revenue), orders: v.orders, conversion: 0 }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [receipts]);

  // Summary KPIs
  const totals = useMemo(() => {
    const totalRevenue = receipts.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const totalOrders = receipts.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    // Repeat rate: members with more than 1 transaction
    const memberTxCounts: Record<string, number> = {};
    receipts.forEach(r => {
      if (r.member_id) memberTxCounts[r.member_id] = (memberTxCounts[r.member_id] || 0) + 1;
    });
    const uniqueMembers = Object.keys(memberTxCounts).length;
    const repeatMembers = Object.values(memberTxCounts).filter(c => c > 1).length;
    const repeatRate = uniqueMembers > 0 ? (repeatMembers / uniqueMembers) * 100 : 0;
    return { totalRevenue, totalOrders, avgOrderValue, repeatRate };
  }, [receipts]);

  // Conversion funnel: leads vs members (use members data)
  const funnel = useMemo(() => {
    const total = members.length;
    const active = members.filter(m => m.membership_status === "active").length;
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const newThisMonth = members.filter(m => {
      const raw = m.join_date || m.created_at;
      return raw ? String(raw).split("T")[0].startsWith(currentMonthKey) : false;
    }).length;
    return { total, active, newThisMonth };
  }, [members]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Advanced insights on revenue growth, customer behavior, and product performance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9" onClick={loadData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm" className="h-9">
            <Sparkles className="mr-2 h-4 w-4" />
            Insights
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes analyticsFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .analytics-panel {
          animation: analyticsFadeIn 0.22s ease-out;
        }
      `}</style>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 analytics-panel">
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Revenue</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{formatAED(Math.round(totals.totalRevenue))}</div>
            <p className="text-xs text-muted-foreground mt-1">All time from receipts</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Orders</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <ShoppingBag className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{totals.totalOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Total transactions</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Avg Order Value</CardTitle>
            <div className="bg-purple-50 p-2 rounded-lg">
              <Wallet className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{formatAED(Math.round(totals.avgOrderValue))}</div>
            <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Repeat Rate</CardTitle>
            <div className="bg-amber-50 p-2 rounded-lg">
              <BadgeCheck className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{totals.repeatRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Members with multiple receipts</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6 analytics-panel">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2 border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Revenue vs Target</CardTitle>
                <CardDescription>Monthly performance over last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyPerformance.every(m => m.revenue === 0) ? (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                    No revenue data available.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={monthlyPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(v: number, name: string) => [formatAED(v), name]} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#2563eb" name="Revenue" radius={[6, 6, 0, 0]} />
                      <Line type="monotone" dataKey="target" stroke="#f97316" strokeWidth={2} name="Target" />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Customer Mix</CardTitle>
                <CardDescription>New vs returning members by month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={customerMix}>
                    <defs>
                      <linearGradient id="newFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="returnFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="newCustomers" stroke="#6366f1" fill="url(#newFill)" name="New Members" />
                    <Area type="monotone" dataKey="returning" stroke="#22c55e" fill="url(#returnFill)" name="Returning" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Sales Velocity</CardTitle>
                <CardDescription>Orders growth over last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={monthlyPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="orders" stroke="#0ea5e9" strokeWidth={3} name="Orders" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Member Funnel</CardTitle>
                <CardDescription>Total, active, and new members</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Total Members</span>
                    <span className="font-semibold">{funnel.total.toLocaleString()}</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Active Members</span>
                    <span className="font-semibold">{funnel.active.toLocaleString()}</span>
                  </div>
                  <Progress value={funnel.total > 0 ? (funnel.active / funnel.total) * 100 : 0} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">New This Month</span>
                    <span className="font-semibold">{funnel.newThisMonth.toLocaleString()}</span>
                  </div>
                  <Progress value={funnel.total > 0 ? (funnel.newThisMonth / funnel.total) * 100 : 0} className="h-2" />
                </div>
                <div className="text-xs text-muted-foreground">
                  Active rate: {funnel.total > 0 ? ((funnel.active / funnel.total) * 100).toFixed(1) : 0}% of all members.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Monthly Member Acquisition</CardTitle>
                <CardDescription>New members joined each month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={customerMix}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="newCustomers" fill="#6366f1" name="New Members" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="returning" fill="#22c55e" name="Returning" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Customer Insights</CardTitle>
                <CardDescription>Retention and loyalty metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Active membership base</p>
                    <p className="text-sm text-muted-foreground">
                      {funnel.active.toLocaleString()} active members out of {funnel.total.toLocaleString()} total ({funnel.total > 0 ? ((funnel.active / funnel.total) * 100).toFixed(1) : 0}% retention).
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <ArrowUpRight className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Repeat transaction rate</p>
                    <p className="text-sm text-muted-foreground">
                      {totals.repeatRate.toFixed(1)}% of members have made more than one purchase.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Activity className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold">New members this month</p>
                    <p className="text-sm text-muted-foreground">
                      {funnel.newThisMonth} new members joined this month.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Product/Service Performance</CardTitle>
              <CardDescription>Revenue breakdown by category</CardDescription>
            </CardHeader>
            <CardContent>
              {productPerformance.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No product data available.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {productPerformance.map(product => (
                    <div key={product.name} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{product.name}</p>
                        <Badge variant="outline" className="border-blue-200 text-blue-700">
                          {product.share}%
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Revenue</p>
                      <p className="text-lg font-bold">{formatAED(product.revenue)}</p>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <span>Revenue share</span>
                          <span>{product.share}%</span>
                        </div>
                        <Progress value={product.share} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Channel Performance</CardTitle>
                <CardDescription>Revenue by payment method</CardDescription>
              </CardHeader>
              <CardContent>
                {channelPerformance.length === 0 ? (
                  <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">No data available.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={channelPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="channel" />
                      <YAxis />
                      <Tooltip formatter={(v: number) => formatAED(v)} />
                      <Bar dataKey="revenue" fill="#7c3aed" name="Revenue" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Channel Breakdown</CardTitle>
                <CardDescription>Order volume and revenue by payment type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {channelPerformance.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">No data available.</div>
                ) : (
                  channelPerformance.slice(0, 6).map(channel => (
                    <div key={channel.channel} className="flex items-center justify-between border rounded-lg px-4 py-3">
                      <div>
                        <p className="font-semibold">{channel.channel}</p>
                        <p className="text-xs text-muted-foreground">{channel.orders} orders</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatAED(channel.revenue)}</p>
                        <p className="text-xs text-muted-foreground">
                          {totals.totalRevenue > 0 ? `${((channel.revenue / totals.totalRevenue) * 100).toFixed(1)}% share` : "—"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Insights Footer */}
      <Card className="analytics-panel border-primary/10 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>Key Metrics Summary</CardTitle>
          <CardDescription>Derived from live transaction and membership data</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <LineChartIcon className="h-4 w-4 text-blue-600" />
              Revenue performance
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Total of {formatAED(Math.round(totals.totalRevenue))} across {totals.totalOrders.toLocaleString()} transactions with an average of {formatAED(Math.round(totals.avgOrderValue))} per order.
            </p>
          </div>
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="h-4 w-4 text-green-600" />
              Membership health
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {funnel.active.toLocaleString()} active members ({funnel.total > 0 ? ((funnel.active / funnel.total) * 100).toFixed(1) : 0}% active rate). {funnel.newThisMonth} joined this month.
            </p>
          </div>
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4 text-purple-600" />
              Repeat business
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {totals.repeatRate.toFixed(1)}% of members have made multiple purchases, indicating strong customer loyalty.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
