import { Building2, Dumbbell, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SessionParticipant, TrainingSessionApi } from "../../utils/supabase/training-service";

export const SESSION_TYPES: Record<string, { label: string; icon: LucideIcon; tone: string }> = {
  class: { label: "Group Class", icon: Users, tone: "purple" },
  pt: { label: "Personal Training", icon: Dumbbell, tone: "blue" },
  facility: { label: "Facility", icon: Building2, tone: "cyan" },
};
export const sessionType = (type?: string) => SESSION_TYPES[type ?? ""] ?? SESSION_TYPES.class;

/** Stored status → what staff see. "active" is a scheduled session. */
export const SESSION_STATUS: Record<string, { label: string; tone: string }> = {
  active: { label: "Scheduled", tone: "blue" },
  in_progress: { label: "In Progress", tone: "amber" },
  completed: { label: "Completed", tone: "green" },
  cancelled: { label: "Cancelled", tone: "red" },
};
export const sessionStatus = (status?: string | null) => SESSION_STATUS[(status || "active").toLowerCase()] ?? SESSION_STATUS.active;

export const PARTICIPANT_STATUS: Record<string, { label: string; tone: string }> = {
  confirmed: { label: "Booked", tone: "blue" },
  "checked-in": { label: "Checked In", tone: "green" },
  "no-show": { label: "No-show", tone: "red" },
  pending_approval: { label: "Payment pending", tone: "amber" },
  waitlisted: { label: "Waitlisted", tone: "amber" },
  cancelled: { label: "Cancelled", tone: "gray" },
};
export const participantStatus = (status?: string | null) =>
  PARTICIPANT_STATUS[(status || "").toLowerCase()] ?? { label: status || "—", tone: "gray" };

export const hhmm = (value?: string | null) => (value ? value.slice(0, 5) : "");

export const formatSessionDate = (value?: string | null, style: "short" | "long" = "short") => {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return style === "long"
    ? d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const sessionDuration = (s: TrainingSessionApi) => {
  if (s.durationMinutes) return s.durationMinutes;
  const [sh, sm] = hhmm(s.startTime).split(":").map(Number);
  const [eh, em] = hhmm(s.endTime).split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  return Number.isFinite(mins) && mins > 0 ? mins : 0;
};

/** Local date (YYYY-MM-DD) — toISOString() would shift to UTC. */
export const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** A backend UTC timestamp → local "HH:mm". */
export const clockTime = (value?: string | null) => {
  if (!value) return "";
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Downloads the session roster as a CSV (opens in Excel). */
export function downloadRoster(session: TrainingSessionApi, participants: SessionParticipant[]) {
  const header = ["#", "Member", "Member ID", "Plan", "Phone", "Email", "Attendance", "Check-in time", "Waitlist #"];
  const rows = participants.map((p, i) => [
    i + 1, p.name, p.guest ? "Guest" : p.memberCode ?? "", p.plan ?? "", p.phone ?? "", p.email ?? "",
    participantStatus(p.status).label, clockTime(p.checkedInAt), p.waitlistPosition ?? "",
  ]);
  const title = [`${session.name} — ${formatSessionDate(session.date)} ${hhmm(session.startTime)}-${hhmm(session.endTime)}`
    + (session.trainerName ? ` — ${session.trainerName}` : "")];
  const csv = [title, [], header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `roster-${(session.name || "session").replace(/[^\w-]+/g, "-").toLowerCase()}-${session.date}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
