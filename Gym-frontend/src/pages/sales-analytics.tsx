import React, { useMemo } from "react";
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
  Brain,
  Download,
  LineChart as LineChartIcon,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  ShoppingBag,
  BadgeCheck,
  Wallet,
} from "lucide-react";

const monthlyPerformance = [
  { month: "Oct", revenue: 120000, target: 112000, orders: 620 },
  { month: "Nov", revenue: 128500, target: 118000, orders: 680 },
  { month: "Dec", revenue: 142800, target: 125000, orders: 720 },
  { month: "Jan", revenue: 151200, target: 132000, orders: 760 },
  { month: "Feb", revenue: 162400, target: 140000, orders: 820 },
  { month: "Mar", revenue: 174600, target: 150000, orders: 860 },
];

const customerMix = [
  { month: "Oct", newCustomers: 210, returning: 410 },
  { month: "Nov", newCustomers: 240, returning: 440 },
  { month: "Dec", newCustomers: 260, returning: 460 },
  { month: "Jan", newCustomers: 280, returning: 480 },
  { month: "Feb", newCustomers: 300, returning: 520 },
  { month: "Mar", newCustomers: 320, returning: 540 },
];

const productPerformance = [
  { name: "Memberships", revenue: 68400, growth: 12.4, margin: 68 },
  { name: "PT Packages", revenue: 35650, growth: 9.1, margin: 52 },
  { name: "Supplements", revenue: 28400, growth: 6.8, margin: 34 },
  { name: "Merchandise", revenue: 15800, growth: 4.2, margin: 46 },
  { name: "Cafe", revenue: 12400, growth: 7.6, margin: 29 },
];

const channelPerformance = [
  { channel: "POS", revenue: 82400, conversion: 4.8, orders: 410 },
  { channel: "Online", revenue: 29650, conversion: 3.6, orders: 188 },
  { channel: "Corporate", revenue: 18500, conversion: 5.4, orders: 72 },
  { channel: "Referrals", revenue: 12200, conversion: 6.1, orders: 68 },
];

const heatmapDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const heatmapHours = ["6-9", "9-12", "12-3", "3-6", "6-9", "9-12"];
const heatmapValues = [
  [18, 34, 28, 42, 55, 24],
  [22, 36, 30, 45, 58, 26],
  [20, 32, 29, 40, 60, 28],
  [24, 38, 32, 48, 64, 30],
  [28, 44, 36, 52, 72, 34],
  [30, 46, 40, 56, 78, 38],
  [26, 40, 34, 50, 66, 32],
];

const formatAED = (value: number) => `AED ${value.toLocaleString()}`;

export function SalesAnalytics() {
  const totals = useMemo(() => {
    const totalRevenue = monthlyPerformance.reduce((sum, m) => sum + m.revenue, 0);
    const totalOrders = monthlyPerformance.reduce((sum, m) => sum + m.orders, 0);
    return {
      totalRevenue,
      totalOrders,
      avgOrderValue: Math.round(totalRevenue / Math.max(totalOrders, 1)),
    };
  }, []);

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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 analytics-panel">
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Revenue</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{formatAED(totals.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">+11.2% growth</p>
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
            <div className="text-2xl font-bold text-blue-700">{totals.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">+8.9% increase</p>
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
            <div className="text-2xl font-bold text-purple-700">{formatAED(totals.avgOrderValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Stable across channels</p>
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
            <div className="text-2xl font-bold text-amber-700">62%</div>
            <p className="text-xs text-muted-foreground mt-1">Return customers</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Conversion Rate</CardTitle>
            <div className="bg-indigo-50 p-2 rounded-lg">
              <Target className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-700">5.2%</div>
            <p className="text-xs text-muted-foreground mt-1">Lead to sale</p>
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
                <CardDescription>Monthly performance against goals</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={monthlyPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#2563eb" name="Revenue" radius={[6, 6, 0, 0]} />
                    <Line type="monotone" dataKey="target" stroke="#f97316" strokeWidth={2} name="Target" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Customer Mix</CardTitle>
                <CardDescription>New vs returning revenue</CardDescription>
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
                    <Area type="monotone" dataKey="newCustomers" stroke="#6366f1" fill="url(#newFill)" name="New" />
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
                <CardDescription>Orders growth and trend line</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={monthlyPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="orders" stroke="#0ea5e9" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>Lead to membership conversion</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Leads Captured</span>
                    <span className="font-semibold">2,480</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Trials Booked</span>
                    <span className="font-semibold">1,420</span>
                  </div>
                  <Progress value={57} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Converted to Members</span>
                    <span className="font-semibold">842</span>
                  </div>
                  <Progress value={34} className="h-2" />
                </div>
                <div className="text-xs text-muted-foreground">
                  Conversion rate improved by 1.6% compared to last quarter.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Customer Activity Heatmap</CardTitle>
                <CardDescription>Sales intensity by day and hour</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-[70px_repeat(6,1fr)] gap-2 text-xs">
                  <div />
                  {heatmapHours.map(hour => (
                    <div key={hour} className="text-center text-muted-foreground">{hour}</div>
                  ))}
                  {heatmapDays.map((day, dayIndex) => (
                    <React.Fragment key={day}>
                      <div className="text-muted-foreground flex items-center">{day}</div>
                      {heatmapValues[dayIndex].map((value, idx) => {
                        const intensity = Math.min(1, value / 80);
                        return (
                          <div
                            key={`${day}-${idx}`}
                            className="h-8 rounded-md"
                            style={{ backgroundColor: `rgba(37, 99, 235, ${0.15 + intensity * 0.6})` }}
                            title={`${value} sales`}
                          />
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Customer Insights</CardTitle>
                <CardDescription>Retention and loyalty metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Users className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold">High retention cohort</p>
                    <p className="text-sm text-muted-foreground">
                      Members acquired in Q4 show 74% repeat purchase rate.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <ArrowUpRight className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Upsell opportunity</p>
                    <p className="text-sm text-muted-foreground">
                      32% of online buyers have not tried PT services.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Peak engagement</p>
                    <p className="text-sm text-muted-foreground">
                      Evening slots drive 42% of daily revenue.
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
              <CardTitle>Product Performance</CardTitle>
              <CardDescription>Revenue, growth, and margins by category</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
                {productPerformance.map(product => (
                  <div key={product.name} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{product.name}</p>
                      <Badge variant="outline" className="border-green-200 text-green-700">
                        +{product.growth}%
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Revenue</p>
                    <p className="text-lg font-bold">{formatAED(product.revenue)}</p>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>Margin</span>
                        <span>{product.margin}%</span>
                      </div>
                      <Progress value={product.margin} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Channel Performance</CardTitle>
                <CardDescription>Revenue and conversion by channel</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={channelPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="channel" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#7c3aed" name="Revenue" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Channel Conversion</CardTitle>
                <CardDescription>Order volume and conversion rate</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {channelPerformance.map(channel => (
                  <div key={channel.channel} className="flex items-center justify-between border rounded-lg px-4 py-3">
                    <div>
                      <p className="font-semibold">{channel.channel}</p>
                      <p className="text-xs text-muted-foreground">{channel.orders} orders</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatAED(channel.revenue)}</p>
                      <p className="text-xs text-muted-foreground">Conversion {channel.conversion}%</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Insights Footer */}
      <Card className="analytics-panel border-primary/10 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>Actionable Insights</CardTitle>
          <CardDescription>Key recommendations based on current trends</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <LineChartIcon className="h-4 w-4 text-blue-600" />
              Lift weekday performance
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Tuesday and Wednesday sales lag 8% behind the weekly average. Run bundle offers on those days.
            </p>
          </div>
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="h-4 w-4 text-green-600" />
              Focus on memberships
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Membership upgrades contribute 41% of revenue growth. Promote annual plans in POS flow.
            </p>
          </div>
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-purple-600" />
              Improve conversion
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Corporate leads convert at 6.1%. Expand outbound follow-ups to boost pipeline velocity.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
