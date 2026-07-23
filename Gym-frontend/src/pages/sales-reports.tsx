import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useCurrency } from "../utils/currency";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  FileText,
  Download,
  Filter,
  RefreshCw,
  TrendingUp,
  ShoppingCart,
  CreditCard,
  Users,
  Wallet,
  BadgeCheck,
  Receipt,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { receiptsService, Receipt as ReceiptType } from "../utils/supabase/receipts-service";

type StatusType = "paid" | "partial" | "refunded" | "pending";

const statusBadge = (status: StatusType) => {
  const map: Record<StatusType, string> = {
    paid: "bg-green-100 text-green-800",
    partial: "bg-yellow-100 text-yellow-800",
    refunded: "bg-red-100 text-red-800",
    pending: "bg-gray-100 text-gray-800",
  };
  return <Badge className={map[status] ?? "bg-gray-100 text-gray-800"}>{status}</Badge>;
};

const CATEGORY_COLORS: Record<string, string> = {
  Memberships: "#2563eb",
  "PT Sessions": "#16a34a",
  Classes: "#f97316",
  Merchandise: "#7c3aed",
  Other: "#0891b2",
};

function categorizeReceipt(r: ReceiptType): string {
  const t = (r.transaction_type || "").toLowerCase();
  const plan = (r.plan_name || "").toLowerCase();
  if (t.includes("new member") || t.includes("renew") || t.includes("upgrade") || plan.includes("membership")) return "Memberships";
  if (t.includes("training") || plan.includes("pt") || plan.includes("personal")) return "PT Sessions";
  if (t.includes("class") || plan.includes("class")) return "Classes";
  if (t.includes("pos") || t.includes("product") || plan.includes("product") || plan.includes("merchandise")) return "Merchandise";
  return "Other";
}

function normalizeStatus(s: string | undefined): StatusType {
  const lower = (s || "").toLowerCase();
  if (lower === "paid" || lower === "completed") return "paid";
  if (lower === "partial") return "partial";
  if (lower === "refunded") return "refunded";
  if (lower === "pending") return "pending";
  return "paid";
}

export function SalesReports() {
  const { currencyCode } = useCurrency();
  const formatAED = (value: number) => `${currencyCode} ${value.toLocaleString()}`;
  const [receipts, setReceipts] = useState<ReceiptType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState("last-7");
  const [statusFilter, setStatusFilter] = useState("all-status");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await receiptsService.getReceipts({}, { page: 1, limit: 5000 });
      setReceipts(resp.receipts ?? []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load receipts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const now = new Date();

  // Date filter cutoff
  const dateCutoff = useMemo(() => {
    if (dateRange === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (dateRange === "last-7") return new Date(now.getTime() - 7 * 86400000);
    if (dateRange === "last-30") return new Date(now.getTime() - 30 * 86400000);
    if (dateRange === "this-month") return new Date(now.getFullYear(), now.getMonth(), 1);
    return new Date(0);
  }, [dateRange]);

  // Filtered receipts by date + status + search
  const filteredReceipts = useMemo(() => {
    return receipts.filter(r => {
      const d = r.transaction_date ? new Date(r.transaction_date) : null;
      if (d && d < dateCutoff) return false;
      if (statusFilter !== "all-status" && normalizeStatus(r.status) !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !(r.member_name || "").toLowerCase().includes(q) &&
          !(r.receipt_no || "").toLowerCase().includes(q) &&
          !(r.plan_name || "").toLowerCase().includes(q) &&
          !(r.member_id || "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [receipts, dateCutoff, statusFilter, searchQuery]);

  // Weekly sales trend (last 7 days)
  const salesTrend = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      const ds = d.toISOString().split("T")[0];
      const label = d.toLocaleString(undefined, { weekday: "short" });
      const dayRows = receipts.filter(r => (r.transaction_date || "").split("T")[0] === ds);
      const sales = dayRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const orders = dayRows.length;
      const refunds = dayRows.filter(r => normalizeStatus(r.status) === "refunded").reduce((s, r) => s + (Number(r.amount) || 0), 0);
      return { day: label, sales: Math.round(sales), orders, refunds: Math.round(refunds) };
    });
  }, [receipts]);

  // Category mix
  const categoryMix = useMemo(() => {
    const cats: Record<string, number> = {};
    filteredReceipts.forEach(r => {
      const cat = categorizeReceipt(r);
      cats[cat] = (cats[cat] || 0) + (Number(r.amount) || 0);
    });
    const total = Object.values(cats).reduce((s, v) => s + v, 0);
    return Object.entries(cats)
      .map(([name, revenue]) => ({
        name,
        value: total > 0 ? Math.round((revenue / total) * 100) : 0,
        revenue: Math.round(revenue),
        color: CATEGORY_COLORS[name] ?? "#64748b",
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredReceipts]);

  // Payment methods
  const paymentMix = useMemo(() => {
    const methods: Record<string, number> = {};
    filteredReceipts.forEach(r => {
      const m = r.payment_method || "Other";
      methods[m] = (methods[m] || 0) + (Number(r.amount) || 0);
    });
    return Object.entries(methods)
      .map(([method, value]) => ({ method, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [filteredReceipts]);

  // Sales register (latest 50 from filtered set)
  const salesRegister = useMemo(() => {
    return [...filteredReceipts]
      .sort((a, b) => new Date(b.transaction_date || b.created_at).getTime() - new Date(a.transaction_date || a.created_at).getTime())
      .slice(0, 50)
      .map(r => ({
        id: r.id,
        invoice: r.receipt_no || r.id.slice(0, 8).toUpperCase(),
        date: r.transaction_date ? r.transaction_date.split("T")[0] : "—",
        customer: r.member_name || "—",
        channel: r.transaction_type || "POS",
        payment: r.payment_method || "—",
        status: normalizeStatus(r.status),
        amount: Number(r.amount) || 0,
      }));
  }, [filteredReceipts]);

  // Top products/plans by revenue
  const topProducts = useMemo(() => {
    const plans: Record<string, { units: number; revenue: number; category: string }> = {};
    filteredReceipts.forEach(r => {
      const name = r.plan_name || r.transaction_type || "Unknown";
      if (!plans[name]) plans[name] = { units: 0, revenue: 0, category: categorizeReceipt(r) };
      plans[name].units += 1;
      plans[name].revenue += Number(r.amount) || 0;
    });
    return Object.entries(plans)
      .map(([name, v]) => ({ name, category: v.category, units: v.units, revenue: Math.round(v.revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredReceipts]);

  // Summary totals
  const totals = useMemo(() => {
    const totalSales = filteredReceipts.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const paidCount = filteredReceipts.filter(r => normalizeStatus(r.status) === "paid").length;
    const refundTotal = filteredReceipts.filter(r => normalizeStatus(r.status) === "refunded").reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const avgOrder = filteredReceipts.length > 0 ? totalSales / filteredReceipts.length : 0;
    const uniqueMembers = new Set(filteredReceipts.map(r => r.member_id).filter(Boolean)).size;
    return { totalSales, paidCount, refundTotal, avgOrder, uniqueMembers };
  }, [filteredReceipts]);

  const periodLabel =
    dateRange === "today" ? "1 Day" :
    dateRange === "last-7" ? "7 Days" :
    dateRange === "last-30" ? "30 Days" :
    "This Month";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Revenue tracking, transaction summaries, and product performance reporting.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9" onClick={loadData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" className="h-9">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes reportFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .report-panel {
          animation: reportFadeIn 0.22s ease-out;
        }
      `}</style>

      {/* Filter Bar */}
      <Card className="report-panel border-primary/10 shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[220px] relative">
              <Input
                placeholder="Search invoices, customers, or plans..."
                className="h-10"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="last-7">Last 7 Days</SelectItem>
                <SelectItem value="last-30">Last 30 Days</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-status">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 report-panel">
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Sales</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{formatAED(Math.round(totals.totalSales))}</div>
            <p className="text-xs text-muted-foreground mt-1">{filteredReceipts.length} transactions</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Paid Orders</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <BadgeCheck className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{totals.paidCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Receipts issued</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Refunds</CardTitle>
            <div className="bg-red-50 p-2 rounded-lg">
              <Receipt className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{formatAED(Math.round(totals.refundTotal))}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totals.totalSales > 0 ? `${((totals.refundTotal / totals.totalSales) * 100).toFixed(1)}% refund rate` : "No refunds"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Avg Order</CardTitle>
            <div className="bg-purple-50 p-2 rounded-lg">
              <Wallet className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{formatAED(Math.round(totals.avgOrder))}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all channels</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Unique Members</CardTitle>
            <div className="bg-amber-50 p-2 rounded-lg">
              <Users className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{totals.uniqueMembers}</div>
            <p className="text-xs text-muted-foreground mt-1">Members with transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 report-panel">
        <Card className="xl:col-span-2 border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Weekly Sales Trend</CardTitle>
            <CardDescription>Sales, orders, and refunds by day (last 7 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={salesTrend}>
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(v: number, name: string) => name === "sales" ? `${currencyCode} ${v.toLocaleString()}` : v} />
                <Legend />
                <Area type="monotone" dataKey="sales" stroke="#2563eb" fill="url(#salesFill)" name={`Sales (${currencyCode})`} />
                <Line type="monotone" dataKey="orders" stroke="#16a34a" strokeWidth={2} name="Orders" />
                <Line type="monotone" dataKey="refunds" stroke="#dc2626" strokeWidth={2} name={`Refunds (${currencyCode})`} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Category Mix</CardTitle>
            <CardDescription>Revenue share by type</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryMix.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">No data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={categoryMix} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                    {categoryMix.map(entry => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [`${value}%`, name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 report-panel">
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Revenue by payment type</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentMix.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">No data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={paymentMix}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="method" />
                  <YAxis />
                  <Tooltip formatter={(v: number) => `${currencyCode} ${v.toLocaleString()}`} />
                  <Bar dataKey="value" fill="#6366f1" name="Revenue" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow xl:col-span-2">
          <CardHeader>
            <CardTitle>Reporting Snapshot</CardTitle>
            <CardDescription>Key highlights for this period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                Period Coverage
              </div>
              <span className="text-sm font-semibold">{periodLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShoppingCart className="h-4 w-4" />
                Orders Processed
              </div>
              <span className="text-sm font-semibold">{filteredReceipts.length.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                Payment Success Rate
              </div>
              <span className="text-sm font-semibold">
                {filteredReceipts.length > 0
                  ? `${(((filteredReceipts.length - filteredReceipts.filter(r => normalizeStatus(r.status) === "pending").length) / filteredReceipts.length) * 100).toFixed(1)}%`
                  : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowUpRight className="h-4 w-4" />
                Total Revenue
              </div>
              <span className="text-sm font-semibold text-green-600">{formatAED(Math.round(totals.totalSales))}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Register */}
      <Card className="report-panel border-primary/10 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sales Register</CardTitle>
              <CardDescription>Detailed transaction listing ({salesRegister.length} shown)</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading transactions...</div>
          ) : salesRegister.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No transactions found for the selected period.</div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Plan / Type</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesRegister.map(row => (
                  <TableRow key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-medium">{row.invoice}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.customer}</TableCell>
                    <TableCell>{row.channel}</TableCell>
                    <TableCell>{row.payment}</TableCell>
                    <TableCell>{statusBadge(row.status)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatAED(row.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card className="report-panel border-primary/10 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Top Plans and Services</CardTitle>
              <CardDescription>Best performers by revenue</CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              <FileText className="mr-2 h-4 w-4" />
              View Full Report
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {topProducts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No product data available.</div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Plan / Service</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Transactions</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map(product => (
                  <TableRow key={product.name} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell className="text-center">{product.units}</TableCell>
                    <TableCell className="text-right font-semibold">{formatAED(product.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
