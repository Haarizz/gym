import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Progress } from "../components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Brain,
  Building2,
  Download,
  Gauge,
  LineChart as LineChartIcon,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Wrench,
} from "lucide-react";

type CategoryPerformance = {
  category: string;
  assets: number;
  utilization: number;
  downtime: number;
  roi: number;
  maintenanceCost: number;
};

type BranchHealth = {
  branch: string;
  activeAssets: number;
  utilization: number;
  maintenanceCost: number;
  incidents: number;
  readiness: number;
};

type RiskAsset = {
  id: string;
  asset: string;
  branch: string;
  category: string;
  issue: string;
  risk: "high" | "medium" | "low";
  owner: string;
  nextAction: string;
};

const portfolioTrend = [
  { month: "Nov", bookValue: 2140000, replacementValue: 2610000, maintenanceCost: 42000 },
  { month: "Dec", bookValue: 2185000, replacementValue: 2660000, maintenanceCost: 44800 },
  { month: "Jan", bookValue: 2230000, replacementValue: 2715000, maintenanceCost: 43100 },
  { month: "Feb", bookValue: 2295000, replacementValue: 2784000, maintenanceCost: 46900 },
  { month: "Mar", bookValue: 2360000, replacementValue: 2860000, maintenanceCost: 51200 },
  { month: "Apr", bookValue: 2415000, replacementValue: 2925000, maintenanceCost: 48700 },
];

const lifecycleMix = [
  { name: "Commissioned", value: 54, color: "#2563eb" },
  { name: "In Service", value: 218, color: "#22c55e" },
  { name: "Maintenance", value: 26, color: "#f59e0b" },
  { name: "Retirement Review", value: 12, color: "#ef4444" },
];

const weeklyServiceLoad = [
  { week: "W1", preventive: 18, corrective: 7 },
  { week: "W2", preventive: 22, corrective: 9 },
  { week: "W3", preventive: 20, corrective: 6 },
  { week: "W4", preventive: 24, corrective: 8 },
  { week: "W5", preventive: 19, corrective: 5 },
];

const categoryPerformance: CategoryPerformance[] = [
  { category: "Cardio", assets: 48, utilization: 88, downtime: 3.4, roi: 14.2, maintenanceCost: 18500 },
  { category: "Strength", assets: 66, utilization: 82, downtime: 4.1, roi: 12.8, maintenanceCost: 16200 },
  { category: "Technology", assets: 39, utilization: 74, downtime: 2.2, roi: 10.4, maintenanceCost: 9800 },
  { category: "Facility", assets: 24, utilization: 91, downtime: 5.8, roi: 16.1, maintenanceCost: 21100 },
  { category: "Furniture", assets: 31, utilization: 63, downtime: 1.4, roi: 7.9, maintenanceCost: 4300 },
];

const branchHealth: BranchHealth[] = [
  { branch: "Downtown Dubai", activeAssets: 132, utilization: 91, maintenanceCost: 24500, incidents: 2, readiness: 94 },
  { branch: "Marina", activeAssets: 108, utilization: 86, maintenanceCost: 18800, incidents: 3, readiness: 90 },
  { branch: "JVC", activeAssets: 94, utilization: 79, maintenanceCost: 15400, incidents: 4, readiness: 84 },
];

const riskWatchlist: RiskAsset[] = [
  { id: "AST-104", asset: "HVAC Plant 02", branch: "Downtown Dubai", category: "Facility", issue: "Maintenance cost 34% above baseline", risk: "high", owner: "Facilities Lead", nextAction: "Vendor inspection booked for Apr 4" },
  { id: "AST-219", asset: "Treadmill Row B-07", branch: "Marina", category: "Cardio", issue: "Utilization spike with repeat downtime events", risk: "medium", owner: "Gym Floor Supervisor", nextAction: "Swap motor belt and review evening load" },
  { id: "AST-331", asset: "MacBook Front Desk 03", branch: "JVC", category: "Technology", issue: "Warranty expires in 18 days", risk: "low", owner: "IT Support", nextAction: "Renew device coverage or replace unit" },
  { id: "AST-087", asset: "Smith Machine Elite", branch: "Downtown Dubai", category: "Strength", issue: "Inspection flagged for frame wear", risk: "high", owner: "Safety Officer", nextAction: "Temporary restriction pending structural review" },
];

const riskClassMap: Record<RiskAsset["risk"], string> = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const formatAED = (value: number) =>
  new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(value);

const formatCompactAED = (value: number) =>
  `AED ${Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`;

export function AssetAnalytics() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("last-6");
  const cardShell = "border-primary/10 shadow-md hover:shadow-lg transition-shadow";

  const filteredCategories = useMemo(() => {
    return categoryPerformance.filter((item) => selectedCategory === "all" || item.category === selectedCategory);
  }, [selectedCategory]);

  const filteredBranches = useMemo(() => {
    return branchHealth.filter((item) => selectedBranch === "all" || item.branch === selectedBranch);
  }, [selectedBranch]);

  const filteredRisks = useMemo(() => {
    return riskWatchlist.filter((item) => {
      const matchesSearch =
        item.asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.issue.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBranch = selectedBranch === "all" || item.branch === selectedBranch;
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      return matchesSearch && matchesBranch && matchesCategory;
    });
  }, [searchTerm, selectedBranch, selectedCategory]);

  const stats = useMemo(() => {
    const activeAssets = filteredBranches.reduce((sum, branch) => sum + branch.activeAssets, 0);
    const maintenanceSpend = filteredBranches.reduce((sum, branch) => sum + branch.maintenanceCost, 0);
    const avgUtilization = filteredBranches.length
      ? Math.round(filteredBranches.reduce((sum, branch) => sum + branch.utilization, 0) / filteredBranches.length)
      : 0;
    const readiness = filteredBranches.length
      ? Math.round(filteredBranches.reduce((sum, branch) => sum + branch.readiness, 0) / filteredBranches.length)
      : 0;
    const roi = filteredCategories.length
      ? (filteredCategories.reduce((sum, category) => sum + category.roi, 0) / filteredCategories.length).toFixed(1)
      : "0.0";

    return {
      activeAssets,
      maintenanceSpend,
      avgUtilization,
      readiness,
      roi,
      highRisk: filteredRisks.filter((item) => item.risk === "high").length,
    };
  }, [filteredBranches, filteredCategories, filteredRisks]);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Asset Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Utilization, maintenance pressure, lifecycle health, and branch readiness in one analytics layer.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toast.success("Analytics export queued.", {
                description: "The current mock dashboard snapshot is being packaged."
              })
            }
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toast.success("Portfolio recalculated.", {
                description: "Asset health indicators were refreshed in the UI."
              })
            }
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() =>
              toast.success("Insight brief prepared.", {
                description: "Mock recommendations are ready for asset operations and finance."
              })
            }
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Insights
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes assetAnalyticsFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .asset-analytics-panel {
          animation: assetAnalyticsFadeIn 0.22s ease-out;
        }
      `}</style>

      <Card className="asset-analytics-panel overflow-hidden border-primary/10 shadow-md">
        <CardContent className="p-0">
          <div className="grid gap-6 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 p-6 text-white lg:grid-cols-[1.45fr_1fr]">
            <div className="space-y-4">
              <Badge className="w-fit border border-white/10 bg-white/10 text-white hover:bg-white/10">
                Asset intelligence layer
              </Badge>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Turn asset data into operating decisions.</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-300">
                  This redesigned analytics page makes it easier to spot value drift, maintenance concentration, and readiness risk before they hit operations.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-200">
                    <Gauge className="h-4 w-4 text-emerald-300" />
                    Fleet utilization
                  </div>
                  <p className="mt-2 text-2xl font-bold">{stats.avgUtilization}%</p>
                  <p className="text-xs text-slate-400">Healthy demand across the visible asset mix.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-200">
                    <Shield className="h-4 w-4 text-cyan-300" />
                    Readiness score
                  </div>
                  <p className="mt-2 text-2xl font-bold">{stats.readiness}%</p>
                  <p className="text-xs text-slate-400">Composite score for documentation, uptime, and branch controls.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-200">
                    <Brain className="h-4 w-4 text-amber-300" />
                    Priority risk
                  </div>
                  <p className="mt-2 text-2xl font-bold">{stats.highRisk}</p>
                  <p className="text-xs text-slate-400">Assets need immediate follow-up in the watchlist.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-200">
                  <TrendingUp className="h-4 w-4 text-emerald-300" />
                  Signal 1
                </div>
                <p className="mt-2 text-sm text-slate-300">Cardio utilization is leading the network, especially at Marina after the evening floor expansion.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-200">
                  <Wrench className="h-4 w-4 text-amber-300" />
                  Signal 2
                </div>
                <p className="mt-2 text-sm text-slate-300">Facility maintenance cost is still elevated, driven by HVAC and electrical equipment concentration.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-200">
                  <Target className="h-4 w-4 text-cyan-300" />
                  Signal 3
                </div>
                <p className="mt-2 text-sm text-slate-300">JVC has the lowest readiness score, mostly because of expiring warranties and slower maintenance closure.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={`${cardShell} asset-analytics-panel`}>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
                placeholder="Search asset IDs, names, or risk notes..."
              />
            </div>

            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                <SelectItem value="Downtown Dubai">Downtown Dubai</SelectItem>
                <SelectItem value="Marina">Marina</SelectItem>
                <SelectItem value="JVC">JVC</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Cardio">Cardio</SelectItem>
                <SelectItem value="Strength">Strength</SelectItem>
                <SelectItem value="Technology">Technology</SelectItem>
                <SelectItem value="Facility">Facility</SelectItem>
                <SelectItem value="Furniture">Furniture</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-6">Last 6 Months</SelectItem>
                <SelectItem value="last-12">Last 12 Months</SelectItem>
                <SelectItem value="qtd">Quarter to Date</SelectItem>
                <SelectItem value="ytd">Year to Date</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setSelectedBranch("all");
                setSelectedCategory("all");
                setSelectedPeriod("last-6");
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="asset-analytics-panel grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Active Assets</CardTitle>
            <div className="rounded-lg bg-blue-50 p-2">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats.activeAssets}</div>
            <p className="text-xs text-muted-foreground">Assets currently included in the selected view</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Avg Utilization</CardTitle>
            <div className="rounded-lg bg-emerald-50 p-2">
              <Activity className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{stats.avgUtilization}%</div>
            <p className="text-xs text-muted-foreground">Average usage intensity across visible branches</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Maintenance Spend</CardTitle>
            <div className="rounded-lg bg-amber-50 p-2">
              <Wrench className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{formatCompactAED(stats.maintenanceSpend)}</div>
            <p className="text-xs text-muted-foreground">Current run-rate for visible branches</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Average ROI</CardTitle>
            <div className="rounded-lg bg-purple-50 p-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{stats.roi}%</div>
            <p className="text-xs text-muted-foreground">Average return across the visible asset categories</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">High Risk Assets</CardTitle>
            <div className="rounded-lg bg-red-50 p-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{stats.highRisk}</div>
            <p className="text-xs text-muted-foreground">Items demanding immediate operational response</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="asset-analytics-panel space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[520px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
            <Card className={cardShell}>
              <CardHeader>
                <CardTitle>Portfolio Value & Maintenance Trend</CardTitle>
                <CardDescription>Book value, replacement value, and maintenance run-rate over the selected period.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={portfolioTrend}>
                    <defs>
                      <linearGradient id="bookValueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" tickFormatter={(value) => `${Math.round(value / 1000000)}M`} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${Math.round(value / 1000)}K`} />
                    <Tooltip formatter={(value: number) => formatAED(value)} />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="bookValue" stroke="#2563eb" fill="url(#bookValueFill)" name="Book Value" />
                    <Line yAxisId="left" type="monotone" dataKey="replacementValue" stroke="#22c55e" strokeWidth={2.5} name="Replacement Value" />
                    <Bar yAxisId="right" dataKey="maintenanceCost" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Maintenance Cost" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className={cardShell}>
              <CardHeader>
                <CardTitle>Lifecycle Mix</CardTitle>
                <CardDescription>How the portfolio is distributed across service stages.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={lifecycleMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                      {lifecycleMix.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} assets`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {lifecycleMix.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className={cardShell}>
              <CardHeader>
                <CardTitle>Category Utilization Snapshot</CardTitle>
                <CardDescription>Usage intensity and maintenance burden by asset category.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={filteredCategories}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="utilization" fill="#2563eb" radius={[6, 6, 0, 0]} name="Utilization %" />
                    <Bar dataKey="downtime" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Downtime %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className={cardShell}>
              <CardHeader>
                <CardTitle>Service Load</CardTitle>
                <CardDescription>Preventive versus corrective demand across the latest service cycle.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={weeklyServiceLoad}>
                    <defs>
                      <linearGradient id="preventiveFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.04} />
                      </linearGradient>
                      <linearGradient id="correctiveFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="preventive" stroke="#22c55e" fill="url(#preventiveFill)" name="Preventive" />
                    <Area type="monotone" dataKey="corrective" stroke="#ef4444" fill="url(#correctiveFill)" name="Corrective" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="lifecycle" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {filteredCategories.map((item) => (
              <Card key={item.category} className={cardShell}>
                <CardHeader>
                  <CardTitle className="text-lg">{item.category}</CardTitle>
                  <CardDescription>{item.assets} tracked assets in this category</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Utilization</span>
                      <span className="font-medium">{item.utilization}%</span>
                    </div>
                    <Progress value={item.utilization} className="h-2" />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">ROI</p>
                      <p className="mt-1 font-semibold">{item.roi}%</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Downtime</p>
                      <p className="mt-1 font-semibold">{item.downtime}%</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Spend</p>
                      <p className="mt-1 font-semibold">{formatCompactAED(item.maintenanceCost)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className={cardShell}>
            <CardHeader>
              <CardTitle>Lifecycle Performance Table</CardTitle>
              <CardDescription>Compare asset categories on return, utilization, and maintenance intensity.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-slate-50/60">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Category</TableHead>
                    <TableHead>Assets</TableHead>
                    <TableHead>Utilization</TableHead>
                    <TableHead>ROI</TableHead>
                    <TableHead>Downtime</TableHead>
                    <TableHead>Maintenance Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((item) => (
                    <TableRow key={item.category} className="transition-colors hover:bg-slate-50/60">
                      <TableCell className="font-medium">{item.category}</TableCell>
                      <TableCell>{item.assets}</TableCell>
                      <TableCell>{item.utilization}%</TableCell>
                      <TableCell>{item.roi}%</TableCell>
                      <TableCell>{item.downtime}%</TableCell>
                      <TableCell>{formatAED(item.maintenanceCost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.55fr_1fr]">
            <Card className={cardShell}>
              <CardHeader>
                <CardTitle>Risk Watchlist</CardTitle>
                <CardDescription>Assets with operational, financial, or compliance signals that need follow-up.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader className="bg-slate-50/60">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Asset</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Next Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRisks.map((item) => (
                      <TableRow key={item.id} className="transition-colors hover:bg-slate-50/60">
                        <TableCell className="font-medium">
                          <div>
                            <div>{item.asset}</div>
                            <div className="text-xs text-muted-foreground">{item.id}</div>
                          </div>
                        </TableCell>
                        <TableCell>{item.branch}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.issue}</TableCell>
                        <TableCell>
                          <Badge className={riskClassMap[item.risk]}>{item.risk}</Badge>
                        </TableCell>
                        <TableCell>{item.owner}</TableCell>
                        <TableCell>{item.nextAction}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className={cardShell}>
              <CardHeader>
                <CardTitle>Recommended Actions</CardTitle>
                <CardDescription>Mock decision aids derived from the visible risk and maintenance profile.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-red-800">
                    <AlertTriangle className="h-4 w-4" />
                    Immediate containment
                  </div>
                  <p className="mt-2 text-sm text-red-700">Restrict use of frame-wear equipment until structural inspection is closed.</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                    <Wrench className="h-4 w-4" />
                    Cost control
                  </div>
                  <p className="mt-2 text-sm text-amber-700">Bundle HVAC vendor calls into a planned maintenance window to cut emergency charges.</p>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
                    <ArrowUpRight className="h-4 w-4" />
                    Governance
                  </div>
                  <p className="mt-2 text-sm text-blue-700">Review expiring warranties at JVC before the next monthly close packet is issued.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="branches" className="space-y-6">
          <Card className={cardShell}>
            <CardHeader>
              <CardTitle>Branch Performance Comparison</CardTitle>
              <CardDescription>Utilization and readiness side by side across the network.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={filteredBranches}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="branch" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="utilization" fill="#2563eb" radius={[6, 6, 0, 0]} name="Utilization %" />
                  <Bar dataKey="readiness" fill="#22c55e" radius={[6, 6, 0, 0]} name="Readiness %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {filteredBranches.map((branch) => (
              <Card key={branch.branch} className={cardShell}>
                <CardHeader>
                  <CardTitle className="text-lg">{branch.branch}</CardTitle>
                  <CardDescription>{branch.activeAssets} active assets</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Utilization</p>
                      <p className="mt-1 text-lg font-semibold">{branch.utilization}%</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Readiness</p>
                      <p className="mt-1 text-lg font-semibold">{branch.readiness}%</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Maintenance</p>
                      <p className="mt-1 text-lg font-semibold">{formatCompactAED(branch.maintenanceCost)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Incidents</p>
                      <p className="mt-1 text-lg font-semibold">{branch.incidents}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      toast.success(`${branch.branch} drill-down opened.`, {
                        description: "Branch-level analytics remain mocked but interactive."
                      })
                    }
                  >
                    <LineChartIcon className="mr-2 h-4 w-4" />
                    View Branch Drill-down
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
