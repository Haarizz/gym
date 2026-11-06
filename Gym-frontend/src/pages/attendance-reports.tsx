import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { Progress } from "../components/ui/progress";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Switch } from "../components/ui/switch";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { motion } from "motion/react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Download,
  Filter,
  Users,
  Clock,
  TrendingUp,
  Calendar as CalendarIcon,
  AlertCircle,
  Lightbulb,
  FileText,
  Mail,
  Activity,
  Dumbbell,
  User,
  Target,
  BarChart3,
  RefreshCw,
  ArrowLeft,
  Printer,
  TableIcon,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../components/ui/breadcrumb";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { authService } from "../utils/supabase/auth-service";
import { attendanceService } from "../utils/supabase/attendance-service";
import {
  ReportActions, useReportExporter, type ReportDocument, chartFromRows, col, countCol, kpiSection, pieSection, tableSection,
} from "../components/report-export";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

interface AttendanceReportsProps {
  onNavigate?: (section: string) => void;
}

interface DailySummaryRow {
  date: string;
  fullDate: string;
  visits: number;
  avgDuration: number;
}

interface ActivityRow {
  type: string;
  count: number;
  percentage: number;
}

interface PeakHourRow {
  hour: string;
  label: string;
  Mon: number; Tue: number; Wed: number; Thu: number; Fri: number; Sat: number; Sun: number;
}

interface FacilityRow {
  name: string;
  value: number;
  count: number;
  color: string;
}

interface MemberRow {
  id: number;
  name: string;
  visits: number;
  attendanceRate: number;
}

interface InsightRow {
  id: number;
  type: "success" | "warning" | "info";
  title: string;
  message: string;
}

interface MonthlyRow {
  month: string;
  visits: number;
}

interface ReportSummary {
  totalVisits: number;
  avgDailyVisits: number;
  attendanceRate: number;
  peakHour: string;
  totalActiveMembers: number;
  daysInRange: number;
}

interface ReportData {
  dailySummary: DailySummaryRow[];
  activityBreakdown: ActivityRow[];
  peakHours: PeakHourRow[];
  facilityBreakdown: FacilityRow[];
  topConsistentMembers: MemberRow[];
  irregularMembers: MemberRow[];
  monthlyTrend: MonthlyRow[];
  insights: InsightRow[];
  summary: ReportSummary;
}

interface TrainerRow {
  id: number;
  name: string;
  role: string;
  department: string;
  photoUrl: string;
  sessions: number;
  totalMinutes: number;
  avgSessionMinutes: number;
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchReport(startDate: string, endDate: string): Promise<ReportData> {
  const res = await authService.makeAuthenticatedRequest(
    `${BASE}/attendance/reports?startDate=${startDate}&endDate=${endDate}`
  );
  if (!res.ok) throw new Error(`Failed to load report: ${res.status}`);
  return res.json();
}

async function fetchTrainerReport(startDate: string, endDate: string): Promise<TrainerRow[]> {
  const res = await authService.makeAuthenticatedRequest(
    `${BASE}/staff/attendance/reports?startDate=${startDate}&endDate=${endDate}`
  );
  if (!res.ok) throw new Error(`Failed to load trainer report: ${res.status}`);
  return res.json();
}

// ── Export helpers ────────────────────────────────────────────────────────────

function fmtDuration(mins: number): string {
  if (!mins) return "—";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/** The full attendance report (every tab) for export / print. */
function buildAttendanceReport(report: ReportData, trainers: TrainerRow[], startStr: string, endStr: string, trainerFilter: string): ReportDocument {
  const s = report.summary;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
  return {
    title: "Attendance Report",
    period: { from: startStr, to: endStr },
    filters: [{ label: "Trainer", value: trainerFilter }],
    sections: [
      kpiSection([
        { label: "Total visits", value: s.totalVisits, format: "integer" },
        { label: "Avg daily visits", value: s.avgDailyVisits, format: "number" },
        { label: "Attendance rate", value: s.attendanceRate, format: "percent" },
        { label: "Peak hour", value: s.peakHour || "—" },
        { label: "Active members", value: s.totalActiveMembers, format: "integer" },
        { label: "Days in range", value: s.daysInRange, format: "integer" },
      ], "Summary"),
      chartFromRows("Daily visits", "bar", report.dailySummary, "date", [{ key: "visits", name: "Visits", color: "#2a78d6" }], { valueFormat: "integer" }),
      tableSection("Daily summary", [col("fullDate", "Date", "date"), countCol("visits", "Visits"), col("avgDuration", "Avg duration", "duration", { total: "avg" })],
        report.dailySummary.map((r) => ({ fullDate: r.fullDate || r.date, visits: r.visits, avgDuration: r.avgDuration > 0 ? r.avgDuration : null })), { totals: true }),
      ...(report.monthlyTrend.length ? [
        chartFromRows("Monthly trend", "line", report.monthlyTrend, "month", [{ key: "visits", name: "Visits", color: "#2a78d6" }], { valueFormat: "integer" }),
      ] : []),
      pieSection("Activity breakdown", report.activityBreakdown.map((a) => ({ label: a.type, value: a.count })), { valueFormat: "integer" }),
      tableSection("Activity breakdown", [col("type", "Activity"), countCol("count", "Visits"), col("percentage", "Share", "percent", { total: "sum" })], report.activityBreakdown, { totals: true }),
      tableSection("Peak hours by weekday", [col("label", "Hour"), ...days.map((d) => countCol(d, d))],
        report.peakHours.map((p) => ({ label: p.label || p.hour, ...Object.fromEntries(days.map((d) => [d, p[d]])) })), { totals: true }),
      pieSection("Facility usage", report.facilityBreakdown.filter((f) => f.count > 0).map((f) => ({ label: f.name, value: f.count })), { valueFormat: "integer" }),
      tableSection("Facility usage", [col("name", "Facility"), countCol("count", "Visits"), col("value", "Share", "percent", { total: "sum" })],
        report.facilityBreakdown.filter((f) => f.count > 0), { totals: true }),
      tableSection("Most consistent members", [col("name", "Member"), countCol("visits", "Visits"), col("attendanceRate", "Attendance rate", "percent")], report.topConsistentMembers),
      tableSection("Irregular members", [col("name", "Member"), countCol("visits", "Visits"), col("attendanceRate", "Attendance rate", "percent")], report.irregularMembers),
      tableSection("Trainer sessions", [col("name", "Trainer"), col("role", "Role"), col("department", "Department"), countCol("sessions", "Sessions"),
        col("totalMinutes", "Total time", "duration", { total: "sum" }), col("avgSessionMinutes", "Avg session", "duration")], trainers, { totals: true }),
      ...(report.insights.length ? [tableSection("Insights", [col("title", "Insight"), col("message", "Detail", "text", { wrap: true })], report.insights)] : []),
    ],
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AttendanceReports({ onNavigate }: AttendanceReportsProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [activeTab, setActiveTab] = useState("overview");
  const [automatedReports, setAutomatedReports] = useState(false);
  const [reportRecipientEmail, setReportRecipientEmail] = useState("");
  const [gymCapacity, setGymCapacity] = useState("150");
  const [savingReportSettings, setSavingReportSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState("all");
  const [sortField, setSortField] = useState<keyof DailySummaryRow>("fullDate");
  const [sortAsc, setSortAsc] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const startStr = dateRange?.from
    ? format(dateRange.from, "yyyy-MM-dd")
    : format(subDays(new Date(), 30), "yyyy-MM-dd");
  const endStr = dateRange?.to
    ? format(dateRange.to, "yyyy-MM-dd")
    : format(new Date(), "yyyy-MM-dd");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rep, tr] = await Promise.all([
        fetchReport(startStr, endStr),
        fetchTrainerReport(startStr, endStr),
      ]);
      setReport(rep);
      setTrainers(tr);
    } catch (e: any) {
      setError(e.message || "Failed to load report data");
      toast.error("Failed to load report", { description: e.message });
    } finally {
      setLoading(false);
    }
  }, [startStr, endStr]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    attendanceService.getReportSettings()
      .then(settings => {
        setAutomatedReports(settings.enabled);
        setReportRecipientEmail(settings.recipient_email || "");
        if (settings.gym_capacity) setGymCapacity(String(settings.gym_capacity));
      })
      .catch(() => {});
  }, []);

  const handleSaveGymCapacity = async () => {
    const capacity = parseInt(gymCapacity, 10);
    if (!capacity || capacity <= 0) {
      toast.error("Enter a valid gym capacity");
      return;
    }
    setSavingReportSettings(true);
    try {
      await attendanceService.updateReportSettings({ enabled: automatedReports, gym_capacity: capacity });
      toast.success("Gym capacity updated", { description: `Occupancy on Check-In is now calculated out of ${capacity}.` });
    } catch (e: any) {
      toast.error("Failed to update gym capacity", { description: e?.message || "Please try again." });
    } finally {
      setSavingReportSettings(false);
    }
  };

  const handleToggleAutomatedReports = async (checked: boolean) => {
    if (checked && !reportRecipientEmail.trim()) {
      toast.error("Enter a recipient email first");
      return;
    }
    setSavingReportSettings(true);
    try {
      await attendanceService.updateReportSettings({
        enabled: checked,
        recipient_email: reportRecipientEmail.trim() || undefined,
      });
      setAutomatedReports(checked);
      toast[checked ? "success" : "info"](
        checked ? "Automated Reports Enabled" : "Automated Reports Disabled",
        {
          description: checked
            ? `A weekly attendance summary will be emailed to ${reportRecipientEmail.trim()} every Monday.`
            : "Automated report delivery has been turned off.",
        }
      );
    } catch (e: any) {
      toast.error("Failed to update report settings", { description: e?.message || "Please try again." });
    } finally {
      setSavingReportSettings(false);
    }
  };

  // ── Sorted summary table ──────────────────────────────────────────────────
  const sortedSummary = useMemo(() => {
    if (!report) return [];
    return [...report.dailySummary].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === "number" && typeof bv === "number")
        return sortAsc ? av - bv : bv - av;
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [report, sortField, sortAsc]);

  const handleSort = (field: keyof DailySummaryRow) => {
    if (sortField === field) setSortAsc((p) => !p);
    else { setSortField(field); setSortAsc(false); }
  };

  const filteredTrainers = useMemo(() => {
    if (selectedTrainer === "all") return trainers;
    return trainers.filter((t) => String(t.id) === selectedTrainer);
  }, [trainers, selectedTrainer]);

  // ── Export / print (shared engine) ───────────────────────────────────────
  const exporter = useReportExporter();
  const buildReport = () => {
    if (!report) throw new Error("No data to export yet");
    const trainerName = selectedTrainer === "all" ? "All trainers" : trainers.find((t) => String(t.id) === selectedTrainer)?.name ?? "All trainers";
    return buildAttendanceReport(report, filteredTrainers, startStr, endStr, trainerName);
  };
  const handleExportPDF = () => exporter.run("pdf", buildReport);
  const handleExportExcel = () => exporter.run("xlsx", buildReport);
  const handlePrint = () => exporter.run("print", buildReport);
  const handleDownloadReport = () => handleExportExcel();

  // ── View Detailed Report (modal) ──────────────────────────────────────────
  const handleViewDetailed = () => {
    if (!report) { toast.error("No data to display"); return; }
    setDetailOpen(true);
  };

  // ── Insight icon helper ───────────────────────────────────────────────────
  const insightIcon = (type: string) => {
    if (type === "success") return TrendingUp;
    if (type === "warning") return AlertCircle;
    return Lightbulb;
  };

  const summary = report?.summary;

  const LoadSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Billing-style tab animation ─────────────────────────────────── */}
      <style>{`
        @keyframes tabSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        [role="tabpanel"][data-state="active"] {
          animation: tabSlideIn 0.22s ease-out;
        }
      `}</style>

      {/* Gradient Header */}
      <div className="bg-gradient-primary text-white py-8 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => onNavigate?.("attendance")}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors text-sm font-medium group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Attendance
          </button>

          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={() => onNavigate?.("community")}
                  className="cursor-pointer text-white/80 hover:text-white"
                >
                  Community
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/60" />
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={() => onNavigate?.("attendance")}
                  className="cursor-pointer text-white/80 hover:text-white"
                >
                  Attendance
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/60" />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-white font-medium">Reports</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Attendance Reports</h1>
              <p className="text-white/90">
                Detailed attendance analytics based on real check-in data
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {dateRange?.from
                      ? dateRange.to
                        ? `${format(dateRange.from, "LLL dd")} – ${format(dateRange.to, "LLL dd")}`
                        : format(dateRange.from, "LLL dd, y")
                      : "Pick a date range"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              <Button
                onClick={loadData}
                variant="outline"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Loading…" : "Refresh"}
              </Button>

              <div className="rounded-lg bg-white p-0.5">
                <ReportActions report={buildReport} disabled={!report || loading} size="default" menuLabel="Attendance report" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* Error banner */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
              <Button size="sm" variant="outline" onClick={loadData} className="ml-auto">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* KPI Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <Card className="border-primary/10 bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gradient-light p-3 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <Badge className="bg-blue-100 text-blue-800 border-0">
                  {summary ? `${summary.daysInRange}d` : "—"}
                </Badge>
              </div>
              {loading ? (
                <Skeleton className="h-9 w-24 mb-1" />
              ) : (
                <h3 className="text-3xl font-bold text-primary mb-1">
                  {summary?.totalVisits.toLocaleString() ?? "—"}
                </h3>
              )}
              <p className="text-sm text-gray-600">Total Check-ins</p>
              <p className="text-xs text-gray-400 mt-1">
                {summary ? `Avg ${summary.avgDailyVisits}/day` : ""}
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gradient-light p-3 rounded-lg">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
              </div>
              {loading ? (
                <Skeleton className="h-9 w-32 mb-1" />
              ) : (
                <h3 className="text-2xl font-bold text-primary mb-1">
                  {summary?.peakHour ?? "—"}
                </h3>
              )}
              <p className="text-sm text-gray-600">Peak Hour</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gradient-light p-3 rounded-lg">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
              </div>
              {loading ? (
                <Skeleton className="h-9 w-20 mb-1" />
              ) : (
                <h3 className="text-3xl font-bold text-primary mb-1">
                  {summary?.attendanceRate ?? 0}%
                </h3>
              )}
              <p className="text-sm text-gray-600">Avg Attendance Rate</p>
              {summary && (
                <div className="mt-3">
                  <div className="relative w-20 h-20 mx-auto">
                    <svg className="transform -rotate-90" width="80" height="80">
                      <circle cx="40" cy="40" r="32" stroke="#E5E7EB" strokeWidth="7" fill="none" />
                      <circle
                        cx="40" cy="40" r="32"
                        stroke="#0047AB" strokeWidth="7" fill="none"
                        strokeDasharray={`${Math.min(summary.attendanceRate, 100) / 100 * 201} 201`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{summary.attendanceRate}%</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/10 bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gradient-light p-3 rounded-lg">
                  <Dumbbell className="h-6 w-6 text-primary" />
                </div>
              </div>
              {loading ? (
                <Skeleton className="h-9 w-20 mb-1" />
              ) : (
                <h3 className="text-3xl font-bold text-primary mb-1">
                  {summary?.totalActiveMembers.toLocaleString() ?? "—"}
                </h3>
              )}
              <p className="text-sm text-gray-600">Active Members</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Analytics Tabs — Billing module style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="w-full flex">
              <TabsTrigger value="overview" className="flex-1">
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="member-trends" className="flex-1">
                <Users className="h-4 w-4 mr-2" />
                Member Trends
              </TabsTrigger>
              <TabsTrigger value="trainer-reports" className="flex-1">
                <User className="h-4 w-4 mr-2" />
                Trainer Reports
              </TabsTrigger>
              <TabsTrigger value="peak-hours" className="flex-1">
                <Clock className="h-4 w-4 mr-2" />
                Peak Hours
              </TabsTrigger>
              <TabsTrigger value="facility" className="flex-1">
                <Target className="h-4 w-4 mr-2" />
                Facility
              </TabsTrigger>
            </TabsList>

            {/* ── Overview Tab ──────────────────────────────────────────────── */}
            <TabsContent value="overview" className="space-y-6">
              {loading ? (
                <LoadSkeleton />
              ) : (
                <>
                  <Card className="border-primary/10 shadow-md">
                    <CardHeader>
                      <CardTitle className="text-primary">Daily Check-ins Over Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={report?.dailySummary ?? []}>
                          <defs>
                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0047AB" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#00c5cb" stopOpacity={0.1} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis dataKey="date" stroke="#555555" />
                          <YAxis stroke="#555555" />
                          <Tooltip contentStyle={{ background: "light-dark(white, var(--card))", border: "1px solid #0047AB20", borderRadius: "8px" }} />
                          <Legend />
                          <Area type="monotone" dataKey="visits" name="Check-ins" stroke="#0047AB" fill="url(#areaGradient)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {(report?.activityBreakdown?.length ?? 0) > 0 && (
                    <Card className="border-primary/10 shadow-md">
                      <CardHeader>
                        <CardTitle className="text-primary">Attendance by Activity Type</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={report!.activityBreakdown}>
                            <defs>
                              <linearGradient id="classBarGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#0047AB" />
                                <stop offset="100%" stopColor="#00c5cb" />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="type" stroke="#555555" />
                            <YAxis stroke="#555555" />
                            <Tooltip contentStyle={{ background: "light-dark(white, var(--card))", border: "1px solid #0047AB20", borderRadius: "8px" }} />
                            <Legend />
                            <Bar dataKey="count" name="Visits" fill="url(#classBarGradient)" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="border-primary/10 shadow-md">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-primary">Summary Table</CardTitle>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Filter className="h-3 w-3" /> Click headers to sort
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto rounded-lg border border-primary/10">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gradient-light">
                              {([
                                { key: "fullDate" as keyof DailySummaryRow, label: "Date" },
                                { key: "visits" as keyof DailySummaryRow, label: "Check-ins" },
                                { key: "avgDuration" as keyof DailySummaryRow, label: "Avg Duration" },
                              ]).map(({ key, label }) => (
                                <TableHead
                                  key={key}
                                  className="text-primary cursor-pointer hover:bg-primary/10 select-none"
                                  onClick={() => handleSort(key)}
                                >
                                  {label} {sortField === key ? (sortAsc ? "↑" : "↓") : ""}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedSummary.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={3} className="text-center text-gray-400 py-8">
                                  No attendance data for this period
                                </TableCell>
                              </TableRow>
                            ) : (
                              sortedSummary.map((row, i) => (
                                <TableRow key={i} className="hover:bg-gray-50">
                                  <TableCell className="font-medium">{row.date}</TableCell>
                                  <TableCell className="text-green-600 font-semibold">{row.visits}</TableCell>
                                  <TableCell>{row.avgDuration > 0 ? `${row.avgDuration} min` : "—"}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* ── Member Trends Tab ──────────────────────────────────────── */}
            <TabsContent value="member-trends" className="space-y-6">
              {loading ? (
                <LoadSkeleton />
              ) : (
                <>
                  {(report?.monthlyTrend?.length ?? 0) > 0 && (
                    <Card className="border-primary/10 shadow-md">
                      <CardHeader>
                        <CardTitle className="text-primary">Monthly Visit Trend</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={report!.monthlyTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="month" stroke="#555555" />
                            <YAxis stroke="#555555" />
                            <Tooltip contentStyle={{ background: "light-dark(white, var(--card))", border: "1px solid #0047AB20", borderRadius: "8px" }} />
                            <Line type="monotone" dataKey="visits" name="Visits" stroke="#0047AB" strokeWidth={3} dot={{ fill: "#0047AB", r: 5 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="border-primary/20 shadow-md">
                      <CardHeader>
                        <CardTitle className="text-primary flex items-center">
                          <TrendingUp className="h-5 w-5 mr-2" />
                          Top 5 Most Consistent Members
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(report?.topConsistentMembers?.length ?? 0) === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-4">
                            No member data for this period
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {report!.topConsistentMembers.map((m, i) => (
                              <div key={i} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="bg-gradient-light p-2 rounded-full">
                                      <User className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                      <p className="font-medium">{m.name}</p>
                                      <p className="text-xs text-gray-500">{m.visits} visits</p>
                                    </div>
                                  </div>
                                  <Badge className="bg-green-100 text-green-800">
                                    {m.attendanceRate}%
                                  </Badge>
                                </div>
                                <Progress value={Math.min(m.attendanceRate, 100)} className="h-2" />
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-primary/20 shadow-md">
                      <CardHeader>
                        <CardTitle className="text-primary flex items-center">
                          <AlertCircle className="h-5 w-5 mr-2" />
                          Top 5 Irregular Members
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(report?.irregularMembers?.length ?? 0) === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-4">
                            No member data for this period
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {report!.irregularMembers.map((m, i) => (
                              <div key={i} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="bg-red-50 p-2 rounded-full">
                                      <User className="h-4 w-4 text-red-600" />
                                    </div>
                                    <div>
                                      <p className="font-medium">{m.name}</p>
                                      <p className="text-xs text-gray-500">{m.visits} visits</p>
                                    </div>
                                  </div>
                                  <Badge className="bg-red-100 text-red-800">
                                    {m.attendanceRate}%
                                  </Badge>
                                </div>
                                <Progress value={Math.min(m.attendanceRate, 100)} className="h-2" />
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </TabsContent>

            {/* ── Trainer Reports Tab ──────────────────────────────────── */}
            <TabsContent value="trainer-reports" className="space-y-6">
              {loading ? (
                <LoadSkeleton />
              ) : (
                <Card className="border-primary/10 shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-primary">Trainer / Staff Attendance</CardTitle>
                        <CardDescription>Clock-in sessions for the selected period</CardDescription>
                      </div>
                      <div>
                        <Label htmlFor="trainer-select" className="sr-only">Filter by Trainer</Label>
                        <Select value={selectedTrainer} onValueChange={setSelectedTrainer}>
                          <SelectTrigger className="w-[220px] border-primary/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Trainers / Staff</SelectItem>
                            {trainers.map((t) => (
                              <SelectItem key={t.id} value={String(t.id)}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto rounded-lg border border-primary/10">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-light">
                            <TableHead className="text-primary">Name</TableHead>
                            <TableHead className="text-primary">Role</TableHead>
                            <TableHead className="text-primary">Sessions</TableHead>
                            <TableHead className="text-primary">Total Hours</TableHead>
                            <TableHead className="text-primary">Avg Session</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTrainers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                                No trainer attendance data for this period
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredTrainers.map((t) => (
                              <TableRow key={t.id} className="hover:bg-gray-50">
                                <TableCell>
                                  <div className="flex items-center space-x-3">
                                    {t.photoUrl ? (
                                      <img
                                        src={t.photoUrl}
                                        alt={t.name}
                                        className="h-8 w-8 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="bg-gradient-light p-2 rounded-full">
                                        <User className="h-4 w-4 text-primary" />
                                      </div>
                                    )}
                                    <span className="font-medium">{t.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-blue-100 text-blue-800 border-0">
                                    {t.role}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-semibold">{t.sessions}</TableCell>
                                <TableCell>{fmtDuration(t.totalMinutes)}</TableCell>
                                <TableCell>
                                  <Badge
                                    className={
                                      t.avgSessionMinutes >= 240
                                        ? "bg-green-100 text-green-800"
                                        : "bg-yellow-100 text-yellow-800"
                                    }
                                  >
                                    {fmtDuration(t.avgSessionMinutes)}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── Peak Hours Tab ────────────────────────────────────────── */}
            <TabsContent value="peak-hours" className="space-y-6">
              {loading ? (
                <LoadSkeleton />
              ) : (
                <>
                  <Card className="border-primary/10 shadow-md">
                    <CardHeader>
                      <CardTitle className="text-primary">Attendance Distribution by Hour</CardTitle>
                      <CardDescription>
                        Number of check-ins per hour across days of the week
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(report?.peakHours?.length ?? 0) === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-12">
                          No attendance data for this period
                        </p>
                      ) : (
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart data={report!.peakHours}>
                            <defs>
                              <linearGradient id="peakGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#0047AB" />
                                <stop offset="100%" stopColor="#00c5cb" />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="hour" stroke="#555555" />
                            <YAxis stroke="#555555" />
                            <Tooltip contentStyle={{ background: "light-dark(white, var(--card))", border: "1px solid #0047AB20", borderRadius: "8px" }} />
                            <Legend />
                            <Bar dataKey="Mon" fill="url(#peakGradient)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Wed" fill="#00c5cb" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Fri" fill="#4CAF50" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Sat" fill="#FFC107" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  {summary && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="border-primary/20 bg-green-50 shadow-md">
                        <CardContent className="p-6">
                          <div className="flex items-start space-x-3">
                            <div className="bg-green-100 p-3 rounded-lg">
                              <TrendingUp className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-green-800 mb-1">Peak Traffic</h4>
                              <p className="text-sm text-green-700">
                                Busiest time window: {summary.peakHour}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-primary/20 bg-blue-50 shadow-md">
                        <CardContent className="p-6">
                          <div className="flex items-start space-x-3">
                            <div className="bg-blue-100 p-3 rounded-lg">
                              <Lightbulb className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-blue-800 mb-1">Avg Daily Visits</h4>
                              <p className="text-sm text-blue-700">
                                {summary.avgDailyVisits} visits/day over {summary.daysInRange} days
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* ── Facility Tab ─────────────────────────────────────────── */}
            <TabsContent value="facility" className="space-y-6">
              {loading ? (
                <LoadSkeleton />
              ) : (report?.facilityBreakdown?.filter((f) => f.count > 0).length ?? 0) === 0 ? (
                <Card className="border-primary/10 shadow-md">
                  <CardContent className="p-12 text-center">
                    <p className="text-sm text-gray-400">
                      No activity-type data for this period. Facility breakdown is derived from
                      the activity type assigned at check-in.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="border-primary/10 shadow-md">
                      <CardHeader>
                        <CardTitle className="text-primary">Facility Usage by Area</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={report!.facilityBreakdown.filter((f) => f.count > 0)}
                              cx="50%" cy="50%"
                              labelLine={false}
                              label={({ name, percent }) =>
                                `${name}: ${(percent * 100).toFixed(0)}%`
                              }
                              outerRadius={100}
                              dataKey="value"
                            >
                              {report!.facilityBreakdown
                                .filter((f) => f.count > 0)
                                .map((entry, i) => (
                                  <Cell key={`cell-${i}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(v: number) => `${v}%`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className="border-primary/10 shadow-md">
                      <CardHeader>
                        <CardTitle className="text-primary">Area Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {report!.facilityBreakdown
                          .filter((f) => f.count > 0)
                          .map((area, i) => (
                            <div key={i} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div
                                    className="w-4 h-4 rounded"
                                    style={{ backgroundColor: area.color }}
                                  />
                                  <span className="font-medium">{area.name}</span>
                                </div>
                                <span className="text-sm text-gray-600">
                                  {area.value}% ({area.count} visits)
                                </span>
                              </div>
                              <Progress value={area.value} className="h-2" />
                            </div>
                          ))}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Insights & Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="border-primary/10 shadow-lg">
            <CardHeader>
              <CardTitle className="text-primary flex items-center space-x-2">
                <Lightbulb className="h-5 w-5" />
                <span>Insights &amp; Recommendations</span>
              </CardTitle>
              <CardDescription>
                Automatically generated from real attendance patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <LoadSkeleton />
              ) : (report?.insights?.length ?? 0) === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No insights available yet
                </p>
              ) : (
                report!.insights.map((insight) => {
                  const Icon = insightIcon(insight.type);
                  return (
                    <motion.div
                      key={insight.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * insight.id }}
                      className={`p-4 rounded-lg border-l-4 ${
                        insight.type === "success"
                          ? "bg-green-50 border-green-500"
                          : insight.type === "warning"
                          ? "bg-yellow-50 border-yellow-500"
                          : "bg-blue-50 border-blue-500"
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <Icon
                          className={`h-5 w-5 mt-0.5 ${
                            insight.type === "success"
                              ? "text-green-600"
                              : insight.type === "warning"
                              ? "text-yellow-600"
                              : "text-blue-600"
                          }`}
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">{insight.title}</h4>
                          <p className="text-sm text-gray-700">{insight.message}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="border-primary/10 shadow-lg">
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-primary mb-1">Gym Capacity</h4>
                  <p className="text-sm text-gray-600">Used to calculate the Check-In page's live occupancy %</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={gymCapacity}
                    onChange={(e) => setGymCapacity(e.target.value)}
                    style={{ maxWidth: '120px' }}
                    disabled={savingReportSettings}
                  />
                  <Button variant="outline" className="border-primary/30" onClick={handleSaveGymCapacity} disabled={savingReportSettings}>
                    Save
                  </Button>
                </div>
              </div>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-light p-3 rounded-lg">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-primary mb-1">
                      Schedule Automated Reports
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Receive weekly attendance reports via email every Monday
                    </p>
                    <Input
                      type="email"
                      placeholder="recipient@example.com"
                      value={reportRecipientEmail}
                      onChange={(e) => setReportRecipientEmail(e.target.value)}
                      className="max-w-xs"
                      disabled={savingReportSettings}
                    />
                  </div>
                  <Switch
                    checked={automatedReports}
                    disabled={savingReportSettings}
                    onCheckedChange={handleToggleAutomatedReports}
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="border-primary/30"
                    onClick={handleViewDetailed}
                    disabled={!report}
                  >
                    <TableIcon className="h-4 w-4 mr-2" />
                    View Detailed Report
                  </Button>
                  <Button
                    variant="outline"
                    className="border-primary/30"
                    onClick={handleExportPDF}
                    disabled={!report || !!exporter.busy}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {exporter.busy === "pdf" ? "Exporting…" : "Export PDF"}
                  </Button>
                  <Button
                    className="btn-primary"
                    onClick={handleDownloadReport}
                    disabled={!report || !!exporter.busy}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {exporter.busy === "xlsx" ? "Exporting…" : "Download Excel"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── View Detailed Report Dialog ──────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary flex items-center gap-2">
              <TableIcon className="h-5 w-5" />
              Detailed Attendance Report
              <span className="text-sm font-normal text-gray-500 ml-2">
                {startStr} – {endStr}
              </span>
            </DialogTitle>
          </DialogHeader>

          {report && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Check-ins", value: report.summary.totalVisits.toLocaleString() },
                  { label: "Avg Daily", value: String(report.summary.avgDailyVisits) },
                  { label: "Attendance Rate", value: `${report.summary.attendanceRate}%` },
                  { label: "Active Members", value: report.summary.totalActiveMembers.toLocaleString() },
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-gradient-light rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{kpi.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{kpi.label}</p>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Daily table — full, scrollable */}
              <div>
                <h3 className="font-semibold text-primary mb-3">Daily Breakdown</h3>
                <div className="overflow-x-auto rounded-lg border border-primary/10 max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10">
                      <TableRow className="bg-gradient-light">
                        <TableHead className="text-primary">Date</TableHead>
                        <TableHead className="text-primary">Check-ins</TableHead>
                        <TableHead className="text-primary">Avg Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.dailySummary.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-gray-400 py-6">
                            No data
                          </TableCell>
                        </TableRow>
                      ) : (
                        report.dailySummary.map((r, i) => (
                          <TableRow key={i} className="hover:bg-gray-50">
                            <TableCell>{r.date}</TableCell>
                            <TableCell className="text-green-600 font-semibold">{r.visits}</TableCell>
                            <TableCell>{r.avgDuration > 0 ? `${r.avgDuration} min` : "—"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Activity breakdown */}
              {report.activityBreakdown.length > 0 && (
                <div>
                  <h3 className="font-semibold text-primary mb-3">Activity Breakdown</h3>
                  <div className="overflow-x-auto rounded-lg border border-primary/10">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-light">
                          <TableHead className="text-primary">Activity</TableHead>
                          <TableHead className="text-primary">Visits</TableHead>
                          <TableHead className="text-primary">Share</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.activityBreakdown.map((a, i) => (
                          <TableRow key={i} className="hover:bg-gray-50">
                            <TableCell>{a.type}</TableCell>
                            <TableCell className="font-semibold">{a.count}</TableCell>
                            <TableCell>
                              <Badge className="bg-blue-100 text-blue-800">{a.percentage}%</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Trainer table */}
              {trainers.length > 0 && (
                <div>
                  <h3 className="font-semibold text-primary mb-3">Trainer / Staff Sessions</h3>
                  <div className="overflow-x-auto rounded-lg border border-primary/10">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-light">
                          <TableHead className="text-primary">Name</TableHead>
                          <TableHead className="text-primary">Role</TableHead>
                          <TableHead className="text-primary">Sessions</TableHead>
                          <TableHead className="text-primary">Total</TableHead>
                          <TableHead className="text-primary">Avg</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trainers.map((t) => (
                          <TableRow key={t.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{t.name}</TableCell>
                            <TableCell>
                              <Badge className="bg-blue-100 text-blue-800 border-0">{t.role}</Badge>
                            </TableCell>
                            <TableCell>{t.sessions}</TableCell>
                            <TableCell>{fmtDuration(t.totalMinutes)}</TableCell>
                            <TableCell>{fmtDuration(t.avgSessionMinutes)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>
                  Close
                </Button>
                <Button variant="outline" onClick={handlePrint} disabled={!!exporter.busy}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" onClick={handleExportPDF} disabled={!!exporter.busy}>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button className="btn-primary" onClick={handleExportExcel} disabled={!!exporter.busy}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Excel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AttendanceReports;
