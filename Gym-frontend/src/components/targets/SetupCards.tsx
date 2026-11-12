import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { Award, Dumbbell, Pencil, Percent, Save, Target, Trash2, Users, X } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  performanceService, metricLabel, lineText,
  type IncentivePlan, type MetricCode, type Measure, type OverviewRow, type PlanBonus, type PlanLine, type PlanRequest, type TargetLine, type TargetRecord,
} from "../../utils/supabase/performance-service";
import { Empty, Money, Note, Panel, Stat, cx, errorMessage, periodLabel, useMoneyText, wf as s } from "../workforce/ui";

/**
 * Setup: one card per role with everything about how that role is measured and paid —
 * a monthly target, a commission % and an optional bonus for reaching the target — plus a
 * people table where any field can be set differently for one person (blank = role's).
 *
 * Trainers:  target = PT sales (money members paid for PT with them, on payment);
 *            commission = % of PT, paid when the member pays, or month by month as sessions
 *            are used for packages set to "On completion" (PT_REVENUE).
 * Others:    target = total sales; commission = % of new memberships and % of POS sales.
 *
 * Underneath it saves ordinary targets (role / staff, repeating from this month) and
 * incentive plans (role plan, or a personal copy for someone with their own %). Settings this
 * page doesn't manage are listed as "Older settings" with a Remove button, never silently kept.
 */

type Kind = "trainer" | "staff";

interface Field {
  key: string;
  label: string;
  hint: string;
  unit: "money" | "count" | "percent";
  /** where it is stored */
  store: { type: "target"; metric: MetricCode; measure: Measure } | { type: "line"; metric: MetricCode } | { type: "bonus"; metric: MetricCode };
  /** can be set per person */
  personal: boolean;
}

const FIELDS: Record<Kind, Field[]> = {
  trainer: [
    { key: "target", label: "Monthly PT sales target", hint: "PT packages and paid PT sessions sold with them. Counts in full when the member pays.", unit: "money", store: { type: "target", metric: "PT_SALE", measure: "amount" }, personal: true },
    { key: "commission", label: "Commission on PT", hint: "Paid when the member pays — or month by month as sessions are used, for packages set to “On completion”.", unit: "percent", store: { type: "line", metric: "PT_REVENUE" }, personal: true },
    { key: "bonus", label: "Bonus for reaching the target", hint: "Paid once in a month when they reach 100% of their PT sales target.", unit: "money", store: { type: "bonus", metric: "PT_SALE" }, personal: false },
    { key: "sessions", label: "Sessions target (optional)", hint: "PT sessions where the member came. Measured only — pays nothing.", unit: "count", store: { type: "target", metric: "PT_SESSION_DELIVERED", measure: "count" }, personal: true },
  ],
  staff: [
    { key: "target", label: "Monthly sales target", hint: "New memberships + POS sales they took payment for.", unit: "money", store: { type: "target", metric: "REVENUE_TOTAL", measure: "amount" }, personal: true },
    { key: "membership", label: "Commission on new memberships", hint: "Of the money received for new admissions they processed.", unit: "percent", store: { type: "line", metric: "MEMBER_ADMISSION" }, personal: true },
    { key: "pos", label: "Commission on POS sales", hint: "Of completed POS bills they rang up, after refunds.", unit: "percent", store: { type: "line", metric: "POS_SALE" }, personal: true },
    { key: "bonus", label: "Bonus for reaching the target", hint: "Paid once in a month when they reach 100% of their sales target.", unit: "money", store: { type: "bonus", metric: "REVENUE_TOTAL" }, personal: false },
  ],
};

const isTrainerRole = (r: string) => /train|coach|instruct/i.test(r);
const roleKey = (r: string | null | undefined) => (r ?? "").trim().toLowerCase();
const isCurrent = (p: IncentivePlan) => p.status === "active" && !p.effective_to;
const roleOnly = (p: IncentivePlan) => p.assignments.filter(a => !a.staff_id && a.role);
const num = (v: string | undefined) => (v == null || v.trim() === "" ? null : Number(v));

/** Simple, readable value of a field in a plan / target. */
function readField(f: Field, plan: IncentivePlan | null, target: TargetRecord | undefined): string {
  const st = f.store;
  if (st.type === "target") {
    const l = target?.lines.find(x => x.metric === st.metric && x.measure === st.measure);
    return l ? String(Number(l.goal)) : "";
  }
  if (st.type === "line") {
    const l = plan?.lines.find(x => x.metric === st.metric && x.basis === "percent_of_amount" && !x.min_units && !x.cap_amount);
    return l ? String(Number(l.rate)) : "";
  }
  const b = plan?.bonuses.find(x => x.metric === st.metric && Number(x.threshold_pct) === 100 && x.reward_type === "fixed" && !x.condition_metric);
  return b ? String(Number(b.reward_value)) : "";
}

/** Lines / bonuses / target lines this page does not manage for a kind. */
function managedLine(kind: Kind, l: PlanLine) {
  return FIELDS[kind].some(f => f.store.type === "line" && f.store.metric === l.metric) && l.basis === "percent_of_amount" && !l.min_units && !l.cap_amount;
}
function managedBonus(kind: Kind, b: PlanBonus) {
  return FIELDS[kind].some(f => f.store.type === "bonus" && f.store.metric === b.metric) && Number(b.threshold_pct) === 100 && b.reward_type === "fixed" && !b.condition_metric;
}
function managedTarget(kind: Kind, l: TargetLine) {
  return FIELDS[kind].some(f => f.store.type === "target" && f.store.metric === l.metric && f.store.measure === l.measure);
}

interface Group {
  key: string;
  name: string;
  kind: Kind;
  people: OverviewRow[];
  plan: IncentivePlan | null;        // the role's own plan
  shared: IncentivePlan | null;      // a plan shared with other roles, when it has none of its own
  target: TargetRecord | undefined;  // the role's target in force this month
}

interface Props {
  rows: OverviewRow[];
  plans: IncentivePlan[];
  /** Targets in force for the current month. */
  targets: TargetRecord[];
  currentPeriod: string;
  activeBranchId: number | null;
  canEdit: boolean;
  onSaved: () => void;
}

export function SetupCards({ rows, plans, targets, currentPeriod, activeBranchId, canEdit, onSaved }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const inBranch = (p: IncentivePlan) => p.branch_id == null || activeBranchId == null || p.branch_id === activeBranchId;
  const best = (list: IncentivePlan[]) => [...list].sort((a, b) =>
    Number(b.branch_id != null) - Number(a.branch_id != null) || b.effective_from.localeCompare(a.effective_from) || b.id - a.id)[0] ?? null;

  const groups = useMemo<Group[]>(() => {
    const byKey = new Map<string, OverviewRow[]>();
    rows.forEach(r => { const k = roleKey(r.role); if (k) byKey.set(k, [...(byKey.get(k) ?? []), r]); });
    const current = plans.filter(p => isCurrent(p) && inBranch(p));
    return Array.from(byKey.entries()).map(([key, people]) => {
      const covering = current.filter(p => roleOnly(p).some(a => roleKey(a.role) === key));
      const own = best(covering.filter(p => !p.assignments.some(a => a.staff_id) && roleOnly(p).every(a => roleKey(a.role) === key)));
      const name = people[0].role as string;
      return {
        key, name, kind: (isTrainerRole(name) ? "trainer" : "staff") as Kind, people,
        plan: own, shared: own ? null : best(covering),
        target: targets.find(t => t.scope === "role" && roleKey(t.role) === key),
      };
    }).sort((a, b) => Number(b.kind === "trainer") - Number(a.kind === "trainer") || a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, plans, targets, activeBranchId]);

  if (groups.length === 0) {
    return <Panel><Empty icon={Users} title="No staff yet">Add staff with a role, then set their targets and commission here.</Empty></Panel>;
  }

  return (
    <div className={s.stack} style={{ gap: "0.75rem" }}>
      <Note tone="teal" icon={Dumbbell}>
        <b>PT:</b> when a member pays for PT (a package or a single session), the trainer's target moves by the full amount.
        Commission is the trainer's % of it — all at once, or month by month as sessions are used for packages set to “On completion” (set on each package).
      </Note>
      {groups.map(g => (
        <RoleCard key={g.key} group={g} plans={plans} targets={targets} currentPeriod={currentPeriod} activeBranchId={activeBranchId}
          canEdit={canEdit} editing={editing === g.key} onEdit={() => setEditing(g.key)} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onSaved(); }} />
      ))}
    </div>
  );
}

function RoleCard({ group: g, plans, targets, currentPeriod, activeBranchId, canEdit, editing, onEdit, onClose, onSaved }: {
  group: Group; plans: IncentivePlan[]; targets: TargetRecord[]; currentPeriod: string; activeBranchId: number | null;
  canEdit: boolean; editing: boolean; onEdit: () => void; onClose: () => void; onSaved: () => void;
}) {
  const money = useMoneyText();
  const fields = FIELDS[g.kind];
  const rolePlan = g.plan ?? g.shared;
  const personalPlan = (r: OverviewRow) => plans.find(p => isCurrent(p) && p.assignments.some(a => a.staff_id === r.staff_id)) ?? null;
  const staffTarget = (r: OverviewRow) => targets.find(t => t.scope === "staff" && t.staff_id === r.staff_id);

  const roleValues = useMemo(() => Object.fromEntries(fields.map(f => [f.key, readField(f, rolePlan, g.target)])), [fields, rolePlan, g.target]);

  /** A person's own values: only what differs from the role (blank = role's). */
  const personValues = (r: OverviewRow) => {
    const pp = personalPlan(r);
    const st = staffTarget(r);
    const out: Record<string, string> = {};
    fields.filter(f => f.personal).forEach(f => {
      const v = f.store.type === "target" ? readField(f, null, st) : pp ? readField(f, pp, undefined) : "";
      if (v !== "" && v !== roleValues[f.key]) out[f.key] = v;
    });
    return out;
  };

  const older = useMemo(() => ({
    lines: (rolePlan?.lines ?? []).filter(l => !managedLine(g.kind, l)),
    bonuses: (rolePlan?.bonuses ?? []).filter(b => !managedBonus(g.kind, b)),
    targets: (g.target?.lines ?? []).filter(l => !managedTarget(g.kind, l)),
  }), [rolePlan, g.target, g.kind]);
  const hasOlder = older.lines.length + older.bonuses.length + older.targets.length > 0;

  const fmt = (f: Field, v: string) => v === "" ? null : f.unit === "money" ? money(Number(v)) : f.unit === "percent" ? `${Number(v)}%` : String(Number(v));
  const thisMonth = g.people.reduce((t, r) => t + Number(r.months.find(m => m.period === currentPeriod)?.commission || 0), 0);

  return (
    <Panel
      title={<span className={s.row} style={{ gap: "0.5rem" }}>{g.kind === "trainer" ? <Dumbbell size={16} /> : <Users size={16} />}{g.name}</span>}
      description={<>{g.people.length} {g.people.length === 1 ? "person" : "people"} · {periodLabel(currentPeriod)} commission so far <span className={s.strong}><Money value={thisMonth} /></span></>}
      actions={canEdit && !editing && <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="h-4 w-4 mr-1" />Edit</Button>}
    >
      {editing ? (
        <RoleEditor group={g} fields={fields} roleValues={roleValues} personValues={personValues} personalPlan={personalPlan}
          staffTarget={staffTarget} older={older} currentPeriod={currentPeriod} activeBranchId={activeBranchId} onClose={onClose} onSaved={onSaved} />
      ) : (
        <div className={s.stack} style={{ gap: "0.75rem" }}>
          <div className={s.stats}>
            {fields.map(f => <Stat key={f.key} label={f.label} value={fmt(f, roleValues[f.key]) ?? <span className={s.muted}>Not set</span>} />)}
          </div>
          {!roleValues.target && <div className={s.cellSub}>No target yet — progress isn't measured for this role.</div>}
          {g.shared && <div className={s.cellSub}>Uses the “{g.shared.name}” plan shared with other roles. Saving here gives {g.name} its own settings.</div>}
          {(() => {
            const custom = g.people.map(r => ({ r, v: personValues(r) })).filter(x => Object.keys(x.v).length > 0);
            if (!custom.length) return null;
            return (
              <div className={s.cellSub}>
                Different for: {custom.map(({ r, v }, i) => (
                  <span key={r.staff_id}>{i ? " · " : ""}<span className={s.strong}>{r.name}</span> ({fields.filter(f => v[f.key]).map(f => `${f.label.replace(/^Monthly |Commission on |\s*\(optional\)/g, "").toLowerCase()} ${fmt(f, v[f.key])}`).join(", ")})</span>
                ))}
              </div>
            );
          })()}
          {hasOlder && (
            <Note tone="amber">
              Also has older settings: {[...older.lines.map(l => `${metricLabel(l.metric)} ${lineText(l, money)}`),
                ...older.bonuses.map(b => `bonus on ${metricLabel(b.metric).toLowerCase()}`),
                ...older.targets.map(l => `${metricLabel(l.metric).toLowerCase()} target`)].join(", ")}. Click Edit to review or remove them.
            </Note>
          )}
        </div>
      )}
    </Panel>
  );
}

function RoleEditor({ group: g, fields, roleValues, personValues, personalPlan, staffTarget, older, currentPeriod, activeBranchId, onClose, onSaved }: {
  group: Group; fields: Field[]; roleValues: Record<string, string>;
  personValues: (r: OverviewRow) => Record<string, string>;
  personalPlan: (r: OverviewRow) => IncentivePlan | null;
  staffTarget: (r: OverviewRow) => TargetRecord | undefined;
  older: { lines: PlanLine[]; bonuses: PlanBonus[]; targets: TargetLine[] };
  currentPeriod: string; activeBranchId: number | null; onClose: () => void; onSaved: () => void;
}) {
  const money = useMoneyText();
  const [role, setRole] = useState<Record<string, string>>(roleValues);
  const [people, setPeople] = useState<Record<number, Record<string, string>>>(() =>
    Object.fromEntries(g.people.map(r => [r.staff_id, personValues(r)])));
  const [keepOlder, setKeepOlder] = useState(() => ({
    lines: older.lines.map(() => true), bonuses: older.bonuses.map(() => true), targets: older.targets.map(() => true),
  }));
  const [saving, setSaving] = useState(false);
  const personalFields = fields.filter(f => f.personal);

  const planLines = (vals: Record<string, string>): PlanLine[] => [
    ...fields.filter(f => f.store.type === "line" && Number(vals[f.key]) > 0)
      .map(f => ({ metric: f.store.metric, basis: "percent_of_amount" as const, rate: Number(vals[f.key]) })),
    ...older.lines.filter((_, i) => keepOlder.lines[i]),
  ];
  const planBonuses = (vals: Record<string, string>): PlanBonus[] => [
    ...fields.filter(f => f.store.type === "bonus" && Number(vals[f.key]) > 0)
      .map(f => ({ metric: f.store.metric, threshold_pct: 100, reward_type: "fixed" as const, reward_value: Number(vals[f.key]) })),
    ...older.bonuses.filter((_, i) => keepOlder.bonuses[i]),
  ];
  const targetLines = (vals: Record<string, string>, onlyPersonal = false): TargetLine[] =>
    fields.filter(f => f.store.type === "target" && (!onlyPersonal || f.personal) && Number(vals[f.key]) > 0).map(f => {
      const st = f.store as { metric: MetricCode; measure: Measure };
      return { metric: st.metric, measure: st.measure, goal: Number(vals[f.key]) };
    });

  /** Create, update, or (when months were approved under it) version a plan. */
  const savePlan = async (existing: IncentivePlan | null, req: PlanRequest) => {
    if (!existing) return performanceService.createPlan(req);
    if (existing.settled_months > 0) return performanceService.newPlanVersion(existing.id, { ...req, effective_from: currentPeriod });
    return performanceService.updatePlan(existing.id, { ...req, effective_from: existing.effective_from });
  };

  const save = async () => {
    for (const vals of [role, ...Object.values(people)]) {
      for (const f of fields) {
        const v = num(vals[f.key]);
        if (v != null && (isNaN(v) || v < 0)) { toast.error(`${f.label}: enter a positive number`); return; }
        if (f.unit === "percent" && v != null && v > 100) { toast.error(`${f.label}: a percentage can't be more than 100`); return; }
      }
    }
    setSaving(true);
    try {
      // 1. Role target, repeating from this month.
      await performanceService.saveTarget({
        scope: "role", role: g.name, branch_id: activeBranchId, period: currentPeriod, repeat_monthly: true,
        lines: [...targetLines(role), ...older.targets.filter((_, i) => keepOlder.targets[i])],
      });

      // 2. Role plan (its own; a shared one is left to the other roles).
      const lines = planLines(role);
      const bonuses = planBonuses(role);
      if (g.plan || lines.length || bonuses.length) {
        await savePlan(g.plan, {
          name: g.plan?.name ?? g.name,
          branch_id: g.plan ? g.plan.branch_id : activeBranchId,
          effective_from: currentPeriod,
          status: "active",
          assignments: g.plan ? g.plan.assignments : [{ role: g.name, staff_id: null }],
          lines, bonuses,
        });
      }

      // 3. People: own target lines, and a personal plan only when their commission differs.
      for (const r of g.people) {
        const before = personValues(r);
        const now = people[r.staff_id] ?? {};
        const same = (k: string) => (before[k] ?? "") === (now[k] ?? "");
        const merged = { ...role, ...Object.fromEntries(Object.entries(now).filter(([, v]) => v.trim() !== "")) };

        const targetFields = personalFields.filter(f => f.store.type === "target");
        if (!targetFields.every(f => same(f.key))) {
          const own = targetLines(Object.fromEntries(targetFields.map(f => [f.key, now[f.key] ?? ""])), true);
          const otherLines = (staffTarget(r)?.lines ?? []).filter(l => !managedTarget(g.kind, l));
          await performanceService.saveTarget({ scope: "staff", staff_id: r.staff_id, period: currentPeriod, repeat_monthly: true, lines: [...own, ...otherLines] });
        }

        // A personal plan is always "the role's settings + their own %", rewritten on every save.
        const lineFields = personalFields.filter(f => f.store.type === "line");
        const pp = personalPlan(r);
        if (lineFields.some(f => (now[f.key] ?? "").trim() !== "")) {
          await savePlan(pp, {
            name: pp?.name ?? `${r.name} (own rates)`,
            branch_id: pp ? pp.branch_id : activeBranchId,
            effective_from: currentPeriod,
            status: "active",
            assignments: [{ role: null, staff_id: r.staff_id }],
            lines: planLines(merged), bonuses: planBonuses(merged),
          });
        } else if (pp) {
          await performanceService.deletePlan(pp.id); // back to the role's rates (archived if months were approved)
        }
      }
      toast.success(`${g.name} saved — applies from ${periodLabel(currentPeriod)}`);
      onSaved();
    } catch (e) {
      toast.error(errorMessage(e, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={s.stack} style={{ gap: "1rem" }}>
      <div className={s.stack} style={{ gap: "0.625rem" }}>
        {fields.map(f => (
          <div key={f.key} className={s.spread} style={{ gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: "1 1 16rem", minWidth: 0 }}>
              <div className={s.strong} style={{ fontSize: "0.875rem" }}>
                {f.unit === "percent" ? <Percent size={13} style={{ display: "inline", marginRight: 4 }} /> : f.store.type === "bonus" ? <Award size={13} style={{ display: "inline", marginRight: 4 }} /> : <Target size={13} style={{ display: "inline", marginRight: 4 }} />}
                {f.label}
              </div>
              <div className={s.cellSub}>{f.hint}</div>
            </div>
            <div className={s.row} style={{ gap: "0.375rem" }}>
              <Input type="number" min={0} step={f.unit === "percent" ? "0.5" : "1"} className="h-9" style={{ width: "8rem" }}
                placeholder={f.store.type === "bonus" || f.key === "sessions" ? "None" : "0"}
                value={role[f.key] ?? ""} onChange={e => setRole(v => ({ ...v, [f.key]: e.target.value }))} />
              {f.unit === "percent" && <span className={s.muted}>%</span>}
            </div>
          </div>
        ))}
      </div>

      {g.people.length > 0 && (
        <div>
          <div className={s.sectionLabel}>Different for someone?</div>
          <div className={s.cellSub} style={{ marginBottom: "0.375rem" }}>Leave blank to use the role's value.</div>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr><th>Person</th>{personalFields.map(f => <th key={f.key}>{f.label.replace(/^Monthly |\s*\(optional\)/g, "")}</th>)}<th /></tr>
              </thead>
              <tbody>
                {g.people.map(r => {
                  const v = people[r.staff_id] ?? {};
                  const any = Object.values(v).some(x => x.trim() !== "");
                  return (
                    <tr key={r.staff_id}>
                      <td className={s.strong}>{r.name}</td>
                      {personalFields.map(f => (
                        <td key={f.key}>
                          <Input type="number" min={0} className="h-8" style={{ width: "7rem" }}
                            placeholder={role[f.key] ? (f.unit === "percent" ? `${role[f.key]}%` : f.unit === "money" ? money(Number(role[f.key])) : role[f.key]) : "—"}
                            value={v[f.key] ?? ""} onChange={e => setPeople(p => ({ ...p, [r.staff_id]: { ...v, [f.key]: e.target.value } }))} />
                        </td>
                      ))}
                      <td className={s.right}>
                        {any && <button type="button" className={s.iconBtn} title="Use the role's values" onClick={() => setPeople(p => ({ ...p, [r.staff_id]: {} }))}><X size={14} /></button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(older.lines.length + older.bonuses.length + older.targets.length) > 0 && (
        <div className={s.section} data-tone="amber">
          <div className={s.sectionTitle}>Older settings</div>
          <div className={s.cellSub} style={{ marginBottom: "0.375rem" }}>Set up before this page was simplified. They still count until removed.</div>
          {older.lines.map((l, i) => (
            <OlderRow key={`l${i}`} kept={keepOlder.lines[i]} text={`Pays ${lineText(l, money)} on ${metricLabel(l.metric).toLowerCase()}`}
              onToggle={() => setKeepOlder(k => ({ ...k, lines: k.lines.map((x, j) => j === i ? !x : x) }))} />
          ))}
          {older.bonuses.map((b, i) => (
            <OlderRow key={`b${i}`} kept={keepOlder.bonuses[i]}
              text={`Bonus at ${Number(b.threshold_pct)}% of ${metricLabel(b.metric).toLowerCase()} target → ${b.reward_type === "fixed" ? money(Number(b.reward_value)) : `${Number(b.reward_value)}%`}`}
              onToggle={() => setKeepOlder(k => ({ ...k, bonuses: k.bonuses.map((x, j) => j === i ? !x : x) }))} />
          ))}
          {older.targets.map((l, i) => (
            <OlderRow key={`t${i}`} kept={keepOlder.targets[i]}
              text={`${metricLabel(l.metric)} target: ${l.measure === "amount" ? money(Number(l.goal)) : Number(l.goal)}`}
              onToggle={() => setKeepOlder(k => ({ ...k, targets: k.targets.map((x, j) => j === i ? !x : x) }))} />
          ))}
        </div>
      )}

      {g.plan && g.plan.settled_months > 0 && (
        <Note tone="blue">Months already approved keep the old rates; the new ones apply from {periodLabel(currentPeriod)}.</Note>
      )}

      <div className={s.row} style={{ gap: "0.5rem", justifyContent: "flex-end" }}>
        <Button variant="outline" onClick={onClose}><X className="h-4 w-4 mr-1" />Cancel</Button>
        <Button disabled={saving} onClick={save}><Save className="h-4 w-4 mr-1" />{saving ? "Saving…" : "Save"}</Button>
      </div>
    </div>
  );
}

function OlderRow({ kept, text, onToggle }: { kept: boolean; text: string; onToggle: () => void }) {
  return (
    <div className={s.spread} style={{ minHeight: "2rem" }}>
      <span className={cx(s.small, !kept && s.muted)} style={{ textDecoration: kept ? undefined : "line-through" }}>{text}</span>
      <button type="button" className={s.iconBtn} data-tone={kept ? "red" : undefined} title={kept ? "Remove" : "Keep"} onClick={onToggle}>
        {kept ? <Trash2 size={14} /> : <span className={s.small}>Undo</span>}
      </button>
    </div>
  );
}
