import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw, Search, Users, Target, Percent, ChevronRight, Pencil, Plus, Calendar, CreditCard, ShoppingBag, Dumbbell, CalendarCheck,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { staffService, Staff, StaffTarget } from "../../utils/supabase/staff-service";
import { hasPermission } from "../../utils/permissions";
import { TARGET_UNIT_TYPES } from "../../utils/target-units";
import {
  PageHeader, Kpi, Panel, Person, Avatar, Empty, Badge, Money, Stat, ProgressBar, Note, cx, wf as s, MONTHS, errorMessage,
} from "../workforce/ui";
import { MetricCell, MetricGrid, targetMetrics, pct, achTone, unitTarget, unitAchieved, type MetricKey } from "./target-metrics";

const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

interface Row { staff: Staff; target: StaffTarget | null; }

/**
 * Admin roster for My Profile › My Targets (accounts with no linked staff record): every
 * staff member's target for the chosen month — overall, membership, POS and PT revenue and
 * PT sessions, achieved vs target — with a per-staff breakdown dialog.
 */
export function StaffTargetsBoard() {
  const navigate = useNavigate();
  const canEdit = hasPermission("STAFF_EDIT") || hasPermission("PAYROLL_EDIT") || hasPermission("STAFF_CREATE");
  const now = new Date();
  const [period, setPeriod] = useState(ym(now));
  const [staff, setStaff] = useState<Staff[]>([]);
  const [targets, setTargets] = useState<StaffTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [show, setShow] = useState<"all" | "with" | "without">("all");
  const [detail, setDetail] = useState<Row | null>(null);

  const [year, month] = period.split("-").map(Number);
  const periodText = `${MONTHS[month - 1]} ${year}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [staffPage, list] = await Promise.all([
        staffService.getStaff({}, 1, 500),
        staffService.getTargets(year, month),
      ]);
      setStaff(staffPage.items);
      setTargets(list.filter(t => t.staff_db_id));
    } catch (e) {
      setError(errorMessage(e, "Failed to load staff targets"));
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const rows: Row[] = useMemo(() => {
    const listed = staff.map(st => ({
      staff: st,
      target: targets.find(t => String(t.staff_db_id) === String(st.id)) ?? null,
    }));
    // The staff list is scoped by staff↔branch links; a target for someone not linked to
    // this branch still shows, from the staff fields on the target itself.
    const known = new Set(staff.map(st => String(st.id)));
    const extra = targets.filter(t => !known.has(String(t.staff_db_id))).map(t => ({
      staff: { id: t.staff_db_id, staff_id: t.staff_id, name: t.staff_name, role: t.staff_role, department: t.staff_department } as Staff,
      target: t,
    }));
    return [...listed, ...extra];
  }, [staff, targets]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter(r => show === "all" || (show === "with" ? !!r.target : !r.target))
      .filter(r => !q || [r.staff.name, r.staff.role, r.staff.department, r.staff.staff_id].some(v => (v || "").toLowerCase().includes(q)))
      .sort((a, b) => {
        // Staff with targets first, best overall achievement first; then by name.
        if (!!a.target !== !!b.target) return a.target ? -1 : 1;
        const pa = a.target ? pct(Number(a.target.revenue_achieved || 0), Number(a.target.revenue_target || 0)) : 0;
        const pb = b.target ? pct(Number(b.target.revenue_achieved || 0), Number(b.target.revenue_target || 0)) : 0;
        return pb - pa || (a.staff.name || "").localeCompare(b.staff.name || "");
      });
  }, [rows, search, show]);

  // Team totals over staff with a target this month. `achieved` is everyone's figure;
  // `onTarget` only counts staff who have that metric's target, so the % compares like with like.
  const totals = useMemo(() => {
    const blank = () => ({ target: 0, achieved: 0, onTarget: 0, staff: 0 });
    const sum: Record<MetricKey, ReturnType<typeof blank>> = {
      overall: blank(), memberships: blank(), pos: blank(), pt: blank(), pt_sessions: blank(),
    };
    let commission = 0;
    rows.forEach(r => {
      if (!r.target) return;
      commission += Number(r.target.commission_earned || 0);
      targetMetrics(r.target).forEach(m => {
        sum[m.key].achieved += m.achieved;
        if (m.target > 0) {
          sum[m.key].target += m.target;
          sum[m.key].onTarget += m.achieved;
          sum[m.key].staff += 1;
        }
      });
    });
    return { sum, commission, withTarget: rows.filter(r => r.target).length };
  }, [rows]);

  const periodOptions = useMemo(() => Array.from({ length: 15 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + 2 - i, 1);
    return { value: ym(d), label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const daysLeft = useMemo(() => {
    if (year !== now.getFullYear() || month !== now.getMonth() + 1) return null;
    return Math.max(0, new Date(year, month, 0).getDate() - now.getDate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const kpi = (key: MetricKey, icon: typeof Target, label: string, money = true) => {
    const t = totals.sum[key];
    const p = pct(t.onTarget, t.target);
    const fmt = (v: number) => (money ? <Money value={v} /> : v.toLocaleString());
    return (
      <Kpi icon={icon} label={label}
        value={fmt(t.achieved)}
        sub={t.target
          ? <>{p}% of {fmt(t.target)} · {t.staff} staff</>
          : "No targets set"}
        tone={t.target ? achTone(p) : "gray"} />
    );
  };

  const goSetTargets = () => navigate("/set-targets", { state: { tab: "individual" } });

  return (
    <div className={s.page}>
      <PageHeader
        crumbs={[{ label: "My Profile" }, { label: "Staff Targets" }]}
        icon={Target}
        title="Staff Targets"
        subtitle={`Every staff member's targets and progress · ${periodText}`}
        actions={
          <>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="h-9" style={{ width: "12rem" }}><Calendar className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>{periodOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
            {canEdit && <Button size="sm" onClick={goSetTargets}><Plus className="h-4 w-4 mr-1" />Set targets</Button>}
          </>
        }
      />

      {error && <Note tone="red">{error}</Note>}

      <div className={s.kpis}>
        {kpi("overall", Target, "Overall revenue")}
        {kpi("memberships", CreditCard, "Membership revenue")}
        {kpi("pos", ShoppingBag, "POS sales")}
        {kpi("pt", Dumbbell, "PT revenue")}
        {kpi("pt_sessions", CalendarCheck, "PT sessions", false)}
        <Kpi icon={Percent} label="Commission earned" value={<Money value={totals.commission} />}
          sub={`${totals.withTarget} of ${rows.length} staff have targets`} tone="violet" />
      </div>

      <Panel flush
        title="Staff performance"
        description={`${periodText}${daysLeft != null ? ` · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : ""} · click a row for the full breakdown`}>
        <div className={s.filterBar}>
          <div className={s.search}>
            <Search size={14} />
            <Input className="h-9" placeholder="Search staff, role, department…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={show} onValueChange={v => setShow(v as typeof show)}>
            <SelectTrigger className={cx("h-9", s.select)}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All staff</SelectItem>
              <SelectItem value="with">With a target</SelectItem>
              <SelectItem value="without">Without a target</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {loading && rows.length === 0 ? (
          <Empty icon={RefreshCw} title="Loading targets…" />
        ) : rows.length === 0 ? (
          <Empty icon={Users} title="No staff members found">Add staff under Payroll &amp; Employees › Staffs &amp; Trainers, then set their targets.</Empty>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Staff</th><th>Overall</th><th>Membership</th><th>POS sales</th><th>PT revenue</th><th>PT sessions</th>
                  <th className={s.right}>Commission</th><th aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {visible.map(r => {
                  const sub = [r.staff.role, r.staff.department].filter(Boolean).join(" · ");
                  if (!r.target) {
                    return (
                      <tr key={r.staff.id}>
                        <td><Person name={r.staff.name} sub={sub} photo={r.staff.photo_url} /></td>
                        <td colSpan={6} className={s.muted}>No target for {periodText}</td>
                        <td className={s.right}>
                          {canEdit && <Button variant="ghost" size="sm" onClick={goSetTargets} title="Set target"><Plus className="h-4 w-4" /></Button>}
                        </td>
                      </tr>
                    );
                  }
                  const metrics = targetMetrics(r.target);
                  return (
                    <tr key={r.staff.id} className={s.clickable} onClick={() => setDetail(r)}>
                      <td><Person name={r.staff.name} sub={sub} photo={r.staff.photo_url} /></td>
                      {metrics.map(m => <td key={m.key}><MetricCell metric={m} /></td>)}
                      <td className={s.right}><span className={s.strong} style={{ color: "var(--primary)" }}><Money value={r.target.commission_earned} /></span></td>
                      <td className={s.right}><ChevronRight size={16} className={s.muted} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {visible.length === 0 && <Empty icon={Users} title="No staff match these filters" />}
          </div>
        )}
      </Panel>

      <Dialog open={!!detail} onOpenChange={v => !v && setDetail(null)}>
        <DialogContent className={cx(s.dialogLg, s.dialogScroll)}>
          {detail?.target && (() => {
            const t = detail.target;
            const overall = targetMetrics(t)[0];
            const remaining = Math.max(0, overall.target - overall.achieved);
            const units = TARGET_UNIT_TYPES
              .filter(u => u.id !== "pt_sessions")
              .map(u => ({ ...u, target: unitTarget(t, u.id), done: unitAchieved(t, u.id) }))
              .filter(u => u.target > 0 || u.done > 0);
            return (
              <>
                <DialogHeader>
                  <div className={s.row} style={{ gap: "0.75rem", flexWrap: "nowrap" }}>
                    <Avatar name={detail.staff.name} photo={detail.staff.photo_url} size="lg" />
                    <div style={{ textAlign: "left" }}>
                      <DialogTitle>{detail.staff.name}</DialogTitle>
                      <DialogDescription>{[detail.staff.role, detail.staff.department].filter(Boolean).join(" · ")} · {periodText}</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className={s.dialogBody}>
                  <MetricGrid target={t} />
                  <div className={s.stats}>
                    <Stat label="Commission earned" value={<Money value={t.commission_earned} />} />
                    <Stat label="New clients" value={`${t.new_clients_achieved || 0}${t.new_clients_target ? ` / ${t.new_clients_target}` : ""}`} />
                    {daysLeft != null && <Stat label="Days left" value={daysLeft} />}
                    {daysLeft != null && overall.target > 0 && remaining > 0 && (
                      <Stat label="Needed per day" value={<Money value={Math.ceil(remaining / Math.max(1, daysLeft))} />} />
                    )}
                  </div>
                  {units.length > 0 && (
                    <div className={s.section}>
                      <div className={s.sectionTitle}>Other unit targets</div>
                      <div className={s.stack} style={{ gap: "0.5rem" }}>
                        {units.map(u => {
                          const p = pct(u.done, u.target);
                          return (
                            <div key={u.id} className={s.spread} style={{ flexWrap: "nowrap" }}>
                              <span className={s.small} style={{ minWidth: "8rem" }}>{u.name}</span>
                              <div style={{ flex: 1 }}>{u.target > 0 && <ProgressBar value={p} tone={achTone(p)} />}</div>
                              <span className={cx(s.small, s.strong, s.num)} style={{ minWidth: "5rem", textAlign: "right" }}>
                                {u.done}{u.target ? ` / ${u.target}` : ""}
                              </span>
                              {u.target > 0 ? <Badge tone={achTone(p)}>{p}%</Badge> : <Badge plain>No target</Badge>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <Note tone="blue">
                    Revenue is credited to whoever took the payment, and PT session bookings (incl. the app) to the session's trainer.
                    Payments still awaiting approval or rejected don't count. Membership revenue excludes PT, so membership + POS + PT
                    add up to the overall figure.
                  </Note>
                </div>
                <div className={s.dialogFooter}>
                  <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
                  {canEdit && <Button onClick={goSetTargets}><Pencil className="h-4 w-4 mr-1" />Edit targets</Button>}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
