import React, { useEffect, useMemo, useState } from "react";
import {
  Ban, CalendarClock, CheckCircle2, Download, Eye, MapPin, MessageSquare, PlayCircle, Plus, Search, Star, UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { MemberStatCards } from "../members/MemberStatCards";
import { MemberAvatar } from "../members/MemberAvatar";
import { resolveBackendImageUrl } from "../../utils/resolve-image-url";
import { trainingService, type SessionStatus, type TrainingSessionApi } from "../../utils/supabase/training-service";
import { bookingService } from "../../utils/supabase/booking-service";
import {
  SESSION_TYPES, buildRosterReport, formatSessionDate, hhmm, isoDay, sessionDuration, sessionStatus, sessionType,
} from "./session-utils";
import s from "./trainings.module.css";
import { useReportExporter } from "../report-export";

interface TrainingSessionsTabProps {
  sessions: TrainingSessionApi[];
  loading: boolean;
  /** Bumped by the page after any change, so participant names reload too. */
  refreshKey: number;
  onChanged: () => void;
  onCreate: () => void;
  onView: (id: string, opts?: { remind?: boolean }) => void;
}

type DateFilter = "all" | "today" | "week" | "upcoming" | "past";
const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: "all", label: "All Dates" },
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
];

const weekBounds = () => {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return [isoDay(monday), isoDay(sunday)];
};

export function TrainingSessionsTab({ sessions, loading, refreshKey, onChanged, onCreate, onView }: TrainingSessionsTabProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [trainerFilter, setTrainerFilter] = useState("all");
  const [studioFilter, setStudioFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [namesBySession, setNamesBySession] = useState<Map<string, string[]>>(new Map());
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<TrainingSessionApi | null>(null);

  // Participant initials for the avatar stacks (seat holders only).
  useEffect(() => {
    bookingService.getBookings({})
      .then((list) => {
        const map = new Map<string, string[]>();
        list.forEach((b) => {
          if (!b.sessionId || b.status === "cancelled" || b.status === "waitlisted") return;
          const key = String(b.sessionId);
          map.set(key, [...(map.get(key) ?? []), b.memberName || "Guest"]);
        });
        setNamesBySession(map);
      })
      .catch(() => setNamesBySession(new Map()));
  }, [refreshKey]);

  const trainers = useMemo(() => {
    const map = new Map<string, string>();
    sessions.forEach((x) => { if (x.trainerId) map.set(String(x.trainerId), x.trainerName || "Trainer"); });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [sessions]);
  const studios = useMemo(
    () => [...new Set(sessions.map((x) => (x.location || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [sessions]);

  const today = isoDay(new Date());
  // Every filter except status — the status cards count within it.
  const scoped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const [weekStart, weekEnd] = weekBounds();
    return sessions.filter((x) => {
      if (typeFilter !== "all" && x.type !== typeFilter) return false;
      if (trainerFilter !== "all" && String(x.trainerId ?? "") !== trainerFilter) return false;
      if (studioFilter !== "all" && (x.location || "").trim() !== studioFilter) return false;
      if (dateFilter === "today" && x.date !== today) return false;
      if (dateFilter === "week" && (x.date < weekStart || x.date > weekEnd)) return false;
      if (dateFilter === "upcoming" && x.date < today) return false;
      if (dateFilter === "past" && x.date >= today) return false;
      if (q && ![x.name, x.trainerName, x.location].some((v) => (v || "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [sessions, search, typeFilter, trainerFilter, studioFilter, dateFilter, today]);

  const counts = useMemo(() => {
    const c = { active: 0, in_progress: 0, completed: 0, cancelled: 0, checkedIn: 0 };
    scoped.forEach((x) => {
      const key = (x.status || "active").toLowerCase() as keyof typeof c;
      if (key in c) c[key]++;
      c.checkedIn += x.checkedIn ?? 0;
    });
    return c;
  }, [scoped]);

  // Upcoming soonest first, then past sessions most recent first.
  const rows = useMemo(() => {
    const list = statusFilter === "all" ? scoped : scoped.filter((x) => (x.status || "active").toLowerCase() === statusFilter);
    const key = (x: TrainingSessionApi) => `${x.date} ${hhmm(x.startTime)}`;
    return [...list].sort((a, b) => {
      const ap = a.date < today, bp = b.date < today;
      if (ap !== bp) return ap ? 1 : -1;
      return ap ? key(b).localeCompare(key(a)) : key(a).localeCompare(key(b));
    });
  }, [scoped, statusFilter, today]);

  const filtersOn = search || typeFilter !== "all" || trainerFilter !== "all" || studioFilter !== "all" || dateFilter !== "all" || statusFilter !== "all";
  const clearFilters = () => {
    setSearch(""); setTypeFilter("all"); setTrainerFilter("all"); setStudioFilter("all"); setDateFilter("all"); setStatusFilter("all");
  };

  const changeStatus = async (session: TrainingSessionApi, next: SessionStatus, done: string) => {
    setBusy(session.id);
    try {
      await trainingService.updateStatus(session.id, next);
      toast.success(done);
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || "Couldn't update the session");
    } finally {
      setBusy(null);
    }
  };

  // Downloads the roster as a formatted Excel sheet (open the session for PDF / print)
  const rosterExporter = useReportExporter();
  const exportRoster = async (session: TrainingSessionApi) => {
    setBusy(session.id);
    try {
      await rosterExporter.run("xlsx", async () => {
        const overview = await trainingService.getOverview(session.id);
        if (!overview.participants.length) throw new Error("No participants to export yet");
        return buildRosterReport(overview.session, overview.participants);
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <MemberStatCards
        cards={[
          { key: "active", label: "Scheduled", value: loading ? null : counts.active, sub: "Not started yet", icon: CalendarClock, tone: "blue" },
          { key: "in_progress", label: "In Progress", value: loading ? null : counts.in_progress, sub: "Running now", icon: PlayCircle, tone: "amber" },
          { key: "completed", label: "Completed", value: loading ? null : counts.completed, sub: "Finished sessions", icon: CheckCircle2, tone: "green" },
          { key: "all", label: "Checked In", value: loading ? null : counts.checkedIn, sub: "Participants checked in", icon: UserCheck, tone: "primary" },
        ]}
        activeKey={statusFilter === "all" ? null : statusFilter}
        onSelect={(key) => setStatusFilter(statusFilter === key || key === "all" ? "all" : key)}
      />

      <div className={s.panel}>
        <div className={s.panelTop}>
          <div className={s.panelHead}>
            <div>
              <p className={s.panelTitle}>Training Session Management</p>
              <p className={s.panelSub}>Manage scheduled fitness classes, one-to-one training, and group activities.</p>
            </div>
            <Button className="gap-2" onClick={onCreate}><Plus className="h-4 w-4" /> Create Session</Button>
          </div>
          <div className={s.filters}>
            <div className={s.search}>
              <Search />
              <Input placeholder="Search session, trainer, or studio…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className={s.filterSelect}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Session Types</SelectItem>
                {Object.entries(SESSION_TYPES).map(([id, t]) => <SelectItem key={id} value={id}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={trainerFilter} onValueChange={setTrainerFilter}>
              <SelectTrigger className={s.filterSelect}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trainers</SelectItem>
                {trainers.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={studioFilter} onValueChange={setStudioFilter}>
              <SelectTrigger className={s.filterSelect}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Studios</SelectItem>
                {studios.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className={s.filterSelect}><SelectValue /></SelectTrigger>
              <SelectContent>
                {DATE_FILTERS.map((d) => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={s.filterSelect}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {filtersOn && (
            <div className={s.filterNote}>
              <span>Showing {rows.length} of {sessions.length} sessions</span>
              <button type="button" className={s.linkBtn} onClick={clearFilters}>Clear filters</button>
            </div>
          )}
        </div>

        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Session</th><th>Trainer</th><th>Date & Time</th><th>Location</th>
                <th>Participants</th><th>Reviews</th><th>Status</th><th className={s.right}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className={s.tableMessage}>Loading sessions…</td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className={s.tableMessage}>
                    {sessions.length === 0 ? "No sessions yet. Create a class or PT session to get started." : "No sessions match these filters."}
                  </td>
                </tr>
              ) : rows.map((x) => {
                const type = sessionType(x.type);
                const TypeIcon = type.icon;
                const st = sessionStatus(x.status);
                const stKey = (x.status || "active").toLowerCase();
                const capacity = Number(x.capacity ?? 0);
                const booked = Number(x.booked ?? 0);
                const left = capacity > 0 ? Math.max(0, capacity - booked) : null;
                const names = namesBySession.get(String(x.id)) ?? [];
                const isBusy = busy === x.id;
                const closed = stKey === "cancelled" || stKey === "completed";
                return (
                  <tr key={x.id} data-cancelled={stKey === "cancelled"}>
                    <td>
                      <div className={s.sessionCell}>
                        <span className={s.typeIcon} data-tone={type.tone}><TypeIcon /></span>
                        <div>
                          <button type="button" className={s.sessionName} onClick={() => onView(x.id)}>{x.name}</button>
                          <p className={s.sub}>{type.label} · {sessionDuration(x)} minutes</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      {x.trainerName ? (
                        <div className={s.person}>
                          <MemberAvatar name={x.trainerName} photo={x.trainerPhotoUrl ? String(resolveBackendImageUrl(x.trainerPhotoUrl)) : null} size={30} />
                          {x.trainerName}
                        </div>
                      ) : <span className={s.sub}>Unassigned</span>}
                    </td>
                    <td className={s.when}>
                      <p>{formatSessionDate(x.date)}</p>
                      <p className={s.sub}>{hhmm(x.startTime)}–{hhmm(x.endTime)}</p>
                    </td>
                    <td><span className={s.place}><MapPin /> {x.location || "—"}</span></td>
                    <td>
                      <div className={s.partTop}>
                        {names.length > 0 && (
                          <span className={s.stack}>
                            {names.slice(0, 3).map((n, i) => <MemberAvatar key={i} name={n} photo={null} size={26} />)}
                            {names.length > 3 && <span className={s.stackMore}>+{names.length - 3}</span>}
                          </span>
                        )}
                        {booked} {booked === 1 ? "member" : "members"}
                      </div>
                      <div className={s.partSub}>
                        <span>{x.checkedIn ?? 0} checked in</span>
                        {left !== null && stKey !== "cancelled" && (
                          <span data-full={left === 0} data-low={left > 0 && left <= 2}>
                            {left === 0 ? `Full${x.waitlisted ? ` · ${x.waitlisted} waiting` : ""}` : `${left} spot${left === 1 ? "" : "s"} left`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {x.reviewCount ? (
                        <span className={s.stars}><Star /> {x.averageRating?.toFixed(1)} <span className={s.starsCount}>({x.reviewCount})</span></span>
                      ) : <span className={s.noReviews}>No reviews</span>}
                    </td>
                    <td><span className={s.pill} data-tone={st.tone}>{st.label}</span></td>
                    <td>
                      <div className={s.actions}>
                        <button type="button" className={s.iconBtn} data-tone="gray" title="View session" onClick={() => onView(x.id)}><Eye /></button>
                        <button type="button" className={s.iconBtn} data-tone="blue" title="Send reminder" disabled={closed}
                          onClick={() => onView(x.id, { remind: true })}><MessageSquare /></button>
                        <button type="button" className={s.iconBtn} data-tone="gray" title="Export roster" disabled={isBusy}
                          onClick={() => exportRoster(x)}><Download /></button>
                        {stKey === "in_progress" ? (
                          <button type="button" className={s.iconBtn} data-tone="green" title="Mark completed" disabled={isBusy}
                            onClick={() => changeStatus(x, "completed", `${x.name} marked completed`)}><CheckCircle2 /></button>
                        ) : (
                          <button type="button" className={s.iconBtn} data-tone="amber" title="Start session" disabled={isBusy || closed}
                            onClick={() => changeStatus(x, "in_progress", `${x.name} started`)}><PlayCircle /></button>
                        )}
                        <button type="button" className={s.iconBtn} data-tone="red" title="Cancel session" disabled={isBusy || closed}
                          onClick={() => setCancelling(x)}><Ban /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!cancelling} onOpenChange={(o) => { if (!o) setCancelling(null); }}>
        <DialogContent style={{ maxWidth: 460 }}>
          <DialogHeader>
            <DialogTitle>Cancel this session?</DialogTitle>
            <DialogDescription>
              {cancelling && `${cancelling.name} on ${formatSessionDate(cancelling.date)} at ${hhmm(cancelling.startTime)} is called off. `}
              Every booking on it is cancelled and refunded in full to the member's wallet, and the waitlist is cleared. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelling(null)}>Keep session</Button>
            <Button variant="destructive" onClick={() => {
              const x = cancelling;
              setCancelling(null);
              if (x) changeStatus(x, "cancelled", `${x.name} cancelled — bookings refunded`);
            }}>Cancel session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
