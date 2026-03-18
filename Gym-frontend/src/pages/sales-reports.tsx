import React, { useMemo } from "react";
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

type SalesRow = {
  id: string;
  invoice: string;
  date: string;
  customer: string;
  channel: string;
  payment: string;
  status: "paid" | "partial" | "refunded" | "pending";
  amount: number;
};

const salesTrend = [
  { day: "Mon", sales: 12450, orders: 64, refunds: 320 },
  { day: "Tue", sales: 13890, orders: 71, refunds: 280 },
  { day: "Wed", sales: 15220, orders: 79, refunds: 410 },
  { day: "Thu", sales: 17180, orders: 88, refunds: 350 },
  { day: "Fri", sales: 19640, orders: 102, refunds: 520 },
  { day: "Sat", sales: 21430, orders: 112, refunds: 610 },
  { day: "Sun", sales: 16810, orders: 84, refunds: 300 },
];

const categoryMix = [
  { name: "Memberships", value: 42, revenue: 68400, color: "#2563eb" },
  { name: "PT Sessions", value: 22, revenue: 35650, color: "#16a34a" },
  { name: "Supplements", value: 18, revenue: 28400, color: "#f97316" },
  { name: "Merchandise", value: 10, revenue: 15800, color: "#7c3aed" },
  { name: "Cafe", value: 8, revenue: 12400, color: "#0891b2" },
];

const paymentMix = [
  { method: "Card", value: 82400 },
  { method: "Cash", value: 29650 },
  { method: "Bank", value: 18500 },
  { method: "Wallet", value: 12200 },
];

const hourlySales = [
  { hour: "6-9", sales: 8200 },
  { hour: "9-12", sales: 14600 },
  { hour: "12-3", sales: 12850 },
  { hour: "3-6", sales: 16720 },
  { hour: "6-9", sales: 21480 },
  { hour: "9-12", sales: 10240 },
];

const salesRegister: SalesRow[] = [
  { id: "1", invoice: "INV-20482", date: "2026-03-17", customer: "Aisha Patel", channel: "POS", payment: "Card", status: "paid", amount: 640 },
  { id: "2", invoice: "INV-20483", date: "2026-03-17", customer: "Rahul Singh", channel: "Online", payment: "Wallet", status: "paid", amount: 320 },
  { id: "3", invoice: "INV-20484", date: "2026-03-17", customer: "Emily Rogers", channel: "POS", payment: "Cash", status: "partial", amount: 410 },
  { id: "4", invoice: "INV-20485", date: "2026-03-16", customer: "Mohamed Saeed", channel: "Corporate", payment: "Bank", status: "paid", amount: 2100 },
  { id: "5", invoice: "INV-20486", date: "2026-03-16", customer: "Kavya Nair", channel: "POS", payment: "Card", status: "refunded", amount: 180 },
  { id: "6", invoice: "INV-20487", date: "2026-03-15", customer: "Liam Brown", channel: "Online", payment: "Card", status: "pending", amount: 520 },
];

const topProducts = [
  { name: "Premium Membership", category: "Membership", units: 84, revenue: 75600, margin: 62 },
  { name: "PT Starter Pack", category: "Training", units: 36, revenue: 28800, margin: 48 },
  { name: "Whey Protein 2kg", category: "Supplements", units: 102, revenue: 21420, margin: 34 },
  { name: "Performance Shaker", category: "Merchandise", units: 140, revenue: 9800, margin: 55 },
];

const statusBadge = (status: SalesRow["status"]) => {
  const map: Record<SalesRow["status"], string> = {
    paid: "bg-green-100 text-green-800",
    partial: "bg-yellow-100 text-yellow-800",
    refunded: "bg-red-100 text-red-800",
    pending: "bg-gray-100 text-gray-800",
  };
  return <Badge className={map[status]}>{status}</Badge>;
};

const formatAED = (value: number) => `AED ${value.toLocaleString()}`;

export function SalesReports() {
  const totals = useMemo(() => {
    const totalSales = salesRegister.reduce((sum, row) => sum + row.amount, 0);
    const paidCount = salesRegister.filter(r => r.status === "paid").length;
    const refundTotal = salesRegister.filter(r => r.status === "refunded").reduce((sum, row) => sum + row.amount, 0);
    const avgOrder = totalSales / Math.max(salesRegister.length, 1);
    return { totalSales, paidCount, refundTotal, avgOrder };
  }, []);

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
          <Button variant="outline" size="sm" className="h-9">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            <Download className="mr-2 h-4 w-4" />
            Export
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
                placeholder="Search invoices, customers, or products..."
                className="h-10"
              />
            </div>
            <Select defaultValue="last-7">
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
            <Select defaultValue="all-branches">
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-branches">All Branches</SelectItem>
                <SelectItem value="downtown">Downtown</SelectItem>
                <SelectItem value="marina">Marina</SelectItem>
                <SelectItem value="al-barsha">Al Barsha</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all-channels">
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-channels">All Channels</SelectItem>
                <SelectItem value="pos">POS</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="corporate">Corporate</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all-status">
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
            <div className="text-2xl font-bold text-green-700">{formatAED(totals.totalSales)}</div>
            <p className="text-xs text-muted-foreground mt-1">+12.4% vs last period</p>
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
            <div className="text-2xl font-bold text-red-700">{formatAED(totals.refundTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">Refund rate 2.1%</p>
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
            <CardTitle className="text-sm font-medium text-primary">New Customers</CardTitle>
            <div className="bg-amber-50 p-2 rounded-lg">
              <Users className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">128</div>
            <p className="text-xs text-muted-foreground mt-1">+18 this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 report-panel">
        <Card className="xl:col-span-2 border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Weekly Sales Trend</CardTitle>
            <CardDescription>Sales, orders, and refunds by day</CardDescription>
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
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="sales" stroke="#2563eb" fill="url(#salesFill)" name="Sales" />
                <Line type="monotone" dataKey="orders" stroke="#16a34a" strokeWidth={2} name="Orders" />
                <Line type="monotone" dataKey="refunds" stroke="#dc2626" strokeWidth={2} name="Refunds" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Category Mix</CardTitle>
            <CardDescription>Revenue share by product category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={categoryMix} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                  {categoryMix.map(entry => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, name: string, props: any) => [`${value}%`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={paymentMix}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="method" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" name="Revenue" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Peak Hours</CardTitle>
            <CardDescription>Sales volume by time slot</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={hourlySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sales" fill="#0ea5e9" name="Sales" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
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
              <span className="text-sm font-semibold">7 Days</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShoppingCart className="h-4 w-4" />
                Orders Processed
              </div>
              <span className="text-sm font-semibold">490</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                Payment Success
              </div>
              <span className="text-sm font-semibold">98.2%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowUpRight className="h-4 w-4" />
                Sales Growth
              </div>
              <span className="text-sm font-semibold text-green-600">+9.6%</span>
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
              <CardDescription>Detailed transaction listing</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Channel</TableHead>
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
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card className="report-panel border-primary/10 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Top Products and Services</CardTitle>
              <CardDescription>Best performers by revenue and margin</CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              <FileText className="mr-2 h-4 w-4" />
              View Full Report
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Units</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProducts.map(product => (
                <TableRow key={product.name} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell className="text-center">{product.units}</TableCell>
                  <TableCell className="text-right font-semibold">{formatAED(product.revenue)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="border-green-200 text-green-700">
                      {product.margin}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
