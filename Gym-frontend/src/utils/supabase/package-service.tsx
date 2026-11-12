import { authService } from "./auth-service";
import type { Receipt } from "./receipts-service";

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

/** sessions = "15 sessions within 60 days"; days = "a 30-day plan" (optionally capped). */
export type PackagePlanType = "sessions" | "days";
/** When the trainer's commission counts: all at sale, or share by share as the package is used. */
export type CommissionTiming = "enrolment" | "completion";
export type UnusedAtExpiry = "forfeit" | "pay_at_expiry";
export type NoShowPolicy = "counts" | "not_counted";

export interface TrainingPackage {
  id: number;
  name: string;
  description?: string | null;
  kind: string;
  plan_type: PackagePlanType;
  session_count?: number | null;
  session_cap?: number | null;
  validity_days: number;
  price: number;
  default_trainer_id?: number | null;
  default_trainer_name?: string | null;
  commission_timing: CommissionTiming;
  unused_at_expiry: UnusedAtExpiry;
  no_show_policy: NoShowPolicy;
  is_active: boolean;
  branch_id?: number | null;
  /** Sold at least once — can be deactivated but not deleted. */
  sold: boolean;
}

export interface TrainingPackageRequest {
  name: string;
  description?: string | null;
  plan_type: PackagePlanType;
  session_count?: number | null;
  session_cap?: number | null;
  validity_days: number;
  price: number;
  default_trainer_id?: number | null;
  commission_timing: CommissionTiming;
  unused_at_expiry: UnusedAtExpiry;
  no_show_policy: NoShowPolicy;
  is_active?: boolean;
  branch_id?: number | null;
}

export interface TrainerChange {
  effective_date: string;
  from_trainer_id?: number | null;
  from_trainer_name?: string | null;
  to_trainer_id?: number | null;
  to_trainer_name?: string | null;
  changed_by?: string | null;
}

/** active | upcoming | completed | expired | cancelled */
export type EnrolmentStatus = "active" | "upcoming" | "completed" | "expired" | "cancelled";

export interface PackageEnrolment {
  id: number;
  package_id: number;
  package_name: string;
  member_id: number;
  member_code?: string | null;
  member_name?: string | null;
  trainer_id?: number | null;
  trainer_name?: string | null;
  plan_type: PackagePlanType;
  /** null = unlimited (day-based with no cap) */
  sessions_total?: number | null;
  sessions_used: number;
  /** Upcoming bookings already holding a session. */
  sessions_booked: number;
  sessions_remaining?: number | null;
  validity_days: number;
  start_date: string;
  end_date: string;
  /** Day N of the plan (null before it starts). */
  day_number?: number | null;
  price: number;
  commission_timing: CommissionTiming;
  unused_at_expiry: UnusedAtExpiry;
  no_show_policy: NoShowPolicy;
  status: EnrolmentStatus;
  member_addon_id?: number | null;
  transaction_id?: string | null;
  receipt_id?: number | null;
  /** The add-on's status: Active / Pending Approval / Cancelled … */
  payment_status?: string | null;
  cancelled_at?: string | null;
  created_at?: string | null;
  trainer_changes: TrainerChange[];
}

export interface SellPackageRequest {
  package_id: number;
  member_id: number;
  trainer_id?: number | null;
  /** yyyy-mm-dd; defaults to today */
  start_date?: string;
  payment_mode: string;
  payment_breakdown?: unknown;
  paid_amount?: number;
  wallet_amount_applied?: number;
  processed_by_staff_id?: number;
  notes?: string;
}

export interface SellPackageResult {
  enrolment: PackageEnrolment;
  receipt?: Receipt | null;
}

async function failure(response: Response, fallback: string): Promise<Error> {
  const err = await response.json().catch(() => ({}));
  return new Error((err as any)?.message || fallback);
}

async function call<T>(path: string, init?: RequestInit, fallback = "Request failed"): Promise<T> {
  const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}${path}`, init);
  if (!response.ok) throw await failure(response, fallback);
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const packageService = {
  list: (activeOnly = false) =>
    call<TrainingPackage[]>(`/training-packages${activeOnly ? "?active_only=true" : ""}`, undefined, "Failed to load packages"),
  create: (body: TrainingPackageRequest) =>
    call<TrainingPackage>("/training-packages", { method: "POST", body: JSON.stringify(body) }, "Failed to save package"),
  update: (id: number, body: TrainingPackageRequest) =>
    call<TrainingPackage>(`/training-packages/${id}`, { method: "PUT", body: JSON.stringify(body) }, "Failed to save package"),
  toggleActive: (id: number) =>
    call<TrainingPackage>(`/training-packages/${id}/toggle-active`, { method: "PATCH" }, "Failed to update package"),
  remove: (id: number) =>
    call<void>(`/training-packages/${id}`, { method: "DELETE" }, "Failed to delete package"),

  enrolments: (params: { memberId?: number | string; trainerId?: number | string; status?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.memberId) q.append("member_id", String(params.memberId));
    if (params.trainerId) q.append("trainer_id", String(params.trainerId));
    if (params.status) q.append("status", params.status);
    const qs = q.toString();
    return call<PackageEnrolment[]>(`/package-enrolments${qs ? `?${qs}` : ""}`, undefined, "Failed to load packages");
  },
  usable: (memberId: number | string) =>
    call<PackageEnrolment[]>(`/package-enrolments/usable?member_id=${memberId}`, undefined, "Failed to load packages"),
  sell: (body: SellPackageRequest) =>
    call<SellPackageResult>("/package-enrolments", { method: "POST", body: JSON.stringify(body) }, "Failed to sell package"),
  changeTrainer: (id: number, trainerId: number, effectiveDate?: string) =>
    call<PackageEnrolment>(`/package-enrolments/${id}/trainer`, {
      method: "POST", body: JSON.stringify({ trainer_id: trainerId, effective_date: effectiveDate || null }),
    }, "Failed to change trainer"),
  cancel: (id: number) =>
    call<PackageEnrolment>(`/package-enrolments/${id}/cancel`, { method: "POST" }, "Failed to cancel package"),
};

/** "15 sessions · 60 days" / "30 days · up to 20 sessions" / "30 days · unlimited sessions" */
export function packageSummary(p: Pick<TrainingPackage, "plan_type" | "session_count" | "session_cap" | "validity_days">): string {
  if (p.plan_type === "sessions") return `${p.session_count ?? 0} sessions · within ${p.validity_days} days`;
  return `${p.validity_days} days · ${p.session_cap ? `up to ${p.session_cap} sessions` : "unlimited sessions"}`;
}

/** "Session 4 of 15" / "Day 9 of 30" */
export function enrolmentProgress(e: PackageEnrolment): string {
  if (e.plan_type === "sessions" && e.sessions_total) return `${e.sessions_used} of ${e.sessions_total} sessions used`;
  const day = e.day_number ? `Day ${e.day_number} of ${e.validity_days}` : `Starts ${e.start_date}`;
  return e.sessions_total ? `${day} · ${e.sessions_used}/${e.sessions_total} sessions` : `${day} · ${e.sessions_used} sessions`;
}

export const COMMISSION_TIMING_LABEL: Record<CommissionTiming, string> = {
  enrolment: "On booking",
  completion: "On completion",
};

export const ENROLMENT_STATUS_LABEL: Record<EnrolmentStatus, string> = {
  active: "Active",
  upcoming: "Upcoming",
  completed: "Completed",
  expired: "Expired",
  cancelled: "Cancelled",
};
