import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  UserCheck, CheckCircle, Clock, XCircle, TimerOff, RefreshCw, TrendingUp, Download, Pencil, Search,
  CalendarDays, ListChecks, ClipboardEdit, ChevronLeft, ChevronRight, Save, Undo2, CalendarClock,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { hasPermission } from "../utils/permissions";
import { useBranch } from "../utils/branch-context";
import { exportAsCsv } from "../utils/export-utils";
import {
  staffAttendanceAdminService, AttendanceDay, AttendanceSummary, AttendanceCorrection, AttendanceStatus, ApprovalStatus,
} from "../utils/supabase/workforce-service";
import {
  PageHeader, Kpi, Badge, Note, Panel, TabBar, Person, Empty, Field, Stat, ProgressBar, Tone, cx, wf as s,
  toISODate, formatDate, minutesLabel, hoursLabel, errorMessage, MONTHS,
} from "../components/workforce/ui";

interface StaffAttendanceProps { onNavigate?: (section: string, params?: Record<string, any>) => void; }

type TabId = "daily" | "monthly" | "corrections";

export const STATUS_TONE: Record<AttendanceStatus, Tone> = {
  "Present": "green", "Late": "amber", "Early Departure": "orange", "Absent": "red", "Half Day": "amber",
  "Weekly Off": "gray", "Holiday": "blue", "Paid Leave": "violet", "Unpaid Leave": "rose", "Incomplete Punch": "rose",
  "Overtime": "teal", "Working": "teal", "Scheduled": "gray", "No Shift": "gray",
};
const APPROVAL_TONE: Record<ApprovalStatus, Tone> = { "Auto-Approved": "green", "Pending": "amber", "Approved": "teal", "Rejected": "red" };
const DAY_STATUSES = ["Present", "Absent", "Half Day", "Paid Leave", "Unpaid Leave", "Holiday", "Weekly Off"];
const FILTER_STATUSES: AttendanceStatus[] = ["Present", "Late", "Early Departure", "Absent", "Half Day", "Overtime", "Incomplete Punch", "Working", "Paid Leave", "Unpaid Leave", "Holiday", "Weekly Off", "Scheduled", "No Shift"];

interface CorrectionForm { staff_id: string; date: string; check_in: string; check_out: string; day_status: string; reason: string; }

export function StaffAttendance({ onNavigate }: StaffAttendanceProps) {
  const location = useLocation();
  const navState = (location.state || {}) as { date?: string; staffId?: number; tab?: TabId };
  const { activeBranchId } = useBranch();
  const canEdit = hasPermission("STAFF_EDIT") || hasPermission("PAYROLL_EDIT");
  const canApprove = hasPermission("PAYROLL_APPROVE");

  const todayIso = toISODate(new Date());
  const [tab, setTab] = useState<TabId>(navState.tab ?? "daily");
  const [from, setFrom] = useState(navState.date ?? todayIso);
  const [to, setTo] = useState(navState.date ?? todayIso);
  const [staffFilter, setStaffFilter] = useState(navState.staffId ? String(navState.staffId) : "all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [hideOff, setHideOff] = useState(true);
  const [search, setSearch] = useState("");

  const [days, setDays] = useState<AttendanceDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [summary, setSummary] = useState<AttendanceSummary[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [corrections, setCorrections] = useState<AttendanceCorrection[]>([]);

  const [detail, setDetail] = useState<AttendanceDay | null>(null);
  const [otMinutes, setOtMinutes] = useState("");
  const [dayStatus, setDayStatus] = useState("");
  const [dayNote, setDayNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [corrOpen, setCorrOpen] = useState(false);
  const [corr, setCorr] = useState<CorrectionForm>({ staff_id: "", date: todayIso, check_in: "", check_out: "", day_status: "", reason: "" });
  const [review, setReview] = useState<{ c: AttendanceCorrection; approve: boolean } | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const loadDays = useCallback(async () => {
    setLoading(true);
    try {
      setDays(await staffAttendanceAdminService.daily(from, to));
    } catch (e) {
      toast.error(errorMessage(e, "Failed to load attendance"));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  const loadCorrections = useCallback(async () => {
    try { setCorrections(await staffAttendanceAdminService.corrections()); }
    catch (e) { toast.error(errorMessage(e, "Failed to load corrections")); }
  }, []);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try { setSummary(await staffAttendanceAdminService.monthly(month.getFullYear(), month.getMonth() + 1)); }
    catch (e) { toast.error(errorMessage(e, "Failed to load monthly summary")); }
    finally { setSummaryLoading(false); }
  }, [month]);

  useEffect(() => { if (to >= from) loadDays(); }, [loadDays, activeBranchId, from, to]);
  useEffect(() => { loadCorrections(); }, [loadCorrections, activeBranchId]);
  useEffect(() => { if (tab === "monthly") loadSummary(); }, [tab, loadSummary, activeBranchId]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const staffOptions = useMemo(() => {
    const m = new Map<number, string>();
    days.forEach(d => m.set(d.staff_id, d.staff_name));
    summary.forEach(d => m.set(d.staff_id, d.staff_name));
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [days, summary]);

  const filtered = useMemo(() => days.filter(d => {
    if (staffFilter !== "all" && String(d.staff_id) !== staffFilter) return false;
    if (statusFilter === "pending") { if (d.approval_status !== "Pending") return false; }
    else if (statusFilter === "late") { if (d.late_minutes <= 0) return false; }
    else if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (hideOff && statusFilter === "all" && (d.status === "Weekly Off" || d.status === "No Shift") && !d.punch_count) return false;
    if (search && !`${d.staff_name} ${d.staff_code ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [days, staffFilter, statusFilter, hideOff, search]);

  const kpis = useMemo(() => {
    const scope = days.filter(d => staffFilter === "all" || String(d.staff_id) === staffFilter);
    return {
      present: scope.filter(d => ["Present", "Late", "Early Departure", "Overtime", "Working", "Half Day"].includes(d.status)).length,
      late: scope.filter(d => d.late_minutes > 0).length,
      absent: scope.filter(d => d.status === "Absent").length,
      incomplete: scope.filter(d => d.status === "Incomplete Punch").length,
      pending: scope.filter(d => d.approval_status === "Pending").length,
      ot: scope.reduce((t, d) => t + d.ot_minutes, 0),
    };
  }, [days, staffFilter]);

  const pendingCorrections = corrections.filter(c => c.status === "Pending");
  const pendingOt = filtered.filter(d => d.ot_minutes > 0 && d.approval_status === "Pending");
  const singleDay = from === to;

  // ── Actions ───────────────────────────────────────────────────────────────
  const openDetail = (d: AttendanceDay) => {
    setDetail(d);
    setOtMinutes(d.ot_minutes ? String(d.approved_ot_minutes || d.ot_minutes) : "");
    setDayStatus(d.status_override ?? "");
    setDayNote(d.note ?? "");
  };

  const decide = async (d: AttendanceDay, body: Parameters<typeof staffAttendanceAdminService.decide>[0], msg: string) => {
    setSaving(true);
    try {
      await staffAttendanceAdminService.decide(body);
      toast.success(msg);
      setDetail(null);
      loadDays();
    } catch (e) {
      toast.error(errorMessage(e, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  const approveAllOt = async () => {
    try {
      const r = await staffAttendanceAdminService.decideMany(pendingOt.map(d => ({ staff_id: d.staff_id, date: d.date, approval_status: "Approved" as const })));
      toast.success(`Approved overtime on ${r.updated} day${r.updated === 1 ? "" : "s"}`);
      loadDays();
    } catch (e) { toast.error(errorMessage(e, "Failed to approve overtime")); }
  };

  const openCorrection = (d?: AttendanceDay) => {
    setCorr({
      staff_id: d ? String(d.staff_id) : staffFilter !== "all" ? staffFilter : "",
      date: d?.date ?? (singleDay ? from : todayIso),
      check_in: d?.actual_in ?? d?.scheduled_in ?? "",
      check_out: d?.actual_out ?? d?.scheduled_out ?? "",
      day_status: "",
      reason: "",
    });
    setDetail(null);
    setCorrOpen(true);
  };

  const submitCorrection = async () => {
    if (!corr.staff_id) { toast.error("Pick an employee"); return; }
    if (!corr.reason.trim()) { toast.error("Give a reason for the correction"); return; }
    setSaving(true);
    try {
      await staffAttendanceAdminService.requestCorrection({
        staff_id: Number(corr.staff_id), date: corr.date,
        check_in: corr.check_in || null, check_out: corr.check_out || null,
        day_status: corr.day_status || null, reason: corr.reason.trim(),
      });
      toast.success("Correction submitted for approval");
      setCorrOpen(false);
      loadCorrections();
      loadDays();
      setTab("corrections");
    } catch (e) {
      toast.error(errorMessage(e, "Failed to submit correction"));
    } finally {
      setSaving(false);
    }
  };

  const submitReview = async () => {
    if (!review) return;
    setSaving(true);
    try {
      if (review.approve) await staffAttendanceAdminService.approveCorrection(review.c.id, reviewNote || undefined);
      else await staffAttendanceAdminService.rejectCorrection(review.c.id, reviewNote || undefined);
      toast.success(review.approve ? "Correction approved and applied" : "Correction rejected");
      setReview(null);
      setReviewNote("");
      loadCorrections();
      loadDays();
    } catch (e) {
      toast.error(errorMessage(e, "Failed to review correction"));
    } finally {
      setSaving(false);
    }
  };

  const withdraw = async (c: AttendanceCorrection) => {
    try { await staffAttendanceAdminService.withdrawCorrection(c.id); toast.success("Correction withdrawn"); loadCorrections(); loadDays(); }
    catch (e) { toast.error(errorMessage(e, "Failed to withdraw")); }
  };

  const exportCsv = () => {
    if (tab === "monthly") {
      exportAsCsv(`staff-attendance-${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}.csv`,
        ["Employee", "Code", "Shift", "Scheduled Days", "Present", "Absent", "Paid Leave", "Unpaid Leave", "Weekly Off", "Holidays", "Late Arrivals",
          "Scheduled Hrs", "Actual Hrs", "Regular Hrs", "Late Hrs", "OT Hrs", "Approved OT Hrs", "Attendance %"],
        summary.map(m => [m.staff_name, m.staff_code, m.shift_name, m.scheduled_days, m.present, m.absent, m.paid_leave, m.unpaid_leave, m.weekly_off,
          m.holidays, m.late_count, m.scheduled_hours, m.actual_hours, m.regular_hours, m.late_hours, m.ot_hours, m.approved_ot_hours, m.attendance_rate ?? ""]));
      return;
    }
    exportAsCsv(`staff-attendance-${from}${from !== to ? `_${to}` : ""}.csv`,
      ["Date", "Employee", "Code", "Shift", "Scheduled In", "Actual In", "Scheduled Out", "Actual Out", "Worked (min)", "Late (min)", "Early (min)", "OT (min)", "Approved OT (min)", "Status", "Approval"],
      filtered.map(d => [d.date, d.staff_name, d.staff_code, d.shift_name, d.scheduled_in, d.actual_in, d.scheduled_out, d.actual_out,
        d.worked_minutes, d.late_minutes, d.early_minutes, d.ot_minutes, d.approved_ot_minutes, d.status, d.approval_status]));
  };

  const shiftDay = (delta: number) => {
    const d = new Date(`${from}T00:00:00`);
    d.setDate(d.getDate() + delta);
    const iso = toISODate(d);
    setFrom(iso);
    setTo(iso);
  };

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className={s.page}>
      <PageHeader
        crumbs={[{ label: "Payroll & Employees", to: "payroll-employees" }, { label: "Staff Attendance" }]}
        onCrumb={to => onNavigate?.(to)}
        icon={UserCheck}
        title="Staff Attendance"
        subtitle="Shift-based attendance · Overtime approval · Corrections · Monthly summary for payroll"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => onNavigate?.("shifts-schedules")}><CalendarClock className="h-4 w-4 mr-1" />Shifts & Schedules</Button>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export</Button>
            {canEdit && <Button size="sm" onClick={() => openCorrection()}><Pencil className="h-4 w-4 mr-1" />Manual Entry</Button>}
          </>
        }
      />

      <div className={s.kpis}>
        <Kpi icon={CheckCircle} label="Present" value={kpis.present} tone="green" onClick={() => { setTab("daily"); setStatusFilter("all"); }} />
        <Kpi icon={Clock} label="Late arrivals" value={kpis.late} tone="amber" onClick={() => { setTab("daily"); setStatusFilter("late"); }} active={statusFilter === "late"} />
        <Kpi icon={XCircle} label="Absent" value={kpis.absent} tone="red" onClick={() => { setTab("daily"); setStatusFilter("Absent"); }} active={statusFilter === "Absent"} />
        <Kpi icon={TimerOff} label="Incomplete punches" value={kpis.incomplete} tone="rose" onClick={() => { setTab("daily"); setStatusFilter("Incomplete Punch"); }} active={statusFilter === "Incomplete Punch"} />
        <Kpi icon={RefreshCw} label="Pending approval" value={kpis.pending + pendingCorrections.length} sub={pendingCorrections.length ? `${pendingCorrections.length} correction${pendingCorrections.length === 1 ? "" : "s"}` : undefined}
          tone="violet" onClick={() => { setTab(pendingCorrections.length && !kpis.pending ? "corrections" : "daily"); setStatusFilter("pending"); }} active={statusFilter === "pending"} />
        <Kpi icon={TrendingUp} label={singleDay ? "Overtime (day)" : "Overtime (range)"} value={minutesLabel(kpis.ot) === "—" ? "0h" : minutesLabel(kpis.ot)} tone="teal" />
      </div>

      <TabBar<TabId>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "daily", label: "Daily Records", icon: ListChecks },
          { id: "monthly", label: "Monthly Summary", icon: CalendarDays },
          { id: "corrections", label: "Corrections", icon: ClipboardEdit, count: pendingCorrections.length, countTone: "violet" },
        ]}
      />

      {/* ── Daily ─────────────────────────────────────────────────────────── */}
      {tab === "daily" && (
        <Panel flush>
          <div className={s.filterBar}>
            <Button variant="outline" size="sm" className="h-9" onClick={() => shiftDay(-1)} title="Previous day"><ChevronLeft className="h-4 w-4" /></Button>
            <Input type="date" className="h-9" style={{ width: "9.75rem" }} value={from} max={to}
              onChange={e => { setFrom(e.target.value); if (e.target.value > to) setTo(e.target.value); }} />
            <span className={s.muted}>to</span>
            <Input type="date" className="h-9" style={{ width: "9.75rem" }} value={to} min={from}
              onChange={e => setTo(e.target.value)} />
            <Button variant="outline" size="sm" className="h-9" onClick={() => shiftDay(1)} title="Next day"><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="h-9" onClick={() => { setFrom(todayIso); setTo(todayIso); }}>Today</Button>
            <div className={s.search}>
              <Search size={14} />
              <Input className="h-9" placeholder="Search employee…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={staffFilter} onValueChange={setStaffFilter}>
              <SelectTrigger className={cx("h-9", s.select)}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {staffOptions.map(([id, name]) => <SelectItem key={id} value={String(id)}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={cx("h-9", s.select)}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending approval</SelectItem>
                <SelectItem value="late">Late arrivals</SelectItem>
                {FILTER_STATUSES.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="h-9" onClick={() => setHideOff(v => !v)}>{hideOff ? "Show days off" : "Hide days off"}</Button>
            {(statusFilter !== "all" || staffFilter !== "all" || search) && (
              <Button variant="ghost" size="sm" className="h-9" onClick={() => { setStatusFilter("all"); setStaffFilter("all"); setSearch(""); }}>
                <Undo2 className="h-4 w-4 mr-1" />Reset
              </Button>
            )}
          </div>
          {canEdit && pendingOt.length > 1 && (
            <div className={s.panelBody} style={{ paddingTop: 0 }}>
              <Note tone="violet" icon={TrendingUp}>
                <div className={s.spread}>
                  <span>{pendingOt.length} days have overtime waiting for approval ({minutesLabel(pendingOt.reduce((t, d) => t + d.ot_minutes, 0))}).</span>
                  <Button size="sm" onClick={approveAllOt}><CheckCircle className="h-4 w-4 mr-1" />Approve all</Button>
                </div>
              </Note>
            </div>
          )}
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th className={s.stickyCol}>Employee</th>
                  {!singleDay && <th>Date</th>}
                  <th>Shift</th>
                  <th>Sched. In</th>
                  <th>Actual In</th>
                  <th>Sched. Out</th>
                  <th>Actual Out</th>
                  <th className={s.right}>Worked</th>
                  <th className={s.right}>Late</th>
                  <th className={s.right}>OT</th>
                  <th>Status</th>
                  <th>Approval</th>
                  {canEdit && <th className={s.right}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const otPending = d.ot_minutes > 0 && d.approval_status === "Pending";
                  return (
                    <tr key={d.id} className={s.clickable} onClick={() => openDetail(d)}>
                      <td className={s.stickyCol}><Person name={d.staff_name} sub={d.role ?? d.staff_code} photo={d.photo_url} size="sm" /></td>
                      {!singleDay && <td>{formatDate(d.date, { weekday: "short", day: "2-digit", month: "short" })}</td>}
                      <td>{d.shift_name ? <span>{d.shift_name}{d.roster_change && <span className={s.cellSub}> · day change</span>}</span> : <span className={s.muted}>—</span>}</td>
                      <td className={s.num}>{d.scheduled_in ?? "—"}</td>
                      <td className={s.num}>
                        <span data-tone={!d.actual_in ? (d.status === "Absent" ? "red" : undefined) : d.late_minutes > 0 ? "amber" : "green"}
                          className={cx(s.strong, (d.actual_in || d.status === "Absent") && s.toneText)}>{d.actual_in ?? "—"}</span>
                      </td>
                      <td className={s.num}>{d.scheduled_out ?? "—"}</td>
                      <td className={s.num}>
                        <span data-tone={d.status === "Incomplete Punch" ? "rose" : d.early_minutes > 0 ? "orange" : undefined}
                          className={cx(s.strong, (d.status === "Incomplete Punch" || d.early_minutes > 0) && s.toneText)}>
                          {d.actual_out ?? (d.status === "Working" ? "in" : "—")}
                        </span>
                      </td>
                      <td className={cx(s.right, s.num)}>{minutesLabel(d.worked_minutes)}</td>
                      <td className={cx(s.right, s.num)}><span data-tone="amber" className={d.late_minutes ? s.toneText : s.muted}>{minutesLabel(d.late_minutes)}</span></td>
                      <td className={cx(s.right, s.num)}><span data-tone="teal" className={d.ot_minutes ? cx(s.toneText, s.strong) : s.muted}>{minutesLabel(d.ot_minutes)}</span></td>
                      <td><Badge tone={STATUS_TONE[d.status] ?? "gray"}>{d.status}</Badge>{d.pending_correction && <div className={s.cellSub}>correction pending</div>}</td>
                      <td><Badge tone={APPROVAL_TONE[d.approval_status]}>{d.approval_status}</Badge></td>
                      {canEdit && (
                        <td className={s.right} onClick={e => e.stopPropagation()}>
                          <div className={s.rowActions}>
                            {otPending && (
                              <>
                                <button className={s.iconBtn} data-tone="green" title="Approve overtime"
                                  onClick={() => decide(d, { staff_id: d.staff_id, date: d.date, approval_status: "Approved" }, "Overtime approved")}><CheckCircle size={15} /></button>
                                <button className={s.iconBtn} data-tone="red" title="Reject overtime"
                                  onClick={() => decide(d, { staff_id: d.staff_id, date: d.date, approval_status: "Rejected" }, "Overtime rejected")}><XCircle size={15} /></button>
                              </>
                            )}
                            <button className={s.iconBtn} title="Correct record" onClick={() => openCorrection(d)}><Pencil size={14} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!loading && filtered.length === 0 && (
              <Empty icon={UserCheck} title="No attendance records">
                {days.length === 0 ? "Assign shifts to employees in Shifts & Schedules to track attendance against them." : "Nothing matches these filters."}
              </Empty>
            )}
            {loading && <Empty icon={RefreshCw} title="Loading attendance…" />}
          </div>
        </Panel>
      )}

      {/* ── Monthly ───────────────────────────────────────────────────────── */}
      {tab === "monthly" && (
        <>
          <Panel
            title={`${MONTHS[month.getMonth()]} ${month.getFullYear()} — Monthly Attendance Summary`}
            description="Scheduled days and hours come from each employee's shift; payroll uses these figures."
            actions={
              <>
                <Button variant="outline" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>This month</Button>
                <Button variant="outline" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </>
            }
            flush
          >
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th className={s.stickyCol}>Employee</th>
                    <th className={s.center}>Sched. Days</th>
                    <th className={s.center}>Present</th>
                    <th className={s.center}>Absent</th>
                    <th className={s.center}>Paid Leave</th>
                    <th className={s.center}>Unpaid</th>
                    <th className={s.center}>Weekly Off</th>
                    <th className={s.center}>Holiday</th>
                    <th className={s.center}>Late</th>
                    <th className={s.right}>Sched. Hrs</th>
                    <th className={s.right}>Actual Hrs</th>
                    <th className={s.right}>Regular Hrs</th>
                    <th className={s.right}>OT Hrs</th>
                    <th className={s.right}>Appr. OT</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map(m => {
                    const rate = m.attendance_rate;
                    const tone: Tone = rate == null ? "gray" : rate >= 95 ? "green" : rate >= 80 ? "amber" : "red";
                    const dash = (v: number, t?: Tone) => v ? <span data-tone={t} className={cx(t && s.toneText, s.strong)}>{v}</span> : <span className={s.muted}>—</span>;
                    return (
                      <tr key={m.staff_id} className={s.clickable}
                        onClick={() => {
                          const first = toISODate(month);
                          const last = toISODate(new Date(month.getFullYear(), month.getMonth() + 1, 0));
                          setFrom(first); setTo(last < todayIso ? last : (todayIso >= first ? todayIso : last));
                          setStaffFilter(String(m.staff_id)); setStatusFilter("all"); setTab("daily");
                        }}>
                        <td className={s.stickyCol}>
                          <div className={s.person}>
                            <Person name={m.staff_name} sub={m.shift_name ?? "No shift"} photo={m.photo_url} size="sm" />
                          </div>
                          {rate != null && (
                            <div className={s.barRow} style={{ marginTop: 4 }}>
                              <ProgressBar value={rate} tone={tone} />
                              <span className={s.cellSub}>{rate}%</span>
                            </div>
                          )}
                        </td>
                        <td className={s.center}>{m.scheduled_days || <span className={s.muted}>—</span>}</td>
                        <td className={s.center}>{dash(m.present, "green")}</td>
                        <td className={s.center}>{dash(m.absent, "red")}</td>
                        <td className={s.center}>{dash(m.paid_leave, "violet")}</td>
                        <td className={s.center}>{dash(m.unpaid_leave, "rose")}</td>
                        <td className={s.center}>{dash(m.weekly_off)}</td>
                        <td className={s.center}>{dash(m.holidays, "blue")}</td>
                        <td className={s.center}>{dash(m.late_count, "amber")}</td>
                        <td className={cx(s.right, s.num)}>{hoursLabel(m.scheduled_hours)}</td>
                        <td className={cx(s.right, s.num, s.strong)}>{hoursLabel(m.actual_hours)}</td>
                        <td className={cx(s.right, s.num)}>{hoursLabel(m.regular_hours)}</td>
                        <td className={cx(s.right, s.num)}>{m.ot_hours ? hoursLabel(m.ot_hours) : <span className={s.muted}>—</span>}</td>
                        <td className={cx(s.right, s.num)}>
                          {m.approved_ot_hours ? <span data-tone="teal" className={cx(s.toneText, s.strong)}>{hoursLabel(m.approved_ot_hours)}</span> : <span className={s.muted}>—</span>}
                          {m.pending_ot_days > 0 && <div className={s.cellSub}>{m.pending_ot_days} pending</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!summaryLoading && summary.length === 0 && <Empty icon={CalendarDays} title="No employees" />}
              {summaryLoading && <Empty icon={RefreshCw} title="Calculating…" />}
            </div>
          </Panel>
          <Note tone="teal">
            The monthly summary feeds <strong>Payroll</strong>: absences and unpaid leave are deducted at the daily rate, and only approved
            overtime is paid. Employees without a shift are paid their fixed salary.
          </Note>
        </>
      )}

      {/* ── Corrections ───────────────────────────────────────────────────── */}
      {tab === "corrections" && (
        <Panel
          title="Correction requests"
          description="Missed punches, wrong times and leave entries. Changes apply to attendance only once approved."
          actions={canEdit && <Button size="sm" onClick={() => openCorrection()}><Pencil className="h-4 w-4 mr-1" />New correction</Button>}
          flush
        >
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Employee</th><th>Date</th><th>Check-in</th><th>Check-out</th><th>Day status</th><th>Reason</th>
                  <th>Requested</th><th>Status</th><th className={s.right}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {corrections.map(c => (
                  <tr key={c.id}>
                    <td><Person name={c.staff_name} sub={c.role ?? c.staff_code} photo={c.photo_url} size="sm" /></td>
                    <td>{formatDate(c.date, { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td className={s.num}>{c.check_in ?? "—"}</td>
                    <td className={s.num}>{c.check_out ?? "—"}</td>
                    <td>{c.day_status ? <Badge tone={STATUS_TONE[c.day_status as AttendanceStatus] ?? "gray"}>{c.day_status}</Badge> : <span className={s.muted}>—</span>}</td>
                    <td style={{ whiteSpace: "normal", minWidth: "12rem", maxWidth: "20rem" }}>{c.reason}</td>
                    <td><div className={s.cellStack}><span>{c.requested_by ?? "—"}</span><span className={s.cellSub}>{formatDate(c.requested_at)}</span></div></td>
                    <td>
                      <Badge tone={c.status === "Pending" ? "amber" : c.status === "Approved" ? "green" : "red"}>{c.status}</Badge>
                      {c.reviewed_by && <div className={s.cellSub}>by {c.reviewed_by}</div>}
                    </td>
                    <td className={s.right}>
                      {c.status === "Pending" && (
                        <div className={s.rowActions}>
                          {canApprove && (
                            <>
                              <button className={s.iconBtn} data-tone="green" title="Approve" onClick={() => { setReview({ c, approve: true }); setReviewNote(""); }}><CheckCircle size={15} /></button>
                              <button className={s.iconBtn} data-tone="red" title="Reject" onClick={() => { setReview({ c, approve: false }); setReviewNote(""); }}><XCircle size={15} /></button>
                            </>
                          )}
                          {canEdit && <button className={s.iconBtn} title="Withdraw" onClick={() => withdraw(c)}><Undo2 size={14} /></button>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {corrections.length === 0 && <Empty icon={ClipboardEdit} title="No correction requests" />}
          </div>
          {!canApprove && pendingCorrections.length > 0 && (
            <div className={s.panelBody}><Note tone="amber">Approving corrections needs the Payroll approve permission.</Note></div>
          )}
        </Panel>
      )}

      {/* ══ Day detail ════════════════════════════════════════════════════ */}
      <Dialog open={!!detail} onOpenChange={v => !v && setDetail(null)}>
        <DialogContent className={cx(s.dialogLg, s.dialogScroll)}>
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.staff_name}</DialogTitle>
                <DialogDescription>{formatDate(detail.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {detail.shift_name ?? "No shift"}</DialogDescription>
              </DialogHeader>
              <div className={s.dialogBody}>
                <div className={s.row}>
                  <Badge tone={STATUS_TONE[detail.status] ?? "gray"}>{detail.status}</Badge>
                  <Badge tone={APPROVAL_TONE[detail.approval_status]}>{detail.approval_status}</Badge>
                  {detail.status_override && <Badge plain>Set by manager</Badge>}
                  {detail.pending_correction && <Badge tone="violet">Correction pending</Badge>}
                </div>
                <div className={s.stats}>
                  <Stat label="Scheduled" value={detail.scheduled_in ? `${detail.scheduled_in} – ${detail.scheduled_out}` : "Not scheduled"} />
                  <Stat label="Actual" value={detail.actual_in ? `${detail.actual_in} – ${detail.actual_out ?? (detail.status === "Working" ? "now" : "?")}` : "No clock-in"} />
                  <Stat label="Break" value={minutesLabel(detail.break_minutes)} />
                  <Stat label="Scheduled net" value={minutesLabel(detail.scheduled_minutes)} />
                  <Stat label="Worked" value={minutesLabel(detail.worked_minutes)} />
                  <Stat label="Late" value={minutesLabel(detail.late_minutes)} />
                  <Stat label="Left early" value={minutesLabel(detail.early_minutes)} />
                  <Stat label="Overtime" value={minutesLabel(detail.ot_minutes)} />
                  <Stat label="Approved OT" value={minutesLabel(detail.approved_ot_minutes)} />
                  <Stat label="Clock-ins" value={detail.punch_count} />
                </div>

                {canEdit && detail.ot_minutes > 0 && detail.overtime_policy === "approval" && (
                  <div className={s.section} data-tone="teal">
                    <div className={s.sectionTitle}>Overtime approval</div>
                    <div className={s.grid2} style={{ alignItems: "end" }}>
                      <Field label="Minutes to approve" hint={`Worked ${minutesLabel(detail.ot_minutes)} past the shift`}>
                        <Input type="number" min={0} max={detail.ot_minutes} value={otMinutes} onChange={e => setOtMinutes(e.target.value)} />
                      </Field>
                      <div className={s.row} style={{ justifyContent: "flex-end" }}>
                        <Button variant="outline" disabled={saving}
                          onClick={() => decide(detail, { staff_id: detail.staff_id, date: detail.date, approval_status: "Rejected", approved_ot_minutes: null }, "Overtime rejected")}>
                          <XCircle className="h-4 w-4 mr-1" />Reject
                        </Button>
                        <Button disabled={saving}
                          onClick={() => decide(detail, { staff_id: detail.staff_id, date: detail.date, approval_status: "Approved", approved_ot_minutes: otMinutes ? Number(otMinutes) : null }, "Overtime approved")}>
                          <CheckCircle className="h-4 w-4 mr-1" />Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {canEdit && (
                  <div className={s.section}>
                    <div className={s.sectionTitle}>Day status</div>
                    <div className={s.grid2}>
                      <Field label="Mark this day as" hint="Leave as computed to use the clock-ins">
                        <Select value={dayStatus || "auto"} onValueChange={v => setDayStatus(v === "auto" ? "" : v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Computed from clock-ins</SelectItem>
                            {DAY_STATUSES.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Note">
                        <Input value={dayNote} placeholder="Optional" onChange={e => setDayNote(e.target.value)} />
                      </Field>
                    </div>
                    <div className={s.row} style={{ justifyContent: "flex-end", marginTop: "0.75rem" }}>
                      <Button size="sm" disabled={saving}
                        onClick={() => decide(detail, { staff_id: detail.staff_id, date: detail.date, day_status: dayStatus || null, note: dayNote || null }, "Day updated")}>
                        <Save className="h-4 w-4 mr-1" />Save day status
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className={s.dialogFooter}>
                <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
                {canEdit && <Button variant="outline" onClick={() => openCorrection(detail)}><Pencil className="h-4 w-4 mr-1" />Correct times</Button>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ══ Correction request ════════════════════════════════════════════ */}
      <Dialog open={corrOpen} onOpenChange={setCorrOpen}>
        <DialogContent className={cx(s.dialogMd, s.dialogScroll)}>
          <DialogHeader>
            <DialogTitle>Attendance correction</DialogTitle>
            <DialogDescription>Enter the corrected times or a day status. The record stays as it is until a manager approves.</DialogDescription>
          </DialogHeader>
          <div className={s.dialogBody}>
            <div className={s.grid2}>
              <Field label="Employee" required>
                <Select value={corr.staff_id} onValueChange={v => setCorr(c => ({ ...c, staff_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {staffOptions.map(([id, name]) => <SelectItem key={id} value={String(id)}>{name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Date" required>
                <Input type="date" max={todayIso} value={corr.date} onChange={e => setCorr(c => ({ ...c, date: e.target.value }))} />
              </Field>
              <Field label="Corrected check-in"><Input type="time" value={corr.check_in} onChange={e => setCorr(c => ({ ...c, check_in: e.target.value }))} /></Field>
              <Field label="Corrected check-out"><Input type="time" value={corr.check_out} onChange={e => setCorr(c => ({ ...c, check_out: e.target.value }))} /></Field>
              <Field label="Day status (optional)" span2 hint="e.g. Paid Leave for an approved day off">
                <Select value={corr.day_status || "none"} onValueChange={v => setCorr(c => ({ ...c, day_status: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No change</SelectItem>
                    {DAY_STATUSES.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Reason" required span2>
                <Textarea rows={2} value={corr.reason} placeholder="e.g. Forgot to clock out, device offline, field visit…" onChange={e => setCorr(c => ({ ...c, reason: e.target.value }))} />
              </Field>
            </div>
            <Note tone="amber">A check-out earlier than the check-in is read as the next day (overnight shifts).</Note>
          </div>
          <div className={s.dialogFooter}>
            <Button variant="outline" onClick={() => setCorrOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={submitCorrection}><Save className="h-4 w-4 mr-1" />{saving ? "Submitting…" : "Submit for approval"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ Review correction ═════════════════════════════════════════════ */}
      <Dialog open={!!review} onOpenChange={v => !v && setReview(null)}>
        <DialogContent className={s.dialogMd}>
          {review && (
            <>
              <DialogHeader>
                <DialogTitle>{review.approve ? "Approve" : "Reject"} correction</DialogTitle>
                <DialogDescription>{review.c.staff_name} · {formatDate(review.c.date)}</DialogDescription>
              </DialogHeader>
              <div className={s.dialogBody}>
                <div className={s.stats}>
                  <Stat label="Check-in" value={review.c.check_in ?? "—"} />
                  <Stat label="Check-out" value={review.c.check_out ?? "—"} />
                  <Stat label="Day status" value={review.c.day_status ?? "No change"} />
                </div>
                <div className={cx(s.small, s.muted)}>Reason: {review.c.reason}</div>
                <Field label="Note (optional)"><Input value={reviewNote} onChange={e => setReviewNote(e.target.value)} /></Field>
                {review.approve && <Note tone="teal">Approving updates the clock-ins for that day and recalculates attendance and payroll figures.</Note>}
              </div>
              <div className={s.dialogFooter}>
                <Button variant="outline" onClick={() => setReview(null)}>Cancel</Button>
                <Button variant={review.approve ? "default" : "destructive"} disabled={saving} onClick={submitReview}>
                  {review.approve ? <><CheckCircle className="h-4 w-4 mr-1" />Approve & apply</> : <><XCircle className="h-4 w-4 mr-1" />Reject</>}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
