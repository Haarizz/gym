import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  Target, Plus, ArrowLeft, Save, Users, Building2, Percent, DollarSign, CheckCircle, Clock, BarChart3, Eye, Copy, Award,
  Dumbbell, ShoppingBag, CreditCard, Banknote, Star, XCircle, Pencil, Activity, Download, RotateCcw, Undo2, Gauge, Info,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { hasPermission } from "../utils/permissions";
import { useBranch } from "../utils/branch-context";
import { exportAsCsv } from "../utils/export-utils";
import { staffService, StaffTarget, CommissionRule } from "../utils/supabase/staff-service";
import { rolesService } from "../utils/supabase/roles-service";
import {
  commissionEarningsService, CommissionOverview, CommissionStaffRow, CommissionMonth, CommissionCategory, CommissionStatus, CommissionCategoryFigures,
} from "../utils/supabase/workforce-service";
import { TARGET_UNIT_TYPES, unitLabel } from "../utils/target-units";
import {
  PageHeader, Kpi, Badge, Note, Panel, TabBar, Person, Avatar, Empty, Field, Stat, ProgressBar, Money, Line, Tone, cx, wf as s,
  periodLabel, errorMessage, useMoneyText, MONTHS,
} from "../components/workforce/ui";

interface SetTargetsProps { onNavigate: (section: string, params?: Record<string, any>) => void; }

type TabId = "overview" | "institution" | "individual" | "rules" | "earnings";
type PeriodType = "monthly" | "quarterly" | "yearly";
type SegKey = "memberships" | "pos" | "pt";

const SEGS: Array<{ key: SegKey; label: string; short: string; tone: Tone; icon: typeof CreditCard; units: string[]; hint: string }> = [
  { key: "memberships", label: "Memberships", short: "Members", tone: "teal", icon: CreditCard, units: ["admissions", "renewals", "addons", "walkins"], hint: "Admissions, renewals, add-ons and walk-ins they collected" },
  { key: "pos", label: "POS Sales", short: "POS", tone: "blue", icon: ShoppingBag, units: ["pos_sales", "pos_items"], hint: "Completed POS bills they rang up (net of refunds)" },
  { key: "pt", label: "PT Sessions", short: "PT", tone: "violet", icon: Dumbbell, units: ["pt_sessions"], hint: "Personal training sessions delivered" },
];
const EARN_TONE: Record<CommissionStatus, Tone> = { estimated: "blue", pending: "amber", approved: "green", paid: "teal", rejected: "red" };
const EARN_LABEL: Record<CommissionStatus, string> = { estimated: "Estimated", pending: "Pending", approved: "Approved", paid: "Paid", rejected: "Rejected" };
const CAT_LABEL: Record<CommissionCategory, string> = { memberships: "Memberships", pos: "POS Sales" };

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const achTone = (p: number): Tone => (p >= 100 ? "green" : p >= 80 ? "amber" : "red");
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

interface TargetForm { id?: string; scope: "individual" | "institution"; staffId: string; period: string; revenue: string; units: Record<string, string>; }

export function SetTargets({ onNavigate }: SetTargetsProps) {
  const location = useLocation();
  const navTab = ((location.state || {}) as { tab?: TabId }).tab;
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
  const [empF, setEmpF] = useState("all");
  const [catF, setCatF] = useState("all");
  const [statusF, setStatusF] = useState("all");

  const [data, setData] = useState<CommissionOverview | null>(null);
  const [instTargets, setInstTargets] = useState<StaffTarget[]>([]);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [roleNames, setRoleNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [empDetail, setEmpDetail] = useState<CommissionStaffRow | null>(null);
  const [earn, setEarn] = useState<{ row: CommissionStaffRow; month: CommissionMonth; cat: CommissionCategoryFigures } | null>(null);
  const [earnNote, setEarnNote] = useState("");
  const [targetForm, setTargetForm] = useState<TargetForm | null>(null);
  const [ruleForm, setRuleForm] = useState<{ id?: string; role: string; admission: string; base: string; pos: string; perSale: string; bonuses: string } | null>(null);
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
      const overview = await commissionEarningsService.overview(range.from, range.to);
      setData(overview);
      const inst = await Promise.all(overview.periods.map(p => {
        const [y, m] = p.split("-").map(Number);
        return staffService.getTargets(y, m, "institution").catch(() => [] as StaffTarget[]);
      }));
      setInstTargets(inst.flat().filter(t => !t.staff_db_id));
    } catch (e) {
      toast.error(errorMessage(e, "Failed to load targets"));
    } finally {
      setLoading(false);
    }
  }, [range]);

  const loadRules = useCallback(async () => {
    try {
      setRules(await staffService.getCommissionRules());
      const roles = await rolesService.getRoles("", 1, 200).then(r => r.data.map(x => x.role_name)).catch(() => [] as string[]);
      setRoleNames(roles.filter(r => !["GYMBIOS_ADMIN", "MEMBER", "DEVICE", "USER", "SUPER_ADMIN"].includes(r.toUpperCase())));
    } catch (e) { toast.error(errorMessage(e, "Failed to load commission rules")); }
  }, []);

  useEffect(() => { load(); }, [load, activeBranchId]);
  useEffect(() => { loadRules(); }, [loadRules, activeBranchId]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const rows = data?.rows ?? [];
  const roles = useMemo(() => Array.from(new Set(rows.map(r => r.role).filter(Boolean) as string[])).sort(), [rows]);
  const depts = useMemo(() => Array.from(new Set(rows.map(r => r.department).filter(Boolean) as string[])).sort(), [rows]);
  const visible = useMemo(() => rows.filter(r =>
    (roleF === "all" || r.role === roleF) && (deptF === "all" || r.department === deptF) && (empF === "all" || String(r.staff_id) === empF)), [rows, roleF, deptF, empF]);

  const unitTarget = (m: CommissionMonth, type: string) =>
    m.unit_targets.filter(u => u.service === type).reduce((t, u) => t + Number(u.target_units || 0), 0);
  const segUnits = (m: CommissionMonth, seg: SegKey) => {
    const main = seg === "pos" ? ["pos_sales"] : SEGS.find(x => x.key === seg)!.units;
    return {
      done: main.reduce((t, u) => t + Number(m.units[u] || 0), 0),
      target: main.reduce((t, u) => t + unitTarget(m, u), 0),
    };
  };
  const segRevenue = (m: CommissionMonth, seg: SegKey) => seg === "pt" ? 0 : Number(m.categories.find(c => c.category === seg)?.revenue || 0);
  const segCommission = (m: CommissionMonth, seg: SegKey) => seg === "pt" ? 0 : Number(m.categories.find(c => c.category === seg)?.commission || 0);

  const perStaff = useMemo(() => visible.map(r => {
    let revT = 0, revA = 0, uT = 0, uA = 0, comm = 0, approved = 0, pending = 0;
    r.months.forEach(m => {
      revT += Number(m.revenue_target || 0);
      revA += Number(m.revenue || 0);
      m.unit_targets.forEach(u => { uT += Number(u.target_units || 0); uA += Number(m.units[u.service] || 0); });
      m.categories.forEach(c => {
        comm += Number(c.commission || 0);
        if (c.status === "approved" || c.status === "paid") approved += Number(c.commission || 0);
        if (c.status === "pending") pending += Number(c.commission || 0);
      });
    });
    return { row: r, revT, revA, uT, uA, comm, approved, pending, ach: pct(revA, revT) };
  }), [visible]);

  const totals = useMemo(() => perStaff.reduce((t, x) => ({
    revT: t.revT + x.revT, revA: t.revA + x.revA, uT: t.uT + x.uT, uA: t.uA + x.uA, comm: t.comm + x.comm, approved: t.approved + x.approved, pending: t.pending + x.pending,
  }), { revT: 0, revA: 0, uT: 0, uA: 0, comm: 0, approved: 0, pending: 0 }), [perStaff]);

  const earnings = useMemo(() => {
    const out: Array<{ row: CommissionStaffRow; month: CommissionMonth; cat: CommissionCategoryFigures }> = [];
    visible.forEach(row => row.months.forEach(month => month.categories.forEach(cat => {
      if (catF !== "all" && cat.category !== catF) return;
      if (statusF !== "all" && cat.status !== statusF) return;
      if (!cat.revenue && !cat.commission && !cat.units && cat.status !== "approved" && cat.status !== "paid") return;
      out.push({ row, month, cat });
    })));
    return out.sort((a, b) => b.month.period.localeCompare(a.month.period) || a.row.name.localeCompare(b.row.name));
  }, [visible, catF, statusF]);

  const earnTotals = useMemo(() => {
    const t: Record<CommissionStatus, number> = { estimated: 0, pending: 0, approved: 0, paid: 0, rejected: 0 };
    visible.forEach(row => row.months.forEach(m => m.categories.forEach(c => { t[c.status] += Number(c.commission || 0); })));
    return t;
  }, [visible]);

  const pendingPeriods = useMemo(() => {
    const set = new Set<string>();
    visible.forEach(row => row.months.forEach(m => m.categories.forEach(c => { if (c.status === "pending" && Number(c.commission) > 0) set.add(m.period); })));
    return Array.from(set).sort();
  }, [visible]);

  // Institution: targets per unit type & revenue across the period, achieved = whole gym
  const inst = useMemo(() => {
    const revT = instTargets.reduce((t, x) => t + Number(x.revenue_target || 0), 0);
    const revA = instTargets.reduce((t, x) => t + Number(x.revenue_achieved || 0), 0);
    const byUnit = new Map<string, { target: number; done: number }>();
    instTargets.forEach(t => {
      let list: Array<{ service: string; target_units: number }> = [];
      try { list = JSON.parse(t.unit_targets_json || "[]"); } catch { /* ignore */ }
      list.forEach(u => {
        const cur = byUnit.get(u.service) ?? { target: 0, done: 0 };
        cur.target += Number(u.target_units || 0);
        byUnit.set(u.service, cur);
      });
      Object.entries(t.units_achieved ?? {}).forEach(([k, v]) => {
        const cur = byUnit.get(k) ?? { target: 0, done: 0 };
        cur.done += Number(v || 0);
        byUnit.set(k, cur);
      });
    });
    const allocated = rows.reduce((t, r) => t + r.months.reduce((a, m) => a + (m.target_id ? Number(m.revenue_target || 0) : 0), 0), 0);
    return { revT, revA, byUnit, allocated };
  }, [instTargets, rows]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const decide = async (action: "approve" | "reject" | "pay" | "reset", row: CommissionStaffRow, period: string, category: CommissionCategory, note?: string) => {
    setSaving(true);
    try {
      await commissionEarningsService.decide(action, { staff_id: row.staff_id, period, category, note });
      toast.success({ approve: "Commission approved", reject: "Commission rejected", pay: "Marked as paid", reset: "Decision undone" }[action]);
      setEarn(null);
      setEarnNote("");
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Failed to update commission"));
    } finally {
      setSaving(false);
    }
  };

  const approveAll = async (period: string) => {
    try {
      const r = await commissionEarningsService.approveAll(period);
      toast.success(`Approved ${r.approved} commission${r.approved === 1 ? "" : "s"} for ${periodLabel(period)}`);
      load();
    } catch (e) { toast.error(errorMessage(e, "Failed to approve commission")); }
  };

  const openTarget = (scope: "individual" | "institution", row?: CommissionStaffRow, month?: CommissionMonth) => {
    const period = month?.period ?? (periodType === "monthly" ? anchor : ym(now));
    const existing = scope === "institution" ? instTargets.find(t => `${t.year}-${String(t.month).padStart(2, "0")}` === period) : undefined;
    const units: Record<string, string> = {};
    TARGET_UNIT_TYPES.forEach(u => {
      const v = month ? unitTarget(month, u.id) : existing ? (() => {
        try { return (JSON.parse(existing.unit_targets_json || "[]") as any[]).filter(x => x.service === u.id).reduce((t, x) => t + Number(x.target_units || 0), 0); } catch { return 0; }
      })() : 0;
      units[u.id] = v ? String(v) : "";
    });
    setTargetForm({
      id: scope === "institution" ? existing?.id : month?.target_id ? String(month.target_id) : undefined,
      scope, staffId: row ? String(row.staff_id) : "",
      period,
      revenue: scope === "institution" ? (existing ? String(existing.revenue_target) : "") : month?.target_id ? String(month.revenue_target) : "",
      units,
    });
  };

  const copyPrevious = async () => {
    if (!targetForm) return;
    const [y, m] = targetForm.period.split("-").map(Number);
    const prev = new Date(y, m - 2, 1);
    try {
      const list = await staffService.getTargets(prev.getFullYear(), prev.getMonth() + 1, targetForm.scope,
        targetForm.scope === "individual" && targetForm.staffId ? Number(targetForm.staffId) : undefined);
      const t = targetForm.scope === "institution" ? list.find(x => !x.staff_db_id) : list[0];
      if (!t) { toast.info(`No target set for ${MONTHS[prev.getMonth()]} ${prev.getFullYear()}`); return; }
      const units: Record<string, string> = {};
      let parsed: any[] = [];
      try { parsed = JSON.parse(t.unit_targets_json || "[]"); } catch { /* ignore */ }
      TARGET_UNIT_TYPES.forEach(u => {
        const v = parsed.filter(x => x.service === u.id).reduce((a, x) => a + Number(x.target_units || 0), 0);
        units[u.id] = v ? String(v) : "";
      });
      setTargetForm(f => f && ({ ...f, revenue: String(t.revenue_target || ""), units }));
      toast.success(`Copied from ${MONTHS[prev.getMonth()]} ${prev.getFullYear()}`);
    } catch (e) { toast.error(errorMessage(e, "Failed to copy previous target")); }
  };

  const saveTarget = async () => {
    if (!targetForm) return;
    if (targetForm.scope === "individual" && !targetForm.staffId) { toast.error("Pick a staff member"); return; }
    const revenue = Number(targetForm.revenue) || 0;
    const unitList = Object.entries(targetForm.units).filter(([, v]) => Number(v) > 0).map(([service, v]) => ({ service, target_units: Number(v), achieved_units: 0 }));
    if (revenue <= 0 && unitList.length === 0) { toast.error("Set a revenue target or at least one unit target"); return; }
    const [y, m] = targetForm.period.split("-").map(Number);
    setSaving(true);
    try {
      const payload: any = {
        scope: targetForm.scope, timeframe: "monthly", year: y, month: m, revenue_target: revenue,
        unit_targets_json: JSON.stringify(unitList),
        ...(targetForm.scope === "individual" ? { staff_db_id: Number(targetForm.staffId) } : {}),
      };
      if (targetForm.id) await staffService.updateTarget(targetForm.id, payload);
      else await staffService.createTarget(payload);
      toast.success(`Target saved for ${MONTHS[m - 1]} ${y}`);
      setTargetForm(null);
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Failed to save target"));
    } finally {
      setSaving(false);
    }
  };

  const openRule = (r?: CommissionRule) => setRuleForm(r ? {
    id: r.id, role: r.role, admission: String(r.admission_commission ?? r.base_commission), base: String(r.base_commission),
    pos: String(r.pos_commission ?? 0), perSale: String(r.pos_commission_per_sale ?? 0), bonuses: r.target_bonuses_json || "[]",
  } : { role: "", admission: "5", base: "5", pos: "0", perSale: "0", bonuses: "[]" });

  const saveRule = async () => {
    if (!ruleForm) return;
    if (!ruleForm.role.trim()) { toast.error("Pick a role"); return; }
    setSaving(true);
    try {
      const body = {
        role: ruleForm.role.trim(), base_commission: Number(ruleForm.base) || 0, admission_commission: Number(ruleForm.admission) || 0,
        pos_commission: Number(ruleForm.pos) || 0, pos_commission_per_sale: Number(ruleForm.perSale) || 0, target_bonuses_json: ruleForm.bonuses || "[]",
      };
      if (ruleForm.id) await staffService.updateCommissionRule(ruleForm.id, body);
      else await staffService.createCommissionRule(body);
      toast.success("Commission rule saved");
      setRuleForm(null);
      loadRules();
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Failed to save commission rule"));
    } finally {
      setSaving(false);
    }
  };

  const exportPerformance = () => exportAsCsv(`staff-performance-${range.from}${range.to !== range.from ? `_${range.to}` : ""}.csv`,
    ["Employee", "Role", "Department", "Revenue Target", "Actual Revenue", "Achievement %", "Units Target", "Units Achieved", "Commission", "Approved Commission"],
    perStaff.map(x => [x.row.name, x.row.role, x.row.department, x.revT, x.revA, x.ach, x.uT, x.uA, x.comm, x.approved]));

  const anchorOptions = useMemo(() => Array.from({ length: 18 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { value: ym(d), label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const ruleText = (r: CommissionStaffRow["rule"]) => {
    const parts = [`Admissions ${r.admission_commission}%`, `Renewals/add-ons ${r.base_commission}%`];
    if (Number(r.pos_commission) > 0 || Number(r.pos_commission_per_sale) > 0) {
      parts.push(`POS ${Number(r.pos_commission) || 0}%${Number(r.pos_commission_per_sale) > 0 ? ` + ${money(r.pos_commission_per_sale)}/sale` : ""}`);
    }
    return parts.join(" · ") + (r.configured ? "" : " (default)");
  };

  const statusBadge = (ach: number, hasTarget: boolean) =>
    !hasTarget ? <Badge plain>No target</Badge> : <Badge tone={achTone(ach)}>{ach >= 100 ? "On track" : ach >= 80 ? "Near" : "Below"}</Badge>;

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className={s.page}>
      <PageHeader
        crumbs={[{ label: "Payroll & Employees", to: "payroll-employees" }, { label: "Staffs & Trainers", to: "staffs-trainers" }, { label: "Target & Commission" }]}
        onCrumb={to => onNavigate(to)}
        icon={Target}
        title="Target & Commission Management"
        subtitle="Set targets · Commission rates · Track performance · Approve payouts"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => onNavigate("staffs-trainers")}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate("targets-overview")}><Gauge className="h-4 w-4 mr-1" />Targets Overview</Button>
            {canEdit && <Button size="sm" onClick={() => openTarget("individual")}><Plus className="h-4 w-4 mr-1" />Set Target</Button>}
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
          { id: "institution", label: "Institution", icon: Building2 },
          { id: "individual", label: "Individual", icon: Users },
          { id: "rules", label: "Commission Rules", icon: Percent },
          { id: "earnings", label: "Earnings", icon: Banknote, count: pendingPeriods.length ? earnings.filter(e => e.cat.status === "pending").length : 0, countTone: "amber" },
        ]}
      />

      {loading && !data && <Panel><Empty icon={Activity} title="Calculating performance…" /></Panel>}

      {/* ── Overview ──────────────────────────────────────────────────────── */}
      {tab === "overview" && data && (
        <>
          <div className={s.kpis4}>
            <Kpi icon={Target} label="Revenue target" value={<Money value={totals.revT} />} sub={periodText} tone="teal" />
            <Kpi icon={DollarSign} label="Actual revenue" value={<Money value={totals.revA} />} sub={totals.revT ? `${pct(totals.revA, totals.revT)}% of target` : "No targets set"} tone={totals.revA >= totals.revT && totals.revT ? "green" : "amber"} />
            <Kpi icon={Award} label="Achievement" value={totals.revT ? `${pct(totals.revA, totals.revT)}%` : "—"} sub={totals.revT ? (totals.revA >= totals.revT ? "Target reached" : `${money(totals.revT - totals.revA)} to go`) : undefined} tone={totals.revT ? achTone(pct(totals.revA, totals.revT)) : "gray"} />
            <Kpi icon={Activity} label="Units target" value={totals.uT ? totals.uT.toLocaleString() : "—"} sub="all unit types" tone="teal" />
            <Kpi icon={CheckCircle} label="Units achieved" value={totals.uA.toLocaleString()} sub={totals.uT ? `${pct(totals.uA, totals.uT)}% of unit targets` : "no unit targets set"} tone="blue" />
            <Kpi icon={Percent} label="Commission earned" value={<Money value={totals.comm} />} sub="current role rates" tone="violet" onClick={() => setTab("earnings")} />
            <Kpi icon={CheckCircle} label="Approved commission" value={<Money value={totals.approved} />} sub="ready for payout" tone="green" onClick={() => { setStatusF("approved"); setTab("earnings"); }} />
            <Kpi icon={Clock} label="Pending approval" value={<Money value={totals.pending} />} sub="under review" tone={totals.pending ? "amber" : "gray"} onClick={() => { setStatusF("pending"); setTab("earnings"); }} />
          </div>

          <Panel title="Staff performance" description={`${periodText} · click a row for the category breakdown`}
            actions={<Button variant="outline" size="sm" onClick={exportPerformance}><Download className="h-4 w-4 mr-1" />Export</Button>} flush>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Employee</th><th>Role</th><th className={s.right}>Revenue target</th><th className={s.right}>Actual revenue</th>
                    <th className={s.right}>Units</th><th>Achievement</th><th className={s.right}>Commission</th><th className={s.center}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {perStaff.map(x => (
                    <tr key={x.row.staff_id} className={s.clickable} onClick={() => setEmpDetail(x.row)}>
                      <td><Person name={x.row.name} sub={x.row.department ?? x.row.staff_code} photo={x.row.photo_url} /></td>
                      <td><Badge plain>{x.row.role || "—"}</Badge></td>
                      <td className={s.right}><Money value={x.revT} dash /></td>
                      <td className={cx(s.right, s.strong)}><Money value={x.revA} /></td>
                      <td className={cx(s.right, s.num)}>{x.uA}{x.uT ? <span className={s.muted}> / {x.uT}</span> : null}</td>
                      <td style={{ minWidth: "9rem" }}>
                        {x.revT ? (
                          <div className={s.barRow}>
                            <ProgressBar value={x.ach} tone={achTone(x.ach)} />
                            <span data-tone={achTone(x.ach)} className={cx(s.toneText, s.strong, s.small)}>{x.ach}%</span>
                            {x.ach >= 100 && <Star size={13} color="#f59e0b" fill="#f59e0b" />}
                          </div>
                        ) : <span className={s.muted}>—</span>}
                      </td>
                      <td className={s.right}><span className={s.strong} style={{ color: "var(--primary)" }}><Money value={x.comm} /></span></td>
                      <td className={s.center}>{statusBadge(x.ach, x.revT > 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {perStaff.length === 0 && <Empty icon={Users} title="No staff match these filters" />}
            </div>
          </Panel>

          <Panel title="Institution — category performance" description="Whole-gym units and takings this period">
            <div className={s.grid3}>
              {SEGS.map(seg => {
                const done = rows.reduce((t, r) => t + r.months.reduce((a, m) => a + segUnits(m, seg.key).done, 0), 0);
                const target = rows.reduce((t, r) => t + r.months.reduce((a, m) => a + segUnits(m, seg.key).target, 0), 0);
                const rev = rows.reduce((t, r) => t + r.months.reduce((a, m) => a + segRevenue(m, seg.key), 0), 0);
                const p = pct(done, target);
                return (
                  <div key={seg.key} className={s.section} data-tone={seg.tone}>
                    <div className={s.spread} style={{ marginBottom: "0.5rem" }}>
                      <span className={s.row} style={{ gap: "0.4rem" }}><span data-tone={seg.tone} className={s.toneText}><seg.icon size={16} /></span><span className={s.strong}>{seg.label}</span></span>
                      {target ? <span data-tone={achTone(p)} className={cx(s.toneText, s.strong)}>{p}%</span> : <Badge plain>No target</Badge>}
                    </div>
                    <ProgressBar value={target ? p : 0} tone={seg.tone} />
                    <div className={s.spread} style={{ marginTop: "0.5rem" }}>
                      <span className={cx(s.small, s.muted)}>Units <strong style={{ color: "var(--foreground)" }}>{done}{target ? ` / ${target}` : ""}</strong></span>
                      {seg.key !== "pt" && <span className={s.small}><Money value={rev} /></span>}
                    </div>
                    <div className={s.cellSub} style={{ marginTop: 4 }}>{seg.hint}</div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </>
      )}

      {/* ── Institution ───────────────────────────────────────────────────── */}
      {tab === "institution" && data && (
        <>
          <div className={s.spread}>
            <div>
              <div className={s.panelTitle}>Institution-wide targets</div>
              <div className={s.panelDesc}>Targets for the whole facility; achieved figures count every sale, by anyone, in the branch.</div>
            </div>
            {canEdit && <Button size="sm" onClick={() => openTarget("institution")}><Plus className="h-4 w-4 mr-1" />Set institution target</Button>}
          </div>
          <div className={s.grid3}>
            <div className={s.kpi} data-tone="teal"><div className={s.kpiIcon}><Building2 size={18} /></div><div className={s.kpiText}><div className={s.kpiValue}><Money value={inst.revT} /></div><div className={s.kpiLabel}>Institution revenue target · {periodText}</div></div></div>
            <div className={s.kpi} data-tone="blue"><div className={s.kpiIcon}><Users size={18} /></div><div className={s.kpiText}><div className={s.kpiValue}><Money value={inst.allocated} /></div><div className={s.kpiLabel}>Allocated to staff{inst.revT ? ` · ${pct(inst.allocated, inst.revT)}%` : ""}</div></div></div>
            <div className={s.kpi} data-tone={inst.revT - inst.allocated > 0 ? "amber" : "green"}><div className={s.kpiIcon}><Target size={18} /></div><div className={s.kpiText}><div className={s.kpiValue}><Money value={Math.max(0, inst.revT - inst.allocated)} /></div><div className={s.kpiLabel}>Unallocated</div></div></div>
          </div>
          {instTargets.length === 0 ? (
            <Panel><Empty icon={Building2} title={`No institution target for ${periodText}`}>{canEdit && "Set one to track the whole gym's revenue and units."}</Empty></Panel>
          ) : (
            <Panel flush title="Targets by unit type" description={`${periodText} · revenue ${money(inst.revA)} of ${money(inst.revT)} (${pct(inst.revA, inst.revT)}%)`}
              actions={canEdit && periodType === "monthly" && <Button variant="outline" size="sm" onClick={() => openTarget("institution")}><Pencil className="h-4 w-4 mr-1" />Edit</Button>}>
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <thead><tr><th>Unit type</th><th>Category</th><th className={s.right}>Target</th><th className={s.right}>Achieved</th><th>Achievement</th></tr></thead>
                  <tbody>
                    <tr>
                      <td className={s.strong}>Revenue</td><td><Badge plain>All sales</Badge></td>
                      <td className={s.right}><Money value={inst.revT} /></td><td className={cx(s.right, s.strong)}><Money value={inst.revA} /></td>
                      <td style={{ minWidth: "10rem" }}><div className={s.barRow}><ProgressBar value={pct(inst.revA, inst.revT)} tone={achTone(pct(inst.revA, inst.revT))} /><span className={s.small}>{pct(inst.revA, inst.revT)}%</span></div></td>
                    </tr>
                    {TARGET_UNIT_TYPES.map(u => {
                      const v = inst.byUnit.get(u.id) ?? { target: 0, done: 0 };
                      if (!v.target && !v.done) return null;
                      const p = pct(v.done, v.target);
                      return (
                        <tr key={u.id}>
                          <td className={s.strong}>{u.name}<div className={s.cellSub}>{u.hint}</div></td>
                          <td><Badge plain>{u.category}</Badge></td>
                          <td className={cx(s.right, s.num)}>{v.target || "—"}</td>
                          <td className={cx(s.right, s.num, s.strong)}>{v.done}</td>
                          <td style={{ minWidth: "10rem" }}>{v.target ? <div className={s.barRow}><ProgressBar value={p} tone={achTone(p)} /><span className={s.small}>{p}%</span></div> : <span className={s.muted}>No target</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </>
      )}

      {/* ── Individual ────────────────────────────────────────────────────── */}
      {tab === "individual" && data && (
        <>
          <div className={s.spread}>
            <div>
              <div className={s.panelTitle}>Individual targets</div>
              <div className={s.panelDesc}>Institution target → staff targets → actual achievement, per category</div>
            </div>
            {canEdit && <Button size="sm" onClick={() => openTarget("individual")}><Plus className="h-4 w-4 mr-1" />Assign target</Button>}
          </div>
          <div className={s.stack} style={{ gap: "0.75rem" }}>
            {perStaff.map(x => {
              const latest = x.row.months[x.row.months.length - 1];
              return (
                <div key={x.row.staff_id} className={s.panel}>
                  <div className={s.panelHeader}>
                    <Person name={x.row.name} sub={[x.row.role, x.row.department, x.row.branch].filter(Boolean).join(" · ")} photo={x.row.photo_url} />
                    <div className={s.actions}>
                      <div className={s.right}>
                        <div data-tone={x.revT ? achTone(x.ach) : "gray"} className={cx(s.toneText, s.strong)}>{x.revT ? `${x.ach}%` : "—"}</div>
                        <div className={s.cellSub}>{money(x.revA)}{x.revT ? ` of ${money(x.revT)}` : " · no revenue target"}</div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setEmpDetail(x.row)}><Eye className="h-4 w-4 mr-1" />Detail</Button>
                      {canEdit && periodType === "monthly" && latest && (
                        <Button variant="ghost" size="sm" onClick={() => openTarget("individual", x.row, latest)} title={latest.target_id ? "Edit target" : "Set target"}>
                          {latest.target_id ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className={s.panelBody}>
                    <div className={s.grid3}>
                      {SEGS.map(seg => {
                        const done = x.row.months.reduce((t, m) => t + segUnits(m, seg.key).done, 0);
                        const target = x.row.months.reduce((t, m) => t + segUnits(m, seg.key).target, 0);
                        const rev = x.row.months.reduce((t, m) => t + segRevenue(m, seg.key), 0);
                        const comm = x.row.months.reduce((t, m) => t + segCommission(m, seg.key), 0);
                        const p = pct(done, target);
                        return (
                          <div key={seg.key} className={s.section} data-tone={seg.tone} style={{ padding: "0.625rem 0.75rem" }}>
                            <div className={s.spread}>
                              <span className={s.row} style={{ gap: "0.35rem" }}><span data-tone={seg.tone} className={s.toneText}><seg.icon size={14} /></span><span className={cx(s.small, s.strong)}>{seg.short}</span></span>
                              {target ? <span data-tone={achTone(p)} className={cx(s.toneText, s.small, s.strong)}>{p}%</span> : null}
                            </div>
                            <div className={s.cellSub} style={{ marginTop: 4 }}>
                              {done}{target ? ` / ${target}` : ""} units{seg.key !== "pt" ? ` · ${money(rev)}` : ""}{comm ? ` · ${money(comm)} comm.` : ""}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            {perStaff.length === 0 && <Panel><Empty icon={Users} title="No staff match these filters" /></Panel>}
          </div>
        </>
      )}

      {/* ── Rules ─────────────────────────────────────────────────────────── */}
      {tab === "rules" && (
        <>
          <div className={s.spread}>
            <div>
              <div className={s.panelTitle}>Commission rules</div>
              <div className={s.panelDesc}>Rates per role. They apply to everyone with that role, on the sales credited to them.</div>
            </div>
            {canEdit && <Button size="sm" onClick={() => openRule()}><Plus className="h-4 w-4 mr-1" />Create rule</Button>}
          </div>
          <Note tone="blue" icon={Info}>
            Roles without a rule earn the default 5% on membership sales and nothing on POS. Membership commission is credited to whoever took the payment;
            POS commission to the cashier who rang the sale up.
          </Note>
          <div className={s.stack} style={{ gap: "0.75rem" }}>
            {rules.map(r => {
              const staffCount = rows.filter(x => (x.role ?? "").toLowerCase() === r.role.toLowerCase()).length;
              return (
                <div key={r.id} className={s.listCard} data-tone="teal">
                  <div className={s.listIcon}><Percent size={18} /></div>
                  <div className={s.listMain}>
                    <div className={s.row}>
                      <span className={s.strong}>{r.role}</span>
                      <Badge tone="green">Active</Badge>
                      <Badge plain>{staffCount} staff</Badge>
                    </div>
                    <div className={s.chips} style={{ gap: "0.375rem" }}>
                      <span className={s.badge} data-tone="teal"><CreditCard size={11} />Admissions {r.admission_commission ?? r.base_commission}%</span>
                      <span className={s.badge} data-tone="teal"><CreditCard size={11} />Renewals · add-ons · walk-ins {r.base_commission}%</span>
                      <span className={s.badge} data-tone="blue"><ShoppingBag size={11} />POS {Number(r.pos_commission) || 0}% of sale</span>
                      {Number(r.pos_commission_per_sale) > 0 && <span className={s.badge} data-tone="blue"><ShoppingBag size={11} />+ {money(r.pos_commission_per_sale)} per sale</span>}
                    </div>
                  </div>
                  {canEdit && <div className={s.rowActions}><button className={s.iconBtn} title="Edit rule" onClick={() => openRule(r)}><Pencil size={15} /></button></div>}
                </div>
              );
            })}
            {rules.length === 0 && <Panel><Empty icon={Percent} title="No commission rules yet">Create one per role (e.g. Trainer, Receptionist).</Empty></Panel>}
          </div>
        </>
      )}

      {/* ── Earnings ──────────────────────────────────────────────────────── */}
      {tab === "earnings" && data && (
        <>
          <div className={s.kpis}>
            {(["estimated", "pending", "approved", "paid"] as CommissionStatus[]).map(st => (
              <Kpi key={st} icon={Banknote} label={st === "estimated" ? "Estimated (month running)" : st === "pending" ? "Pending verification" : EARN_LABEL[st]}
                value={<Money value={earnTotals[st]} />} tone={EARN_TONE[st]} active={statusF === st} onClick={() => setStatusF(statusF === st ? "all" : st)} />
            ))}
          </div>
          <Panel flush>
            <div className={s.filterBar}>
              <Select value={catF} onValueChange={setCatF}>
                <SelectTrigger className={cx("h-9", s.select)}><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All categories</SelectItem><SelectItem value="memberships">Memberships</SelectItem><SelectItem value="pos">POS Sales</SelectItem></SelectContent>
              </Select>
              <Select value={statusF} onValueChange={setStatusF}>
                <SelectTrigger className={cx("h-9", s.select)}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {(Object.keys(EARN_LABEL) as CommissionStatus[]).map(k => <SelectItem key={k} value={k}>{EARN_LABEL[k]}</SelectItem>)}
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
                    <th>Employee</th><th>Month</th><th>Category</th><th className={s.right}>Units</th><th className={s.right}>Collection</th>
                    <th>Rate applied</th><th className={s.right}>Commission</th><th className={s.center}>Status</th><th className={s.right}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.map(e => (
                    <tr key={`${e.row.staff_id}-${e.month.period}-${e.cat.category}`} className={s.clickable} onClick={() => { setEarn(e); setEarnNote(""); }}>
                      <td><Person name={e.row.name} sub={e.row.role} photo={e.row.photo_url} size="sm" /></td>
                      <td>{periodLabel(e.month.period)}</td>
                      <td><span data-tone={e.cat.category === "pos" ? "blue" : "teal"} className={cx(s.toneText, s.row)} style={{ gap: 4 }}>{e.cat.category === "pos" ? <ShoppingBag size={13} /> : <CreditCard size={13} />}{CAT_LABEL[e.cat.category]}</span></td>
                      <td className={cx(s.right, s.num)}>{e.cat.units}</td>
                      <td className={s.right}><Money value={e.cat.revenue} /></td>
                      <td className={cx(s.cellSub)} style={{ whiteSpace: "normal", minWidth: "10rem" }}>
                        {e.cat.category === "pos"
                          ? `${Number(e.row.rule.pos_commission) || 0}%${Number(e.row.rule.pos_commission_per_sale) > 0 ? ` + ${money(e.row.rule.pos_commission_per_sale)}/sale` : ""}`
                          : `${e.row.rule.admission_commission}% admissions · ${e.row.rule.base_commission}% other`}
                      </td>
                      <td className={s.right}><span className={s.strong} style={{ color: "var(--primary)" }}><Money value={e.cat.commission} /></span></td>
                      <td className={s.center}><Badge tone={EARN_TONE[e.cat.status]}>{EARN_LABEL[e.cat.status]}</Badge></td>
                      <td className={s.right} onClick={ev => ev.stopPropagation()}>
                        <div className={s.rowActions}>
                          {e.cat.status === "pending" && canApprove && (
                            <>
                              <button className={s.iconBtn} data-tone="green" title="Approve" onClick={() => decide("approve", e.row, e.month.period, e.cat.category)}><CheckCircle size={15} /></button>
                              <button className={s.iconBtn} data-tone="red" title="Reject" onClick={() => { setEarn(e); setEarnNote(""); }}><XCircle size={15} /></button>
                            </>
                          )}
                          {e.cat.status === "approved" && canEdit && (
                            <button className={s.iconBtn} data-tone="teal" title="Mark as paid (outside payroll)" onClick={() => decide("pay", e.row, e.month.period, e.cat.category)}><Banknote size={15} /></button>
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
          <Note tone="teal">Approved commission is added to that month's payroll and marked paid when the employee's salary is paid. Amounts are frozen when approved.</Note>
        </>
      )}

      {/* ══ Employee detail ═══════════════════════════════════════════════ */}
      <Dialog open={!!empDetail} onOpenChange={v => !v && setEmpDetail(null)}>
        <DialogContent className={cx(s.dialogLg, s.dialogScroll)}>
          {empDetail && (() => {
            const months = empDetail.months;
            const revT = months.reduce((t, m) => t + Number(m.revenue_target || 0), 0);
            const revA = months.reduce((t, m) => t + Number(m.revenue || 0), 0);
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
                  <div className={s.cellSub} style={{ textAlign: "left" }}>{ruleText(empDetail.rule)}</div>
                </DialogHeader>
                <div className={s.dialogBody}>
                  <div className={s.stats}>
                    <Stat label="Revenue target" value={<Money value={revT} dash />} />
                    <Stat label="Actual revenue" value={<Money value={revA} />} />
                    <Stat label="Achievement" value={revT ? `${pct(revA, revT)}%` : "—"} />
                    <Stat label="Commission" value={<Money value={months.reduce((t, m) => t + m.categories.reduce((a, c) => a + Number(c.commission || 0), 0), 0)} />} />
                  </div>
                  {SEGS.map(seg => {
                    const done = months.reduce((t, m) => t + segUnits(m, seg.key).done, 0);
                    const target = months.reduce((t, m) => t + segUnits(m, seg.key).target, 0);
                    const p = pct(done, target);
                    return (
                      <div key={seg.key} className={s.section} data-tone={seg.tone}>
                        <div className={s.spread} style={{ marginBottom: "0.5rem" }}>
                          <span className={s.row} style={{ gap: "0.4rem" }}><span data-tone={seg.tone} className={s.toneText}><seg.icon size={16} /></span><span className={s.strong}>{seg.label}</span></span>
                          {target ? <Badge tone={achTone(p)}>{p >= 100 ? "On track" : p >= 80 ? "Near target" : "Below target"} · {p}%</Badge> : <Badge plain>No unit target</Badge>}
                        </div>
                        {target > 0 && <ProgressBar value={p} tone={seg.tone} />}
                        <div className={s.stats} style={{ marginTop: "0.5rem" }}>
                          {seg.units.map(u => (
                            <Stat key={u} label={unitLabel(u)} value={`${months.reduce((t, m) => t + Number(m.units[u] || 0), 0)}${months.reduce((t, m) => t + unitTarget(m, u), 0) ? ` / ${months.reduce((t, m) => t + unitTarget(m, u), 0)}` : ""}`} />
                          ))}
                          {seg.key !== "pt" && <Stat label="Collected" value={<Money value={months.reduce((t, m) => t + segRevenue(m, seg.key), 0)} />} />}
                          {seg.key !== "pt" && <Stat label="Commission" value={<Money value={months.reduce((t, m) => t + segCommission(m, seg.key), 0)} />} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className={s.dialogFooter}>
                  <Button variant="outline" onClick={() => setEmpDetail(null)}>Close</Button>
                  <Button onClick={() => { setEmpF(String(empDetail.staff_id)); setTab("earnings"); setEmpDetail(null); }}><Banknote className="h-4 w-4 mr-1" />View earnings</Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ══ Earning detail ════════════════════════════════════════════════ */}
      <Dialog open={!!earn} onOpenChange={v => !v && setEarn(null)}>
        <DialogContent className={cx(s.dialogMd, s.dialogScroll)}>
          {earn && (
            <>
              <DialogHeader>
                <DialogTitle>Commission breakdown</DialogTitle>
                <DialogDescription>{earn.row.name} · {CAT_LABEL[earn.cat.category]} · {periodLabel(earn.month.period)}</DialogDescription>
              </DialogHeader>
              <div className={s.dialogBody}>
                <div className={s.spread}><span className={s.small}>Status</span><Badge tone={EARN_TONE[earn.cat.status]}>{EARN_LABEL[earn.cat.status]}</Badge></div>
                <div className={s.stats}>
                  <Stat label="Units" value={earn.cat.units} />
                  <Stat label="Collection" value={<Money value={earn.cat.revenue} />} />
                  <Stat label="Calculated now" value={<Money value={earn.cat.computed_commission} />} />
                  {earn.cat.reviewed_by && <Stat label="Reviewed by" value={earn.cat.reviewed_by} />}
                </div>
                <div className={s.section} data-tone="teal">
                  <div className={s.sectionTitle}>Rate applied ({earn.row.rule.configured ? `${earn.row.rule.role} rule` : "default"})</div>
                  {earn.cat.category === "memberships" ? (
                    <>
                      <Line label="New admissions" value={`${earn.row.rule.admission_commission}%`} />
                      <Line label="Renewals, add-ons, walk-ins" value={`${earn.row.rule.base_commission}%`} />
                    </>
                  ) : (
                    <>
                      <Line label="Of each completed sale (after refunds)" value={`${Number(earn.row.rule.pos_commission) || 0}%`} />
                      <Line label="Fixed per sale" value={money(earn.row.rule.pos_commission_per_sale)} />
                    </>
                  )}
                  <div className={s.netRow}><span className={s.netLabel}>Commission</span><span className={s.netValue}>{money(earn.cat.commission)}</span></div>
                </div>
                {(earn.cat.status === "approved" || earn.cat.status === "paid") && Number(earn.cat.computed_commission) !== Number(earn.cat.commission) && (
                  <Note tone="amber">Sales changed after approval: it would now calculate to {money(earn.cat.computed_commission)}. Undo the approval to re-approve at the new amount.</Note>
                )}
                {earn.cat.status === "paid" && <Note tone="teal">Paid {earn.cat.payroll_run_id ? "through payroll" : "outside payroll"}.</Note>}
                {earn.cat.status === "estimated" && <Note tone="blue">The month is still running — commission can be approved once it ends.</Note>}
                {earn.cat.note && <div className={s.small}><span className={s.strong}>Note: </span>{earn.cat.note}</div>}
                {earn.cat.status === "pending" && canApprove && (
                  <Field label="Rejection reason (if rejecting)"><Input value={earnNote} placeholder="Optional" onChange={e => setEarnNote(e.target.value)} /></Field>
                )}
              </div>
              <div className={s.dialogFooter}>
                {(earn.cat.status === "approved" || earn.cat.status === "rejected") && canApprove && (
                  <Button variant="ghost" disabled={saving} onClick={() => decide("reset", earn.row, earn.month.period, earn.cat.category)}><Undo2 className="h-4 w-4 mr-1" />Undo decision</Button>
                )}
                <Button variant="outline" onClick={() => setEarn(null)}>Close</Button>
                {earn.cat.status === "pending" && canApprove && (
                  <>
                    <Button variant="outline" disabled={saving} onClick={() => decide("reject", earn.row, earn.month.period, earn.cat.category, earnNote || undefined)}><XCircle className="h-4 w-4 mr-1" />Reject</Button>
                    <Button disabled={saving} onClick={() => decide("approve", earn.row, earn.month.period, earn.cat.category)}><CheckCircle className="h-4 w-4 mr-1" />Approve</Button>
                  </>
                )}
                {earn.cat.status === "approved" && canEdit && (
                  <Button disabled={saving} onClick={() => decide("pay", earn.row, earn.month.period, earn.cat.category)}><Banknote className="h-4 w-4 mr-1" />Mark as paid</Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ══ Target form ═══════════════════════════════════════════════════ */}
      <Dialog open={!!targetForm} onOpenChange={v => !v && setTargetForm(null)}>
        <DialogContent className={cx(s.dialogLg, s.dialogScroll)}>
          {targetForm && (
            <>
              <DialogHeader>
                <DialogTitle>{targetForm.scope === "institution" ? "Institution target" : "Individual target"}</DialogTitle>
                <DialogDescription>Monthly revenue and unit targets. Progress is tracked live from receipts, POS sales and PT sessions.</DialogDescription>
              </DialogHeader>
              <div className={s.dialogBody}>
                <div className={s.grid2}>
                  {targetForm.scope === "individual" && (
                    <Field label="Staff member" required>
                      <Select value={targetForm.staffId} onValueChange={v => {
                        const row = rows.find(r => String(r.staff_id) === v);
                        const month = row?.months.find(m => m.period === targetForm.period);
                        if (row && month) openTarget("individual", row, month);
                        else setTargetForm(f => f && ({ ...f, staffId: v, id: undefined }));
                      }}>
                        <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                        <SelectContent>{rows.map(r => <SelectItem key={r.staff_id} value={String(r.staff_id)}>{r.name}{r.role ? ` (${r.role})` : ""}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                  )}
                  <Field label="Month" required>
                    <Select value={targetForm.period} onValueChange={v => setTargetForm(f => f && ({ ...f, period: v, id: undefined }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 15 }, (_, i) => new Date(now.getFullYear(), now.getMonth() + 2 - i, 1)).map(d => (
                          <SelectItem key={ym(d)} value={ym(d)}>{MONTHS[d.getMonth()]} {d.getFullYear()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Revenue target" hint="Membership collections + POS sales">
                    <Input type="number" min={0} value={targetForm.revenue} onChange={e => setTargetForm(f => f && ({ ...f, revenue: e.target.value }))} />
                  </Field>
                </div>
                <hr className={s.divider} />
                <span className={s.sectionLabel}>Unit targets</span>
                <div className={s.stack} style={{ gap: "0.375rem" }}>
                  {SEGS.map(seg => (
                    <div key={seg.key} className={s.section} data-tone={seg.tone} style={{ padding: "0.625rem 0.75rem" }}>
                      <div className={s.row} style={{ gap: "0.4rem", marginBottom: "0.5rem" }}><span data-tone={seg.tone} className={s.toneText}><seg.icon size={14} /></span><span className={cx(s.small, s.strong)}>{seg.label}</span></div>
                      <div className={s.grid4}>
                        {seg.units.map(u => {
                          const def = TARGET_UNIT_TYPES.find(x => x.id === u)!;
                          return (
                            <Field key={u} label={def.name}>
                              <Input type="number" min={0} className="h-9" value={targetForm.units[u] ?? ""} placeholder="0"
                                onChange={e => setTargetForm(f => f && ({ ...f, units: { ...f.units, [u]: e.target.value } }))} />
                            </Field>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                {targetForm.id && <Note tone="blue">A target already exists for this month — saving updates it.</Note>}
              </div>
              <div className={s.dialogFooter}>
                <Button variant="outline" onClick={copyPrevious}><Copy className="h-4 w-4 mr-1" />Copy previous month</Button>
                <Button variant="outline" onClick={() => setTargetForm(null)}>Cancel</Button>
                <Button disabled={saving} onClick={saveTarget}><Save className="h-4 w-4 mr-1" />{saving ? "Saving…" : "Save target"}</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ══ Rule form ═════════════════════════════════════════════════════ */}
      <Dialog open={!!ruleForm} onOpenChange={v => !v && setRuleForm(null)}>
        <DialogContent className={cx(s.dialogMd, s.dialogScroll)}>
          {ruleForm && (
            <>
              <DialogHeader>
                <DialogTitle>{ruleForm.id ? `Edit ${ruleForm.role} rule` : "Create commission rule"}</DialogTitle>
                <DialogDescription>Commission rates for everyone with this role</DialogDescription>
              </DialogHeader>
              <div className={s.dialogBody}>
                <Field label="Role" required>
                  {ruleForm.id ? <Input value={ruleForm.role} disabled /> : (
                    <Select value={ruleForm.role} onValueChange={v => setRuleForm(f => f && ({ ...f, role: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                      <SelectContent>
                        {Array.from(new Set([...roleNames, ...roles])).filter(r => !rules.some(x => x.role.toLowerCase() === r.toLowerCase())).map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </Field>
                <div className={s.section} data-tone="teal">
                  <div className={s.sectionTitle}>Memberships</div>
                  <div className={s.grid2}>
                    <Field label="New admissions (%)"><Input type="number" min={0} step="0.1" value={ruleForm.admission} onChange={e => setRuleForm(f => f && ({ ...f, admission: e.target.value }))} /></Field>
                    <Field label="Renewals, add-ons, walk-ins (%)"><Input type="number" min={0} step="0.1" value={ruleForm.base} onChange={e => setRuleForm(f => f && ({ ...f, base: e.target.value }))} /></Field>
                  </div>
                </div>
                <div className={s.section} data-tone="blue">
                  <div className={s.sectionTitle}>POS sales</div>
                  <div className={s.grid2}>
                    <Field label="Of each sale (%)" hint="After refunds"><Input type="number" min={0} step="0.1" value={ruleForm.pos} onChange={e => setRuleForm(f => f && ({ ...f, pos: e.target.value }))} /></Field>
                    <Field label="Fixed per sale"><Input type="number" min={0} step="0.5" value={ruleForm.perSale} onChange={e => setRuleForm(f => f && ({ ...f, perSale: e.target.value }))} /></Field>
                  </div>
                </div>
                <Note tone="amber">New rates apply to commission that isn't approved yet; approved amounts stay as they were.</Note>
              </div>
              <div className={s.dialogFooter}>
                <Button variant="outline" onClick={() => setRuleForm(null)}>Cancel</Button>
                <Button disabled={saving} onClick={saveRule}><CheckCircle className="h-4 w-4 mr-1" />Save rule</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
