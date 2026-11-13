import { authService } from './auth-service';
import { parseApiError } from './api-error';

/**
 * Performance & incentives engine (/api/performance): targets, incentive plans, commission
 * settlements and the "Unassigned sales" list. Every figure comes from the backend engine;
 * nothing here calculates commission.
 */

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
// Month boundaries are the gym's local time: the backend uses the branch time zone, else this browser's.
const CLIENT_TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; } })();

// ── Metrics ─────────────────────────────────────────────────────────────────

export type MetricCode =
  | 'MEMBER_ADMISSION' | 'LEAD_CONVERSION' | 'POS_SALE'
  | 'PT_SESSION_DELIVERED' | 'CLASS_TAUGHT' | 'CLASS_ATTENDEE' | 'PT_SALE' | 'PT_REVENUE' | 'REVENUE_TOTAL';
export type Measure = 'count' | 'amount';

export interface MetricDef {
  code: MetricCode;
  label: string;
  audience: 'staff' | 'trainer' | 'both';
  has_count: boolean;
  has_amount: boolean;
  virtual: boolean;
}

/** Labels and units shown in the web app (the backend sends English labels too). */
export const METRICS: Array<{ code: MetricCode; label: string; unit: string; hasCount: boolean; hasAmount: boolean; hint: string }> = [
  { code: 'REVENUE_TOTAL', label: 'Total revenue', unit: 'revenue', hasCount: false, hasAmount: true, hint: 'Admissions + POS sales + PT sales' },
  { code: 'MEMBER_ADMISSION', label: 'New member admissions', unit: 'admission', hasCount: true, hasAmount: true, hint: 'New-member receipts they processed (money received)' },
  { code: 'LEAD_CONVERSION', label: 'Lead conversions', unit: 'conversion', hasCount: true, hasAmount: false, hint: 'Leads assigned to them marked converted' },
  { code: 'POS_SALE', label: 'POS sales', unit: 'sale', hasCount: true, hasAmount: true, hint: 'Completed POS bills they rang up, net of refunds' },
  { code: 'PT_SESSION_DELIVERED', label: 'PT sessions delivered', unit: 'session', hasCount: true, hasAmount: false, hint: 'PT sessions they trained where the member came (checked in, or a counted no-show)' },
  { code: 'CLASS_TAUGHT', label: 'Classes taught', unit: 'class', hasCount: true, hasAmount: false, hint: 'Classes they led with at least one booking' },
  { code: 'CLASS_ATTENDEE', label: 'Class attendees', unit: 'attendee', hasCount: true, hasAmount: false, hint: 'Members checked in to their classes' },
  { code: 'PT_SALE', label: 'PT sales', unit: 'sale', hasCount: true, hasAmount: true, hint: 'Money members paid for PT with them: packages and paid PT sessions, counted on payment' },
  { code: 'PT_REVENUE', label: 'PT earned for commission', unit: 'revenue', hasCount: false, hasAmount: true, hint: "PT money their commission is paid on: all at once for packages set to 'on booking' and paid sessions, or month by month as sessions are used for 'on completion' packages" },
];
export const metricLabel = (code: string) => METRICS.find(m => m.code === code)?.label ?? code;
export const metricUnit = (code: string) => METRICS.find(m => m.code === code)?.unit ?? 'unit';

// ── Results ─────────────────────────────────────────────────────────────────

export type SettlementStatus = 'estimated' | 'pending' | 'approved' | 'paid' | 'rejected';

export interface AchievedFigure { count: number | null; amount: number | null }

export interface GoalFigure {
  metric: MetricCode;
  label: string;
  measure: Measure;
  goal: number;
  achieved: number;
  percent: number | null;
  source: 'staff' | 'role' | 'branch';
  target_id: number;
}

export interface IncentiveLineResult {
  line_id: number | null;
  metric: MetricCode | null;
  label: string;
  basis: 'percent_of_amount' | 'fixed_per_unit' | null;
  rate: number | null;
  units: number;
  base: number | null;
  earned: number;
  min_units: number | null;
  cap_amount: number | null;
  below_minimum: boolean;
  capped: boolean;
}

export interface IncentiveBonusResult {
  bonus_id: number | null;
  metric: MetricCode;
  label: string;
  threshold_pct: number;
  attainment_pct: number | null;
  reward_type: 'fixed' | 'percent_of_metric_amount';
  reward_value: number;
  reached: boolean;
  condition_met: boolean;
  earned: number;
}

export interface IncentiveResult {
  plan_id: number | null;
  plan_name: string | null;
  has_plan: boolean;
  legacy: boolean;
  total: number;
  lines: IncentiveLineResult[];
  bonuses: IncentiveBonusResult[];
}

export interface Settlement {
  status: SettlementStatus;
  amount: number;
  computed_amount: number | null;
  adjustment_amount: number | null;
  note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  paid_at: string | null;
  payroll_run_id: number | null;
  plan_id: number | null;
}

export interface PeriodFigures {
  period: string;
  achieved: Record<MetricCode, AchievedFigure>;
  goals: GoalFigure[];
  incentive: IncentiveResult;
  settlement: Settlement;
  /** Frozen amount once decided, else the live estimate. */
  commission: number;
}

export interface OverviewRow {
  staff_id: number;
  staff_code: string | null;
  name: string;
  role: string | null;
  department: string | null;
  branch: string | null;
  photo_url: string | null;
  plan: { id: number; name: string } | null;
  months: PeriodFigures[];
}

export interface BranchFigures {
  branch_id: number | null;
  period: string;
  achieved: Record<MetricCode, AchievedFigure>;
  goals: GoalFigure[];
}

export interface PerformanceOverview {
  periods: string[];
  current_period: string;
  rows: OverviewRow[];
  branch: BranchFigures;
}

export interface MyPerformance extends PeriodFigures {
  staff_id: number;
  name: string;
  role: string | null;
  plan: IncentivePlan | null;
}

// ── Targets ─────────────────────────────────────────────────────────────────

export type TargetScope = 'staff' | 'role' | 'branch';

export interface TargetLine { metric: MetricCode; measure: Measure; goal: number }

export interface TargetRecord {
  id: number;
  scope: TargetScope;
  staff_id: number | null;
  role: string | null;
  branch_id: number | null;
  period: string;
  repeat_monthly: boolean;
  lines: TargetLine[];
}

export interface TargetRequest {
  scope: TargetScope;
  staff_id?: number | null;
  role?: string | null;
  branch_id?: number | null;
  period: string;
  repeat_monthly?: boolean;
  lines: TargetLine[];
}

// ── Incentive plans ─────────────────────────────────────────────────────────

export interface PlanLine {
  id?: number;
  metric: MetricCode;
  basis: 'percent_of_amount' | 'fixed_per_unit';
  rate: number;
  min_units?: number | null;
  cap_amount?: number | null;
}

export interface PlanBonus {
  id?: number;
  metric: MetricCode;
  threshold_pct: number;
  reward_type: 'fixed' | 'percent_of_metric_amount';
  reward_value: number;
  condition_metric?: MetricCode | null;
  condition_min?: number | null;
}

export interface IncentivePlan {
  id: number;
  name: string;
  branch_id: number | null;
  effective_from: string;
  effective_to: string | null;
  status: 'draft' | 'active' | 'archived';
  settled_months: number;
  assignments: Array<{ role: string | null; staff_id: number | null }>;
  lines: PlanLine[];
  bonuses: PlanBonus[];
}

export type PlanRequest = Omit<IncentivePlan, 'id' | 'effective_to' | 'settled_months'>;

export interface PlanPreview {
  period: string;
  /** What the previewed plan would pay everyone listed. */
  total: number;
  /** What they actually got (or are getting) under their current plans. */
  actual: number;
  rows: Array<{ staff_id: number; name: string | null; total: number; actual: number; incentive: IncentiveResult }>;
}

// ── Credited activity ───────────────────────────────────────────────────────

export interface CreditEvent {
  id: number;
  metric: MetricCode;
  occurred_at: string;
  quantity: number;
  amount: number | null;
  source_type: string;
  source_id: number;
  correction: boolean;
  /** "b:<booking>" = one package session used, "d:<yyyy-MM>" = a month of a day package, "expiry" = unused sessions paid out */
  part?: string;
  title: string | null;
  person: string | null;
  /** at the month's plan rates, before caps and bonuses */
  commission: number;
}

// ── Unassigned ──────────────────────────────────────────────────────────────

export interface UnassignedRow {
  id: number;
  date: string | null;
  title: string | null;
  recorded_as: string | null;
  amount: number | null;
  created_by: string | null;
  branch_id: number | null;
}

export interface UnassignedList {
  receipts: UnassignedRow[];
  sales: UnassignedRow[];
  leads: UnassignedRow[];
  total: number;
}

// ── Request helper ──────────────────────────────────────────────────────────

async function request<T>(path: string, fallback: string, init?: RequestInit): Promise<T> {
  const res = await authService.makeAuthenticatedRequest(`${BASE}/performance${path}`, {
    ...init,
    headers: { ...(init?.headers as Record<string, string> | undefined), ...(CLIENT_TZ ? { 'X-Client-Timezone': CLIENT_TZ } : {}) },
  });
  if (!res.ok) throw new Error(await parseApiError(res, fallback));
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const post = (body?: unknown): RequestInit => ({ method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
const put = (body: unknown): RequestInit => ({ method: 'PUT', body: JSON.stringify(body) });
const del: RequestInit = { method: 'DELETE' };

export type SettlementAction = 'approve' | 'reject' | 'pay' | 'reset';

/** Per person, what the monthly overview doesn't carry (GET /performance/staff-extras). */
export interface StaffExtra {
  staff_id: number;
  leads_assigned: number;
  leads_converted: number;
  follow_ups_total: number;
  follow_ups_completed: number;
  /** Members' average rating of the sessions they trained, 0 = none. */
  rating: number;
  rating_count: number;
}

export const performanceService = {
  overview: (from: string, to: string, staffId?: number) =>
    request<PerformanceOverview>(`/overview?from=${from}&to=${to}${staffId ? `&staff_id=${staffId}` : ''}`, 'Failed to load performance'),
  staffExtras: () => request<StaffExtra[]>('/staff-extras', 'Failed to load staff figures'),
  me: (period?: string) => request<MyPerformance>(`/me${period ? `?period=${period}` : ''}`, 'Failed to load your performance'),
  decide: (action: SettlementAction, body: { staff_id: number; period: string; note?: string; adjustment?: number }) =>
    request<Settlement>(`/settlements/${action}`, `Failed to ${action} commission`, post(body)),
  approveAll: (period: string) =>
    request<{ approved: number }>('/settlements/bulk/approve', 'Failed to approve commission', post({ period })),

  targets: (period: string) => request<TargetRecord[]>(`/targets?period=${period}`, 'Failed to load targets'),
  saveTarget: (body: TargetRequest) => request<TargetRecord | undefined>('/targets', 'Failed to save target', put(body)),
  deleteTarget: (id: number) => request<void>(`/targets/${id}`, 'Failed to delete target', del),
  copyTargets: (from: string, to: string) => request<{ copied: number }>('/targets/copy', 'Failed to copy targets', post({ from, to })),

  plans: () => request<IncentivePlan[]>('/plans', 'Failed to load incentive plans'),
  createPlan: (body: PlanRequest) => request<IncentivePlan>('/plans', 'Failed to create plan', post(body)),
  updatePlan: (id: number, body: PlanRequest) => request<IncentivePlan>(`/plans/${id}`, 'Failed to save plan', put(body)),
  newPlanVersion: (id: number, body: PlanRequest) => request<IncentivePlan>(`/plans/${id}/versions`, 'Failed to create a new version', post(body)),
  deletePlan: (id: number) => request<void>(`/plans/${id}`, 'Failed to delete plan', del),
  /** What an unsaved plan would pay these people for a month (default: last month), next to what they got. */
  previewPlan: (body: { plan: PlanRequest; staff_ids: number[]; period?: string }) =>
    request<PlanPreview>('/plans/preview', 'Failed to preview plan', post(body)),

  events: (staffId: number, period: string) =>
    request<CreditEvent[]>(`/events?staff_id=${staffId}&period=${period}`, 'Failed to load activity'),

  unassigned: (months = 6) => request<UnassignedList>(`/unassigned?months=${months}`, 'Failed to load unassigned sales'),
  assign: (type: 'receipt' | 'sale' | 'lead', id: number, staffId: number | null) =>
    request<void>(`/unassigned/${type}/${id}`, 'Failed to assign', put({ staff_id: staffId })),
};

/** The goal on a metric/measure in a month's figures, or null. */
export const goalOf = (m: PeriodFigures | BranchFigures, metric: MetricCode, measure: Measure) =>
  m.goals.find(g => g.metric === metric && g.measure === measure) ?? null;

export const amountOf = (m: PeriodFigures | BranchFigures, metric: MetricCode) => Number(m.achieved?.[metric]?.amount ?? 0);
export const countOf = (m: PeriodFigures | BranchFigures, metric: MetricCode) => Number(m.achieved?.[metric]?.count ?? 0);

/** "5% of amount", "₹150 per session" — money formatter passed in so currency follows the gym. */
export function lineText(l: Pick<PlanLine, 'metric' | 'basis' | 'rate' | 'min_units' | 'cap_amount'>, money: (n: number) => string) {
  let text = l.basis === 'percent_of_amount' ? `${Number(l.rate)}%` : `${money(Number(l.rate))} per ${metricUnit(l.metric)}`;
  if (l.min_units) text += ` (from ${l.min_units})`;
  if (l.cap_amount) text += `, max ${money(Number(l.cap_amount))}`;
  return text;
}

export function bonusText(b: Pick<PlanBonus, 'metric' | 'threshold_pct' | 'reward_type' | 'reward_value' | 'condition_metric' | 'condition_min'>, money: (n: number) => string) {
  const reward = b.reward_type === 'fixed' ? money(Number(b.reward_value)) : `${Number(b.reward_value)}% of ${metricLabel(b.metric).toLowerCase()}`;
  const cond = b.condition_metric && b.condition_min != null ? ` if ${metricLabel(b.condition_metric).toLowerCase()} ≥ ${b.condition_min}` : '';
  return `${Number(b.threshold_pct)}% of ${metricLabel(b.metric).toLowerCase()} target → ${reward}${cond}`;
}
