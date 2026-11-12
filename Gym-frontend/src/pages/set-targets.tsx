import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  Target, ArrowLeft, Users, Percent, CheckCircle, Clock, Award, Banknote, Star, XCircle, Activity, RotateCcw, Undo2, Gauge,
  Info, UserX, Settings2, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { hasPermission } from "../utils/permissions";
import { useBranch } from "../utils/branch-context";
import { ReportActions, type ReportDocument, chartFromRows, kpiSection, tableFromMatrix } from "../components/report-export";
import {
  performanceService, metricLabel,
  type PerformanceOverview, type OverviewRow, type PeriodFigures, type SettlementStatus, type SettlementAction,
  type TargetRecord, type IncentivePlan, type UnassignedList, type UnassignedRow, type CreditEvent, type GoalFigure,
} from "../utils/supabase/performance-service";
import {
  PageHeader, Kpi, Badge, Note, Panel, TabBar, Person, Avatar, Empty, Field, ProgressBar, Money, Line, Tone, cx, wf as s,
  periodLabel, errorMessage, useMoneyText, MONTHS,
} from "../components/workforce/ui";
import { SetupCards } from "../components/targets/SetupCards";
import { HowItWorksDialog } from "../components/targets/HowItWorksDialog";

/**
 * Targets & Commission: three steps.
 *  Setup   — per role: monthly target, commission %, bonus; per-person differences.
 *  Team    — the month's progress and commission per person, and what credited them.
 *  Payouts — approve / reject / mark paid each person's month.
 */

interface SetTargetsProps { onNavigate: (section: string, params?: Record<string, any>) => void; }

type TabId = "setup" | "team" | "payouts";
/** Old links (payroll, staff pages) still use the previous tab names. */
const TAB_ALIASES: Record<string, TabId> = {
  setup: "setup", plans: "setup", targets: "setup",
  team: "team", overview: "team", branch: "team", unassigned: "team",
  payouts: "payouts", earnings: "payouts",
};

const EARN_TONE: Record<SettlementStatus, Tone> = { estimated: "blue", pending: "amber", approved: "green", paid: "teal", rejected: "red" };
const EARN_LABEL: Record<SettlementStatus, string> = { estimated: "Month running", pending: "To approve", approved: "Approved", paid: "Paid", rejected: "Rejected" };

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const achTone = (p: number): Tone => (p >= 100 ? "green" : p >= 80 ? "amber" : "red");
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** The goal a person is mainly measured on: their money target, else the first one. */
const mainGoal = (m: PeriodFigures | undefined): GoalFigure | null =>
  !m ? null : m.goals.find(g => g.measure === "amount") ?? m.goals[0] ?? null;

/** Plain words for one credited activity. */
function creditWhat(e: CreditEvent): string {
  const part = e.part ?? "";
  switch (e.metric) {
    case "PT_SALE": return e.source_type === "enrolment" ? "PT package paid" : "PT session paid";
    case "PT_REVENUE":
      if (part.startsWith("b:")) return "Package session used";
      if (part.startsWith("d:")) return "Package days this month";
      if (part === "expiry") return "Unused sessions at expiry";
      return e.source_type === "enrolment" ? "Package — commission in full" : "Session — commission";
    case "PT_SESSION_DELIVERED": return "PT session delivered";
    case "MEMBER_ADMISSION": return "New membership";
    case "POS_SALE": return "POS sale";
    case "LEAD_CONVERSION": return "Lead converted";
    case "CLASS_TAUGHT": return "Class taught";
    case "CLASS_ATTENDEE": return "Class attendees";
    default: return metricLabel(e.metric);
  }
}

export function SetTargets({ onNavigate }: SetTargetsProps) {
  const location = useLocation();
  const navState = (location.state || {}) as { tab?: string; staffId?: string | number };
  const { activeBranchId } = useBranch();
  const money = useMoneyText();
  const canEdit = hasPermission("STAFF_EDIT") || hasPermission("PAYROLL_EDIT") || hasPermission("STAFF_CREATE");
  const canApprove = hasPermission("PAYROLL_APPROVE");

  const now = new Date();
  const thisMonth = ym(now);
  const [tab, setTab] = useState<TabId>(TAB_ALIASES[navState.tab ?? ""] ?? (navState.staffId ? "team" : "setup"));
  const [anchor, setAnchor] = useState(thisMonth);
  const [roleF, setRoleF] = useState("all");
  const [personF, setPersonF] = useState(navState.staffId ? String(navState.staffId) : "all");
  const [statusF, setStatusF] = useState("all");

  const [data, setData] = useState<PerformanceOverview | null>(null);
  const [current, setCurrent] = useState<PerformanceOverview | null>(null);
  const [currentTargets, setCurrentTargets] = useState<TargetRecord[]>([]);
  const [plans, setPlans] = useState<IncentivePlan[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedList | null>(null);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [loading, setLoading] = useState(true);

  const [detail, setDetail] = useState<OverviewRow | null>(null);
  const [credits, setCredits] = useState<CreditEvent[] | null>(null);
  const [earn, setEarn] = useState<{ row: OverviewRow; month: PeriodFigures } | null>(null);
  const [earnNote, setEarnNote] = useState("");
  const [earnAdjust, setEarnAdjust] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // The month shown on Team / Payouts; Setup always works on the current month.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await performanceService.overview(anchor, anchor));
    } catch (e) {
      toast.error(errorMessage(e, "Failed to load performance"));
    } finally {
      setLoading(false);
    }
  }, [anchor]);

  const loadSetup = useCallback(async () => {
    try {
      const [overview, targets, planList] = await Promise.all([
        performanceService.overview(thisMonth, thisMonth),
        performanceService.targets(thisMonth),
        performanceService.plans(),
      ]);
      setCurrent(overview);
      setCurrentTargets(targets);
      setPlans(planList);
    } catch (e) { toast.error(errorMessage(e, "Failed to load targets and commission")); }
  }, [thisMonth]);

  const loadUnassigned = useCallback(async () => {
    try { setUnassigned(await performanceService.unassigned(6)); } catch { /* the warning is optional */ }
  }, []);

  useEffect(() => { load(); }, [load, activeBranchId]);
  useEffect(() => { loadSetup(); loadUnassigned(); }, [loadSetup, loadUnassigned, activeBranchId]);

  useEffect(() => {
    if (!detail) { setCredits(null); return; }
    let live = true;
    performanceService.events(detail.staff_id, anchor)
      .then(list => { if (live) setCredits(list); })
      .catch(() => { if (live) setCredits([]); });
    return () => { live = false; };
  }, [detail, anchor]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const rows = data?.rows ?? [];
  const roles = useMemo(() => Array.from(new Set(rows.map(r => r.role).filter(Boolean) as string[])).sort(), [rows]);
  const visible = useMemo(() => rows.filter(r =>
    (roleF === "all" || r.role === roleF) && (personF === "all" || String(r.staff_id) === personF)), [rows, roleF, personF]);
  const monthOf = (r: OverviewRow) => r.months.find(m => m.period === anchor) ?? r.months[r.months.length - 1];

  const perStaff = useMemo(() => visible.map(r => {
    const m = monthOf(r);
    const goal = mainGoal(m);
    return { row: r, month: m, goal, ach: goal?.percent ?? 0, comm: Number(m?.commission || 0) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [visible, anchor]);

  const totals = useMemo(() => perStaff.reduce((t, x) => ({
    withTarget: t.withTarget + (x.goal ? 1 : 0),
    reached: t.reached + (x.goal && x.ach >= 100 ? 1 : 0),
    comm: t.comm + x.comm,
    pending: t.pending + (x.month?.settlement.status === "pending" ? x.comm : 0),
  }), { withTarget: 0, reached: 0, comm: 0, pending: 0 }), [perStaff]);

  const earnings = useMemo(() => perStaff
    .filter(x => x.month && (statusF === "all" || x.month.settlement.status === statusF))
    .filter(x => ["approved", "paid", "rejected"].includes(x.month!.settlement.status) || Number(x.month!.commission) || x.month!.incentive.has_plan)
    .map(x => ({ row: x.row, month: x.month! })), [perStaff, statusF]);

  const earnTotals = useMemo(() => {
    const t: Record<SettlementStatus, number> = { estimated: 0, pending: 0, approved: 0, paid: 0, rejected: 0 };
    perStaff.forEach(x => { if (x.month) t[x.month.settlement.status] += Number(x.month.commission || 0); });
    return t;
  }, [perStaff]);

  const noPlan = (current?.rows ?? []).filter(r => !r.plan);
  const unassignedTotal = unassigned?.total ?? 0;
  const staffName = (id: number | null) => rows.find(r => r.staff_id === id)?.name ?? (id ? `Staff #${id}` : "—");

  // ── Actions ───────────────────────────────────────────────────────────────
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

  const approveAll = async () => {
    try {
      const r = await performanceService.approveAll(anchor);
      toast.success(`Approved ${r.approved} commission${r.approved === 1 ? "" : "s"} for ${periodLabel(anchor)}`);
      load();
    } catch (e) { toast.error(errorMessage(e, "Failed to approve commission")); }
  };

  const assign = async (type: "receipt" | "sale" | "lead", row: UnassignedRow, staffId: string) => {
    try {
      await performanceService.assign(type, row.id, Number(staffId));
      toast.success(`Credited to ${staffName(Number(staffId))}`);
      loadUnassigned();
      load();
    } catch (e) { toast.error(errorMessage(e, "Failed to assign")); }
  };

  const buildReport = (): ReportDocument => ({
    title: "Staff Targets & Commission", fileName: "Staff Targets", orientation: "landscape",
    period: { from: anchor, to: anchor },
    sections: [
      kpiSection([
        { label: "Staff with a target", value: totals.withTarget, format: "number" },
        { label: "Reached their target", value: totals.reached, format: "number" },
        { label: "Commission", value: totals.comm, format: "money" },
      ]),
      chartFromRows("Target progress", "bar", perStaff.filter(x => x.goal).map(x => ({ name: x.row.name, a: x.ach })), "name", [
        { key: "a", name: "% of target", color: "#2a78d6" },
      ]),
      tableFromMatrix("Staff",
        ["Employee", "Role", "Target", "Achieved", "Achievement %", "Commission", "Status"],
        perStaff.map(x => [x.row.name, x.row.role, x.goal ? Number(x.goal.goal) : "", x.goal ? Number(x.goal.achieved) : "",
          x.goal ? `${x.ach}%` : "", x.comm, x.month ? EARN_LABEL[x.month.settlement.status] : ""]),
        { totals: true, money: [5] }),
    ],
  });

  const monthOptions = useMemo(() => Array.from({ length: 18 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { value: ym(d), label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const goalText = (g: GoalFigure) => g.measure === "amount" ? `${money(g.achieved)} of ${money(g.goal)}` : `${g.achieved} of ${Number(g.goal)}`;

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className={s.page}>
      <PageHeader
        crumbs={[{ label: "Payroll & Employees", to: "payroll-employees" }, { label: "Staffs & Trainers", to: "staffs-trainers" }, { label: "Targets & Commission" }]}
        onCrumb={to => onNavigate(to)}
        icon={Target}
        title="Targets & Commission"
        subtitle="Set each role's target and commission · follow progress · approve monthly commission"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => onNavigate("staffs-trainers")}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
            <Button variant="outline" size="sm" onClick={() => setHelpOpen(true)}><Info className="h-4 w-4 mr-1" />How it works</Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate("targets-overview")}><Gauge className="h-4 w-4 mr-1" />Staff Targets</Button>
          </>
        }
      />

      <TabBar<TabId>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "setup", label: "1. Setup", icon: Settings2, count: noPlan.length, countTone: "amber" },
          { id: "team", label: "2. Team progress", icon: Users, count: unassignedTotal, countTone: "amber" },
          { id: "payouts", label: "3. Payouts", icon: Banknote, count: perStaff.filter(x => x.month?.settlement.status === "pending").length, countTone: "amber" },
        ]}
      />

      {/* ── Setup ─────────────────────────────────────────────────────────── */}
      {tab === "setup" && (
        <>
          <div>
            <div className={s.panelTitle}>Targets and commission per role</div>
            <div className={s.panelDesc}>Changes apply from {periodLabel(thisMonth)} and repeat every month until you change them. Approved months never change.</div>
          </div>
          {noPlan.length > 0 && (
            <Note tone="amber" icon={Info}>
              {noPlan.length === 1 ? "1 person earns" : `${noPlan.length} people earn`} no commission yet: {noPlan.slice(0, 6).map(r => r.name).join(", ")}{noPlan.length > 6 ? "…" : ""}. Set a commission % on their role below.
            </Note>
          )}
          {!current
            ? <Panel><Empty icon={Activity} title="Loading…" /></Panel>
            : <SetupCards rows={current.rows} plans={plans} targets={currentTargets} currentPeriod={thisMonth}
                activeBranchId={activeBranchId} canEdit={canEdit} onSaved={() => { loadSetup(); load(); }} />}
        </>
      )}

      {/* ── Filters for Team / Payouts ─────────────────────────────────────── */}
      {tab !== "setup" && (
        <Panel flush>
          <div className={s.filterBar}>
            <span className={s.filterLabel}>Month</span>
            <Select value={anchor} onValueChange={setAnchor}>
              <SelectTrigger className="h-9" style={{ width: "10.5rem" }}><SelectValue /></SelectTrigger>
              <SelectContent>{monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={roleF} onValueChange={setRoleF}>
              <SelectTrigger className={cx("h-9", s.select)}><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All roles</SelectItem>{roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={personF} onValueChange={setPersonF}>
              <SelectTrigger className={cx("h-9", s.select)}><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Everyone</SelectItem>{rows.map(r => <SelectItem key={r.staff_id} value={String(r.staff_id)}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
            {(roleF !== "all" || personF !== "all" || anchor !== thisMonth) && (
              <Button variant="ghost" size="sm" className="h-9" onClick={() => { setRoleF("all"); setPersonF("all"); setAnchor(thisMonth); }}>
                <RotateCcw className="h-4 w-4 mr-1" />Reset
              </Button>
            )}
          </div>
        </Panel>
      )}

      {tab !== "setup" && loading && !data && <Panel><Empty icon={Activity} title="Calculating…" /></Panel>}

      {/* ── Team ──────────────────────────────────────────────────────────── */}
      {tab === "team" && data && (
        <>
          <div className={s.kpis4}>
            <Kpi icon={Target} label="Have a target" value={`${totals.withTarget} of ${perStaff.length}`} sub={periodLabel(anchor)} tone="teal" />
            <Kpi icon={Award} label="Reached it" value={String(totals.reached)} sub={totals.withTarget ? `${pct(totals.reached, totals.withTarget)}% of them` : "No targets set"} tone={totals.reached ? "green" : "gray"} />
            <Kpi icon={Percent} label="Commission" value={<Money value={totals.comm} />} sub={anchor === thisMonth ? "so far this month" : periodLabel(anchor)} tone="violet" onClick={() => setTab("payouts")} />
            <Kpi icon={Clock} label="To approve" value={<Money value={totals.pending} />} sub="month ended" tone={totals.pending ? "amber" : "gray"} onClick={() => { setStatusF("pending"); setTab("payouts"); }} />
          </div>

          {unassignedTotal > 0 && (
            <Note tone="amber" icon={UserX}>
              {unassignedTotal} sale{unassignedTotal === 1 ? "" : "s"} from the last 6 months couldn't be matched to one staff member, so nobody got credit.{" "}
              <button type="button" className={s.strong} style={{ textDecoration: "underline" }} onClick={() => setShowUnassigned(v => !v)}>
                {showUnassigned ? "Hide" : "Credit them"}{showUnassigned ? <ChevronUp size={12} style={{ display: "inline" }} /> : <ChevronDown size={12} style={{ display: "inline" }} />}
              </button>
            </Note>
          )}
          {showUnassigned && unassigned && ([
            ["receipt", "New memberships", unassigned.receipts],
            ["sale", "POS sales", unassigned.sales],
            ["lead", "Lead conversions", unassigned.leads],
          ] as Array<["receipt" | "sale" | "lead", string, UnassignedRow[]]>).filter(([, , list]) => list.length > 0).map(([type, title, list]) => (
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
              </div>
            </Panel>
          ))}

          <Panel title="Team progress" description={`${periodLabel(anchor)} · click a person to see what counted`}
            actions={<ReportActions report={buildReport} menuLabel="Team progress" compact />} flush>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr><th>Person</th><th>Target</th><th>Progress</th><th className={s.right}>Commission</th></tr>
                </thead>
                <tbody>
                  {perStaff.map(x => (
                    <tr key={x.row.staff_id} className={s.clickable} onClick={() => setDetail(x.row)}>
                      <td><Person name={x.row.name} sub={x.row.role ?? undefined} photo={x.row.photo_url} /></td>
                      <td>
                        {x.goal
                          ? <><div className={s.small}>{x.goal.label}</div><div className={s.cellSub}>{goalText(x.goal)}</div></>
                          : <span className={s.muted}>No target</span>}
                        {x.month && x.month.goals.length > 1 && (
                          <div className={s.cellSub}>{x.month.goals.filter(g => g !== x.goal).map(g => `${g.label}: ${goalText(g)}`).join(" · ")}</div>
                        )}
                      </td>
                      <td style={{ minWidth: "10rem" }}>
                        {x.goal ? (
                          <div className={s.barRow}>
                            <ProgressBar value={x.ach} tone={achTone(x.ach)} />
                            <span data-tone={achTone(x.ach)} className={cx(s.toneText, s.strong, s.small)}>{x.ach}%</span>
                            {x.ach >= 100 && <Star size={13} color="#f59e0b" fill="#f59e0b" />}
                          </div>
                        ) : <span className={s.muted}>—</span>}
                      </td>
                      <td className={s.right}>
                        {x.row.plan
                          ? <span className={s.strong} style={{ color: "var(--primary)" }}><Money value={x.comm} /></span>
                          : <Badge tone="amber">No commission set</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {perStaff.length === 0 && <Empty icon={Users} title="No staff match these filters" />}
            </div>
          </Panel>
        </>
      )}

      {/* ── Payouts ───────────────────────────────────────────────────────── */}
      {tab === "payouts" && data && (
        <>
          <div className={s.kpis}>
            {(["estimated", "pending", "approved", "paid"] as SettlementStatus[]).map(st => (
              <Kpi key={st} icon={Banknote} label={EARN_LABEL[st]} value={<Money value={earnTotals[st]} />} tone={EARN_TONE[st]}
                active={statusF === st} onClick={() => setStatusF(statusF === st ? "all" : st)} />
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
              {canApprove && earnTotals.pending > 0 && (
                <Button size="sm" className="h-9" onClick={approveAll}><CheckCircle className="h-4 w-4 mr-1" />Approve all for {periodLabel(anchor)}</Button>
              )}
            </div>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr><th>Person</th><th>Made up of</th><th className={s.right}>Commission</th><th className={s.center}>Status</th><th className={s.right}>Actions</th></tr>
                </thead>
                <tbody>
                  {earnings.map(e => (
                    <tr key={e.row.staff_id} className={s.clickable} onClick={() => { setEarn(e); setEarnNote(""); setEarnAdjust(""); }}>
                      <td><Person name={e.row.name} sub={e.row.role} photo={e.row.photo_url} size="sm" /></td>
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
              {earnings.length === 0 && <Empty icon={Banknote} title={`No commission for ${periodLabel(anchor)}`} />}
            </div>
          </Panel>
          <Note tone="teal">The month's commission can be approved once the month ends. Approving locks it, and payroll pays it with that month's salary. A refund after approval comes off the month the refund happens in.</Note>
        </>
      )}

      {/* ══ Person detail: goals and what counted ═══════════════════════════ */}
      <Dialog open={!!detail} onOpenChange={v => !v && setDetail(null)}>
        <DialogContent className={cx(s.dialogLg, s.dialogScroll)}>
          {detail && (() => {
            const m = monthOf(detail);
            return (
              <>
                <DialogHeader>
                  <div className={s.row} style={{ gap: "0.75rem", flexWrap: "nowrap" }}>
                    <Avatar name={detail.name} photo={detail.photo_url} size="lg" />
                    <div style={{ textAlign: "left" }}>
                      <DialogTitle>{detail.name}</DialogTitle>
                      <DialogDescription>{[detail.role, detail.branch].filter(Boolean).join(" · ")} · {periodLabel(anchor)}</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className={s.dialogBody}>
                  {m && m.goals.length > 0 ? (
                    <div className={s.section} data-tone="teal">
                      <div className={s.sectionTitle}>Targets</div>
                      {m.goals.map(g => (
                        <div key={`${g.metric}-${g.measure}`} style={{ marginBottom: "0.5rem" }}>
                          <div className={s.spread}>
                            <span className={s.small}>{g.label}</span>
                            <span className={s.small}>{goalText(g)} · {g.percent ?? 0}%</span>
                          </div>
                          <ProgressBar value={g.percent ?? 0} tone={achTone(g.percent ?? 0)} />
                        </div>
                      ))}
                    </div>
                  ) : <Note tone="gray">No target this month.</Note>}

                  <div className={s.netRow}>
                    <span className={s.netLabel}>Commission {m ? `· ${EARN_LABEL[m.settlement.status].toLowerCase()}` : ""}</span>
                    <span className={s.netValue}>{money(Number(m?.commission || 0))}</span>
                  </div>
                  {!detail.plan && <Note tone="amber">No commission % is set for this person's role — set it on Setup.</Note>}

                  <div className={s.sectionLabel} style={{ marginTop: "0.5rem" }}>What counted this month</div>
                  {!credits && <div className={cx(s.small, s.muted)}>Loading…</div>}
                  {credits && credits.length === 0 && <div className={cx(s.small, s.muted)}>Nothing credited yet.</div>}
                  {credits && credits.length > 0 && (
                    <div className={s.tableWrap}>
                      <table className={s.table}>
                        <thead><tr><th>Date</th><th>What</th><th>For</th><th className={s.right}>Counts</th><th className={s.right}>Commission</th></tr></thead>
                        <tbody>
                          {credits.map(c => (
                            <tr key={c.id}>
                              <td className={s.cellSub}>{c.occurred_at.slice(0, 10)}</td>
                              <td className={s.small}>{c.correction ? "Correction · " : ""}{creditWhat(c)}</td>
                              <td className={s.cellSub}>{[c.person, c.title].filter(Boolean).join(" · ") || "—"}</td>
                              <td className={cx(s.right, s.small)}>{c.amount != null ? money(Number(c.amount)) : c.quantity}</td>
                              <td className={cx(s.right, s.small)}>{Number(c.commission) ? money(Number(c.commission)) : <span className={s.muted}>—</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className={s.cellSub}>
                    “PT package paid” / “PT session paid” move the target. Commission is paid on the PT money as it's earned — in full when paid, or a share per session used for packages set to “On completion”. Bonuses are added for the month as a whole.
                  </div>
                </div>
                <div className={s.dialogFooter}>
                  <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
                  {m && <Button onClick={() => { setEarn({ row: detail, month: m }); setDetail(null); }}><Banknote className="h-4 w-4 mr-1" />Commission breakdown</Button>}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ══ Commission breakdown / approval ═════════════════════════════════ */}
      <Dialog open={!!earn} onOpenChange={v => !v && setEarn(null)}>
        <DialogContent className={cx(s.dialogMd, s.dialogScroll)}>
          {earn && (() => {
            const st = earn.month.settlement;
            const inc = earn.month.incentive;
            return (
              <>
                <DialogHeader>
                  <DialogTitle>Commission breakdown</DialogTitle>
                  <DialogDescription>{earn.row.name} · {periodLabel(earn.month.period)}</DialogDescription>
                </DialogHeader>
                <div className={s.dialogBody}>
                  <div className={s.spread}><span className={s.small}>Status</span><Badge tone={EARN_TONE[st.status]}>{EARN_LABEL[st.status]}</Badge></div>
                  {!inc.has_plan && <Note tone="amber">No commission was set for this month, so nothing was earned.</Note>}
                  {inc.lines.length > 0 && (
                    <div className={s.section} data-tone="teal">
                      <div className={s.sectionTitle}>Commission</div>
                      {inc.lines.map((l, i) => (
                        <Line key={i}
                          label={<>{l.label}{l.metric && l.basis ? <span className={s.muted}> · {l.basis === "percent_of_amount" ? `${Number(l.rate)}% of ${money(l.base)}` : `${l.units} × ${money(l.rate)}`}{l.below_minimum ? ` (below minimum ${l.min_units})` : ""}{l.capped ? " (capped)" : ""}</span> : null}</>}
                          value={money(l.earned)} />
                      ))}
                    </div>
                  )}
                  {inc.bonuses.length > 0 && (
                    <div className={s.section} data-tone="violet">
                      <div className={s.sectionTitle}>Target bonus</div>
                      {inc.bonuses.map((b, i) => (
                        <Line key={i} tone={b.reached ? "green" : undefined}
                          label={<>{b.label} target<span className={s.muted}> · reached {b.attainment_pct != null ? `${Number(b.attainment_pct)}%` : "no target"}</span></>}
                          value={money(b.earned)} />
                      ))}
                    </div>
                  )}
                  <div className={s.netRow}><span className={s.netLabel}>Total</span><span className={s.netValue}>{money(earn.month.commission)}</span></div>
                  {st.adjustment_amount != null && <Note tone="blue">Includes a manual adjustment of {money(st.adjustment_amount)}{st.computed_amount != null ? ` on the calculated ${money(st.computed_amount)}` : ""}.</Note>}
                  {inc.legacy && <Note tone="blue">Approved before the current commission setup: the old amounts are shown as they were locked.</Note>}
                  {st.status === "paid" && <Note tone="teal">Paid {st.payroll_run_id ? "through payroll" : "outside payroll"}.</Note>}
                  {st.status === "estimated" && <Note tone="blue">The month is still running — it can be approved once it ends.</Note>}
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

      <HowItWorksDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}

