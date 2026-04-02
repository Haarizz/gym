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
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle,
  ClipboardList,
  Clock,
  Download,
  FileText,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
} from "lucide-react";

type ReportTemplate = {
  id: string;
  title: string;
  family: "core" | "maintenance" | "compliance" | "executive";
  cadence: "weekly" | "monthly" | "quarterly" | "on-demand";
  status: "live" | "scheduled" | "draft";
  coverage: string;
  owner: string;
  description: string;
  lastGenerated: string;
  formats: string[];
};

type ReportRun = {
  id: string;
  report: string;
  branch: string;
  requestedBy: string;
  generatedOn: string;
  format: "PDF" | "XLSX" | "CSV";
  status: "completed" | "processing" | "queued" | "failed";
  size: string;
};

type ReportSchedule = {
  id: string;
  name: string;
  branch: string;
  cadence: string;
  nextRun: string;
  recipients: number;
  status: "scheduled" | "attention" | "paused";
  note: string;
};

const reportTemplates: ReportTemplate[] = [
  {
    id: "asset-register",
    title: "Asset Register Master Pack",
    family: "core",
    cadence: "weekly",
    status: "live",
    coverage: "All branches",
    owner: "Asset Control",
    description: "Full fixed asset register with IDs, category, custodian, branch, and lifecycle stage.",
    lastGenerated: "2026-04-01 09:20",
    formats: ["PDF", "XLSX"],
  },
  {
    id: "depreciation-pack",
    title: "Depreciation & Book Value Rollforward",
    family: "compliance",
    cadence: "monthly",
    status: "scheduled",
    coverage: "Finance + auditors",
    owner: "Finance Ops",
    description: "Month-end depreciation movements, accumulated depreciation, and net book value detail.",
    lastGenerated: "2026-03-31 18:45",
    formats: ["PDF", "CSV"],
  },
  {
    id: "maintenance-pack",
    title: "Maintenance Cost Review",
    family: "maintenance",
    cadence: "weekly",
    status: "live",
    coverage: "Engineering assets",
    owner: "Facilities",
    description: "Corrective versus preventive maintenance spend, work orders, downtime, and vendor performance.",
    lastGenerated: "2026-04-01 07:10",
    formats: ["PDF", "XLSX"],
  },
  {
    id: "high-value-watchlist",
    title: "High-Value Asset Watchlist",
    family: "executive",
    cadence: "monthly",
    status: "live",
    coverage: "Leadership",
    owner: "Asset Strategy",
    description: "Premium assets by branch with current value, utilization trend, risk flags, and renewal actions.",
    lastGenerated: "2026-03-30 15:00",
    formats: ["PDF"],
  },
  {
    id: "insurance-summary",
    title: "Insurance & Coverage Summary",
    family: "compliance",
    cadence: "quarterly",
    status: "scheduled",
    coverage: "All insured assets",
    owner: "Risk Office",
    description: "Policy coverage, claims in progress, exclusions, and uninsured exposure by category.",
    lastGenerated: "2026-03-25 13:20",
    formats: ["PDF", "XLSX"],
  },
  {
    id: "transfer-audit",
    title: "Transfer & Custody Audit",
    family: "core",
    cadence: "on-demand",
    status: "draft",
    coverage: "Inter-branch movements",
    owner: "Operations",
    description: "Custody changes, transfer approvals, handover evidence, and unresolved destination mismatches.",
    lastGenerated: "2026-03-18 11:05",
    formats: ["PDF", "CSV"],
  },
];

const reportRuns: ReportRun[] = [
  { id: "RUN-2418", report: "Asset Register Master Pack", branch: "Downtown Dubai", requestedBy: "Sarah Ahmed", generatedOn: "2026-04-01 09:20", format: "XLSX", status: "completed", size: "4.8 MB" },
  { id: "RUN-2417", report: "Maintenance Cost Review", branch: "Marina", requestedBy: "Ahmed Hassan", generatedOn: "2026-04-01 07:10", format: "PDF", status: "completed", size: "2.1 MB" },
  { id: "RUN-2416", report: "Depreciation & Book Value Rollforward", branch: "All Branches", requestedBy: "Finance Bot", generatedOn: "2026-03-31 18:45", format: "CSV", status: "completed", size: "1.2 MB" },
  { id: "RUN-2415", report: "Insurance & Coverage Summary", branch: "JVC", requestedBy: "Risk Office", generatedOn: "2026-03-31 14:10", format: "PDF", status: "processing", size: "Generating" },
  { id: "RUN-2414", report: "High-Value Asset Watchlist", branch: "Downtown Dubai", requestedBy: "General Manager", generatedOn: "2026-03-30 15:00", format: "PDF", status: "completed", size: "1.9 MB" },
  { id: "RUN-2413", report: "Transfer & Custody Audit", branch: "Marina", requestedBy: "Operations Lead", generatedOn: "2026-03-29 16:32", format: "CSV", status: "failed", size: "0 MB" },
];

const scheduleQueue: ReportSchedule[] = [
  { id: "SCH-11", name: "Month-end depreciation pack", branch: "All Branches", cadence: "Monthly · 6:00 AM", nextRun: "2026-04-05 06:00", recipients: 6, status: "scheduled", note: "Auto-delivers to finance and compliance owners." },
  { id: "SCH-12", name: "Weekly maintenance review", branch: "Downtown Dubai", cadence: "Weekly · Monday", nextRun: "2026-04-06 08:30", recipients: 4, status: "scheduled", note: "Targets gym floor, HVAC, and safety equipment." },
  { id: "SCH-13", name: "Insurance exception summary", branch: "All Branches", cadence: "Quarterly · 9:00 AM", nextRun: "2026-04-12 09:00", recipients: 3, status: "attention", note: "Waiting for two missing policy attachments from Marina." },
];

const dispatchTrend = [
  { month: "Nov", generated: 12, scheduled: 8, downloads: 31 },
  { month: "Dec", generated: 15, scheduled: 10, downloads: 38 },
  { month: "Jan", generated: 18, scheduled: 12, downloads: 47 },
  { month: "Feb", generated: 16, scheduled: 11, downloads: 43 },
  { month: "Mar", generated: 22, scheduled: 14, downloads: 56 },
  { month: "Apr", generated: 19, scheduled: 13, downloads: 49 },
];

const formatMix = [
  { name: "PDF", value: 58, color: "#2563eb" },
  { name: "XLSX", value: 27, color: "#16a34a" },
  { name: "CSV", value: 15, color: "#f97316" },
];

const compliancePacks = [
  { title: "Depreciation close readiness", owner: "Finance Ops", progress: 92, note: "Only two April additions are still pending tagging before close." },
  { title: "Custody evidence coverage", owner: "Operations", progress: 84, note: "Three transfer records are missing signed handover attachments." },
  { title: "Insurance policy linkage", owner: "Risk Office", progress: 88, note: "Coverage is complete except for a pending cardio zone endorsement." },
];

const statusClassMap: Record<ReportTemplate["status"] | ReportRun["status"] | ReportSchedule["status"], string> = {
  live: "bg-green-100 text-green-800 border-green-200",
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  draft: "bg-slate-100 text-slate-800 border-slate-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  processing: "bg-amber-100 text-amber-800 border-amber-200",
  queued: "bg-indigo-100 text-indigo-800 border-indigo-200",
  failed: "bg-red-100 text-red-800 border-red-200",
  attention: "bg-amber-100 text-amber-800 border-amber-200",
  paused: "bg-slate-100 text-slate-800 border-slate-200",
};

export function AssetReports() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedFamily, setSelectedFamily] = useState("all");
  const [selectedCadence, setSelectedCadence] = useState("all");
  const cardShell = "border-primary/10 shadow-md hover:shadow-lg transition-shadow";

  const filteredTemplates = useMemo(() => {
    return reportTemplates.filter((template) => {
      const matchesSearch =
        template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.coverage.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFamily = selectedFamily === "all" || template.family === selectedFamily;
      const matchesCadence = selectedCadence === "all" || template.cadence === selectedCadence;
      return matchesSearch && matchesFamily && matchesCadence;
    });
  }, [searchTerm, selectedCadence, selectedFamily]);

  const filteredRuns = useMemo(() => {
    return reportRuns.filter((run) => {
      const matchesSearch =
        run.report.toLowerCase().includes(searchTerm.toLowerCase()) ||
        run.requestedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        run.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBranch = selectedBranch === "all" || run.branch === selectedBranch || run.branch === "All Branches";
      return matchesSearch && matchesBranch;
    });
  }, [searchTerm, selectedBranch]);

  const filteredSchedules = useMemo(() => {
    return scheduleQueue.filter((schedule) =>
      selectedBranch === "all" || schedule.branch === selectedBranch || schedule.branch === "All Branches"
    );
  }, [selectedBranch]);

  const stats = useMemo(() => {
    return {
      liveTemplates: reportTemplates.filter((template) => template.status !== "draft").length,
      completedRuns: filteredRuns.filter((run) => run.status === "completed").length,
      scheduledDispatches: filteredSchedules.filter((schedule) => schedule.status === "scheduled").length,
      complianceReady: compliancePacks.filter((pack) => pack.progress >= 85).length,
    };
  }, [filteredRuns, filteredSchedules]);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Asset Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Audit-ready asset reporting for registers, depreciation, custody, maintenance, and coverage.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toast.success("Asset report data refreshed.", {
                description: "Report queues and library metadata were synced in the UI."
              })
            }
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toast.success("Export package prepared.", {
                description: "Mock ZIP bundle contains the currently visible report runs."
              })
            }
          >
            <Download className="mr-2 h-4 w-4" />
            Export Package
          </Button>
          <Button
            size="sm"
            onClick={() =>
              toast.success("Executive bundle generated.", {
                description: "Leadership summary, depreciation rollforward, and high-value watchlist are ready."
              })
            }
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Bundle
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes assetReportFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .asset-report-panel {
          animation: assetReportFadeIn 0.22s ease-out;
        }
      `}</style>

      <Card className="asset-report-panel overflow-hidden border-primary/10 shadow-md">
        <CardContent className="p-0">
          <div className="grid gap-6 bg-gradient-to-r from-primary/10 via-white to-emerald-50 p-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              <Badge variant="outline" className="w-fit border-primary/20 bg-white/80 text-primary">
                Asset intelligence reporting
              </Badge>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Keep finance, operations, and compliance on the same page.</h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  The reporting layer now groups operational packs, automated dispatches, and audit evidence into one cleaner asset reporting workspace.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-white text-slate-700 border border-slate-200">{stats.liveTemplates} active templates</Badge>
                <Badge className="bg-white text-slate-700 border border-slate-200">{stats.scheduledDispatches} live schedules</Badge>
                <Badge className="bg-white text-slate-700 border border-slate-200">{stats.complianceReady} compliance packs ready</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-xl border border-white/70 bg-white/85 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  Register coverage
                </div>
                <p className="mt-2 text-2xl font-bold">99.2%</p>
                <p className="text-xs text-muted-foreground">Assets tagged and traceable across all branches.</p>
              </div>
              <div className="rounded-xl border border-white/70 bg-white/85 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  Audit readiness
                </div>
                <p className="mt-2 text-2xl font-bold">On Track</p>
                <p className="text-xs text-muted-foreground">Month-end support packs are nearly complete for finance close.</p>
              </div>
              <div className="rounded-xl border border-white/70 bg-white/85 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <CalendarDays className="h-4 w-4 text-amber-600" />
                  Next dispatch
                </div>
                <p className="mt-2 text-2xl font-bold">Apr 5</p>
                <p className="text-xs text-muted-foreground">Depreciation package auto-sends at 6:00 AM.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={`${cardShell} asset-report-panel`}>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
                placeholder="Search report names, owners, run IDs, or coverage..."
              />
            </div>

            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                <SelectItem value="All Branches">All Branches Group</SelectItem>
                <SelectItem value="Downtown Dubai">Downtown Dubai</SelectItem>
                <SelectItem value="Marina">Marina</SelectItem>
                <SelectItem value="JVC">JVC</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedFamily} onValueChange={setSelectedFamily}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Family" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Families</SelectItem>
                <SelectItem value="core">Core Packs</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCadence} onValueChange={setSelectedCadence}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Cadence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cadences</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="on-demand">On Demand</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setSelectedBranch("all");
                setSelectedFamily("all");
                setSelectedCadence("all");
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="asset-report-panel grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Live Templates</CardTitle>
            <div className="rounded-lg bg-blue-50 p-2">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats.liveTemplates}</div>
            <p className="text-xs text-muted-foreground">Production-ready packs in the asset report library</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Completed Runs</CardTitle>
            <div className="rounded-lg bg-green-50 p-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{stats.completedRuns}</div>
            <p className="text-xs text-muted-foreground">Visible report runs delivered successfully</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Scheduled Dispatches</CardTitle>
            <div className="rounded-lg bg-purple-50 p-2">
              <Clock className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{stats.scheduledDispatches}</div>
            <p className="text-xs text-muted-foreground">Automated report drops still active</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Compliance Ready</CardTitle>
            <div className="rounded-lg bg-amber-50 p-2">
              <Shield className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{stats.complianceReady}/3</div>
            <p className="text-xs text-muted-foreground">Controls above 85% readiness this cycle</p>
          </CardContent>
        </Card>
      </div>

      <div className="asset-report-panel grid grid-cols-1 gap-6 xl:grid-cols-[1.55fr_1fr]">
        <Card className={cardShell}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Report Activity Trend</CardTitle>
                <CardDescription>Generated packs, scheduled dispatches, and stakeholder downloads.</CardDescription>
              </div>
              <Badge variant="outline">Last 6 months</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={dispatchTrend}>
                <defs>
                  <linearGradient id="generatedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="scheduledFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="generated" stroke="#2563eb" fill="url(#generatedFill)" name="Generated" />
                <Area type="monotone" dataKey="scheduled" stroke="#16a34a" fill="url(#scheduledFill)" name="Scheduled" />
                <Bar dataKey="downloads" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Downloads" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader>
            <CardTitle>Automation Queue</CardTitle>
            <CardDescription>Upcoming report drops and exceptions that need attention.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredSchedules.map((schedule) => (
              <div key={schedule.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{schedule.name}</p>
                    <p className="text-sm text-muted-foreground">{schedule.branch} · {schedule.cadence}</p>
                  </div>
                  <Badge className={statusClassMap[schedule.status]}>{schedule.status}</Badge>
                </div>
                <p className="mt-3 text-sm text-slate-600">{schedule.note}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{schedule.recipients} recipients</span>
                  <span>Next run: {schedule.nextRun}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="library" className="asset-report-panel space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[420px]">
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="runs">Recent Runs</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className={cardShell}>
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{template.title}</CardTitle>
                        <CardDescription>{template.description}</CardDescription>
                      </div>
                      <Badge className={statusClassMap[template.status]}>{template.status}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="capitalize">{template.family}</Badge>
                      <Badge variant="outline" className="capitalize">{template.cadence}</Badge>
                      <Badge variant="outline">{template.coverage}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Owner</p>
                        <p className="mt-1 font-medium">{template.owner}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Last Generated</p>
                        <p className="mt-1 font-medium">{template.lastGenerated}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {template.formats.map((format) => (
                        <Badge key={format} className="bg-primary/5 text-primary border border-primary/10">
                          {format}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          toast.success(`Preview opened for ${template.title}.`, {
                            description: "This uses mock report content for the redesigned UI."
                          })
                        }
                      >
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          toast.success(`${template.title} generated.`, {
                            description: `Output formats: ${template.formats.join(", ")}`
                          })
                        }
                      >
                        Generate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-6">
              <Card className={cardShell}>
                <CardHeader>
                  <CardTitle>Export Format Mix</CardTitle>
                  <CardDescription>Most requested output formats across recent asset report runs.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={formatMix} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>
                        {formatMix.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-3">
                    {formatMix.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span>{entry.name}</span>
                        </div>
                        <span className="font-medium">{entry.value}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className={cardShell}>
                <CardHeader>
                  <CardTitle>Distribution Health</CardTitle>
                  <CardDescription>Operational checkpoints before reports are pushed externally.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {compliancePacks.map((pack) => (
                    <div key={pack.title} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{pack.title}</p>
                          <p className="text-xs text-muted-foreground">Owner: {pack.owner}</p>
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{pack.progress}%</span>
                      </div>
                      <Progress value={pack.progress} className="h-2" />
                      <p className="text-sm text-muted-foreground">{pack.note}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="runs" className="space-y-6">
          <Card className={cardShell}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Report Runs</CardTitle>
                  <CardDescription>Track report execution, file output, and delivery status.</CardDescription>
                </div>
                <Badge variant="outline">{filteredRuns.length} visible runs</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-slate-50/60">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Run ID</TableHead>
                    <TableHead>Report</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Generated On</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRuns.map((run) => (
                    <TableRow key={run.id} className="transition-colors hover:bg-slate-50/60">
                      <TableCell className="font-medium">{run.id}</TableCell>
                      <TableCell>{run.report}</TableCell>
                      <TableCell>{run.branch}</TableCell>
                      <TableCell>{run.requestedBy}</TableCell>
                      <TableCell>{run.generatedOn}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{run.format}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusClassMap[run.status]}>{run.status}</Badge>
                      </TableCell>
                      <TableCell>{run.size}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            toast.success(`Opening ${run.report}.`, {
                              description: `${run.id} is ready for review in the mock UI.`
                            })
                          }
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {compliancePacks.map((pack) => (
              <Card key={pack.title} className={cardShell}>
                <CardHeader>
                  <CardTitle className="text-lg">{pack.title}</CardTitle>
                  <CardDescription>{pack.owner}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Readiness score</span>
                      <span className="text-xl font-bold">{pack.progress}%</span>
                    </div>
                    <Progress value={pack.progress} className="mt-3 h-2" />
                  </div>
                  <p className="text-sm text-muted-foreground">{pack.note}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      toast.success(`${pack.title} checklist opened.`, {
                        description: "Supporting documents remain mocked for now."
                      })
                    }
                  >
                    Review Checklist
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className={cardShell}>
            <CardHeader>
              <CardTitle>Compliance Dispatch Notes</CardTitle>
              <CardDescription>Quick operational view of what is blocking clean asset reporting.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-medium text-emerald-800">Register completeness</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-900">99.2%</p>
                  <p className="mt-2 text-sm text-emerald-700">Asset IDs and branch custody are almost fully reconciled.</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-800">Evidence gaps</p>
                  <p className="mt-2 text-2xl font-bold text-amber-900">3</p>
                  <p className="mt-2 text-sm text-amber-700">Pending handover proofs are delaying full custody audit sign-off.</p>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm font-medium text-blue-800">Auto-distribution</p>
                  <p className="mt-2 text-2xl font-bold text-blue-900">11</p>
                  <p className="mt-2 text-sm text-blue-700">Recipients receive reports via the scheduled report queue.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
