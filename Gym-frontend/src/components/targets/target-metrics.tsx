import React from "react";
import { Target, CreditCard, ShoppingBag, Dumbbell, CalendarCheck, type LucideIcon } from "lucide-react";
import type { StaffTarget } from "../../utils/supabase/staff-service";
import { Badge, Money, ProgressBar, Tone, cx, wf as s } from "../workforce/ui";

/**
 * The headline figures of a staff target: overall revenue, the three revenue categories
 * (memberships excluding PT, POS, PT) and PT sessions delivered. Shared by the admin
 * Staff Targets board and a staff member's own My Targets page.
 */
export type MetricKey = "overall" | "memberships" | "pos" | "pt" | "pt_sessions";

export interface TargetMetric {
  key: MetricKey;
  label: string;
  hint: string;
  icon: LucideIcon;
  tone: Tone;
  money: boolean;
  /** 0 = no target set for this metric. */
  target: number;
  achieved: number;
}

export interface UnitTargetRow {
  service: string;
  target_units: number;
  achieved_units: number;
}

export const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
export const achTone = (p: number): Tone => (p >= 100 ? "green" : p >= 80 ? "amber" : "red");

export function parseUnitTargets(t: StaffTarget | null | undefined): UnitTargetRow[] {
  if (!t?.unit_targets_json) return [];
  try {
    const list = JSON.parse(t.unit_targets_json);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Target units for one unit type (rows can repeat a type; they add up). */
export function unitTarget(t: StaffTarget, type: string): number {
  return parseUnitTargets(t).filter(u => u.service === type).reduce((sum, u) => sum + Number(u.target_units || 0), 0);
}

/** Live units done for one unit type (units_achieved), falling back to the stored rows. */
export function unitAchieved(t: StaffTarget, type: string): number {
  const live = t.units_achieved?.[type];
  if (live != null) return Number(live);
  return parseUnitTargets(t).filter(u => u.service === type).reduce((sum, u) => sum + Number(u.achieved_units || 0), 0);
}

export function targetMetrics(t: StaffTarget): TargetMetric[] {
  const n = (v: number | null | undefined) => Number(v || 0);
  return [
    { key: "overall", label: "Overall revenue", hint: "Memberships + POS + PT", icon: Target, tone: "teal", money: true,
      target: n(t.revenue_target), achieved: n(t.revenue_achieved) },
    { key: "memberships", label: "Membership revenue", hint: "Admissions, renewals, add-ons, walk-ins", icon: CreditCard, tone: "blue", money: true,
      target: n(t.membership_revenue_target), achieved: n(t.membership_revenue_achieved) },
    { key: "pos", label: "POS sales", hint: "Completed POS bills, after refunds", icon: ShoppingBag, tone: "orange", money: true,
      target: n(t.pos_revenue_target), achieved: n(t.pos_revenue_achieved) },
    { key: "pt", label: "PT revenue", hint: "PT packages sold + paid bookings on their PT sessions", icon: Dumbbell, tone: "violet", money: true,
      target: n(t.pt_revenue_target), achieved: n(t.pt_revenue_achieved) },
    { key: "pt_sessions", label: "PT sessions", hint: "Their PT sessions members booked", icon: CalendarCheck, tone: "rose", money: false,
      target: unitTarget(t, "pt_sessions"), achieved: unitAchieved(t, "pt_sessions") },
  ];
}

const value = (m: TargetMetric, v: number) => (m.money ? <Money value={v} /> : v.toLocaleString());

/** Compact table cell: achieved, "of target", and a bar when a target is set. */
export function MetricCell({ metric }: { metric: TargetMetric }) {
  const p = pct(metric.achieved, metric.target);
  return (
    <div style={{ minWidth: "7.5rem" }}>
      <div className={s.strong}>{value(metric, metric.achieved)}</div>
      {metric.target > 0 ? (
        <>
          <div className={s.cellSub}>of {value(metric, metric.target)} · <span data-tone={achTone(p)} className={s.toneText}>{p}%</span></div>
          <div style={{ marginTop: 4 }}><ProgressBar value={p} tone={achTone(p)} /></div>
        </>
      ) : (
        <div className={s.cellSub}>No target</div>
      )}
    </div>
  );
}

/** Card with the metric, its target, remaining and a progress bar. */
export function MetricCard({ metric }: { metric: TargetMetric }) {
  const p = pct(metric.achieved, metric.target);
  const Icon = metric.icon;
  const remaining = Math.max(0, metric.target - metric.achieved);
  return (
    <div className={s.section} data-tone={metric.tone}>
      <div className={s.spread} style={{ marginBottom: "0.5rem" }}>
        <span className={s.row} style={{ gap: "0.4rem" }}>
          <span data-tone={metric.tone} className={s.toneText}><Icon size={16} /></span>
          <span className={s.strong}>{metric.label}</span>
        </span>
        {metric.target > 0
          ? <Badge tone={achTone(p)}>{p >= 100 ? "Achieved" : p >= 80 ? "Near" : "Below"} · {p}%</Badge>
          : <Badge plain>No target</Badge>}
      </div>
      <div className={cx(s.row)} style={{ alignItems: "baseline", gap: "0.35rem" }}>
        <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>{value(metric, metric.achieved)}</span>
        {metric.target > 0 && <span className={cx(s.small, s.muted)}>of {value(metric, metric.target)}</span>}
      </div>
      {metric.target > 0 && <div style={{ marginTop: "0.5rem" }}><ProgressBar value={p} tone={metric.tone} /></div>}
      <div className={s.cellSub} style={{ marginTop: "0.4rem" }}>
        {metric.target > 0
          ? remaining > 0 ? <>{value(metric, remaining)} to go · {metric.hint}</> : <>Target reached · {metric.hint}</>
          : metric.hint}
      </div>
    </div>
  );
}

export function MetricGrid({ target }: { target: StaffTarget }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(13rem, 1fr))", gap: "0.75rem" }}>
      {targetMetrics(target).map(m => <MetricCard key={m.key} metric={m} />)}
    </div>
  );
}
