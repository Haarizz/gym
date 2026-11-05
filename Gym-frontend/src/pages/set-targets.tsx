import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  Target, Plus, ArrowLeft, Save, Users, Building2, Percent, DollarSign, CheckCircle, Clock, BarChart3, Copy, Award,
  Banknote, Star, XCircle, Pencil, Activity, Download, RotateCcw, Undo2, Gauge, Info, Trash2, Layers, UserX, Repeat, GitBranch,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { hasPermission } from "../utils/permissions";
import { useBranch } from "../utils/branch-context";
import { exportAsCsv } from "../utils/export-utils";
import { rolesService } from "../utils/supabase/roles-service";
import {
  performanceService, METRICS, metricLabel, goalOf, amountOf, countOf, lineText, bonusText,
  type PerformanceOverview, type OverviewRow, type PeriodFigures, type SettlementStatus, type SettlementAction,
  type TargetRecord, type TargetScope, type MetricCode, type Measure, type IncentivePlan, type PlanLine, type PlanBonus,
  type UnassignedList, type UnassignedRow,
} from "../utils/supabase/performance-service";
import {
  PageHeader, Kpi, Badge, Note, Panel, TabBar, Person, Avatar, Empty, Field, Stat, ProgressBar, Money, Line, Tone, cx, wf as s,
  periodLabel, errorMessage, useMoneyText, MONTHS,
} from "../components/workforce/ui";

interface SetTargetsProps { onNavigate: (section: string, params?: Record<string, any>) => void; }

type TabId = "overview" | "branch" | "targets" | "plans" | "earnings" | "unassigned";
type PeriodType = "monthly" | "quarterly" | "yearly";

const EARN_TONE: Record<SettlementStatus, Tone> = { estimated: "blue", pending: "amber", approved: "green", paid: "teal", rejected: "red" };
const EARN_LABEL: Record<SettlementStatus, string> = { estimated: "Estimated", pending: "Pending", approved: "Approved", paid: "Paid", rejected: "Rejected" };
const SCOPE_LABEL: Record<TargetScope, string> = { staff: "Staff member", role: "Role", branch: "Whole branch" };
const HIDDEN_ROLES = ["GYMBIOS_ADMIN", "MEMBER", "DEVICE", "USER", "SUPER_ADMIN"];

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const achTone = (p: number): Tone => (p >= 100 ? "green" : p >= 80 ? "amber" : "red");
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const shiftMonth = (period: string, by: number) => {
  const [y, m] = period.split("-").map(Number);
  return ym(new Date(y, m - 1 + by, 1));
};

interface TargetForm {
  scope: TargetScope; staffId: string; role: string; period: string; repeat: boolean;
  /** "METRIC|measure" → typed value */
  goals: Record<string, string>;
}

interface PlanForm {
  id?: number; settledMonths: number; name: string; branchScope: "all" | "this"; effectiveFrom: string;
  status: IncentivePlan["status"]; roles: string[]; staffIds: string[]; lines: PlanLine[]; bonuses: PlanBonus[];
}

const emptyPlan = (period: string): PlanForm => ({
  settledMonths: 0, name: "", branchScope: "all", effectiveFrom: period, status: "active", roles: [], staffIds: [], lines: [], bonuses: [],
});

export function SetTargets({ onNavigate }: SetTargetsProps) {
  const location = useLocation();
  const navState = (location.state || {}) as { tab?: TabId; staffId?: string | number };
  const navTab = navState.tab;
  const { activeBranchId } = useBranch();
  const money = useMoneyText();
  const canEdit = hasPermission("STAFF_EDIT") || hasPermission("PAYROLL_EDIT") || hasPermission("STAFF_CREATE");
  const canApprove = hasPermission("PAYROLL_APPROVE");

  const now = new Date();
  const [tab, setTab] = useState<TabId>(navTab ?? "overview");
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [anchor, setAnchor] = useState(ym(now));
  const [roleF, setRoleF] = useState("all");
  const [deptF, setDeptF] = useState("all");
  const [empF, setEmpF] = useState(navState.staffId ? String(navState.staffId) : "all");
  const [statusF, setStatusF] = useState("all");

  const [data, setData] = useState<PerformanceOverview | null>(null);
  const [targets, setTargets] = useState<TargetRecord[]>([]);
  const [plans, setPlans] = useState<IncentivePlan[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedList | null>(null);
  const [roleNames, setRoleNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [empDetail, setEmpDetail] = useState<OverviewRow | null>(null);
  const [earn, setEarn] = useState<{ row: OverviewRow; month: PeriodFigures } | null>(null);
  const [earnNote, setEarnNote] = useState("");
  const [earnAdjust, setEarnAdjust] = useState("");
  const [targetForm, setTargetForm] = useState<TargetForm | null>(null);
  const [planForm, setPlanForm] = useState<PlanForm | null>(null);
  const [saving, setSaving] = useState(false);

  const range = useMemo(() => {
    const [y, m] = anchor.split("-").map(Number);
    if (periodType === "yearly") return { from: `${y}-01`, to: `${y}-12` };
    if (periodType === "quarterly") {
      const q = Math.floor((m - 1) / 3);
      return { from: `${y}-${String(q * 3 + 1).padStart(2, "0")}`, to: `${y}-${String(q * 3 + 3).padStart(2, "0")}` };
    }
    return { from: anchor, to: anchor };
  }, [anchor, periodType]);

  const periodText = useMemo(() => {
    const [y, m] = anchor.split("-").map(Number);
    if (periodType === "yearly") return String(y);
    if (periodType === "quarterly") return `Q${Math.floor((m - 1) / 3) + 1} ${y}`;
    return `${MONTHS[m - 1]} ${y}`;
  }, [anchor, periodType]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [overview, list] = await Promise.all([
        performanceService.overview(range.from, range.to),
        performanceService.targets(anchor),
      ]);
      setData(overview);
      setTargets(list);
    } catch (e) {
      toast.error(errorMessage(e, "Failed to load targets"));
    } finally {
      setLoading(false);
    }
  }, [range, anchor]);

  const loadPlans = useCallback(async () => {
    try {
      setPlans(await performanceService.plans());
      const roles = await rolesService.getRoles("", 1, 200).then(r => r.data.map(x => x.role_name)).catch(() => [] as string[]);
      setRoleNames(roles.filter(r => !HIDDEN_ROLES.includes(r.toUpperCase())));
    } catch (e) { toast.error(errorMessage(e, "Failed to load incentive plans")); }
  }, []);

  const loadUnassigned = useCallback(async () => {
    try { setUnassigned(await performanceService.unassigned(6)); }
    catch (e) { toast.error(errorMessage(e, "Failed to load unassigned sales")); }
  }, []);

  useEffect(() => { load(); }, [load, activeBranchId]);
  useEffect(() => { loadPlans(); }, [loadPlans, activeBranchId]);
  useEffect(() => { if (tab === "unassigned") loadUnassigned(); }, [tab, loadUnassigned, activeBranchId]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const rows = data?.rows ?? [];
  const roles = useMemo(() => Array.from(new Set(rows.map(r => r.role).filter(Boolean) as string[])).sort(), [rows]);
  const allRoles = useMemo(() => Array.from(new Set([...roleNames, ...roles])).sort(), [roleNames, roles]);
  const depts = useMemo(() => Array.from(new Set(rows.map(r => r.department).filter(Boolean) as string[])).sort(), [rows]);
  const visible = useMemo(() => rows.filter(r =>
    (roleF === "all" || r.role === roleF) && (deptF === "all" || r.department === deptF) && (empF === "all" || String(r.staff_id) === empF)), [rows, roleF, deptF, empF]);
  const staffName = (id: number | null) => rows.find(r => r.staff_id === id)?.name ?? (id ? `Staff #${id}` : "—");

  const perStaff = useMemo(() => visible.map(r => {
    let revT = 0, revA = 0, comm = 0, approved = 0, pending = 0;
    r.months.forEach(m => {
      revT += Number(goalOf(m, "REVENUE_TOTAL", "amount")?.goal ?? 0);
      revA += amountOf(m, "REVENUE_TOTAL");
      comm += Number(m.commission || 0);
      if (m.settlement.status === "approved" || m.settlement.status === "paid") approved += Number(m.commission || 0);
      if (m.settlement.status === "pending") pending += Number(m.commission || 0);
    });
    const latest = r.months[r.months.length - 1];
    return { row: r, latest, revT, revA, comm, approved, pending, ach: pct(revA, revT) };
  }), [visible]);

  const totals = useMemo(() => perStaff.reduce((t, x) => ({
    revT: t.revT + x.revT, revA: t.revA + x.revA, comm: t.comm + x.comm, approved: t.approved + x.approved, pending: t.pending + x.pending,
  }), { revT: 0, revA: 0, comm: 0, approved: 0, pending: 0 }), [perStaff]);

  const earnings = useMemo(() => {
    const out: Array<{ row: OverviewRow; month: PeriodFigures }> = [];
    visible.forEach(row => row.months.forEach(month => {
      if (statusF !== "all" && month.settlement.status !== statusF) return;
      const decided = ["approved", "paid", "rejected"].includes(month.settlement.status);
      if (!decided && !Number(month.commission) && !month.incentive.has_plan) return;
      out.push({ row, month });
    }));
    return out.sort((a, b) => b.month.period.localeCompare(a.month.period) || a.row.name.localeCompare(b.row.name));
  }, [visible, statusF]);

  const earnTotals = useMemo(() => {
    const t: Record<SettlementStatus, number> = { estimated: 0, pending: 0, approved: 0, paid: 0, rejected: 0 };
    visible.forEach(row => row.months.forEach(m => { t[m.settlement.status] += Number(m.commission || 0); }));
    return t;
  }, [visible]);

  const pendingPeriods = useMemo(() => {
    const set = new Set<string>();
    visible.forEach(row => row.months.forEach(m => { if (m.settlement.status === "pending" && Number(m.commission) > 0) set.add(m.period); }));
    return Array.from(set).sort();
  }, [visible]);

  const noPlanCount = rows.filter(r => !r.plan).length;

  // ── Settlement actions ────────────────────────────────────────────────────
  const decide = async (action: SettlementAction, row: OverviewRow, period: string, note?: string, adjustment?: number) => {
    setSaving(true);
    try {
      await performanceService.decide(action, { staff_id: row.staff_id, period, note, adjustment });
      toast.success({ approve: "Commission approved", reject: "Commission rejected", pay: "Marked as paid", reset: "Decision undone" }[action]);
      setEarn(null);
      setEarnNote("");
      setEarnAdjust("");
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Failed to update commission"));
    } finally {
      setSaving(false);
    }
  };

  const approveAll = async (period: string) => {
    try {
      const r = await performanceService.approveAll(period);
      toast.success(`Approved ${r.approved} commission${r.approved === 1 ? "" : "s"} for ${periodLabel(period)}`);
      load();
    } catch (e) { toast.error(errorMessage(e, "Failed to approve commission")); }
  };

  // ── Targets ───────────────────────────────────────────────────────────────
  const goalKey = (metric: MetricCode, measure: Measure) => `${metric}|${measure}`;

  const formFrom = (t: TargetRecord | undefined, scope: TargetScope, staffId = "", role = ""): TargetForm => {
    const goals: Record<string, string> = {};
    t?.lines.forEach(l => { goals[goalKey(l.metric, l.measure)] = String(Number(l.goal)); });
    return {
      scope: t?.scope ?? scope,
      staffId: t?.staff_id ? String(t.staff_id) : staffId,
      role: t?.role ?? role,
      period: anchor,
      repeat: t?.repeat_monthly ?? false,
      goals,
    };
  };

  /** The target for this month itself (not a repeating one from earlier) for the scope, if any. */
  const ownTarget = (scope: TargetScope, staffId?: string, role?: string) => targets.find(t => t.period === anchor && t.scope === scope
    && (scope !== "staff" || String(t.staff_id) === staffId)
    && (scope !== "role" || (t.role ?? "").toLowerCase() === (role ?? "").toLowerCase()));

  const openTarget = (scope: TargetScope, staffId?: string, role?: string) =>
    setTargetForm(formFrom(ownTarget(scope, staffId, role), scope, staffId, role));

  const saveTarget = async () => {
    if (!targetForm) return;
    if (targetForm.scope === "staff" && !targetForm.staffId) { toast.error("Pick a staff member"); return; }
    if (targetForm.scope === "role" && !targetForm.role) { toast.error("Pick a role"); return; }
    const lines = Object.entries(targetForm.goals)
      .filter(([, v]) => Number(v) > 0)
      .map(([k, v]) => { const [metric, measure] = k.split("|"); return { metric: metric as MetricCode, measure: measure as Measure, goal: Number(v) }; });
    setSaving(true);
    try {
      await performanceService.saveTarget({
        scope: targetForm.scope,
        staff_id: targetForm.scope === "staff" ? Number(targetForm.staffId) : null,
        role: targetForm.scope === "role" ? targetForm.role : null,
        branch_id: activeBranchId,
        period: targetForm.period,
        repeat_monthly: targetForm.repeat,
        lines,
      });
      toast.success(lines.length ? `Target saved for ${periodLabel(targetForm.period)}` : "Target removed");
      setTargetForm(null);
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Failed to save target"));
    } finally {
      setSaving(false);
    }
  };

  const deleteTarget = async (t: TargetRecord) => {
    try {
      await performanceService.deleteTarget(t.id);
      toast.success("Target deleted");
      load();
    } catch (e) { toast.error(errorMessage(e, "Failed to delete target")); }
  };

  const copyPrevious = async () => {
    const prev = shiftMonth(anchor, -1);
    try {
      const r = await performanceService.copyTargets(prev, anchor);
      toast.success(r.copied ? `Copied ${r.copied} target${r.copied === 1 ? "" : "s"} from ${periodLabel(prev)}` : `Nothing new to copy from ${periodLabel(prev)}`);
      load();
    } catch (e) { toast.error(errorMessage(e, "Failed to copy targets")); }
  };

  const targetWho = (t: TargetRecord) => t.scope === "staff" ? staffName(t.staff_id) : t.scope === "role" ? `Everyone in ${t.role}` : "Whole branch";

  // ── Plans ─────────────────────────────────────────────────────────────────
  const openPlan = (p?: IncentivePlan) => setPlanForm(p ? {
    id: p.id, settledMonths: p.settled_months, name: p.name, branchScope: p.branch_id ? "this" : "all",
    effectiveFrom: p.settled_months > 0 ? anchor : p.effective_from, status: p.status,
    roles: p.assignments.filter(a => !a.staff_id && a.role).map(a => a.role as string),
    staffIds: p.assignments.filter(a => a.staff_id).map(a => String(a.staff_id)),
    lines: p.lines.map(l => ({ ...l })), bonuses: p.bonuses.map(b => ({ ...b })),
  } : emptyPlan(anchor));

  const savePlan = async () => {
    if (!planForm) return;
    if (!planForm.name.trim()) { toast.error("Name the plan"); return; }
    if (planForm.roles.length === 0 && planForm.staffIds.length === 0) { toast.error("Assign the plan to at least one role or person"); return; }
    const body = {
      name: planForm.name.trim(),
      branch_id: planForm.branchScope === "this" ? activeBranchId : null,
      effective_from: planForm.effectiveFrom,
      status: planForm.status,
      assignments: [
        ...planForm.roles.map(role => ({ role, staff_id: null })),
        ...planForm.staffIds.map(id => ({ role: null, staff_id: Number(id) })),
      ],
      lines: planForm.lines.filter(l => Number(l.rate) > 0).map(l => ({
        metric: l.metric, basis: l.basis, rate: Number(l.rate),
        min_units: l.min_units ? Number(l.min_units) : null, cap_amount: l.cap_amount ? Number(l.cap_amount) : null,
      })),
      bonuses: planForm.bonuses.filter(b => Number(b.reward_value) > 0).map(b => ({
        metric: b.metric, threshold_pct: Number(b.threshold_pct), reward_type: b.reward_type, reward_value: Number(b.reward_value),
        condition_metric: b.condition_metric || null, condition_min: b.condition_metric && b.condition_min != null ? Number(b.condition_min) : null,
      })),
    };
    setSaving(true);
    try {
      if (!planForm.id) await performanceService.createPlan(body);
      else if (planForm.settledMonths > 0) await performanceService.newPlanVersion(planForm.id, body);
      else await performanceService.updatePlan(planForm.id, body);
      toast.success(planForm.id && planForm.settledMonths > 0 ? `New version from ${periodLabel(planForm.effectiveFrom)}` : "Incentive plan saved");
      setPlanForm(null);
      loadPlans();
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Failed to save plan"));
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (p: IncentivePlan) => {
    try {
      await performanceService.deletePlan(p.id);
      toast.success(p.settled_months > 0 ? "Plan archived (months were approved under it)" : "Plan deleted");
      loadPlans();
      load();
    } catch (e) { toast.error(errorMessage(e, "Failed to delete plan")); }
  };

  const planAssignees = (p: IncentivePlan) => [
    ...p.assignments.filter(a => a.role && !a.staff_id).map(a => a.role as string),
    ...p.assignments.filter(a => a.staff_id).map(a => staffName(a.staff_id)),
  ];

  // ── Unassigned ────────────────────────────────────────────────────────────
  const assign = async (type: "receipt" | "sale" | "lead", row: UnassignedRow, staffId: string) => {
    try {
      await performanceService.assign(type, row.id, Number(staffId));
      toast.success(`Credited to ${staffName(Number(staffId))}`);
      loadUnassigned();
      load();
    } catch (e) { toast.error(errorMessage(e, "Failed to assign")); }
  };

  const exportPerformance = () => exportAsCsv(`staff-performance-${range.from}${range.to !== range.from ? `_${range.to}` : ""}.csv`,
    ["Employee", "Role", "Department", "Plan", "Revenue Target", "Actual Revenue", "Achievement %", "Commission", "Approved Commission"],
    perStaff.map(x => [x.row.name, x.row.role, x.row.department, x.row.plan?.name ?? "No plan", x.revT, x.revA, x.ach, x.comm, x.approved]));

  const anchorOptions = useMemo(() => Array.from({ length: 20 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + 2 - i, 1);
    return { value: ym(d), label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const goalChips = (m: PeriodFigures | undefined) => !m || m.goals.length === 0 ? <span className={s.muted}>No target</span> : (
    <div className={s.chips} style={{ gap: "0.25rem" }}>
      {m.goals.map(g => (
        <span key={`${g.metric}-${g.measure}`} className={s.badge} data-tone={achTone(g.percent ?? 0)} title={`${g.label} (${g.source} target)`}>
          {metricLabel(g.metric)}: {g.measure === "amount" ? money(g.achieved) : g.achieved}/{g.measure === "amount" ? money(g.goal) : Number(g.goal)}
        </span>
      ))}
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className={s.page}>
      <PageHeader
        crumbs={[{ label: "Payroll & Employees", to: "payroll-employees" }, { label: "Staffs & Trainers", to: "staffs-trainers" }, { label: "Targets & Incentives" }]}
        onCrumb={to => onNavigate(to)}
        icon={Target}
        title="Targets & Incentives"
        subtitle="Targets per metric · Incentive plans · Approve monthly commission"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => onNavigate("staffs-trainers")}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate("targets-overview")}><Gauge className="h-4 w-4 mr-1" />Targets Overview</Button>
            {canEdit && <Button size="sm" onClick={() => { setTab("targets"); openTarget("staff"); }}><Plus className="h-4 w-4 mr-1" />Set Target</Button>}
          </>
        }
      />

      <Panel flush>
        <div className={s.filterBar}>
          <span className={s.filterLabel}>Period</span>
          <Select value={periodType} onValueChange={v => setPeriodType(v as PeriodType)}>
            <SelectTrigger className="h-9" style={{ width: "8.5rem" }}><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent>
          </Select>
          <Select value={anchor} onValueChange={setAnchor}>
            <SelectTrigger className="h-9" style={{ width: "10.5rem" }}><SelectValue /></SelectTrigger>
            <SelectContent>{anchorOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <span className={s.filterLabel} style={{ marginLeft: "0.5rem" }}>Filter</span>
          <Select value={roleF} onValueChange={setRoleF}>
            <SelectTrigger className={cx("h-9", s.select)}><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All roles</SelectItem>{roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={deptF} onValueChange={setDeptF}>
            <SelectTrigger className={cx("h-9", s.select)}><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All departments</SelectItem>{depts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={empF} onValueChange={setEmpF}>
            <SelectTrigger className={cx("h-9", s.select)}><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All employees</SelectItem>{rows.map(r => <SelectItem key={r.staff_id} value={String(r.staff_id)}>{r.name}</SelectItem>)}</SelectContent>
          </Select>
          {(roleF !== "all" || deptF !== "all" || empF !== "all" || periodType !== "monthly" || anchor !== ym(now)) && (
            <Button variant="ghost" size="sm" className="h-9" onClick={() => { setRoleF("all"); setDeptF("all"); setEmpF("all"); setPeriodType("monthly"); setAnchor(ym(now)); }}>
              <RotateCcw className="h-4 w-4 mr-1" />Reset
            </Button>
          )}
        </div>
      </Panel>

      <TabBar<TabId>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "overview", label: "Overview", icon: BarChart3 },
          { id: "branch", label: "Branch", icon: Building2 },
          { id: "targets", label: "Targets", icon: Target, count: targets.filter(t => t.period === anchor).length },
          { id: "plans", label: "Incentive Plans", icon: Percent, count: noPlanCount, countTone: "amber" },
          { id: "earnings", label: "Commission", icon: Banknote, count: earnings.filter(e => e.month.settlement.status === "pending").length, countTone: "amber" },
          { id: "unassigned", label: "Unassigned", icon: UserX, count: unassigned?.total ?? 0, countTone: "amber" },
        ]}
      />

      {loading && !data && <Panel><Empty icon={Activity} title="Calculating performance…" /></Panel>}

      {/* ── Overview ──────────────────────────────────────────────────────── */}
      {tab === "overview" && data && (
        <>
          <div className={s.kpis4}>
            <Kpi icon={Target} label="Revenue target" value={<Money value={totals.revT} />} sub={periodText} tone="teal" />
            <Kpi icon={DollarSign} label="Actual revenue" value={<Money value={totals.revA} />} sub={totals.revT ? `${pct(totals.revA, totals.revT)}% of target` : "No revenue targets"} tone={totals.revA >= totals.revT && totals.revT ? "green" : "amber"} />
            <Kpi icon={Award} label="Achievement" value={totals.revT ? `${pct(totals.revA, totals.revT)}%` : "—"} sub={totals.revT ? (totals.revA >= totals.revT ? "Target reached" : `${money(totals.revT - totals.revA)} to go`) : undefined} tone={totals.revT ? achTone(pct(totals.revA, totals.revT)) : "gray"} />
            <Kpi icon={Layers} label="Without a plan" value={String(noPlanCount)} sub="earn no commission" tone={noPlanCount ? "amber" : "green"} onClick={() => setTab("plans")} />
            <Kpi icon={Percent} label="Commission" value={<Money value={totals.comm} />} sub="estimated + decided" tone="violet" onClick={() => setTab("earnings")} />
            <Kpi icon={CheckCircle} label="Approved commission" value={<Money value={totals.approved} />} sub="frozen for payroll" tone="green" onClick={() => { setStatusF("approved"); setTab("earnings"); }} />
            <Kpi icon={Clock} label="Pending approval" value={<Money value={totals.pending} />} sub="month ended" tone={totals.pending ? "amber" : "gray"} onClick={() => { setStatusF("pending"); setTab("earnings"); }} />
            <Kpi icon={UserX} label="Unassigned sales" value={String(unassigned?.total ?? "—")} sub="credit them to staff" tone={unassigned?.total ? "amber" : "gray"} onClick={() => setTab("unassigned")} />
          </div>

          <Panel title="Staff performance" description={`${periodText} · click a row for the breakdown`}
            actions={<Button variant="outline" size="sm" onClick={exportPerformance}><Download className="h-4 w-4 mr-1" />Export</Button>} flush>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Employee</th><th>Plan</th><th className={s.right}>Revenue target</th><th className={s.right}>Actual revenue</th>
                    <th>Achievement</th><th>Goals ({periodLabel(range.to)})</th><th className={s.right}>Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {perStaff.map(x => (
                    <tr key={x.row.staff_id} className={s.clickable} onClick={() => setEmpDetail(x.row)}>
                      <td><Person name={x.row.name} sub={[x.row.role, x.row.department].filter(Boolean).join(" · ")} photo={x.row.photo_url} /></td>
                      <td>{x.row.plan ? <Badge tone="teal">{x.row.plan.name}</Badge> : <Badge tone="amber">No incentive plan</Badge>}</td>
                      <td className={s.right}><Money value={x.revT} dash /></td>
                      <td className={cx(s.right, s.strong)}><Money value={x.revA} /></td>
                      <td style={{ minWidth: "9rem" }}>
                        {x.revT ? (
                          <div className={s.barRow}>
                            <ProgressBar value={x.ach} tone={achTone(x.ach)} />
                            <span data-tone={achTone(x.ach)} className={cx(s.toneText, s.strong, s.small)}>{x.ach}%</span>
                            {x.ach >= 100 && <Star size={13} color="#f59e0b" fill="#f59e0b" />}
                          </div>
                        ) : <span className={s.muted}>—</span>}
                      </td>
                      <td style={{ whiteSpace: "normal", maxWidth: "22rem" }}>{goalChips(x.latest)}</td>
                      <td className={s.right}><span className={s.strong} style={{ color: "var(--primary)" }}><Money value={x.comm} /></span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {perStaff.length === 0 && <Empty icon={Users} title="No staff match these filters" />}
            </div>
          </Panel>
        </>
      )}

      {/* ── Branch ────────────────────────────────────────────────────────── */}
      {tab === "branch" && data && (
        <>
          <div className={s.spread}>
            <div>
              <div className={s.panelTitle}>Branch performance · {periodLabel(data.branch.period)}</div>
              <div className={s.panelDesc}>Everything done in the branch, whoever did it (including sales credited to nobody).</div>
            </div>
            {canEdit && <Button size="sm" onClick={() => { setAnchor(data.branch.period); openTarget("branch"); }}><Plus className="h-4 w-4 mr-1" />Set branch target</Button>}
          </div>
          <Panel flush>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead><tr><th>Metric</th><th className={s.right}>Count</th><th className={s.right}>Amount</th><th className={s.right}>Target</th><th>Achievement</th></tr></thead>
                <tbody>
                  {METRICS.map(m => {
                    const goals = data.branch.goals.filter(g => g.metric === m.code);
                    return (
                      <tr key={m.code}>
                        <td className={s.strong}>{m.label}<div className={s.cellSub}>{m.hint}</div></td>
                        <td className={cx(s.right, s.num)}>{m.hasCount ? countOf(data.branch, m.code) : "—"}</td>
                        <td className={s.right}>{m.hasAmount ? <Money value={amountOf(data.branch, m.code)} /> : "—"}</td>
                        <td className={s.right}>{goals.length ? goals.map(g => <div key={g.measure}>{g.measure === "amount" ? money(g.goal) : Number(g.goal)}</div>) : <span className={s.muted}>—</span>}</td>
                        <td style={{ minWidth: "10rem" }}>
                          {goals.length ? goals.map(g => (
                            <div key={g.measure} className={s.barRow}><ProgressBar value={g.percent ?? 0} tone={achTone(g.percent ?? 0)} /><span className={s.small}>{g.percent ?? 0}%</span></div>
                          )) : <span className={s.muted}>No target</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      {/* ── Targets ───────────────────────────────────────────────────────── */}
      {tab === "targets" && (
        <>
          <div className={s.spread}>
            <div>
              <div className={s.panelTitle}>Targets for {periodLabel(anchor)}</div>
              <div className={s.panelDesc}>A person's goal on a metric comes from their own target, else their role's. Repeating targets carry into later months.</div>
            </div>
            {canEdit && (
              <div className={s.actions}>
                <Button variant="outline" size="sm" onClick={copyPrevious}><Copy className="h-4 w-4 mr-1" />Copy {periodLabel(shiftMonth(anchor, -1))}</Button>
                <Button variant="outline" size="sm" onClick={() => openTarget("role")}><Users className="h-4 w-4 mr-1" />Role target</Button>
                <Button size="sm" onClick={() => openTarget("staff")}><Plus className="h-4 w-4 mr-1" />Staff target</Button>
              </div>
            )}
          </div>
          <Panel flush>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead><tr><th>For</th><th>Scope</th><th>Goals</th><th>Applies</th><th className={s.right}>Actions</th></tr></thead>
                <tbody>
                  {targets.map(t => (
                    <tr key={t.id}>
                      <td className={s.strong}>{targetWho(t)}</td>
                      <td><Badge plain>{SCOPE_LABEL[t.scope]}</Badge></td>
                      <td style={{ whiteSpace: "normal" }}>
                        <div className={s.chips} style={{ gap: "0.25rem" }}>
                          {t.lines.map(l => <span key={`${l.metric}-${l.measure}`} className={s.badge} data-tone="teal">{metricLabel(l.metric)}: {l.measure === "amount" ? money(l.goal) : Number(l.goal)}</span>)}
                        </div>
                      </td>
                      <td>
                        {t.period === anchor
                          ? (t.repeat_monthly ? <Badge tone="violet"><Repeat size={11} /> From {periodLabel(t.period)}</Badge> : <Badge tone="blue">{periodLabel(t.period)} only</Badge>)
                          : <Badge tone="violet"><Repeat size={11} /> Repeating since {t.period.startsWith("2000") ? "before" : periodLabel(t.period)}</Badge>}
                      </td>
                      <td className={s.right}>
                        {canEdit && (
                          <div className={s.rowActions}>
                            <button className={s.iconBtn} title={t.period === anchor ? "Edit" : `Set a target for ${periodLabel(anchor)}`}
                              onClick={() => setTargetForm({ ...formFrom(t, t.scope), period: anchor, repeat: t.period === anchor ? t.repeat_monthly : false })}><Pencil size={15} /></button>
                            {t.period === anchor && <button className={s.iconBtn} data-tone="red" title="Delete" onClick={() => deleteTarget(t)}><Trash2 size={15} /></button>}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {targets.length === 0 && <Empty icon={Target} title={`No targets for ${periodLabel(anchor)}`}>{canEdit && "Set one per staff member or role, or copy last month's."}</Empty>}
            </div>
          </Panel>
        </>
      )}

      {/* ── Plans ─────────────────────────────────────────────────────────── */}
      {tab === "plans" && (
        <>
          <div className={s.spread}>
            <div>
              <div className={s.panelTitle}>Incentive plans</div>
              <div className={s.panelDesc}>Commission lines and target bonuses. A personal plan beats a role plan; a branch plan beats an all-branches plan.</div>
            </div>
            {canEdit && <Button size="sm" onClick={() => openPlan()}><Plus className="h-4 w-4 mr-1" />New plan</Button>}
          </div>
          {noPlanCount > 0 && (
            <Note tone="amber" icon={Info}>
              {noPlanCount} staff member{noPlanCount === 1 ? " has" : "s have"} no incentive plan and earn no commission: {rows.filter(r => !r.plan).map(r => r.name).slice(0, 6).join(", ")}{noPlanCount > 6 ? "…" : ""}.
            </Note>
          )}
          <div className={s.stack} style={{ gap: "0.75rem" }}>
            {plans.map(p => (
              <div key={p.id} className={s.listCard} data-tone={p.status === "active" ? "teal" : "gray"}>
                <div className={s.listIcon}><Percent size={18} /></div>
                <div className={s.listMain}>
                  <div className={s.row}>
                    <span className={s.strong}>{p.name}</span>
                    <Badge tone={p.status === "active" ? "green" : p.status === "draft" ? "blue" : "gray"}>{p.status[0].toUpperCase() + p.status.slice(1)}</Badge>
                    <Badge plain>{p.branch_id ? "This branch" : "All branches"}</Badge>
                    <Badge plain>From {p.effective_from.startsWith("2000") ? "the start" : periodLabel(p.effective_from)}{p.effective_to ? ` to ${periodLabel(p.effective_to.slice(0, 7))}` : ""}</Badge>
                    {p.settled_months > 0 && <Badge tone="violet">{p.settled_months} month{p.settled_months === 1 ? "" : "s"} approved</Badge>}
                  </div>
                  <div className={s.cellSub}>For: {planAssignees(p).join(", ") || "nobody yet"}</div>
                  <div className={s.chips} style={{ gap: "0.375rem" }}>
                    {p.lines.map((l, i) => <span key={i} className={s.badge} data-tone="teal">{metricLabel(l.metric)}: {lineText(l, money)}</span>)}
                    {p.bonuses.map((b, i) => <span key={`b${i}`} className={s.badge} data-tone="violet"><Award size={11} />{bonusText(b, money)}</span>)}
                    {p.lines.length === 0 && p.bonuses.length === 0 && <span className={s.muted}>No lines yet</span>}
                  </div>
                </div>
                {canEdit && (
                  <div className={s.rowActions}>
                    <button className={s.iconBtn} title={p.settled_months > 0 ? "New version" : "Edit"} onClick={() => openPlan(p)}>{p.settled_months > 0 ? <GitBranch size={15} /> : <Pencil size={15} />}</button>
                    {p.status !== "archived" && <button className={s.iconBtn} data-tone="red" title={p.settled_months > 0 ? "Archive" : "Delete"} onClick={() => deletePlan(p)}><Trash2 size={15} /></button>}
                  </div>
                )}
              </div>
            ))}
            {plans.length === 0 && <Panel><Empty icon={Percent} title="No incentive plans yet">Without a plan nobody earns commission. Create one per role (e.g. Trainer, Front desk).</Empty></Panel>}
          </div>
        </>
      )}

      {/* ── Commission ────────────────────────────────────────────────────── */}
      {tab === "earnings" && data && (
        <>
          <div className={s.kpis}>
            {(["estimated", "pending", "approved", "paid"] as SettlementStatus[]).map(st => (
              <Kpi key={st} icon={Banknote} label={st === "estimated" ? "Estimated (month running)" : st === "pending" ? "Pending approval" : EARN_LABEL[st]}
                value={<Money value={earnTotals[st]} />} tone={EARN_TONE[st]} active={statusF === st} onClick={() => setStatusF(statusF === st ? "all" : st)} />
            ))}
          </div>
          <Panel flush>
            <div className={s.filterBar}>
              <Select value={statusF} onValueChange={setStatusF}>
                <SelectTrigger className={cx("h-9", s.select)}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {(Object.keys(EARN_LABEL) as SettlementStatus[]).map(k => <SelectItem key={k} value={k}>{EARN_LABEL[k]}</SelectItem>)}
                </SelectContent>
              </Select>
              {canApprove && pendingPeriods.map(p => (
                <Button key={p} size="sm" className="h-9" onClick={() => approveAll(p)}><CheckCircle className="h-4 w-4 mr-1" />Approve all for {periodLabel(p)}</Button>
              ))}
            </div>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Employee</th><th>Month</th><th>Plan</th><th>Lines</th><th className={s.right}>Commission</th><th className={s.center}>Status</th><th className={s.right}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.map(e => (
                    <tr key={`${e.row.staff_id}-${e.month.period}`} className={s.clickable} onClick={() => { setEarn(e); setEarnNote(""); setEarnAdjust(""); }}>
                      <td><Person name={e.row.name} sub={e.row.role} photo={e.row.photo_url} size="sm" /></td>
                      <td>{periodLabel(e.month.period)}</td>
                      <td>{e.month.incentive.plan_name ? <Badge plain>{e.month.incentive.plan_name}</Badge> : <span className={s.muted}>No plan</span>}</td>
                      <td className={s.cellSub} style={{ whiteSpace: "normal", minWidth: "12rem" }}>
                        {[...e.month.incentive.lines.filter(l => Number(l.earned)).map(l => `${l.label} ${money(l.earned)}`),
                          ...e.month.incentive.bonuses.filter(b => b.reached).map(b => `Bonus ${money(b.earned)}`)].join(" · ") || "—"}
                      </td>
                      <td className={s.right}><span className={s.strong} style={{ color: "var(--primary)" }}><Money value={e.month.commission} /></span></td>
                      <td className={s.center}><Badge tone={EARN_TONE[e.month.settlement.status]}>{EARN_LABEL[e.month.settlement.status]}</Badge></td>
                      <td className={s.right} onClick={ev => ev.stopPropagation()}>
                        <div className={s.rowActions}>
                          {e.month.settlement.status === "pending" && canApprove && (
                            <>
                              <button className={s.iconBtn} data-tone="green" title="Approve" onClick={() => decide("approve", e.row, e.month.period)}><CheckCircle size={15} /></button>
                              <button className={s.iconBtn} data-tone="red" title="Reject" onClick={() => { setEarn(e); setEarnNote(""); setEarnAdjust(""); }}><XCircle size={15} /></button>
                            </>
                          )}
                          {e.month.settlement.status === "approved" && canEdit && (
                            <button className={s.iconBtn} data-tone="teal" title="Mark as paid (outside payroll)" onClick={() => decide("pay", e.row, e.month.period)}><Banknote size={15} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {earnings.length === 0 && <Empty icon={Banknote} title="No commission in this period" />}
            </div>
          </Panel>
          <Note tone="teal">One decision per person per month. Approving freezes the amount and its breakdown; payroll adds it to that month and marks it paid when the salary is paid. A refund after approval reduces the month it happens in.</Note>
        </>
      )}

      {/* ── Unassigned ────────────────────────────────────────────────────── */}
      {tab === "unassigned" && (
        <>
          <div>
            <div className={s.panelTitle}>Unassigned sales</div>
            <div className={s.panelDesc}>Admissions, POS sales and lead conversions from the last 6 months that couldn't be matched to exactly one staff member. Credit them here; nothing is guessed.</div>
          </div>
          {!unassigned && <Panel><Empty icon={Activity} title="Loading…" /></Panel>}
          {unassigned && ([
            ["receipt", "Admissions", unassigned.receipts],
            ["sale", "POS sales", unassigned.sales],
            ["lead", "Lead conversions", unassigned.leads],
          ] as Array<["receipt" | "sale" | "lead", string, UnassignedRow[]]>).map(([type, title, list]) => (
            <Panel key={type} title={`${title} · ${list.length}`} flush>
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <thead><tr><th>Date</th><th>What</th><th>Recorded as</th><th className={s.right}>Amount</th><th>Credit to</th></tr></thead>
                  <tbody>
                    {list.map(r => (
                      <tr key={r.id}>
                        <td>{r.date ? r.date.slice(0, 10) : "—"}</td>
                        <td className={s.strong}>{r.title || `#${r.id}`}</td>
                        <td className={s.cellSub}>{r.recorded_as || "—"}{r.created_by ? ` · by ${r.created_by}` : ""}</td>
                        <td className={s.right}>{r.amount != null ? <Money value={Number(r.amount)} /> : "—"}</td>
                        <td style={{ minWidth: "12rem" }}>
                          {canEdit ? (
                            <Select onValueChange={v => assign(type, r, v)}>
                              <SelectTrigger className="h-8"><SelectValue placeholder="Choose staff" /></SelectTrigger>
                              <SelectContent>{rows.map(x => <SelectItem key={x.staff_id} value={String(x.staff_id)}>{x.name}</SelectItem>)}</SelectContent>
                            </Select>
                          ) : <span className={s.muted}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {list.length === 0 && <Empty icon={CheckCircle} title="Nothing unassigned" />}
              </div>
            </Panel>
          ))}
        </>
      )}

      {/* ══ Employee detail ═══════════════════════════════════════════════ */}
      <Dialog open={!!empDetail} onOpenChange={v => !v && setEmpDetail(null)}>
        <DialogContent className={cx(s.dialogLg, s.dialogScroll)}>
          {empDetail && (() => {
            const latest = empDetail.months[empDetail.months.length - 1];
            return (
              <>
                <DialogHeader>
                  <div className={s.row} style={{ gap: "0.75rem", flexWrap: "nowrap" }}>
                    <Avatar name={empDetail.name} photo={empDetail.photo_url} size="lg" />
                    <div style={{ textAlign: "left" }}>
                      <DialogTitle>{empDetail.name}</DialogTitle>
                      <DialogDescription>{[empDetail.role, empDetail.department, empDetail.branch].filter(Boolean).join(" · ")} · {periodText}</DialogDescription>
                    </div>
                  </div>
                  <div className={s.cellSub} style={{ textAlign: "left" }}>{empDetail.plan ? `Plan: ${empDetail.plan.name}` : "No incentive plan — earns no commission"}</div>
                </DialogHeader>
                <div className={s.dialogBody}>
                  <div className={s.stats}>
                    {METRICS.filter(m => m.code !== "REVENUE_TOTAL").map(m => (
                      <Stat key={m.code} label={m.label} value={
                        <>{empDetail.months.reduce((t, x) => t + countOf(x, m.code), 0)}{m.hasAmount ? <span className={s.muted}> · {money(empDetail.months.reduce((t, x) => t + amountOf(x, m.code), 0))}</span> : null}</>
                      } />
                    ))}
                    <Stat label="Commission" value={<Money value={empDetail.months.reduce((t, x) => t + Number(x.commission || 0), 0)} />} />
                  </div>
                  {latest && latest.goals.length > 0 && (
                    <div className={s.section} data-tone="teal">
                      <div className={s.sectionTitle}>Goals · {periodLabel(latest.period)}</div>
                      {latest.goals.map(g => (
                        <div key={`${g.metric}-${g.measure}`} style={{ marginBottom: "0.5rem" }}>
                          <div className={s.spread}>
                            <span className={s.small}>{g.label}{g.source !== "staff" ? <span className={s.muted}> ({g.source} target)</span> : null}</span>
                            <span className={s.small}>{g.measure === "amount" ? `${money(g.achieved)} / ${money(g.goal)}` : `${g.achieved} / ${Number(g.goal)}`} · {g.percent ?? 0}%</span>
                          </div>
                          <ProgressBar value={g.percent ?? 0} tone={achTone(g.percent ?? 0)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className={s.dialogFooter}>
                  <Button variant="outline" onClick={() => setEmpDetail(null)}>Close</Button>
                  {canEdit && <Button variant="outline" onClick={() => { openTarget("staff", String(empDetail.staff_id)); setEmpDetail(null); }}><Target className="h-4 w-4 mr-1" />Set target</Button>}
                  <Button onClick={() => { setEmpF(String(empDetail.staff_id)); setTab("earnings"); setEmpDetail(null); }}><Banknote className="h-4 w-4 mr-1" />View commission</Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ══ Commission detail ═════════════════════════════════════════════ */}
      <Dialog open={!!earn} onOpenChange={v => !v && setEarn(null)}>
        <DialogContent className={cx(s.dialogMd, s.dialogScroll)}>
          {earn && (() => {
            const st = earn.month.settlement;
            const inc = earn.month.incentive;
            return (
              <>
                <DialogHeader>
                  <DialogTitle>Commission breakdown</DialogTitle>
                  <DialogDescription>{earn.row.name} · {periodLabel(earn.month.period)}{inc.plan_name ? ` · ${inc.plan_name}` : ""}</DialogDescription>
                </DialogHeader>
                <div className={s.dialogBody}>
                  <div className={s.spread}><span className={s.small}>Status</span><Badge tone={EARN_TONE[st.status]}>{EARN_LABEL[st.status]}</Badge></div>
                  {!inc.has_plan && <Note tone="amber">No incentive plan applied to this month, so nothing was earned.</Note>}
                  {inc.lines.length > 0 && (
                    <div className={s.section} data-tone="teal">
                      <div className={s.sectionTitle}>Commission lines</div>
                      {inc.lines.map((l, i) => (
                        <Line key={i}
                          label={<>{l.label}{l.metric && l.basis ? <span className={s.muted}> · {l.basis === "percent_of_amount" ? `${Number(l.rate)}% of ${money(l.base)}` : `${l.units} × ${money(l.rate)}`}{l.below_minimum ? ` (below minimum ${l.min_units})` : ""}{l.capped ? " (capped)" : ""}</span> : null}</>}
                          value={money(l.earned)} />
                      ))}
                    </div>
                  )}
                  {inc.bonuses.length > 0 && (
                    <div className={s.section} data-tone="violet">
                      <div className={s.sectionTitle}>Target bonuses</div>
                      {inc.bonuses.map((b, i) => (
                        <Line key={i} tone={b.reached ? "green" : undefined}
                          label={<>{Number(b.threshold_pct)}% of {b.label.toLowerCase()} target<span className={s.muted}> · reached {b.attainment_pct != null ? `${Number(b.attainment_pct)}%` : "no target"}{!b.condition_met ? " · condition not met" : ""}</span></>}
                          value={money(b.earned)} />
                      ))}
                    </div>
                  )}
                  <div className={s.netRow}><span className={s.netLabel}>Commission</span><span className={s.netValue}>{money(earn.month.commission)}</span></div>
                  {st.adjustment_amount != null && <Note tone="blue">Includes a manual adjustment of {money(st.adjustment_amount)}{st.computed_amount != null ? ` on the calculated ${money(st.computed_amount)}` : ""}.</Note>}
                  {inc.legacy && <Note tone="blue">Approved before incentive plans: the old memberships/POS amounts are shown as they were frozen.</Note>}
                  {st.status === "paid" && <Note tone="teal">Paid {st.payroll_run_id ? "through payroll" : "outside payroll"}.</Note>}
                  {st.status === "estimated" && <Note tone="blue">The month is still running — commission can be approved once it ends.</Note>}
                  {st.reviewed_by && <div className={s.cellSub}>Reviewed by {st.reviewed_by}{st.reviewed_at ? ` on ${st.reviewed_at.slice(0, 10)}` : ""}</div>}
                  {st.note && <div className={s.small}><span className={s.strong}>Note: </span>{st.note}</div>}
                  {st.status === "pending" && canApprove && (
                    <div className={s.grid2}>
                      <Field label="Adjustment (optional)" hint="Added to the calculated amount; can be negative">
                        <Input type="number" value={earnAdjust} placeholder="0" onChange={e => setEarnAdjust(e.target.value)} />
                      </Field>
                      <Field label="Note" hint="Required with an adjustment or a rejection">
                        <Input value={earnNote} placeholder="Reason" onChange={e => setEarnNote(e.target.value)} />
                      </Field>
                    </div>
                  )}
                </div>
                <div className={s.dialogFooter}>
                  {(st.status === "approved" || st.status === "rejected") && canApprove && (
                    <Button variant="ghost" disabled={saving} onClick={() => decide("reset", earn.row, earn.month.period)}><Undo2 className="h-4 w-4 mr-1" />Undo decision</Button>
                  )}
                  <Button variant="outline" onClick={() => setEarn(null)}>Close</Button>
                  {st.status === "pending" && canApprove && (
                    <>
                      <Button variant="outline" disabled={saving} onClick={() => decide("reject", earn.row, earn.month.period, earnNote || undefined)}><XCircle className="h-4 w-4 mr-1" />Reject</Button>
                      <Button disabled={saving} onClick={() => decide("approve", earn.row, earn.month.period, earnNote || undefined, earnAdjust ? Number(earnAdjust) : undefined)}>
                        <CheckCircle className="h-4 w-4 mr-1" />Approve{earnAdjust && Number(earnAdjust) ? ` ${money(Number(earn.month.commission) + Number(earnAdjust))}` : ""}
                      </Button>
                    </>
                  )}
                  {st.status === "approved" && canEdit && (
                    <Button disabled={saving} onClick={() => decide("pay", earn.row, earn.month.period)}><Banknote className="h-4 w-4 mr-1" />Mark as paid</Button>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ══ Target form ═══════════════════════════════════════════════════ */}
      <Dialog open={!!targetForm} onOpenChange={v => !v && setTargetForm(null)}>
        <DialogContent className={cx(s.dialogLg, s.dialogScroll)}>
          {targetForm && (
            <>
              <DialogHeader>
                <DialogTitle>{SCOPE_LABEL[targetForm.scope]} target · {periodLabel(targetForm.period)}</DialogTitle>
                <DialogDescription>Goals per metric. Leave a goal blank for none; saving with every goal blank removes the target.</DialogDescription>
              </DialogHeader>
              <div className={s.dialogBody}>
                <div className={s.grid2}>
                  <Field label="For" required>
                    <Select value={targetForm.scope} onValueChange={v => setTargetForm(formFrom(ownTarget(v as TargetScope, targetForm.staffId, targetForm.role), v as TargetScope, targetForm.staffId, targetForm.role))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{(Object.keys(SCOPE_LABEL) as TargetScope[]).map(k => <SelectItem key={k} value={k}>{SCOPE_LABEL[k]}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  {targetForm.scope === "staff" && (
                    <Field label="Staff member" required>
                      <Select value={targetForm.staffId} onValueChange={v => setTargetForm({ ...formFrom(ownTarget("staff", v), "staff", v), repeat: targetForm.repeat })}>
                        <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                        <SelectContent>{rows.map(r => <SelectItem key={r.staff_id} value={String(r.staff_id)}>{r.name}{r.role ? ` (${r.role})` : ""}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                  )}
                  {targetForm.scope === "role" && (
                    <Field label="Role" required hint="Applies to everyone in the role, in this branch">
                      <Select value={targetForm.role} onValueChange={v => setTargetForm({ ...formFrom(ownTarget("role", undefined, v), "role", "", v), repeat: targetForm.repeat })}>
                        <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                        <SelectContent>{allRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                  )}
                </div>
                <label className={s.row} style={{ gap: "0.5rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={targetForm.repeat} onChange={e => setTargetForm(f => f && ({ ...f, repeat: e.target.checked }))} />
                  <span className={s.small}>Repeat every month after {periodLabel(targetForm.period)} until another target replaces it</span>
                </label>
                <hr className={s.divider} />
                <div className={s.stack} style={{ gap: "0.375rem" }}>
                  {METRICS.map(m => (
                    <div key={m.code} className={s.section} data-tone={m.code === "REVENUE_TOTAL" ? "teal" : "blue"} style={{ padding: "0.625rem 0.75rem" }}>
                      <div className={s.spread} style={{ marginBottom: "0.375rem" }}>
                        <span className={cx(s.small, s.strong)}>{m.label}</span>
                        <span className={s.cellSub}>{m.hint}</span>
                      </div>
                      <div className={s.grid2}>
                        {m.hasCount && (
                          <Field label={`Number of ${m.unit}s`}>
                            <Input type="number" min={0} className="h-9" placeholder="No goal" value={targetForm.goals[goalKey(m.code, "count")] ?? ""}
                              onChange={e => setTargetForm(f => f && ({ ...f, goals: { ...f.goals, [goalKey(m.code, "count")]: e.target.value } }))} />
                          </Field>
                        )}
                        {m.hasAmount && (
                          <Field label="Amount">
                            <Input type="number" min={0} className="h-9" placeholder="No goal" value={targetForm.goals[goalKey(m.code, "amount")] ?? ""}
                              onChange={e => setTargetForm(f => f && ({ ...f, goals: { ...f.goals, [goalKey(m.code, "amount")]: e.target.value } }))} />
                          </Field>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {ownTarget(targetForm.scope, targetForm.staffId, targetForm.role) && <Note tone="blue">A target already exists for this month — saving replaces it.</Note>}
              </div>
              <div className={s.dialogFooter}>
                <Button variant="outline" onClick={() => setTargetForm(null)}>Cancel</Button>
                <Button disabled={saving} onClick={saveTarget}><Save className="h-4 w-4 mr-1" />{saving ? "Saving…" : "Save target"}</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ══ Plan form ═════════════════════════════════════════════════════ */}
      <Dialog open={!!planForm} onOpenChange={v => !v && setPlanForm(null)}>
        <DialogContent className={cx(s.dialogLg, s.dialogScroll)}>
          {planForm && (
            <>
              <DialogHeader>
                <DialogTitle>{!planForm.id ? "New incentive plan" : planForm.settledMonths > 0 ? `New version of ${planForm.name}` : `Edit ${planForm.name}`}</DialogTitle>
                <DialogDescription>
                  {planForm.settledMonths > 0
                    ? "Months were already approved under this plan, so changes start a new version from the month you choose. Earlier months keep their rates."
                    : "Rates apply to months that aren't approved yet."}
                </DialogDescription>
              </DialogHeader>
              <div className={s.dialogBody}>
                <div className={s.grid2}>
                  <Field label="Name" required><Input value={planForm.name} onChange={e => setPlanForm(f => f && ({ ...f, name: e.target.value }))} placeholder="e.g. Front desk 2026" /></Field>
                  <Field label={planForm.settledMonths > 0 ? "New version starts" : "Effective from"} required>
                    <Select value={planForm.effectiveFrom} onValueChange={v => setPlanForm(f => f && ({ ...f, effectiveFrom: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {!anchorOptions.some(o => o.value === planForm.effectiveFrom) && <SelectItem value={planForm.effectiveFrom}>{planForm.effectiveFrom.startsWith("2000") ? "From the start" : periodLabel(planForm.effectiveFrom)}</SelectItem>}
                        {anchorOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Branches">
                    <Select value={planForm.branchScope} onValueChange={v => setPlanForm(f => f && ({ ...f, branchScope: v as "all" | "this" }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="all">All branches</SelectItem>{activeBranchId && <SelectItem value="this">This branch only</SelectItem>}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Status">
                    <Select value={planForm.status} onValueChange={v => setPlanForm(f => f && ({ ...f, status: v as IncentivePlan["status"] }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="draft">Draft (not applied)</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
                    </Select>
                  </Field>
                </div>

                {!planForm.id && (
                  <div className={s.row} style={{ gap: "0.375rem" }}>
                    <span className={s.cellSub}>Start from a template:</span>
                    <Button variant="outline" size="sm" onClick={() => setPlanForm(f => f && ({
                      ...f, name: f.name || "Front desk",
                      lines: [
                        { metric: "MEMBER_ADMISSION", basis: "percent_of_amount", rate: 5 },
                        { metric: "POS_SALE", basis: "percent_of_amount", rate: 2 },
                        { metric: "LEAD_CONVERSION", basis: "fixed_per_unit", rate: 100 },
                      ],
                      bonuses: [{ metric: "REVENUE_TOTAL", threshold_pct: 100, reward_type: "fixed", reward_value: 2000 }],
                    }))}>Front desk / sales</Button>
                    <Button variant="outline" size="sm" onClick={() => setPlanForm(f => f && ({
                      ...f, name: f.name || "Trainer",
                      lines: [
                        { metric: "PT_SESSION_DELIVERED", basis: "fixed_per_unit", rate: 150 },
                        { metric: "CLASS_TAUGHT", basis: "fixed_per_unit", rate: 300 },
                        { metric: "MEMBER_ADMISSION", basis: "percent_of_amount", rate: 5 },
                      ],
                      bonuses: [{ metric: "PT_SESSION_DELIVERED", threshold_pct: 100, reward_type: "fixed", reward_value: 1500 }],
                    }))}>Trainer</Button>
                  </div>
                )}

                <span className={s.sectionLabel}>Applies to</span>
                <div className={s.chips} style={{ gap: "0.375rem" }}>
                  {allRoles.map(r => {
                    const on = planForm.roles.includes(r);
                    return (
                      <button key={r} type="button" className={s.badge} data-tone={on ? "teal" : "gray"}
                        onClick={() => setPlanForm(f => f && ({ ...f, roles: on ? f.roles.filter(x => x !== r) : [...f.roles, r] }))}>
                        {on ? <CheckCircle size={11} /> : <Plus size={11} />}{r}
                      </button>
                    );
                  })}
                </div>
                <Field label="Specific people (override their role's plan)">
                  <Select value="" onValueChange={v => setPlanForm(f => f && (f.staffIds.includes(v) ? f : { ...f, staffIds: [...f.staffIds, v] }))}>
                    <SelectTrigger><SelectValue placeholder="Add a person" /></SelectTrigger>
                    <SelectContent>{rows.filter(r => !planForm.staffIds.includes(String(r.staff_id))).map(r => <SelectItem key={r.staff_id} value={String(r.staff_id)}>{r.name}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                {planForm.staffIds.length > 0 && (
                  <div className={s.chips} style={{ gap: "0.375rem" }}>
                    {planForm.staffIds.map(id => (
                      <button key={id} type="button" className={s.badge} data-tone="violet" onClick={() => setPlanForm(f => f && ({ ...f, staffIds: f.staffIds.filter(x => x !== id) }))}>
                        <XCircle size={11} />{staffName(Number(id))}
                      </button>
                    ))}
                  </div>
                )}

                <hr className={s.divider} />
                <div className={s.spread}>
                  <span className={s.sectionLabel}>Commission lines</span>
                  <Button variant="outline" size="sm" onClick={() => setPlanForm(f => f && ({ ...f, lines: [...f.lines, { metric: "MEMBER_ADMISSION", basis: "percent_of_amount", rate: 5 }] }))}><Plus className="h-4 w-4 mr-1" />Line</Button>
                </div>
                {planForm.lines.map((l, i) => {
                  const def = METRICS.find(m => m.code === l.metric);
                  const update = (patch: Partial<PlanLine>) => setPlanForm(f => f && ({ ...f, lines: f.lines.map((x, j) => j === i ? { ...x, ...patch } : x) }));
                  return (
                    <div key={i} className={s.section} data-tone="teal" style={{ padding: "0.625rem 0.75rem" }}>
                      <div className={s.grid4}>
                        <Field label="Metric">
                          <Select value={l.metric} onValueChange={v => {
                            const m = METRICS.find(x => x.code === v);
                            update({ metric: v as MetricCode, basis: m?.hasAmount ? l.basis : "fixed_per_unit" });
                          }}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>{METRICS.filter(m => m.code !== "REVENUE_TOTAL").map(m => <SelectItem key={m.code} value={m.code}>{m.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </Field>
                        <Field label="Pays">
                          <Select value={l.basis} onValueChange={v => update({ basis: v as PlanLine["basis"] })}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {def?.hasAmount && <SelectItem value="percent_of_amount">% of amount</SelectItem>}
                              <SelectItem value="fixed_per_unit">Fixed per {def?.unit ?? "unit"}</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label={l.basis === "percent_of_amount" ? "Rate (%)" : "Amount"}>
                          <Input type="number" min={0} step="0.1" className="h-9" value={l.rate} onChange={e => update({ rate: e.target.value as unknown as number })} />
                        </Field>
                        <Field label=" ">
                          <Button variant="ghost" size="sm" className="h-9" onClick={() => setPlanForm(f => f && ({ ...f, lines: f.lines.filter((_, j) => j !== i) }))}><Trash2 className="h-4 w-4" /></Button>
                        </Field>
                        <Field label="Minimum units" hint="Pays nothing until reached">
                          <Input type="number" min={0} className="h-9" placeholder="None" value={l.min_units ?? ""} onChange={e => update({ min_units: e.target.value ? Number(e.target.value) : null })} />
                        </Field>
                        <Field label="Monthly cap">
                          <Input type="number" min={0} className="h-9" placeholder="None" value={l.cap_amount ?? ""} onChange={e => update({ cap_amount: e.target.value ? Number(e.target.value) : null })} />
                        </Field>
                      </div>
                    </div>
                  );
                })}
                {planForm.lines.length === 0 && <div className={s.cellSub}>No commission lines.</div>}

                <hr className={s.divider} />
                <div className={s.spread}>
                  <span className={s.sectionLabel}>Target bonuses</span>
                  <Button variant="outline" size="sm" onClick={() => setPlanForm(f => f && ({ ...f, bonuses: [...f.bonuses, { metric: "REVENUE_TOTAL", threshold_pct: 100, reward_type: "fixed", reward_value: 1000 }] }))}><Plus className="h-4 w-4 mr-1" />Bonus</Button>
                </div>
                <div className={s.cellSub}>Paid when the person reaches the % of their goal on the metric. Tiers on the same metric don't stack — the highest reached pays.</div>
                {planForm.bonuses.map((b, i) => {
                  const def = METRICS.find(m => m.code === b.metric);
                  const update = (patch: Partial<PlanBonus>) => setPlanForm(f => f && ({ ...f, bonuses: f.bonuses.map((x, j) => j === i ? { ...x, ...patch } : x) }));
                  return (
                    <div key={i} className={s.section} data-tone="violet" style={{ padding: "0.625rem 0.75rem" }}>
                      <div className={s.grid4}>
                        <Field label="Target on">
                          <Select value={b.metric} onValueChange={v => {
                            const m = METRICS.find(x => x.code === v);
                            update({ metric: v as MetricCode, reward_type: m?.hasAmount ? b.reward_type : "fixed" });
                          }}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>{METRICS.map(m => <SelectItem key={m.code} value={m.code}>{m.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </Field>
                        <Field label="At (% of goal)">
                          <Input type="number" min={1} className="h-9" value={b.threshold_pct} onChange={e => update({ threshold_pct: e.target.value as unknown as number })} />
                        </Field>
                        <Field label="Reward">
                          <Select value={b.reward_type} onValueChange={v => update({ reward_type: v as PlanBonus["reward_type"] })}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Fixed amount</SelectItem>
                              {def?.hasAmount && <SelectItem value="percent_of_metric_amount">% of its amount</SelectItem>}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label={b.reward_type === "fixed" ? "Amount" : "Rate (%)"}>
                          <Input type="number" min={0} step="0.1" className="h-9" value={b.reward_value} onChange={e => update({ reward_value: e.target.value as unknown as number })} />
                        </Field>
                        <Field label="Only if (optional)">
                          <Select value={b.condition_metric ?? "none"} onValueChange={v => update({ condition_metric: v === "none" ? null : v as MetricCode })}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No condition</SelectItem>
                              {METRICS.filter(m => m.hasCount).map(m => <SelectItem key={m.code} value={m.code}>{m.label} at least</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </Field>
                        {b.condition_metric && (
                          <Field label="Minimum">
                            <Input type="number" min={0} className="h-9" value={b.condition_min ?? ""} onChange={e => update({ condition_min: e.target.value ? Number(e.target.value) : null })} />
                          </Field>
                        )}
                        <Field label=" ">
                          <Button variant="ghost" size="sm" className="h-9" onClick={() => setPlanForm(f => f && ({ ...f, bonuses: f.bonuses.filter((_, j) => j !== i) }))}><Trash2 className="h-4 w-4" /></Button>
                        </Field>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className={s.dialogFooter}>
                <Button variant="outline" onClick={() => setPlanForm(null)}>Cancel</Button>
                <Button disabled={saving} onClick={savePlan}>
                  {planForm.id && planForm.settledMonths > 0 ? <GitBranch className="h-4 w-4 mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                  {planForm.id && planForm.settledMonths > 0 ? `Save version from ${periodLabel(planForm.effectiveFrom)}` : "Save plan"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
