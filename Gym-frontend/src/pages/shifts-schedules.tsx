import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Clock, Users, Calendar, CalendarDays, Plus, Settings2, AlertCircle, CheckCircle, Pencil, Copy, Trash2,
  ArrowLeft, Sun, Moon, Zap, RefreshCw, TimerOff, Search, Save, ChevronLeft, ChevronRight, UserMinus,
  Coffee, Timer, ShieldCheck, Building2, Eye,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Checkbox } from "../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { PermissionGate, hasPermission } from "../utils/permissions";
import { useBranch } from "../utils/branch-context";
import {
  shiftsService, staffAttendanceAdminService, Shift, EmployeeSchedule, RosterRow, AttendanceDay, ShiftType, OvertimePolicy,
} from "../utils/supabase/workforce-service";
import {
  PageHeader, Kpi, Badge, Note, Panel, TabBar, Person, Empty, Field, Tone, cx, wf as s,
  toISODate, formatDate, minutesLabel, errorMessage, MONTHS,
} from "../components/workforce/ui";

interface ShiftsSchedulesProps { onNavigate?: (section: string, params?: Record<string, any>) => void; }

type TabId = "templates" | "schedules" | "weekly" | "monthly" | "exceptions";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SHIFT_TONES: Tone[] = ["teal", "blue", "violet", "amber", "rose", "green", "orange", "red"];
const TYPE_ICON: Record<ShiftType, typeof Sun> = { fixed: Sun, flexible: Clock, rotational: RefreshCw, split: Zap, overnight: Moon };
const STATUS_TONE: Record<string, Tone> = { active: "green", draft: "amber", inactive: "gray" };
const OT_LABEL: Record<OvertimePolicy, string> = { eligible: "OT paid automatically", approval: "OT needs approval", none: "No overtime" };
const EXCEPTION_STATUSES = new Set(["Late", "Early Departure", "Absent", "Incomplete Punch", "Half Day"]);

interface ShiftForm {
  name: string; code: string; shift_type: ShiftType; status: string;
  check_in: string; check_out: string; break_start: string; break_end: string;
  grace_in_minutes: string; grace_out_minutes: string; ot_after_minutes: string;
  max_daily_ot_hours: string; max_weekly_hours: string; overtime_policy: OvertimePolicy;
  work_days: string[]; departments: string[]; effective_from: string; effective_to: string;
}

const emptyForm = (): ShiftForm => ({
  name: "", code: "", shift_type: "fixed", status: "active",
  check_in: "08:00", check_out: "17:00", break_start: "13:00", break_end: "14:00",
  grace_in_minutes: "10", grace_out_minutes: "15", ot_after_minutes: "15",
  max_daily_ot_hours: "3", max_weekly_hours: "48", overtime_policy: "approval",
  work_days: ["Mon", "Tue", "Wed", "Thu", "Fri"], departments: [], effective_from: toISODate(new Date()), effective_to: "",
});

const minutesBetween = (a: string, b: string) => {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  let d = bh * 60 + bm - (ah * 60 + am);
  if (d <= 0) d += 24 * 60;
  return d;
};

const mondayOf = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export function ShiftsSchedules({ onNavigate }: ShiftsSchedulesProps) {
  const { activeBranchId } = useBranch();
  const canEdit = hasPermission("STAFF_EDIT") || hasPermission("STAFF_CREATE");
  const [tab, setTab] = useState<TabId>("templates");
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [schedules, setSchedules] = useState<EmployeeSchedule[]>([]);
  const [today, setToday] = useState<AttendanceDay[]>([]);
  const [pendingCorrections, setPendingCorrections] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");

  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [form, setForm] = useState<ShiftForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignShiftId, setAssignShiftId] = useState<string>("");
  const [assignFrom, setAssignFrom] = useState(toISODate(new Date()));
  const [assignTo, setAssignTo] = useState("");
  const [assignStaff, setAssignStaff] = useState<number[]>([]);
  const [assignSearch, setAssignSearch] = useState("");

  const [cell, setCell] = useState<{ row: RosterRow; date: string; shiftId: number | null; working: boolean; changed: boolean } | null>(null);
  const [deleteShift, setDeleteShift] = useState<Shift | null>(null);
  const [unassignFor, setUnassignFor] = useState<EmployeeSchedule | null>(null);

  const shiftById = useMemo(() => new Map(shifts.map(x => [x.id, x])), [shifts]);
  const toneOf = useCallback((id: number | null | undefined): Tone => {
    const idx = shifts.findIndex(x => x.id === id);
    return idx >= 0 ? SHIFT_TONES[idx % SHIFT_TONES.length] : "gray";
  }, [shifts]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const todayIso = toISODate(new Date());
      const [sh, sc, days, corr] = await Promise.all([
        shiftsService.list(),
        shiftsService.schedules(),
        staffAttendanceAdminService.daily(todayIso, todayIso).catch(() => [] as AttendanceDay[]),
        staffAttendanceAdminService.corrections().catch(() => []),
      ]);
      setShifts(sh);
      setSchedules(sc);
      setToday(days);
      setPendingCorrections(corr.filter(c => c.status === "Pending").length);
    } catch (e) {
      toast.error(errorMessage(e, "Failed to load shifts"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, activeBranchId]);

  const rosterRange = useMemo(() => {
    if (tab === "monthly") {
      const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      return { from: toISODate(month), to: toISODate(end) };
    }
    return { from: toISODate(weekStart), to: toISODate(addDays(weekStart, 6)) };
  }, [tab, weekStart, month]);

  const loadRoster = useCallback(async () => {
    setRosterLoading(true);
    try {
      const r = await shiftsService.roster(rosterRange.from, rosterRange.to);
      setRoster(r.rows);
    } catch (e) {
      toast.error(errorMessage(e, "Failed to load roster"));
    } finally {
      setRosterLoading(false);
    }
  }, [rosterRange]);

  useEffect(() => {
    if (tab === "weekly" || tab === "monthly") loadRoster();
  }, [tab, loadRoster, activeBranchId]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const departments = useMemo(
    () => Array.from(new Set(schedules.map(x => x.department).filter(Boolean) as string[])).sort(),
    [schedules]);

  const exceptions = useMemo(() => today.filter(d =>
    EXCEPTION_STATUSES.has(d.status) || d.late_minutes > 0 || d.early_minutes > 0 || (d.ot_minutes > 0 && d.approval_status === "Pending")), [today]);

  const kpis = useMemo(() => ({
    active: shifts.filter(x => x.status === "active").length,
    assigned: schedules.filter(x => x.shift_id).length,
    without: schedules.filter(x => !x.shift_id).length,
    scheduledToday: today.filter(d => d.scheduled).length,
  }), [shifts, schedules, today]);

  const filteredSchedules = useMemo(() => schedules.filter(x => {
    if (deptFilter !== "all" && x.department !== deptFilter) return false;
    if (shiftFilter === "none" && x.shift_id) return false;
    if (shiftFilter !== "all" && shiftFilter !== "none" && String(x.shift_id) !== shiftFilter) return false;
    if (search && !`${x.name} ${x.staff_code ?? ""} ${x.role ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [schedules, deptFilter, shiftFilter, search]);

  // ── Shift form ───────────────────────────────────────────────────────────
  const openCreate = () => { setEditing(null); setForm(emptyForm()); setFormOpen(true); };
  const openEdit = (x: Shift) => {
    setEditing(x);
    setForm({
      name: x.name, code: x.code ?? "", shift_type: x.shift_type, status: x.status,
      check_in: x.check_in, check_out: x.check_out, break_start: x.break_start ?? "", break_end: x.break_end ?? "",
      grace_in_minutes: String(x.grace_in_minutes ?? 0), grace_out_minutes: String(x.grace_out_minutes ?? 0),
      ot_after_minutes: String(x.ot_after_minutes ?? 0), max_daily_ot_hours: x.max_daily_ot_hours != null ? String(x.max_daily_ot_hours) : "",
      max_weekly_hours: x.max_weekly_hours != null ? String(x.max_weekly_hours) : "", overtime_policy: x.overtime_policy,
      work_days: x.work_days, departments: x.departments ?? [], effective_from: x.effective_from ?? "", effective_to: x.effective_to ?? "",
    });
    setFormOpen(true);
  };

  const netMinutes = useMemo(() => {
    if (!form.check_in || !form.check_out) return 0;
    const span = minutesBetween(form.check_in, form.check_out);
    const brk = form.break_start && form.break_end ? minutesBetween(form.break_start, form.break_end) : 0;
    return Math.max(0, span - (brk >= 24 * 60 ? 0 : brk));
  }, [form.check_in, form.check_out, form.break_start, form.break_end]);

  const saveShift = async (status?: string) => {
    if (!form.name.trim()) { toast.error("Give the shift a name"); return; }
    if (!form.work_days.length) { toast.error("Pick at least one work day"); return; }
    setSaving(true);
    try {
      const body: any = {
        ...form,
        status: status ?? form.status,
        code: form.code.trim() || null,
        break_start: form.break_start || null,
        break_end: form.break_end || null,
        effective_from: form.effective_from || null,
        effective_to: form.effective_to || null,
        max_daily_ot_hours: form.max_daily_ot_hours || null,
        max_weekly_hours: form.max_weekly_hours || null,
      };
      if (editing) await shiftsService.update(editing.id, body);
      else await shiftsService.create(body);
      toast.success(editing ? "Shift saved" : "Shift created");
      setFormOpen(false);
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Failed to save shift"));
    } finally {
      setSaving(false);
    }
  };

  const duplicate = async (x: Shift) => {
    try { await shiftsService.duplicate(x.id); toast.success(`Copied "${x.name}" as a draft`); load(); }
    catch (e) { toast.error(errorMessage(e, "Failed to duplicate shift")); }
  };

  const confirmDelete = async () => {
    if (!deleteShift) return;
    try { await shiftsService.remove(deleteShift.id); toast.success("Shift deleted"); setDeleteShift(null); load(); }
    catch (e) { toast.error(errorMessage(e, "Failed to delete shift")); }
  };

  // ── Assign ───────────────────────────────────────────────────────────────
  const openAssign = (shiftId?: number, staffIds: number[] = []) => {
    const first = shiftId ?? shifts.find(x => x.status === "active")?.id;
    setAssignShiftId(first ? String(first) : "");
    setAssignFrom(toISODate(new Date()));
    setAssignTo("");
    setAssignStaff(staffIds);
    setAssignSearch("");
    setAssignOpen(true);
  };

  const submitAssign = async () => {
    if (!assignShiftId) { toast.error("Pick a shift"); return; }
    if (!assignStaff.length) { toast.error("Select at least one employee"); return; }
    setSaving(true);
    try {
      const r = await shiftsService.assign({
        shift_id: Number(assignShiftId), staff_ids: assignStaff, effective_from: assignFrom, effective_to: assignTo || null,
      });
      toast.success(`${r.assigned} employee${r.assigned === 1 ? "" : "s"} assigned to ${shiftById.get(Number(assignShiftId))?.name}`);
      setAssignOpen(false);
      load();
      if (tab === "weekly" || tab === "monthly") loadRoster();
    } catch (e) {
      toast.error(errorMessage(e, "Failed to assign shift"));
    } finally {
      setSaving(false);
    }
  };

  const confirmUnassign = async () => {
    if (!unassignFor) return;
    try {
      await shiftsService.unassign({ staff_ids: [unassignFor.staff_id], effective_from: toISODate(new Date()) });
      toast.success(`${unassignFor.name} no longer has a shift`);
      setUnassignFor(null);
      load();
    } catch (e) { toast.error(errorMessage(e, "Failed to remove shift")); }
  };

  const assignCandidates = useMemo(() => schedules.filter(x =>
    !assignSearch || `${x.name} ${x.role ?? ""} ${x.department ?? ""}`.toLowerCase().includes(assignSearch.toLowerCase())), [schedules, assignSearch]);

  // ── Roster cell ──────────────────────────────────────────────────────────
  const setRosterDay = async (mode: "shift" | "off" | "default", shiftId?: number) => {
    if (!cell) return;
    try {
      await shiftsService.setRosterDay({ staff_id: cell.row.staff_id, date: cell.date, mode, shift_id: shiftId ?? null });
      setCell(null);
      loadRoster();
    } catch (e) { toast.error(errorMessage(e, "Failed to update roster")); }
  };

  const copyLastWeek = async () => {
    try {
      const r = await shiftsService.copyPreviousWeek(toISODate(weekStart));
      toast.success(r.copied ? `Copied ${r.copied} day change${r.copied === 1 ? "" : "s"} from last week` : "Last week had no day changes to copy");
      loadRoster();
    } catch (e) { toast.error(errorMessage(e, "Failed to copy last week")); }
  };

  const approveOt = async (d: AttendanceDay) => {
    try {
      await staffAttendanceAdminService.decide({ staff_id: d.staff_id, date: d.date, approval_status: "Approved" });
      toast.success(`Overtime approved for ${d.staff_name}`);
      load();
    } catch (e) { toast.error(errorMessage(e, "Failed to approve overtime")); }
  };

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const todayIso = toISODate(new Date());

  // ── Render helpers ───────────────────────────────────────────────────────
  const shiftTime = (x?: Shift | null) => x ? `${x.check_in}–${x.check_out}` : "";

  const renderSlot = (row: RosterRow, c: RosterRow["days"][number], compact = false) => {
    const sh = c.shift_id != null ? shiftById.get(c.shift_id) : undefined;
    const working = c.working && !!sh;
    const tone = working ? toneOf(sh!.id) : undefined;
    const label = working ? (sh!.code || sh!.name.slice(0, 3).toUpperCase()) : c.roster_change && !sh ? "OFF" : sh ? "OFF" : "—";
    if (compact) {
      return (
        <span data-tone={tone} className={cx(s.monthCell, !working && s.monthCellOff)} title={sh ? `${sh.name} ${shiftTime(sh)}` : "No shift"}>
          {working ? label : "·"}
        </span>
      );
    }
    return (
      <button
        type="button"
        data-tone={tone}
        disabled={!canEdit}
        onClick={() => setCell({ row, date: c.date, shiftId: c.shift_id, working: c.working, changed: c.roster_change })}
        className={cx(s.slot, !working && (sh || c.roster_change ? s.slotOff : s.slotNone), c.roster_change && s.slotChanged)}
        title={c.roster_change ? "Changed for this day only" : undefined}
      >
        <strong>{working ? label : sh || c.roster_change ? "OFF" : "No shift"}</strong>
        {working && <span>{shiftTime(sh)}</span>}
      </button>
    );
  };

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className={s.page}>
      <PageHeader
        crumbs={[{ label: "Payroll & Employees", to: "payroll-employees" }, { label: "Shifts & Schedules" }]}
        onCrumb={to => onNavigate?.(to)}
        icon={Clock}
        title="Shifts & Schedules"
        subtitle="Create shifts · Assign employees · Manage rosters · Attendance rules"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => onNavigate?.("staffs-trainers")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Staffs & Trainers
            </Button>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => openAssign()} disabled={!shifts.length}>
                <Users className="h-4 w-4 mr-1" /> Assign Employees
              </Button>
            )}
            <PermissionGate anyOf={["STAFF_CREATE", "STAFF_EDIT"]}>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" /> Create Shift
              </Button>
            </PermissionGate>
          </>
        }
      />

      <div className={s.kpis}>
        <Kpi icon={Settings2} label="Shift templates" value={shifts.length} sub={`${kpis.active} active`} tone="teal" onClick={() => setTab("templates")} active={tab === "templates"} />
        <Kpi icon={Users} label="Employees on a shift" value={kpis.assigned} tone="green" onClick={() => { setShiftFilter("all"); setTab("schedules"); }} />
        <Kpi icon={TimerOff} label="Without a shift" value={kpis.without} tone={kpis.without ? "amber" : "gray"} onClick={() => { setShiftFilter("none"); setTab("schedules"); }} />
        <Kpi icon={CalendarDays} label="Scheduled today" value={kpis.scheduledToday} tone="blue" onClick={() => setTab("weekly")} />
        <Kpi icon={AlertCircle} label="Exceptions today" value={exceptions.length} tone={exceptions.length ? "orange" : "gray"} onClick={() => setTab("exceptions")} active={tab === "exceptions"} />
        <Kpi icon={RefreshCw} label="Pending corrections" value={pendingCorrections} tone={pendingCorrections ? "violet" : "gray"}
          onClick={() => onNavigate?.("staff-attendance", { tab: "corrections" })} />
      </div>

      <TabBar<TabId>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "templates", label: "Shift Templates", icon: Settings2 },
          { id: "schedules", label: "Employee Schedules", icon: Users },
          { id: "weekly", label: "Weekly Roster", icon: Calendar },
          { id: "monthly", label: "Monthly Roster", icon: CalendarDays },
          { id: "exceptions", label: "Exceptions & Rules", icon: AlertCircle, count: exceptions.length, countTone: "orange" },
        ]}
      />

      {/* ── Templates ─────────────────────────────────────────────────────── */}
      {tab === "templates" && (
        loading ? <Panel><Empty icon={Clock} title="Loading shifts…" /></Panel> :
        shifts.length === 0 ? (
          <Panel>
            <Empty icon={Clock} title="No shifts yet">
              Create a shift (e.g. Morning 06:00–14:00), then assign employees to it. Attendance, overtime and payroll use these hours.
              {canEdit && <div style={{ marginTop: "0.75rem" }}><Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Create Shift</Button></div>}
            </Empty>
          </Panel>
        ) : (
          <div className={s.stack} style={{ gap: "0.75rem" }}>
            {shifts.map(x => {
              const Icon = TYPE_ICON[x.shift_type] ?? Sun;
              const tone = toneOf(x.id);
              return (
                <div key={x.id} className={s.listCard} data-tone={tone}>
                  <div className={s.listIcon}><Icon size={18} /></div>
                  <div className={s.listMain}>
                    <div className={s.row}>
                      <span className={s.strong}>{x.name}</span>
                      {x.code && <Badge plain>{x.code}</Badge>}
                      <Badge tone={STATUS_TONE[x.status] ?? "gray"}>{x.status[0].toUpperCase() + x.status.slice(1)}</Badge>
                      <Badge plain>{x.shift_type[0].toUpperCase() + x.shift_type.slice(1)}</Badge>
                      {x.overnight && x.shift_type !== "overnight" && <Badge tone="violet"><Moon size={11} />Runs past midnight</Badge>}
                    </div>
                    <div className={s.metaRow}>
                      <span><Clock size={13} /><strong>{x.check_in} – {x.check_out}</strong></span>
                      {x.break_start && <span><Coffee size={13} />Break {x.break_start} – {x.break_end}</span>}
                      <span><Timer size={13} /><strong>{minutesLabel(x.net_minutes)}</strong> net / day</span>
                      <span><Users size={13} /><strong>{x.assigned_count}</strong> employee{x.assigned_count === 1 ? "" : "s"}</span>
                      <span><ShieldCheck size={13} />Grace +{x.grace_in_minutes}m in / −{x.grace_out_minutes}m out</span>
                      <span><Zap size={13} />{OT_LABEL[x.overtime_policy]}</span>
                      {x.departments?.length > 0 && <span><Building2 size={13} />{x.departments.join(", ")}</span>}
                    </div>
                    <div className={s.chips}>
                      {DAYS.map(d => (
                        <span key={d} data-tone={tone} className={cx(s.chip, !x.work_days.includes(d) && s.chipOff)}>{d}</span>
                      ))}
                    </div>
                  </div>
                  {canEdit && (
                    <div className={s.rowActions}>
                      <button className={s.iconBtn} title="Edit shift" onClick={() => openEdit(x)}><Pencil size={15} /></button>
                      <button className={s.iconBtn} title="Duplicate" onClick={() => duplicate(x)}><Copy size={15} /></button>
                      <button className={s.iconBtn} title="Assign employees" onClick={() => openAssign(x.id)}><Users size={15} /></button>
                      {hasPermission("STAFF_DELETE") && (
                        <button className={s.iconBtn} data-tone="red" title="Delete shift" onClick={() => setDeleteShift(x)}><Trash2 size={15} /></button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Employee schedules ───────────────────────────────────────────── */}
      {tab === "schedules" && (
        <Panel flush>
          <div className={s.filterBar}>
            <div className={s.search}>
              <Search size={14} />
              <Input className="h-9" placeholder="Search employee…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className={cx("h-9", s.select)}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={shiftFilter} onValueChange={setShiftFilter}>
              <SelectTrigger className={cx("h-9", s.select)}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All shifts</SelectItem>
                <SelectItem value="none">Without a shift</SelectItem>
                {shifts.map(x => <SelectItem key={x.id} value={String(x.id)}>{x.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Assigned Shift</th>
                  <th>Work Days</th>
                  <th className={s.right}>Net / Day</th>
                  <th>Since</th>
                  {canEdit && <th className={s.right}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.map(x => {
                  const sh = x.shift_id ? shiftById.get(x.shift_id) : undefined;
                  const upcoming = x.upcoming_shift_id ? shiftById.get(x.upcoming_shift_id) : undefined;
                  const tone = toneOf(sh?.id);
                  return (
                    <tr key={x.staff_id}>
                      <td><Person name={x.name} sub={x.role ?? x.staff_code} photo={x.photo_url} /></td>
                      <td>{x.department || <span className={s.muted}>—</span>}</td>
                      <td>
                        {sh ? (
                          <div className={s.cellStack}>
                            <Badge tone={tone}>{sh.name}</Badge>
                            <span className={s.cellSub} style={{ marginTop: 2 }}>{shiftTime(sh)}</span>
                          </div>
                        ) : <Badge tone="red">Unassigned</Badge>}
                        {upcoming && <div className={s.cellSub}>→ {upcoming.name} from {formatDate(x.upcoming_from)}</div>}
                      </td>
                      <td>
                        <div className={s.chips}>
                          {sh ? sh.work_days.map(d => <span key={d} data-tone={tone} className={s.chip}>{d}</span>) : <span className={s.muted}>—</span>}
                        </div>
                      </td>
                      <td className={s.right}>{sh ? minutesLabel(sh.net_minutes) : "—"}</td>
                      <td>{x.effective_from ? formatDate(x.effective_from) : "—"}{x.effective_to && <div className={s.cellSub}>until {formatDate(x.effective_to)}</div>}</td>
                      {canEdit && (
                        <td className={s.right}>
                          <div className={s.rowActions}>
                            <button className={s.iconBtn} title={sh ? "Change shift" : "Assign shift"} onClick={() => openAssign(sh?.id, [x.staff_id])}><Pencil size={14} /></button>
                            {sh && <button className={s.iconBtn} data-tone="red" title="Remove from shift" onClick={() => setUnassignFor(x)}><UserMinus size={14} /></button>}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!loading && filteredSchedules.length === 0 && <Empty icon={Users} title="No employees match these filters" />}
          </div>
        </Panel>
      )}

      {/* ── Weekly roster ────────────────────────────────────────────────── */}
      {tab === "weekly" && (
        <Panel
          title={`Week of ${weekDays[0].toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${weekDays[6].toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`}
          description={canEdit ? "Click a day to change it for that day only — regular schedules stay as they are." : "Shift for each employee per day."}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => setWeekStart(mondayOf(new Date()))}>This week</Button>
              <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight className="h-4 w-4" /></Button>
              {canEdit && <Button variant="outline" size="sm" onClick={copyLastWeek}><Copy className="h-4 w-4 mr-1" />Copy last week's changes</Button>}
            </>
          }
          flush
        >
          <div className={s.tableWrap}>
            <table className={s.roster}>
              <thead>
                <tr>
                  <th>Employee</th>
                  {weekDays.map(d => {
                    const iso = toISODate(d);
                    return (
                      <th key={iso} className={cx(iso === todayIso && s.rosterToday)}>
                        <div className={s.dayHead}>
                          <span>{d.toLocaleDateString(undefined, { weekday: "short" })}</span>
                          <span className={s.dayHeadSub}>{d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {roster.map(row => (
                  <tr key={row.staff_id}>
                    <td><Person name={row.name} sub={row.role} photo={row.photo_url} size="sm" /></td>
                    {row.days.map(c => (
                      <td key={c.date} className={cx(c.date === todayIso && s.rosterToday)}>{renderSlot(row, c)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!rosterLoading && roster.length === 0 && <Empty icon={Calendar} title="No employees to roster" />}
          </div>
          <div className={s.panelBody}>
            <div className={s.legend}>
              {shifts.filter(x => x.status !== "inactive").map(x => (
                <span key={x.id} className={s.legendItem} data-tone={toneOf(x.id)}>
                  <span className={s.legendSwatch} />{x.code || x.name} — {x.name} ({shiftTime(x)})
                </span>
              ))}
              <span className={s.legendItem}><span className={s.legendSwatch} data-tone="gray" />OFF — day off</span>
              <span className={s.legendItem}><span className={s.legendSwatch} data-tone="red" />No shift assigned</span>
            </div>
          </div>
        </Panel>
      )}

      {/* ── Monthly roster ───────────────────────────────────────────────── */}
      {tab === "monthly" && (
        <Panel
          title={`${MONTHS[month.getMonth()]} ${month.getFullYear()} — Monthly Roster`}
          description="Shift code per day; switch to the weekly roster to change a day."
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
            <table className={s.roster}>
              <thead>
                <tr>
                  <th>Employee</th>
                  {(roster[0]?.days ?? []).map(c => {
                    const d = new Date(`${c.date}T00:00:00`);
                    const weekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <th key={c.date} className={cx(weekend && s.rosterWeekend, c.date === todayIso && s.rosterToday)} style={{ minWidth: "2rem", padding: "0.4rem 0.2rem" }}>
                        <div className={s.dayHead}>
                          <span>{d.getDate()}</span>
                          <span className={s.dayHeadSub}>{d.toLocaleDateString(undefined, { weekday: "narrow" })}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {roster.map(row => (
                  <tr key={row.staff_id}>
                    <td><Person name={row.name} sub={row.role} photo={row.photo_url} size="sm" /></td>
                    {row.days.map(c => {
                      const d = new Date(`${c.date}T00:00:00`);
                      const weekend = d.getDay() === 0 || d.getDay() === 6;
                      return <td key={c.date} className={cx(weekend && s.rosterWeekend, c.date === todayIso && s.rosterToday)}>{renderSlot(row, c, true)}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {!rosterLoading && roster.length === 0 && <Empty icon={CalendarDays} title="No employees to roster" />}
          </div>
        </Panel>
      )}

      {/* ── Exceptions & rules ───────────────────────────────────────────── */}
      {tab === "exceptions" && (
        <>
          <Panel
            title="Today's attendance exceptions"
            description={`${formatDate(todayIso, { weekday: "long", day: "numeric", month: "long" })} · late arrivals, early departures, absences, missing punches and overtime waiting for approval`}
            actions={<Button variant="outline" size="sm" onClick={() => onNavigate?.("staff-attendance")}><Eye className="h-4 w-4 mr-1" />Open Staff Attendance</Button>}
          >
            {exceptions.length === 0 ? (
              <Empty icon={CheckCircle} title="No exceptions today">Everyone scheduled so far is on time.</Empty>
            ) : (
              <div className={s.stack} style={{ gap: "0.625rem" }}>
                {exceptions.map(d => {
                  const otPending = d.ot_minutes > 0 && d.approval_status === "Pending";
                  const late = d.late_minutes > 0 && !EXCEPTION_STATUSES.has(d.status);
                  const tone: Tone = d.status === "Absent" ? "red" : d.status === "Incomplete Punch" ? "rose" : otPending ? "violet" : d.status === "Late" || late ? "amber" : "orange";
                  return (
                    <div key={d.id} className={s.listCard} data-tone={tone} style={{ alignItems: "center" }}>
                      <div className={s.listIcon}><AlertCircle size={18} /></div>
                      <div className={s.listMain} style={{ gap: "0.25rem" }}>
                        <div className={s.row}>
                          <span className={s.strong}>{d.staff_name}</span>
                          <Badge tone={tone}>{otPending ? "Overtime pending" : late ? "Late" : d.status}</Badge>
                        </div>
                        <div className={s.metaRow}>
                          <span>Shift <strong>{d.shift_name ?? "—"}</strong> {d.scheduled_in && `(${d.scheduled_in}–${d.scheduled_out})`}</span>
                          <span>In <strong>{d.actual_in ?? "—"}</strong></span>
                          <span>Out <strong>{d.actual_out ?? "—"}</strong></span>
                          {d.late_minutes > 0 && <span>Late <strong>{minutesLabel(d.late_minutes)}</strong></span>}
                          {d.early_minutes > 0 && <span>Left early <strong>{minutesLabel(d.early_minutes)}</strong></span>}
                          {d.ot_minutes > 0 && <span>Overtime <strong>{minutesLabel(d.ot_minutes)}</strong></span>}
                        </div>
                      </div>
                      <div className={s.actions}>
                        <Button variant="outline" size="sm" onClick={() => onNavigate?.("staff-attendance", { date: d.date, staffId: d.staff_id })}>Review</Button>
                        {otPending && canEdit && <Button size="sm" onClick={() => approveOt(d)}><CheckCircle className="h-4 w-4 mr-1" />Approve OT</Button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel title="Attendance rules" description="How GymBios treats each attendance event — set per shift (grace periods, overtime policy)." flush>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr><th>Event</th><th>When</th><th>Status</th><th>Approval</th><th>Payroll impact</th></tr>
                </thead>
                <tbody>
                  {[
                    ["Late arrival", "Clock-in after check-in + the shift's grace period", "Late", "Not needed", "Flagged; add a Late Attendance deduction if your policy charges it"],
                    ["Early departure", "Clock-out before check-out − the shift's tolerance", "Early Departure", "Not needed", "Flagged only"],
                    ["Missed clock-out", "Still clocked in 6h after the shift ended", "Incomplete Punch", "Correction request", "Counted present, hours only once corrected"],
                    ["Overtime", "Stayed longer than “OT starts after” past check-out; all time after check-out counts (early arrival never does)", "Overtime", "Per shift: automatic or manager approval", "Paid at 1.25× the hourly rate, approved hours only"],
                    ["Worked a day off", "Clock-in on a day off from the shift or roster", "Overtime", "Per shift", "All hours count as overtime"],
                    ["Half day", "Worked under half the scheduled net hours", "Half Day", "Not needed", "Half a day deducted"],
                    ["Absence", "No clock-in on a scheduled day after the grace period", "Absent", "Not needed", "One day's basic deducted"],
                    ["Leave / holiday", "Set by a manager on Staff Attendance", "Paid / Unpaid Leave, Holiday", "Manager", "Unpaid leave is deducted; paid leave and holidays are not"],
                  ].map(r => (
                    <tr key={r[0]}>
                      <td className={s.strong}>{r[0]}</td>
                      <td style={{ whiteSpace: "normal", minWidth: "16rem" }}>{r[1]}</td>
                      <td><Badge plain>{r[2]}</Badge></td>
                      <td>{r[3]}</td>
                      <td style={{ whiteSpace: "normal", minWidth: "14rem" }} className={s.muted}>{r[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      {/* ══ Create / edit shift ═══════════════════════════════════════════ */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className={cx(s.dialogLg, s.dialogScroll)}>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "Create shift"}</DialogTitle>
            <DialogDescription>Working hours, break, grace periods and overtime policy</DialogDescription>
          </DialogHeader>
          <div className={s.dialogBody}>
            <div className={s.grid2}>
              <Field label="Shift name" required>
                <Input value={form.name} placeholder="e.g. Morning Shift" onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </Field>
              <Field label="Shift code" hint="Short label shown on the roster">
                <Input value={form.code} maxLength={6} placeholder="e.g. MRN" onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
              </Field>
              <Field label="Shift type">
                <Select value={form.shift_type} onValueChange={v => setForm(f => ({ ...f, shift_type: v as ShiftType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["fixed", "flexible", "rotational", "split", "overnight"] as ShiftType[]).map(t => (
                      <SelectItem key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Effective from">
                <Input type="date" value={form.effective_from} onChange={e => setForm(f => ({ ...f, effective_from: e.target.value }))} />
              </Field>
              <Field label="Effective to" hint="Leave empty for no end date">
                <Input type="date" value={form.effective_to} onChange={e => setForm(f => ({ ...f, effective_to: e.target.value }))} />
              </Field>
            </div>

            {departments.length > 0 && (
              <Field label="Applicable departments" hint="For reference when assigning — leave empty for all">
                <div className={s.dayToggles}>
                  {departments.map(d => {
                    const on = form.departments.includes(d);
                    return (
                      <button key={d} type="button" className={cx(s.dayToggle, on && s.dayToggleOn)}
                        onClick={() => setForm(f => ({ ...f, departments: on ? f.departments.filter(x => x !== d) : [...f.departments, d] }))}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}

            <hr className={s.divider} />
            <span className={s.sectionLabel}>Time configuration</span>
            <div className={s.grid4}>
              <Field label="Check-in"><Input type="time" value={form.check_in} onChange={e => setForm(f => ({ ...f, check_in: e.target.value }))} /></Field>
              <Field label="Check-out"><Input type="time" value={form.check_out} onChange={e => setForm(f => ({ ...f, check_out: e.target.value }))} /></Field>
              <Field label="Break start"><Input type="time" value={form.break_start} onChange={e => setForm(f => ({ ...f, break_start: e.target.value }))} /></Field>
              <Field label="Break end"><Input type="time" value={form.break_end} onChange={e => setForm(f => ({ ...f, break_end: e.target.value }))} /></Field>
            </div>
            <div className={s.section} data-tone="teal">
              <div className={s.spread}>
                <div>
                  <div className={s.statLabel}>Net scheduled working time</div>
                  <div className={s.netValue} style={{ fontSize: "1.25rem" }}>{minutesLabel(netMinutes)} / day</div>
                </div>
                <div className={cx(s.small, s.muted)}>
                  {form.check_in} → {form.check_out}{form.check_out <= form.check_in ? " (next day)" : ""}{form.break_start && form.break_end ? ", break deducted" : ""}
                </div>
              </div>
            </div>

            <div className={s.grid3}>
              <Field label="Late check-in grace (min)"><Input type="number" min={0} value={form.grace_in_minutes} onChange={e => setForm(f => ({ ...f, grace_in_minutes: e.target.value }))} /></Field>
              <Field label="Early check-out tolerance (min)"><Input type="number" min={0} value={form.grace_out_minutes} onChange={e => setForm(f => ({ ...f, grace_out_minutes: e.target.value }))} /></Field>
              <Field label="Overtime starts after (min)"><Input type="number" min={0} value={form.ot_after_minutes} onChange={e => setForm(f => ({ ...f, ot_after_minutes: e.target.value }))} /></Field>
              <Field label="Max daily overtime (hrs)"><Input type="number" min={0} step="0.5" value={form.max_daily_ot_hours} onChange={e => setForm(f => ({ ...f, max_daily_ot_hours: e.target.value }))} /></Field>
              <Field label="Max weekly hours"><Input type="number" min={0} value={form.max_weekly_hours} onChange={e => setForm(f => ({ ...f, max_weekly_hours: e.target.value }))} /></Field>
              <Field label="Overtime policy">
                <Select value={form.overtime_policy} onValueChange={v => setForm(f => ({ ...f, overtime_policy: v as OvertimePolicy }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approval">Manager approval</SelectItem>
                    <SelectItem value="eligible">Paid automatically</SelectItem>
                    <SelectItem value="none">Not eligible</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <hr className={s.divider} />
            <span className={s.sectionLabel}>Work days</span>
            <div className={s.dayToggles}>
              {DAYS.map(d => {
                const on = form.work_days.includes(d);
                return (
                  <button key={d} type="button" className={cx(s.dayToggle, on && s.dayToggleOn)}
                    onClick={() => setForm(f => ({ ...f, work_days: on ? f.work_days.filter(x => x !== d) : DAYS.filter(x => x === d || f.work_days.includes(x)) }))}>
                    {d}
                  </button>
                );
              })}
            </div>
            <Note tone="blue">
              Early arrival never counts as overtime. Once someone stays longer than “overtime starts after”, all the time after check-out
              counts, capped at the daily maximum; shorter overruns are ignored. It is paid only when the policy allows it.
            </Note>
          </div>
          <div className={s.dialogFooter}>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            {!editing && <Button variant="outline" disabled={saving} onClick={() => saveShift("draft")}>Save as draft</Button>}
            <Button disabled={saving} onClick={() => saveShift()}><Save className="h-4 w-4 mr-1" />{saving ? "Saving…" : "Save shift"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ Assign employees ══════════════════════════════════════════════ */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className={cx(s.dialogMd, s.dialogScroll)}>
          <DialogHeader>
            <DialogTitle>Assign shift</DialogTitle>
            <DialogDescription>Put employees on a shift from a date. Their previous shift ends the day before.</DialogDescription>
          </DialogHeader>
          <div className={s.dialogBody}>
            <div className={s.grid2}>
              <Field label="Shift" required span2>
                <Select value={assignShiftId} onValueChange={setAssignShiftId}>
                  <SelectTrigger><SelectValue placeholder="Select a shift" /></SelectTrigger>
                  <SelectContent>
                    {shifts.filter(x => x.status !== "inactive").map(x => (
                      <SelectItem key={x.id} value={String(x.id)}>{x.name} · {shiftTime(x)}{x.status === "draft" ? " (draft)" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Effective from" required><Input type="date" value={assignFrom} onChange={e => setAssignFrom(e.target.value)} /></Field>
              <Field label="Effective to" hint="Empty = until changed"><Input type="date" value={assignTo} onChange={e => setAssignTo(e.target.value)} /></Field>
            </div>
            <div className={s.spread}>
              <span className={s.sectionLabel}>Employees ({assignStaff.length} selected)</span>
              <Button variant="ghost" size="sm" onClick={() => setAssignStaff(assignStaff.length === assignCandidates.length ? [] : assignCandidates.map(x => x.staff_id))}>
                {assignStaff.length === assignCandidates.length && assignCandidates.length ? "Clear" : "Select all"}
              </Button>
            </div>
            <div className={s.search} style={{ maxWidth: "none" }}>
              <Search size={14} />
              <Input className="h-9" placeholder="Search employees…" value={assignSearch} onChange={e => setAssignSearch(e.target.value)} />
            </div>
            <div className={s.stack} style={{ gap: "0.25rem", maxHeight: "16rem", overflowY: "auto" }}>
              {assignCandidates.map(x => {
                const checked = assignStaff.includes(x.staff_id);
                const sh = x.shift_id ? shiftById.get(x.shift_id) : undefined;
                return (
                  <label key={x.staff_id} className={s.itemRow} style={{ gridTemplateColumns: "auto 1fr auto", cursor: "pointer" }}>
                    <Checkbox checked={checked} onCheckedChange={v => setAssignStaff(prev => v ? [...prev, x.staff_id] : prev.filter(id => id !== x.staff_id))} />
                    <Person name={x.name} sub={[x.role, x.department].filter(Boolean).join(" · ")} photo={x.photo_url} size="sm" />
                    {sh ? <Badge tone={toneOf(sh.id)}>{sh.name}</Badge> : <Badge plain>No shift</Badge>}
                  </label>
                );
              })}
            </div>
            <Note tone="amber">One-day roster changes inside the new range stay in place. Attendance from the effective date is checked against the new shift.</Note>
          </div>
          <div className={s.dialogFooter}>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={submitAssign}><CheckCircle className="h-4 w-4 mr-1" />{saving ? "Assigning…" : "Assign shift"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ Roster day ════════════════════════════════════════════════════ */}
      <Dialog open={!!cell} onOpenChange={v => !v && setCell(null)}>
        <DialogContent className={s.dialogMd}>
          {cell && (
            <>
              <DialogHeader>
                <DialogTitle>{cell.row.name}</DialogTitle>
                <DialogDescription>{formatDate(cell.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} — change this day only</DialogDescription>
              </DialogHeader>
              <div className={s.stack} style={{ gap: "0.375rem" }}>
                {shifts.filter(x => x.status !== "inactive").map(x => {
                  const current = cell.working && cell.shiftId === x.id;
                  return (
                    <button key={x.id} type="button" className={s.itemRow} data-tone={toneOf(x.id)}
                      style={{ gridTemplateColumns: "auto 1fr auto", textAlign: "left", cursor: "pointer", boxShadow: current ? "0 0 0 2px color-mix(in srgb, var(--tone) 60%, transparent)" : undefined }}
                      onClick={() => setRosterDay("shift", x.id)}>
                      <span className={s.legendSwatch} />
                      <span><span className={s.strong}>{x.name}</span> <span className={s.muted}>· {shiftTime(x)}</span></span>
                      {current && <Badge tone={toneOf(x.id)}>Current</Badge>}
                    </button>
                  );
                })}
                <button type="button" className={s.itemRow} style={{ gridTemplateColumns: "auto 1fr auto", textAlign: "left", cursor: "pointer" }} onClick={() => setRosterDay("off")}>
                  <span className={s.legendSwatch} data-tone="gray" />
                  <span className={s.strong}>Day off</span>
                  {!cell.working && cell.changed && <Badge>Current</Badge>}
                </button>
              </div>
              <div className={s.dialogFooter}>
                {cell.changed && <Button variant="outline" onClick={() => setRosterDay("default")}><RefreshCw className="h-4 w-4 mr-1" />Use regular schedule</Button>}
                <Button variant="ghost" onClick={() => setCell(null)}>Close</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ══ Confirmations ═════════════════════════════════════════════════ */}
      <Dialog open={!!deleteShift} onOpenChange={v => !v && setDeleteShift(null)}>
        <DialogContent className={s.dialogMd}>
          <DialogHeader>
            <DialogTitle>Delete {deleteShift?.name}?</DialogTitle>
            <DialogDescription>Past roster history that used this shift will show as “no shift”. Shifts with assigned employees can't be deleted — set them Inactive instead.</DialogDescription>
          </DialogHeader>
          <div className={s.dialogFooter}>
            <Button variant="outline" onClick={() => setDeleteShift(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!unassignFor} onOpenChange={v => !v && setUnassignFor(null)}>
        <DialogContent className={s.dialogMd}>
          <DialogHeader>
            <DialogTitle>Remove {unassignFor?.name} from their shift?</DialogTitle>
            <DialogDescription>From today they won't be scheduled, so no absences, lateness or overtime are tracked and payroll pays the fixed salary.</DialogDescription>
          </DialogHeader>
          <div className={s.dialogFooter}>
            <Button variant="outline" onClick={() => setUnassignFor(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmUnassign}><UserMinus className="h-4 w-4 mr-1" />Remove shift</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
