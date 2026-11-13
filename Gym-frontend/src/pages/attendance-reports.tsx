import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, ArrowLeft, BarChart3, Briefcase, CalendarDays, CheckCircle2, Clock, DoorOpen, Dumbbell, Footprints,
  Info, Lightbulb, Mail, RefreshCw, Search, Settings2, Timer, TrendingUp, UserCheck, UserX, Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { DatePickerField } from "../components/shared/DatePickerField";
import {
  styles, usePalette, axisTick, Kpi, Panel, ChartTip, Legend, BarRows, Empty, SectionTabs, Seg, Status, Delta, pctChange,
  fmtInt, fmtDate, isoDate,
} from "../components/overview/overview-kit";
import { ReportActions, type ReportDocument, chartFromRows, col, countCol, kpiSection, tableSection } from "../components/report-export";
import { useBranch } from "../utils/branch-context";
import { attendanceService } from "../utils/supabase/attendance-service";
import {
  staffAttendanceService, type RangeAbsent, type RangeMember, type RangeReport, type RangeStaff,
} from "../utils/supabase/staff-attendance-service";
import a from "./attendance.module.css";
import r from "./attendance-reports.module.css";

// ── Helpers ────────────────────────────────────────────────────────────────────

type Tab = "overview" | "members" | "team" | "times" | "patterns" | "settings";
type Preset = "7d" | "30d" | "month" | "last-month" | "90d" | "year" | "custom";

const PRESETS: [Preset, string][] = [
  ["7d", "Last 7 days"], ["30d", "Last 30 days"], ["month", "This month"], ["last-month", "Last month"],
  ["90d", "Last 90 days"], ["year", "This year"], ["custom", "Custom"],
];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HEAT_LIGHT = ["#b7d3f6", "#86b6ef", "#5598e7", "#2a78d6", "#184f95"];
const HEAT_DARK = ["#184f95", "#1c5cab", "#2a78d6", "#5598e7", "#9ec5f4"];

function presetRange(p: Preset, today = new Date()): { from: string; to: string } {
  const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
  switch (p) {
    case "7d": return { from: isoDate(new Date(y, m, d - 6)), to: isoDate(today) };
    case "month": return { from: isoDate(new Date(y, m, 1)), to: isoDate(today) };
    case "last-month": return { from: isoDate(new Date(y, m - 1, 1)), to: isoDate(new Date(y, m, 0)) };
    case "90d": return { from: isoDate(new Date(y, m, d - 89)), to: isoDate(today) };
    case "year": return { from: isoDate(new Date(y, 0, 1)), to: isoDate(today) };
    default: return { from: isoDate(new Date(y, m, d - 29)), to: isoDate(today) };
  }
}

function fmtDur(min: number | null | undefined) {
  const v = Math.max(0, Math.round(Number(min) || 0));
  if (!v) return "—";
  if (v < 60) return `${v}m`;
  return `${Math.floor(v / 60)}h ${String(v % 60).padStart(2, "0")}m`;
}
const fmtHours = (min: number) => (min >= 60 ? `${fmtInt(Math.round(min / 60))}h` : fmtDur(min));
const plural = (n: number, one: string, many = `${one}s`) => `${fmtInt(n)} ${n === 1 ? one : many}`;
const hourShort = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "a" : "p"}`;
const hourLong = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
const fullDay = (d: string) => ({ Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" } as Record<string, string>)[d] || d;
const shortDate = (iso?: string | null) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};
const initials = (name = "") => name.split(/\s+/).filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";

function Photo({ name, url, tone }: { name: string; url?: string | null; tone: string }) {
  const [broken, setBroken] = useState(false);
  const cls = `${a.photo} ${a.photoSm}`;
  return (
    <span className={a.photoWrap} data-tone={tone}>
      {url && !broken ? <img src={url} alt="" className={cls} onError={() => setBroken(true)} /> : <span className={cls} aria-hidden="true">{initials(name)}</span>}
    </span>
  );
}

function Fact({ label, value, tone }: { label: string; value: React.ReactNode; tone: string }) {
  return (
    <div className={a.teamFact} data-tone={tone}>
      <div className={a.teamFactValue}>{value}</div>
      <div className={a.teamFactLabel}>{label}</div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

interface AttendanceReportsProps {
  onNavigate?: (section: string) => void;
}

export function AttendanceReports({ onNavigate }: AttendanceReportsProps) {
  const { activeBranchId } = useBranch();
  const palette = usePalette();
  const navigate = useNavigate();
  const dark = palette.grid !== "#e9e8e3";
  const heatRamp = dark ? HEAT_DARK : HEAT_LIGHT;

  const [preset, setPreset] = useState<Preset>("30d");
  const [range, setRange] = useState(() => presetRange("30d"));
  const [report, setReport] = useState<RangeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  const [memberQ, setMemberQ] = useState("");
  const [memberSeg, setMemberSeg] = useState<"all" | "regular" | "new" | "once">("all");
  const [memberSort, setMemberSort] = useState<"visits" | "stay" | "recent">("visits");
  const [memberLimit, setMemberLimit] = useState(25);
  const [absentQ, setAbsentQ] = useState("");
  const [absentLimit, setAbsentLimit] = useState(25);
  const [teamFilter, setTeamFilter] = useState<"all" | "trainer" | "staff">("all");
  const [dailyAll, setDailyAll] = useState(false);
  const [heatHover, setHeatHover] = useState<string | null>(null);

  // Settings (weekly email + capacity) — unchanged behaviour, new home.
  const [autoReports, setAutoReports] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [capacity, setCapacity] = useState("150");
  const [savingSettings, setSavingSettings] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await staffAttendanceService.getRangeReport(range.from, range.to));
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Could not load the report");
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);
  useEffect(() => { load(); }, [load, activeBranchId]);

  useEffect(() => {
    attendanceService.getReportSettings().then(s => {
      setAutoReports(!!s.enabled);
      setRecipient(s.recipient_email || "");
      if (s.gym_capacity) setCapacity(String(s.gym_capacity));
    }).catch(() => { /* settings tab shows defaults */ });
  }, []);

  const pickPreset = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") setRange(presetRange(p));
    setMemberLimit(25); setAbsentLimit(25);
  };

  const s = report?.summary;
  const cur = s?.current, prev = s?.previous;
  const openDay = (iso: string) => navigate(`/attendance?date=${iso}`);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const daily = useMemo(() => (report?.daily ?? []).map(d => ({ ...d, tipLabel: `${fullDay(d.weekday)}, ${d.label}` })), [report?.daily]);

  const heat = useMemo(() => {
    const grid = report?.heatmap ?? WEEKDAYS.map(() => new Array(24).fill(0));
    let max = 0, lo = 23, hi = 0;
    grid.forEach(row => row.forEach((v, h) => { if (v > 0) { max = Math.max(max, v); lo = Math.min(lo, h); hi = Math.max(hi, h); } }));
    if (max === 0) { lo = 6; hi = 22; }
    const hours = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    const occ = (report?.weekdays ?? []).map(w => w.occurrences);
    const slots = grid.flatMap((row, di) => row.map((v, h) => ({ day: WEEKDAYS[di], h, v }))).filter(x => x.v > 0).sort((x, y) => y.v - x.v).slice(0, 6);
    return { grid, max, hours, occ, slots };
  }, [report?.heatmap, report?.weekdays]);
  const heatColor = (v: number) => (v <= 0 || heat.max <= 0 ? undefined : heatRamp[Math.max(0, Math.min(4, Math.floor((v / heat.max) * 5 - 1e-9)))]);

  const hourly = useMemo(() => {
    const h = report?.hourly ?? [];
    return heat.hours.map(x => ({ label: hourLong(x), visits: h[x] ?? 0 }));
  }, [report?.hourly, heat.hours]);

  const members = useMemo(() => {
    const q = memberQ.trim().toLowerCase();
    let list = (report?.members ?? []).filter(m => !q || m.name.toLowerCase().includes(q) || (m.code || "").toLowerCase().includes(q) || (m.plan || "").toLowerCase().includes(q));
    if (memberSeg === "regular") list = list.filter(m => m.per_week >= 2);
    if (memberSeg === "new") list = list.filter(m => m.new_visitor);
    if (memberSeg === "once") list = list.filter(m => m.visits === 1);
    const sorted = [...list];
    if (memberSort === "stay") sorted.sort((x, y) => y.avg_stay_minutes - x.avg_stay_minutes);
    if (memberSort === "recent") sorted.sort((x, y) => (y.last_visit || "").localeCompare(x.last_visit || ""));
    return sorted;
  }, [report?.members, memberQ, memberSeg, memberSort]);
  const memberCounts = useMemo(() => {
    const all = report?.members ?? [];
    return { all: all.length, regular: all.filter(m => m.per_week >= 2).length, new: all.filter(m => m.new_visitor).length, once: all.filter(m => m.visits === 1).length };
  }, [report?.members]);

  const absent = useMemo(() => {
    const q = absentQ.trim().toLowerCase();
    return (report?.not_visited ?? []).filter(m => !q || m.name.toLowerCase().includes(q) || (m.code || "").toLowerCase().includes(q) || (m.phone || "").includes(q));
  }, [report?.not_visited, absentQ]);

  const team = useMemo(() => (report?.staff ?? []).filter(t => teamFilter === "all" || (teamFilter === "trainer" ? t.trainer : !t.trainer)), [report?.staff, teamFilter]);
  const teamTotals = useMemo(() => {
    const all = report?.staff ?? [];
    return {
      trainers: all.filter(t => t.trainer && t.days_present > 0).length,
      staff: all.filter(t => !t.trainer && t.days_present > 0).length,
      minutes: all.reduce((n, t) => n + t.total_minutes, 0),
      late: all.reduce((n, t) => n + (t.late_days ?? 0), 0),
      absent: all.reduce((n, t) => n + (t.absent_days ?? 0), 0),
    };
  }, [report?.staff]);

  const dailyRows = useMemo(() => [...(report?.daily ?? [])].filter(d => !d.future).reverse(), [report?.daily]);

  // ── Settings actions ─────────────────────────────────────────────────────────
  const saveCapacity = async () => {
    const n = parseInt(capacity, 10);
    if (!n || n <= 0) { toast.error("Enter a valid gym capacity"); return; }
    setSavingSettings(true);
    try {
      await attendanceService.updateReportSettings({ enabled: autoReports, gym_capacity: n });
      toast.success("Gym capacity saved", { description: `Check-In occupancy is now out of ${n}.` });
    } catch (e: any) {
      toast.error("Couldn't save the capacity", { description: e?.message });
    } finally { setSavingSettings(false); }
  };
  const toggleAuto = async (on: boolean) => {
    if (on && !recipient.trim()) { toast.error("Enter the email address first"); return; }
    setSavingSettings(true);
    try {
      await attendanceService.updateReportSettings({ enabled: on, recipient_email: recipient.trim() || undefined });
      setAutoReports(on);
      toast.success(on ? "Weekly report turned on" : "Weekly report turned off",
        { description: on ? `An attendance summary goes to ${recipient.trim()} every Monday.` : undefined });
    } catch (e: any) {
      toast.error("Couldn't save the report settings", { description: e?.message });
    } finally { setSavingSettings(false); }
  };

  // ── Export ───────────────────────────────────────────────────────────────────
  const buildReport = async (): Promise<ReportDocument> => {
    const rep = report!;
    const sm = rep.summary;
    const c = sm.current, p = sm.previous;
    const chg = (x: number, y: number) => { const v = pctChange(x, y); return v == null ? undefined : `${v > 0 ? "+" : ""}${v}% vs previous period`; };
    return {
      title: "Attendance Report",
      orientation: "landscape",
      period: { from: sm.from, to: sm.to },
      filters: [{ label: "Compared with", value: `${fmtDate(sm.compare_from)} – ${fmtDate(sm.compare_to)}` }, { label: "Time zone", value: rep.time_zone }],
      sections: [
        kpiSection([
          { label: "Visits", value: c.visits, format: "integer", hint: chg(c.visits, p.visits) },
          { label: "Unique members", value: c.unique_members, format: "integer", hint: chg(c.unique_members, p.unique_members) },
          { label: "Average per day", value: c.avg_per_day, format: "number" },
          { label: "Average stay", value: c.avg_stay_minutes, format: "duration" },
          { label: "Member reach", value: sm.reach_pct, format: "percent", hint: `${c.unique_members} of ${sm.active_members} active members` },
          { label: "Walk-ins", value: c.walk_ins, format: "integer" },
          { label: "New visitors", value: sm.new_visitors, format: "integer" },
          { label: "Peak hour", value: sm.peak_hour || "—" },
        ], "Summary"),
        ...(rep.insights.length ? [tableSection("Insights", [col("title", "Insight"), col("text", "Detail", "text", { wrap: true })], rep.insights)] : []),
        chartFromRows("Visits per day", "bar", rep.daily.filter(d => !d.future), "label", [
          { key: "members", name: "Members", color: palette.s1 }, { key: "walk_ins", name: "Walk-ins", color: palette.s2 },
        ], { valueFormat: "integer" }),
        tableSection("Day by day", [
          col("date", "Date", "date"), col("weekday", "Day"), countCol("visits", "Visits"), countCol("members", "Members"),
          countCol("walk_ins", "Walk-ins"), countCol("unique_members", "Unique"), col("avg_stay_minutes", "Avg stay", "duration", { total: "avg" }),
          countCol("previous_visits", "Previous period"),
        ], rep.daily.filter(d => !d.future), { totals: true }),
        tableSection("Busiest weekdays", [col("day", "Day"), countCol("visits", "Visits"), col("average", "Average per day", "number")], rep.weekdays),
        tableSection("Check-ins by hour", [col("hour", "Hour"), ...WEEKDAYS.map(d => countCol(d, d)), countCol("total", "Total")],
          Array.from({ length: 24 }, (_, h) => ({ hour: hourLong(h), ...Object.fromEntries(WEEKDAYS.map((d, i) => [d, rep.heatmap[i][h]])), total: rep.hourly[h] }))
            .filter(row => row.total > 0), { totals: true }),
        tableSection("Time spent", [col("label", "Stay"), countCol("count", "Visits"), col("pct", "Share", "percent")], rep.stay),
        tableSection("Check-in method", [col("label", "Method"), countCol("count", "Visits"), col("pct", "Share", "percent")], rep.methods),
        tableSection("Visits by plan", [col("label", "Plan"), countCol("count", "Visits"), col("pct", "Share", "percent")], rep.plans),
        tableSection("Members who came in", [
          col("code", "ID"), col("name", "Member"), col("plan", "Plan"), countCol("visits", "Visits"), countCol("days_visited", "Days"),
          col("per_week", "Per week", "number"), col("avg_stay_minutes", "Avg stay", "duration"), col("total_minutes", "Total time", "duration"),
          col("usual_time", "Usual time"), col("last_visit", "Last visit", "date"),
        ], rep.members),
        tableSection(`Active members who didn't come in (${sm.not_visited_count})`, [
          col("code", "ID"), col("name", "Member"), col("phone", "Phone"), col("plan", "Plan"), col("last_visit", "Last visit", "date"),
          col("days_since_last_visit", "Days since", "integer"), col("membership_ends", "Membership ends", "date"),
        ], rep.not_visited),
        ...(rep.staff.length ? [tableSection("Staff & trainers", [
          col("name", "Name"), col("role", "Role"), countCol("days_present", "Days"), countCol("sessions", "Sessions"),
          col("total_minutes", "Hours", "duration", { total: "sum" }), col("avg_minutes_per_day", "Per day", "duration"), col("usual_in", "Usual in"),
          countCol("scheduled_days", "Scheduled"), countCol("late_days", "Late days"), countCol("absent_days", "Absent"),
          col("punctuality_pct", "On time", "percent"),
        ], rep.staff, { totals: true })] : []),
      ],
    };
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  const vs = s ? `vs ${fmtDate(s.compare_from)} – ${fmtDate(s.compare_to)}` : "";

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.head}>
        <div>
          <button type="button" className={r.back} onClick={() => onNavigate ? onNavigate("attendance") : navigate("/attendance")}>
            <ArrowLeft size={13} />Attendance
          </button>
          <h1 className={styles.title}>Attendance Reports</h1>
          <div className={styles.subtitle}>
            <span>{fmtDate(range.from)} – {fmtDate(range.to)}</span>
            {s && <span>· {s.days} days · compared with the {s.days} days before</span>}
            {report?.time_zone && <span>· {report.time_zone.replace("_", " ")}</span>}
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="outline" size="sm" onClick={load} aria-label="Refresh"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
          <ReportActions report={buildReport} disabled={!report} menuLabel={`Attendance · ${range.from} – ${range.to}`} />
        </div>
      </div>

      {/* Period */}
      <div className={`${styles.card} ${styles.filters}`}>
        <div className={styles.chips} role="group" aria-label="Period">
          {PRESETS.map(([p, label]) => (
            <button key={p} type="button" className={styles.chip} data-active={preset === p} onClick={() => pickPreset(p)}>{label}</button>
          ))}
        </div>
        {preset === "custom" && (
          <div className={r.range}>
            <div className={r.rangePick}><DatePickerField value={range.from} max={range.to} clearable={false} onChange={v => v && setRange(x => ({ ...x, from: v }))} /></div>
            <span className={r.rangeSep}>to</span>
            <div className={r.rangePick}><DatePickerField value={range.to} min={range.from} max={isoDate(new Date())} clearable={false} onChange={v => v && setRange(x => ({ ...x, to: v }))} /></div>
          </div>
        )}
      </div>

      {error && !report && (
        <div className={`${styles.card} ${styles.filters}`} style={{ color: "var(--destructive)" }}>
          {error}<Button variant="outline" size="sm" onClick={load}>Try again</Button>
        </div>
      )}

      <div className={loading && report ? styles.loadingVeil : undefined} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* KPIs */}
        <div className={styles.kpis}>
          <Kpi icon={UserCheck} tone="blue" label="Visits" value={cur ? fmtInt(cur.visits) : "—"}
            delta={cur && prev ? <Delta pct={pctChange(cur.visits, prev.visits)} /> : undefined}
            hint={prev ? `${fmtInt(prev.visits)} before` : undefined} onClick={() => setTab("overview")} title="Daily trend" />
          <Kpi icon={Users} tone="violet" label="Unique members" value={cur ? fmtInt(cur.unique_members) : "—"}
            delta={cur && prev ? <Delta pct={pctChange(cur.unique_members, prev.unique_members)} /> : undefined}
            hint={cur ? `${cur.visits_per_member} visits each` : undefined} onClick={() => setTab("members")} title="Members who came in" />
          <Kpi icon={CalendarDays} tone="teal" label="Per day" value={cur ? cur.avg_per_day.toLocaleString(undefined, { maximumFractionDigits: 1 }) : "—"}
            delta={cur && prev ? <Delta pct={pctChange(cur.avg_per_day, prev.avg_per_day)} /> : undefined}
            hint={s?.busiest_date ? `best ${shortDate(s.busiest_date)} (${s.busiest_date_visits})` : undefined} />
          <Kpi icon={Timer} tone="amber" label="Average stay" value={cur ? fmtDur(cur.avg_stay_minutes) : "—"}
            delta={cur && prev ? <Delta pct={pctChange(cur.avg_stay_minutes, prev.avg_stay_minutes)} /> : undefined}
            hint={cur ? `${fmtHours(cur.total_minutes)} in total` : undefined} onClick={() => setTab("patterns")} title="Time spent" />
          <Kpi icon={DoorOpen} tone="green" label="Member reach" value={s ? `${s.reach_pct}%` : "—"}
            hint={s ? `${fmtInt(cur!.unique_members)} of ${fmtInt(s.active_members)} active` : undefined}
            onClick={() => setTab("members")} title="Active members who came in" />
          <Kpi icon={Footprints} tone="orange" label="Walk-ins" value={cur ? fmtInt(cur.walk_ins) : "—"}
            delta={cur && prev ? <Delta pct={pctChange(cur.walk_ins, prev.walk_ins)} /> : undefined}
            hint={s ? plural(s.new_visitors, "first-time member") : undefined} />
        </div>

        <SectionTabs<Tab>
          label="Report sections"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "members", label: "Members", icon: Users, count: s?.not_visited_count },
            { id: "team", label: "Staff & trainers", icon: Briefcase },
            { id: "times", label: "Peak times", icon: Clock },
            { id: "patterns", label: "Visit patterns", icon: Timer },
            { id: "settings", label: "Settings", icon: Settings2 },
          ]}
        />

        {!report && loading && <div className={styles.card}><Empty icon={RefreshCw} title="Loading the report…" /></div>}

        {/* ── Overview ── */}
        {report && tab === "overview" && (
          <>
            <Panel title="Visits per day" icon={TrendingUp} sub={`Members and walk-ins each day; the line is the same day of the previous period · click a day to open it`}
              action={<Legend items={[{ label: "Members", color: palette.s1 }, { label: "Walk-ins", color: palette.s2 }, { label: "Previous period", color: "#a8a69f", line: true }]} />}>
              {cur?.visits === 0 ? <Empty icon={UserCheck} title="No visits in this period" /> : (
                <div className={r.chart}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={daily} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                      onClick={(e: any) => { const d = e?.activePayload?.[0]?.payload; if (d && !d.future) openDay(d.date); }}>
                      <CartesianGrid vertical={false} stroke={palette.grid} />
                      <XAxis dataKey="label" tick={axisTick(palette)} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} />
                      <YAxis allowDecimals={false} tick={axisTick(palette)} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTip />} cursor={{ fill: "color-mix(in srgb, currentColor 6%, transparent)" }} />
                      <Bar dataKey="members" name="Members" stackId="v" fill={palette.s1} maxBarSize={26} cursor="pointer" />
                      <Bar dataKey="walk_ins" name="Walk-ins" stackId="v" fill={palette.s2} radius={[4, 4, 0, 0]} maxBarSize={26} cursor="pointer" />
                      <Line dataKey="previous_visits" name="Previous period" type="monotone" stroke="#a8a69f" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <div className={r.cols21}>
              <Panel title="What stands out" icon={Lightbulb} sub={vs}>
                {report.insights.length === 0 ? <Empty icon={Lightbulb} title="Nothing unusual" /> : (
                  <div className={styles.insights}>
                    {report.insights.map((i, idx) => {
                      const Icon = i.tone === "good" ? CheckCircle2 : i.tone === "warning" ? AlertTriangle : Info;
                      return (
                        <div key={idx} className={styles.insight} data-type={i.tone === "good" ? "positive" : i.tone}>
                          <span className={styles.insightIcon}><Icon size={15} /></span>
                          <div>
                            <div className={styles.insightTitle}>{i.title}</div>
                            <div className={styles.insightDetail}>{i.text}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Panel>
              <Panel title="By weekday" icon={CalendarDays} sub="Average visits on each day of the week">
                <BarRows fmt={n => n.toLocaleString(undefined, { maximumFractionDigits: 1 })} empty="No visits"
                  rows={report.weekdays.map(w => ({
                    key: w.day, label: fullDay(w.day), value: w.average, color: w.day === s?.busiest_weekday ? palette.s2 : palette.s1,
                    meta: `${fmtInt(w.visits)} visits`,
                  }))} />
              </Panel>
            </div>

            <Panel title="Day by day" icon={CalendarDays} sub="Newest first · compared with the same day of the previous period">
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Date</th><th>Visits</th><th>Members</th><th>Walk-ins</th><th>Unique members</th><th>Avg stay</th><th>Previous</th><th>Change</th></tr></thead>
                  <tbody>
                    {(dailyAll ? dailyRows : dailyRows.slice(0, 14)).map(d => {
                      const ch = d.previous_visits == null ? null : pctChange(d.visits, d.previous_visits);
                      return (
                        <tr key={d.date}>
                          <td><button type="button" className={r.dayLink} onClick={() => openDay(d.date)}>{d.weekday}, {d.label}</button></td>
                          <td className={r.num} style={{ fontWeight: 700 }}>{fmtInt(d.visits)}</td>
                          <td className={r.num}>{fmtInt(d.members)}</td>
                          <td className={r.num}>{fmtInt(d.walk_ins)}</td>
                          <td className={r.num}>{fmtInt(d.unique_members)}</td>
                          <td className={r.num}>{fmtDur(d.avg_stay_minutes)}</td>
                          <td className={`${r.num} ${styles.muted}`}>{d.previous_visits ?? "—"}</td>
                          <td className={r.num}>{ch == null ? <span className={styles.muted}>—</span> : <span className={ch >= 0 ? r.up : r.down}>{ch > 0 ? "+" : ""}{ch}%</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {dailyRows.length > 14 && (
                <div className={a.more}><Button variant="outline" size="sm" onClick={() => setDailyAll(v => !v)}>{dailyAll ? "Show fewer" : `Show all ${dailyRows.length} days`}</Button></div>
              )}
            </Panel>
          </>
        )}

        {/* ── Members ── */}
        {report && tab === "members" && (
          <>
            <div className={r.facts5}>
              <Fact label="Members came in" value={fmtInt(cur!.unique_members)} tone="blue" />
              <Fact label="Visits per member" value={cur!.visits_per_member} tone="violet" />
              <Fact label="Regulars (2+/week)" value={fmtInt(memberCounts.regular)} tone="green" />
              <Fact label="First-time members" value={fmtInt(s!.new_visitors)} tone="teal" />
              <Fact label="Active, didn't come" value={fmtInt(s!.not_visited_count)} tone={s!.not_visited_count ? "red" : "gray"} />
            </div>

            <div className={r.cols21}>
              <Panel title="Members who came in" icon={UserCheck} scope={String(memberCounts.all)} sub="Visits, time spent and usual time for every member who checked in">
                <div className={a.toolbar} style={{ padding: 0 }}>
                  <label className={a.search}><Search size={15} /><input value={memberQ} onChange={e => setMemberQ(e.target.value)} placeholder="Search name, ID or plan" aria-label="Search members" /></label>
                  <div className={styles.chips} role="group" aria-label="Members">
                    {([["all", "All"], ["regular", "Regulars"], ["new", "First-time"], ["once", "Came once"]] as const).map(([k, l]) => (
                      <button key={k} type="button" className={styles.chip} data-active={memberSeg === k} onClick={() => setMemberSeg(k)}>
                        {l}<span className={a.count}>{memberCounts[k]}</span>
                      </button>
                    ))}
                  </div>
                  <div className={a.toolEnd}><Seg label="Sort" value={memberSort} onChange={setMemberSort} options={[["visits", "Most visits"], ["stay", "Longest stay"], ["recent", "Recent"]]} /></div>
                </div>
                {members.length === 0 ? <Empty icon={Users} title="No members match" /> : (
                  <>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead><tr><th>Member</th><th>Visits</th><th>Per week</th><th>Avg stay</th><th>Total</th><th>Usual time</th><th>Last visit</th></tr></thead>
                        <tbody>
                          {members.slice(0, memberLimit).map((m: RangeMember) => (
                            <tr key={m.id}>
                              <td>
                                <div className={a.personCell}>
                                  <Photo name={m.name} url={m.photo_url} tone="blue" />
                                  <div className={a.who}>
                                    <div className={a.name}>{m.name}{m.new_visitor && <span className={r.newTag}>New</span>}</div>
                                    <div className={a.sub}>{[m.code, m.plan].filter(Boolean).join(" · ")}</div>
                                  </div>
                                </div>
                              </td>
                              <td className={r.num}><b>{m.visits}</b> <span className={styles.muted}>· {m.days_visited}d</span></td>
                              <td className={r.num}>{m.per_week}</td>
                              <td className={r.num}>{fmtDur(m.avg_stay_minutes)}</td>
                              <td className={r.num}>{fmtDur(m.total_minutes)}</td>
                              <td className={r.num}>{m.usual_time || "—"}</td>
                              <td className={r.num}>{fmtDate(m.last_visit)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {members.length > memberLimit && <div className={a.more}><Button variant="outline" size="sm" onClick={() => setMemberLimit(n => n + 100)}>Show more ({members.length - memberLimit} left)</Button></div>}
                  </>
                )}
              </Panel>

              <Panel title="How often they came" icon={BarChart3} sub="Members by number of visits in this period">
                <BarRows fmt={fmtInt} empty="No member visits"
                  rows={report.frequency.map((f, i) => ({ key: f.label, label: f.label, value: f.count, color: [palette.s6, palette.s1, palette.s3, palette.s4, palette.s2][i], meta: `${f.pct}%` }))} />
              </Panel>
            </div>

            <Panel title="Active members who didn't come in" icon={UserX} scope={String(s!.not_visited_count)}
              sub="Valid membership, no visit in this period — longest away first. Call them before they lapse.">
              <div className={a.toolbar} style={{ padding: 0 }}>
                <label className={a.search}><Search size={15} /><input value={absentQ} onChange={e => setAbsentQ(e.target.value)} placeholder="Search name, ID or phone" aria-label="Search absent members" /></label>
                {s!.not_visited_count > report.not_visited.length && <span className={styles.muted} style={{ fontSize: "var(--text-xs)" }}>Showing the {report.not_visited.length} longest away · export for the full list</span>}
              </div>
              {absent.length === 0 ? <Empty icon={CheckCircle2} title={s!.not_visited_count ? "No members match" : "Every active member came in"} /> : (
                <>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead><tr><th>Member</th><th>Phone</th><th>Last visit</th><th>Away</th><th>Membership ends</th></tr></thead>
                      <tbody>
                        {absent.slice(0, absentLimit).map((m: RangeAbsent) => (
                          <tr key={m.id}>
                            <td>
                              <div className={a.personCell}>
                                <Photo name={m.name} url={m.photo_url} tone="red" />
                                <div className={a.who}><div className={a.name}>{m.name}</div><div className={a.sub}>{[m.code, m.plan].filter(Boolean).join(" · ")}</div></div>
                              </div>
                            </td>
                            <td>{m.phone ? <a className={r.phone} href={`tel:${m.phone.replace(/\s+/g, "")}`}>{m.phone}</a> : <span className={styles.muted}>—</span>}</td>
                            <td className={r.num}>{m.last_visit ? fmtDate(m.last_visit) : <span className={r.pill}>Never</span>}</td>
                            <td className={r.num}>
                              {m.days_since_last_visit == null ? "—"
                                : m.days_since_last_visit >= 30 ? <Status kind="critical">{m.days_since_last_visit} days</Status>
                                : m.days_since_last_visit >= 14 ? <Status kind="warning">{m.days_since_last_visit} days</Status>
                                : <span className={r.pill}>{m.days_since_last_visit} days</span>}
                            </td>
                            <td className={r.num}>{m.membership_ends ? fmtDate(m.membership_ends) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {absent.length > absentLimit && <div className={a.more}><Button variant="outline" size="sm" onClick={() => setAbsentLimit(n => n + 100)}>Show more ({absent.length - absentLimit} left)</Button></div>}
                </>
              )}
            </Panel>
          </>
        )}

        {/* ── Staff & trainers ── */}
        {report && tab === "team" && (
          <>
            <div className={r.facts5}>
              <Fact label="Trainers came in" value={teamTotals.trainers} tone="violet" />
              <Fact label="Staff came in" value={teamTotals.staff} tone="teal" />
              <Fact label="Hours on site" value={fmtHours(teamTotals.minutes)} tone="blue" />
              <Fact label="Late arrivals" value={report.roster_included ? teamTotals.late : "—"} tone={teamTotals.late ? "amber" : "gray"} />
              <Fact label="Absences" value={report.roster_included ? teamTotals.absent : "—"} tone={teamTotals.absent ? "red" : "gray"} />
            </div>
            <div className={r.cols21}>
              <Panel title="Staff & trainers" icon={Briefcase} sub={report.roster_included ? "Clock-ins against each person's shifts" : "Clock-ins (lateness and absences are shown for periods up to 3 months)"}
                action={<Seg label="Team" value={teamFilter} onChange={setTeamFilter} options={[["all", "Everyone"], ["trainer", "Trainers"], ["staff", "Staff"]]} />}>
                {team.length === 0 ? <Empty icon={Briefcase} title="No staff or trainers clocked in" text="Staff clock in from the GymBios app or the check-in desk; shifts come from Shifts & Schedules." /> : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead><tr><th>Name</th><th>Days</th><th>Hours</th><th>Per day</th><th>Usual in</th>{report.roster_included && <><th>Late</th><th>Absent</th><th>On time</th></>}</tr></thead>
                      <tbody>
                        {team.map((t: RangeStaff) => (
                          <tr key={t.id}>
                            <td>
                              <div className={a.personCell}>
                                <Photo name={t.name} url={t.photo_url} tone={t.trainer ? "violet" : "teal"} />
                                <div className={a.who}>
                                  <div className={a.name}>{t.name}{t.open_now && <span className={r.newTag}>On duty</span>}</div>
                                  <div className={a.sub}>{[t.code, t.role || (t.trainer ? "Trainer" : "Staff")].filter(Boolean).join(" · ")}</div>
                                </div>
                              </div>
                            </td>
                            <td className={r.num}><b>{t.days_present}</b>{t.scheduled_days ? <span className={styles.muted}> / {t.scheduled_days}</span> : null}</td>
                            <td className={r.num}>{fmtDur(t.total_minutes)}</td>
                            <td className={r.num}>{fmtDur(t.avg_minutes_per_day)}</td>
                            <td className={r.num}>{t.usual_in || "—"}</td>
                            {report.roster_included && <>
                              <td className={r.num}>{t.late_days ? <Status kind="warning">{t.late_days}× · {fmtDur(t.late_minutes)}</Status> : <span className={styles.muted}>—</span>}</td>
                              <td className={r.num}>{t.absent_days ? <Status kind="critical">{t.absent_days}</Status> : <span className={styles.muted}>—</span>}</td>
                              <td className={r.num}>{t.punctuality_pct == null ? "—" : `${t.punctuality_pct}%`}</td>
                            </>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
              <Panel title="Hours on site" icon={Dumbbell} sub="Total clocked time per person">
                <BarRows fmt={v => fmtDur(v)} empty="No clock-ins"
                  rows={[...team].sort((x, y) => y.total_minutes - x.total_minutes).slice(0, 12).map(t => ({
                    key: String(t.id), label: t.name, value: t.total_minutes, color: t.trainer ? palette.s4 : palette.s6, meta: plural(t.days_present, "day"),
                  }))} />
              </Panel>
            </div>
          </>
        )}

        {/* ── Peak times ── */}
        {report && tab === "times" && (
          <>
            <Panel title="When members come in" icon={Clock} sub="Check-ins by weekday and hour · hover a cell for the numbers">
              {heat.max === 0 ? <Empty icon={Clock} title="No visits in this period" /> : (
                <>
                  <div className={styles.heatWrap}>
                    <div className={styles.heat} style={{ ["--cols" as any]: heat.hours.length }} onMouseLeave={() => setHeatHover(null)}
                      role="img" aria-label={`Check-in heatmap. Busiest slot ${heat.slots[0] ? `${fullDay(heat.slots[0].day)} ${hourLong(heat.slots[0].h)} with ${heat.slots[0].v} check-ins` : "none"}.`}>
                      <span />
                      {heat.hours.map(h => <span key={h} className={styles.heatHour}>{h % 2 === 0 ? hourShort(h) : ""}</span>)}
                      {WEEKDAYS.map((d, di) => (
                        <React.Fragment key={d}>
                          <span className={styles.heatLabel}>{d}</span>
                          {heat.hours.map(h => {
                            const v = heat.grid[di]?.[h] ?? 0;
                            const occ = heat.occ[di] || 0;
                            const text = `${fullDay(d)} ${hourLong(h)} – ${v} check-in${v === 1 ? "" : "s"}${occ > 1 ? ` (about ${(v / occ).toFixed(1)} each ${fullDay(d)})` : ""}`;
                            return <span key={h} className={styles.heatCell} style={{ ["--cell" as any]: heatColor(v) }} onMouseEnter={() => setHeatHover(text)} />;
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <div className={styles.panelHead} style={{ alignItems: "center" }}>
                    <div className={styles.heatReadout} aria-live="polite">
                      {heatHover ?? <>Busiest slot <b>{heat.slots[0] ? `${fullDay(heat.slots[0].day)} ${hourLong(heat.slots[0].h)}` : "—"}</b> · peak hour <b>{s?.peak_hour || "—"}</b></>}
                    </div>
                    <div className={styles.heatScale}>
                      <span>Fewer</span>
                      <span className={styles.heatRamp}><span style={{ ["--cell" as any]: "var(--heat-0)" }} />{heatRamp.map(c => <span key={c} style={{ ["--cell" as any]: c }} />)}</span>
                      <span>More (max {heat.max})</span>
                    </div>
                  </div>
                </>
              )}
            </Panel>
            <div className={r.cols21}>
              <Panel title="By hour of day" icon={BarChart3} sub="All check-ins in the period">
                <div className={r.chartSm}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourly} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={palette.grid} />
                      <XAxis dataKey="label" tick={axisTick(palette)} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis allowDecimals={false} tick={axisTick(palette)} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTip />} cursor={{ fill: "color-mix(in srgb, currentColor 6%, transparent)" }} />
                      <Bar dataKey="visits" name="Check-ins" fill={palette.s1} radius={[4, 4, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
              <Panel title="Busiest slots" icon={TrendingUp} sub="Weekday and hour with the most check-ins">
                {heat.slots.length === 0 ? <Empty icon={Clock} title="No visits" /> : (
                  <div className={r.slotList}>
                    {heat.slots.map((x, i) => (
                      <div key={`${x.day}${x.h}`} className={r.slot}>
                        <span className={r.rank}>#{i + 1}</span>
                        <span>{fullDay(x.day)}, {hourLong(x.h)} – {hourLong((x.h + 1) % 24)}</span>
                        <span className={r.slotVal}>{x.v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          </>
        )}

        {/* ── Visit patterns ── */}
        {report && tab === "patterns" && (
          <div className={styles.cols2}>
            <Panel title="Time spent per visit" icon={Timer} sub={`Average ${fmtDur(cur?.avg_stay_minutes)} · ${fmtInt(cur?.no_checkout ?? 0)} visits never checked out`}>
              <BarRows fmt={fmtInt} empty="No visits"
                rows={report.stay.map((x, i) => ({ key: x.label, label: x.label, value: x.count, color: i === report.stay.length - 1 ? "#a8a69f" : i >= 5 ? palette.s2 : palette.s1, meta: `${x.pct}%` }))} />
            </Panel>
            <Panel title="How they check in" icon={DoorOpen} sub="Face device, QR, desk or app">
              <BarRows fmt={fmtInt} empty="No visits" rows={report.methods.map((x, i) => ({ key: x.label, label: x.label, value: x.count, color: [palette.s1, palette.s3, palette.s4, palette.s2, palette.s6, palette.s5][i % 6], meta: `${x.pct}%` }))} />
            </Panel>
            <Panel title="Visits by plan" icon={Users} sub="Which memberships bring people in">
              <BarRows fmt={fmtInt} empty="No visits" rows={report.plans.slice(0, 12).map(x => ({ key: x.label, label: x.label, value: x.count, color: x.label.startsWith("Walk-in") ? palette.s2 : palette.s1, meta: `${x.pct}%` }))} />
            </Panel>
            <Panel title="Activities" icon={Dumbbell} sub="What members logged in the app">
              <BarRows fmt={fmtInt} empty="No activities logged in this period" rows={report.activities.slice(0, 12).map(x => ({ key: x.label, label: x.label, value: x.count, color: palette.s3, meta: `${x.pct}%` }))} />
            </Panel>
          </div>
        )}

        {/* ── Settings ── */}
        {tab === "settings" && (
          <Panel title="Report settings" icon={Settings2} sub="Weekly email summary and the capacity the Check-In page measures occupancy against">
            <div className={r.setting}>
              <span className={styles.kpiIcon} data-tone="blue"><Mail size={16} /></span>
              <div className={r.settingText}>
                <div className={r.settingTitle}>Weekly attendance email</div>
                <div className={r.settingSub}>Every Monday, a summary of last week's attendance goes to this address.</div>
              </div>
              <div className={r.settingControls}>
                <input className={r.field} type="email" placeholder="manager@yourgym.com" value={recipient} onChange={e => setRecipient(e.target.value)} disabled={savingSettings} aria-label="Report email" style={{ width: "16rem" }} />
                <Switch checked={autoReports} disabled={savingSettings} onCheckedChange={toggleAuto} aria-label="Weekly attendance email" />
              </div>
            </div>
            <div className={r.setting}>
              <span className={styles.kpiIcon} data-tone="green"><Users size={16} /></span>
              <div className={r.settingText}>
                <div className={r.settingTitle}>Gym capacity</div>
                <div className={r.settingSub}>How many people the gym holds. The Check-In page shows live occupancy out of this number.</div>
              </div>
              <div className={r.settingControls}>
                <input className={r.field} type="number" min={1} value={capacity} onChange={e => setCapacity(e.target.value)} disabled={savingSettings} aria-label="Gym capacity" style={{ width: "7rem" }} />
                <Button variant="outline" size="sm" onClick={saveCapacity} disabled={savingSettings}>Save</Button>
              </div>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

export default AttendanceReports;
