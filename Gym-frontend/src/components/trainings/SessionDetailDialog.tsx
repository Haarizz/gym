import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpCircle, CalendarDays, Clock, Download, MapPin, MessageSquare, Pencil, Plus, RotateCcw,
  Search, Share2, Star, UserCheck, Users, UserX, X,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { MemberAvatar, MemberStatusPill, memberPhoto } from "../members/MemberAvatar";
import { useCurrency } from "../../utils/currency";
import { resolveBackendImageUrl } from "../../utils/resolve-image-url";
import { trainingService, type SessionOverview, type SessionParticipant, type TrainingSessionApi } from "../../utils/supabase/training-service";
import { bookingService } from "../../utils/supabase/booking-service";
import { membersService } from "../../utils/supabase/members-service";
import {
  clockTime, buildRosterReport, formatSessionDate, hhmm, participantStatus, sessionDuration, sessionStatus, sessionType,
} from "./session-utils";
import s from "./trainings.module.css";
import { ReportActions } from "../report-export";

interface SessionDetailDialogProps {
  sessionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A booking / status changed — refresh the list behind the dialog. */
  onChanged?: () => void;
  onEdit?: (session: TrainingSessionApi) => void;
  /** Open straight into the reminder prompt (row action). */
  startWithReminder?: boolean;
}

const photo = (url?: string | null) => (url ? String(resolveBackendImageUrl(url)) : null);

/** WhatsApp for a phone number, else e-mail; null when there's neither. */
const messageLink = (p: SessionParticipant, text: string) => {
  const digits = (p.phone || "").replace(/\D/g, "");
  if (digits.length >= 7) return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  if (p.email && !p.email.includes("@family.local")) return `mailto:${p.email}?body=${encodeURIComponent(text)}`;
  return null;
};

export function SessionDetailDialog({ sessionId, open, onOpenChange, onChanged, onEdit, startWithReminder }: SessionDetailDialogProps) {
  const { formatCurrency } = useCurrency();
  const [overview, setOverview] = useState<SessionOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"participants" | "reviews">("participants");
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderNote, setReminderNote] = useState("");
  const [sendingReminder, setSendingReminder] = useState(false);
  const [removing, setRemoving] = useState<SessionParticipant | null>(null);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    try {
      setOverview(await trainingService.getOverview(id));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load session");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !sessionId) return;
    setOverview(null);
    setTab("participants");
    setAdding(false);
    setReminderNote("");
    setReminderOpen(Boolean(startWithReminder));
    load(sessionId);
  }, [open, sessionId, startWithReminder, load]);

  const refresh = async () => {
    if (sessionId) await load(sessionId);
    onChanged?.();
  };

  const session = overview?.session;
  const trainer = overview?.trainer;
  const participants = overview?.participants ?? [];
  const reviews = overview?.reviews ?? [];
  const seated = participants.filter((p) => p.status !== "waitlisted");
  const capacity = Number(session?.capacity ?? 0);
  const booked = Number(session?.booked ?? 0);
  const left = capacity > 0 ? Math.max(0, capacity - booked) : null;
  const isFull = left === 0;
  const closed = session ? ["cancelled", "completed"].includes((session.status || "").toLowerCase()) : true;
  const type = sessionType(session?.type);
  const status = sessionStatus(session?.status);
  const TypeIcon = type.icon;

  const setParticipantStatus = async (p: SessionParticipant, next: string, done: string) => {
    setBusy(p.bookingId);
    try {
      await bookingService.updateStatus(p.bookingId, next);
      toast.success(done);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Couldn't update the booking");
    } finally {
      setBusy(null);
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    const p = removing;
    setRemoving(null);
    await setParticipantStatus(p, "cancelled",
      p.status === "waitlisted" ? `${p.name} removed from the waitlist` : `${p.name}'s booking cancelled`);
  };

  const sendReminder = async () => {
    if (!session) return;
    setSendingReminder(true);
    try {
      const sent = await trainingService.sendReminder(session.id, reminderNote.trim() || undefined);
      toast.success(sent ? `Reminder sent to ${sent} member${sent === 1 ? "" : "s"}` : "Nobody to remind — no booked members yet");
      setReminderOpen(false);
      setReminderNote("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send reminder");
    } finally {
      setSendingReminder(false);
    }
  };

  const shareText = session
    ? [
        `${session.name} (${type.label})`,
        `${formatSessionDate(session.date, "long")}, ${hhmm(session.startTime)}–${hhmm(session.endTime)}`,
        session.location ? `At ${session.location}` : "",
        session.trainerName ? `With ${session.trainerName}` : "",
        Number(session.price) > 0 ? `Price: ${formatCurrency(Number(session.price))}` : "Free",
        left === null ? "" : isFull ? "Fully booked — join the waitlist" : `${left} spot${left === 1 ? "" : "s"} left`,
      ].filter(Boolean).join("\n")
    : "";

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: session?.name, text: shareText });
        return;
      }
      await navigator.clipboard.writeText(shareText);
      toast.success("Session details copied — paste them into WhatsApp or an email");
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error("Couldn't share the session");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={s.dialog}>
          <div className={s.hero}>
            <div className={s.heroIcon}><TypeIcon /></div>
            <div className={s.heroMain}>
              <DialogTitle className={s.heroTitle}>{session?.name ?? "Session"}</DialogTitle>
              <DialogDescription className={s.heroSub}>
                {session ? `${type.label} · ${sessionDuration(session)} minutes` : "Loading…"}
              </DialogDescription>
            </div>
            {session && <span className={s.heroPill}>{status.label}</span>}
          </div>

          <div className={s.body}>
            {!session ? (
              <div className={s.loading}>{loading ? "Loading session…" : "Session not found"}</div>
            ) : (
              <>
                <div className={s.infoGrid}>
                  <div className={s.section}>
                    <p className={s.sectionTitle}>Schedule</p>
                    <div className={s.infoList}>
                      <div><CalendarDays /> {formatSessionDate(session.date, "long")}</div>
                      <div><Clock /> {hhmm(session.startTime)} – {hhmm(session.endTime)}</div>
                      <div><MapPin /> {session.location || "Location not set"}</div>
                    </div>
                  </div>
                  <div className={s.section}>
                    <p className={s.sectionTitle}>Trainer</p>
                    {trainer ? (
                      <div className={s.trainer}>
                        <MemberAvatar name={trainer.name} photo={photo(trainer.photoUrl)} size={44} />
                        <div>
                          <p className={s.trainerName}>{trainer.name}</p>
                          <p className={s.trainerMeta}>
                            {trainer.yearsAtGym != null && <span>{trainer.yearsAtGym < 1 ? "New coach" : `${trainer.yearsAtGym} yr${trainer.yearsAtGym === 1 ? "" : "s"} at the gym`}</span>}
                            {trainer.rating != null && <>{trainer.yearsAtGym != null && "·"}<Star /> {trainer.rating} ({trainer.ratingCount})</>}
                            {trainer.yearsAtGym == null && trainer.rating == null && <span>{trainer.role || "Trainer"}</span>}
                          </p>
                          {trainer.certifications.length > 0 && <p className={s.trainerCerts}>{trainer.certifications.join(", ")}</p>}
                        </div>
                      </div>
                    ) : (
                      <p className={s.about}>No trainer assigned</p>
                    )}
                  </div>
                  <div className={s.section}>
                    <p className={s.sectionTitle}>Pricing</p>
                    <p className={s.price}>{Number(session.price) > 0 ? formatCurrency(Number(session.price)) : "Free"}</p>
                  </div>
                  <div className={s.section}>
                    <p className={s.sectionTitle}>Availability</p>
                    <div className={s.barRow}><span>Enrolled</span><span>{booked}/{capacity || "∞"}</span></div>
                    <div className={s.bar}>
                      <div className={s.barFill} data-full={isFull} style={{ width: `${capacity ? Math.min(100, (booked / capacity) * 100) : 0}%` }} />
                    </div>
                    <p className={s.barNote}>
                      {left === null ? "No capacity limit" : isFull ? `Full${session.waitlisted ? ` · ${session.waitlisted} on the waitlist` : ""}` : `${left} spot${left === 1 ? "" : "s"} remaining`}
                    </p>
                  </div>
                </div>

                {session.description && (
                  <div className={s.section}>
                    <p className={s.sectionTitle}>About This Class</p>
                    <p className={s.about}>{session.description}</p>
                  </div>
                )}

                <div className={s.divider} />

                <div className={s.partHead}>
                  <div>
                    <p className={s.partTitle}>Session Participation & Interactions</p>
                    <p className={s.partHint}>Attendance, member details, waitlist activity, and post-session reviews.</p>
                  </div>
                  <div className={s.partActions}>
                    <Button variant="outline" size="sm" className="gap-2" disabled={closed} onClick={() => setReminderOpen(true)}>
                      <MessageSquare className="h-4 w-4" /> Send Reminder
                    </Button>
                    <ReportActions report={() => buildRosterReport(session, participants)} disabled={!participants.length} menuLabel="Session roster" />
                  </div>
                </div>

                <div className={s.tiles}>
                  <div className={s.tile} data-tone="teal"><p className={s.tileLabel}>Participants</p><p className={s.tileValue}>{seated.length}</p></div>
                  <div className={s.tile} data-tone="green"><p className={s.tileLabel}>Checked In</p><p className={s.tileValue}>{session.checkedIn ?? 0}</p></div>
                  <div className={s.tile} data-tone="amber"><p className={s.tileLabel}>Waitlisted</p><p className={s.tileValue}>{session.waitlisted ?? 0}</p></div>
                  <div className={s.tile} data-tone="amber">
                    <p className={s.tileLabel}>Review Rating</p>
                    <p className={s.tileValue}>{session.averageRating != null ? <><Star /> {session.averageRating}</> : "—"}</p>
                  </div>
                </div>

                <div className={s.tabs} role="tablist">
                  <button type="button" role="tab" className={s.tab} data-active={tab === "participants"} aria-selected={tab === "participants"} onClick={() => setTab("participants")}>
                    Participants ({participants.length})
                  </button>
                  <button type="button" role="tab" className={s.tab} data-active={tab === "reviews"} aria-selected={tab === "reviews"} onClick={() => setTab("reviews")}>
                    Reviews ({reviews.length})
                  </button>
                </div>

                {tab === "participants" ? (
                  <>
                    {adding && (
                      <AddParticipant
                        excludeIds={new Set(participants.map((p) => String(p.memberDbId ?? "")))}
                        full={isFull}
                        onClose={() => setAdding(false)}
                        onBooked={async () => { setAdding(false); await refresh(); }}
                        sessionId={session.id}
                      />
                    )}
                    {participants.length === 0 ? (
                      <div className={s.empty}>
                        <div className={s.emptyIcon}><Users /></div>
                        <p className={s.emptyTitle}>No participants yet</p>
                        <p className={s.emptyText}>Members who book in the app or at the desk appear here. Use Book This Class to add someone.</p>
                      </div>
                    ) : (
                      <div className={s.rosterWrap}>
                        <table className={s.roster}>
                          <thead>
                            <tr><th>Member</th><th>Membership Plan</th><th>Contact</th><th>Attendance</th><th>Check-in</th><th className={s.right}>Actions</th></tr>
                          </thead>
                          <tbody>
                            {participants.map((p) => {
                              const st = participantStatus(p.status);
                              const link = messageLink(p, `Hi ${p.name.split(" ")[0]}, about ${session.name} on ${formatSessionDate(session.date)} at ${hhmm(session.startTime)}: `);
                              const isBusy = busy === p.bookingId;
                              const pending = p.status === "pending_approval";
                              return (
                                <tr key={p.bookingId}>
                                  <td>
                                    <div className={s.memberCell}>
                                      <MemberAvatar name={p.name} photo={photo(p.photoUrl)} size={34} />
                                      <div>
                                        <p className={s.memberName}>{p.name}</p>
                                        <p className={s.sub}>{p.guest ? "Guest" : p.memberCode}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <p>{p.plan || (p.guest ? "—" : "No plan")}</p>
                                    {p.membershipStatus && !p.guest && <div style={{ marginTop: 4 }}><MemberStatusPill status={p.membershipStatus} /></div>}
                                  </td>
                                  <td className={s.contact}>
                                    <p>{p.phone || "—"}</p>
                                    {p.email && !p.email.includes("@family.local") && <p className={s.sub}>{p.email}</p>}
                                  </td>
                                  <td>
                                    <span className={s.pill} data-tone={st.tone}>
                                      {p.status === "waitlisted" && p.waitlistPosition ? `Waitlisted #${p.waitlistPosition}` : st.label}
                                    </span>
                                    {p.enrolmentId && <p className={s.sub}>PT package</p>}
                                  </td>
                                  <td className={s.when}>{p.status === "checked-in" ? clockTime(p.checkedInAt) || "—" : "—"}</td>
                                  <td>
                                    <div className={s.actions}>
                                      {p.status === "waitlisted" ? (
                                        <button type="button" className={s.iconBtn} data-tone="green" disabled={isBusy || isFull || closed}
                                          title={isFull ? "No free spot yet" : "Move into the session"}
                                          onClick={() => setParticipantStatus(p, "confirmed", `${p.name} moved into the session`)}>
                                          <ArrowUpCircle />
                                        </button>
                                      ) : p.status === "checked-in" ? (
                                        <button type="button" className={s.iconBtn} data-tone="gray" disabled={isBusy}
                                          title="Undo check-in" onClick={() => setParticipantStatus(p, "confirmed", `Check-in undone for ${p.name}`)}>
                                          <RotateCcw />
                                        </button>
                                      ) : (
                                        <button type="button" className={s.iconBtn} data-tone="green" disabled={isBusy || pending || session.status === "cancelled"}
                                          title={pending ? "Approve the payment first (Approvals)" : "Check in"}
                                          onClick={() => setParticipantStatus(p, "checked-in", `${p.name} checked in`)}>
                                          <UserCheck />
                                        </button>
                                      )}
                                      <button type="button" className={s.iconBtn} data-tone="red" disabled={isBusy || session.status === "cancelled"}
                                        title={p.status === "waitlisted" ? "Remove from waitlist" : "Cancel booking (refunds in full)"}
                                        onClick={() => setRemoving(p)}>
                                        <UserX />
                                      </button>
                                      <a className={s.iconBtn} data-tone="blue" href={link ?? undefined} target="_blank" rel="noreferrer"
                                        aria-disabled={!link} title={link ? "Message" : "No phone or email"}
                                        onClick={(e) => { if (!link) e.preventDefault(); }}
                                        style={link ? undefined : { opacity: 0.3, cursor: "default" }}>
                                        <MessageSquare />
                                      </a>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : reviews.length === 0 ? (
                  <div className={s.empty}>
                    <div className={s.emptyIcon}><Star /></div>
                    <p className={s.emptyTitle}>No reviews yet</p>
                    <p className={s.emptyText}>Members who took part can rate the session after it starts; their stars and comments show here.</p>
                  </div>
                ) : (
                  <div className={s.reviews}>
                    {reviews.map((r) => (
                      <div key={r.id} className={s.review}>
                        <MemberAvatar name={r.memberName || "Member"} photo={photo(r.memberPhotoUrl)} size={36} />
                        <div className={s.reviewMain}>
                          <div className={s.reviewHead}>
                            <span className={s.memberName}>{r.memberName || "Member"}</span>
                            <span className={s.sub}>{r.createdAt ? new Date(/[zZ]$/.test(r.createdAt) ? r.createdAt : `${r.createdAt}Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : ""}</span>
                          </div>
                          <span className={s.reviewStars} aria-label={`${r.rating} out of 5`}>
                            {[1, 2, 3, 4, 5].map((n) => <Star key={n} data-on={n <= r.rating} />)}
                          </span>
                          {r.comment && <p className={s.reviewText}>{r.comment}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className={s.foot}>
            <div className={s.footMain}>
              {session && !closed && (
                <Button className="gap-2" onClick={() => { setTab("participants"); setAdding(true); }}>
                  <Plus className="h-4 w-4" /> {isFull ? "Add to Waitlist" : "Book This Class"}
                </Button>
              )}
            </div>
            {session && onEdit && session.status !== "cancelled" && (
              <Button variant="outline" className="gap-2" onClick={() => onEdit(session)}><Pencil className="h-4 w-4" /> Edit</Button>
            )}
            {session && <Button variant="outline" className="gap-2" onClick={share}><Share2 className="h-4 w-4" /> Share</Button>}
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send reminder */}
      <Dialog open={reminderOpen && open} onOpenChange={setReminderOpen}>
        <DialogContent style={{ maxWidth: 460 }}>
          <DialogHeader>
            <DialogTitle>Send reminder</DialogTitle>
            <DialogDescription>
              Everyone booked on {session?.name ?? "this session"} gets an app notification and a push.
            </DialogDescription>
          </DialogHeader>
          <div className={s.confirmBody}>
            {session && (
              <div className={s.confirmBox}>
                Reminder: {session.name} on {formatSessionDate(session.date)} at {hhmm(session.startTime)}.
                {reminderNote.trim() ? ` ${reminderNote.trim()}` : ""}
              </div>
            )}
            <div>
              <Label htmlFor="reminder-note" className="text-xs">Add a note (optional)</Label>
              <Textarea id="reminder-note" rows={2} maxLength={200} value={reminderNote}
                onChange={(e) => setReminderNote(e.target.value)} placeholder="e.g. Bring a towel and water" style={{ marginTop: 6 }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReminderOpen(false)}>Cancel</Button>
            <Button onClick={sendReminder} disabled={sendingReminder}>{sendingReminder ? "Sending…" : "Send reminder"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove participant */}
      <Dialog open={!!removing} onOpenChange={(o) => { if (!o) setRemoving(null); }}>
        <DialogContent style={{ maxWidth: 440 }}>
          <DialogHeader>
            <DialogTitle>{removing?.status === "waitlisted" ? "Remove from waitlist?" : "Cancel this booking?"}</DialogTitle>
            <DialogDescription>
              {removing?.status === "waitlisted"
                ? `${removing?.name} won't be moved in if a spot opens.`
                : `${removing?.name}'s booking is cancelled and anything they paid is refunded in full to their wallet. The first person on the waitlist moves in.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoving(null)}>Keep</Button>
            <Button variant="destructive" onClick={confirmRemove}>{removing?.status === "waitlisted" ? "Remove" : "Cancel booking"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface PickedMember { id: string; name: string; code?: string; phone?: string; email?: string; status?: string; plan?: string; photo: string | null }

/** Live member search that books the picked member onto the session (or its waitlist when full). */
function AddParticipant({ sessionId, full, excludeIds, onClose, onBooked }: {
  sessionId: string; full: boolean; excludeIds: Set<string>; onClose: () => void; onBooked: () => void | Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedMember[]>([]);
  const [searching, setSearching] = useState(false);
  const [booking, setBooking] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    const mine = ++seq.current;
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(() => {
      membersService.getMembers({ search: q }, { limit: 8 })
        .then((res) => {
          if (mine !== seq.current) return;
          setResults(res.members.map((m: any) => ({
            id: String(m.id), name: m.name ?? "", code: m.member_id, phone: m.phone, email: m.email,
            status: m.membership_status, plan: m.membership_plan || m.membership_type, photo: memberPhoto(m),
          })));
        })
        .catch(() => { if (mine === seq.current) setResults([]); })
        .finally(() => { if (mine === seq.current) setSearching(false); });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const shown = useMemo(() => results.filter((m) => !excludeIds.has(m.id)), [results, excludeIds]);

  const book = async (m: PickedMember) => {
    setBooking(m.id);
    try {
      const created = await bookingService.createBooking({ sessionId: Number(sessionId), memberId: Number(m.id), waitlist: full });
      toast.success(created.status === "waitlisted" ? `${m.name} added to the waitlist`
        : created.packageName ? `${m.name} booked — uses a session of ${created.packageName}` : `${m.name} booked`);
      await onBooked();
    } catch (e: any) {
      toast.error(e?.message || "Couldn't book the member");
    } finally {
      setBooking(null);
    }
  };

  return (
    <div className={s.addPanel}>
      <div className={s.addHead}>
        <p className={s.addTitle}>{full ? "Add a member to the waitlist" : "Book a member into this session"}</p>
        <button type="button" className={s.iconBtn} aria-label="Close" onClick={onClose}><X /></button>
      </div>
      <div className={s.search}>
        <Search />
        <Input autoFocus placeholder="Search by name, member ID, phone or email…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {query.trim().length >= 2 && (
        shown.length === 0 ? (
          <p className={s.sub}>{searching ? "Searching…" : "No members found (members already on this session are hidden)."}</p>
        ) : (
          <div className={s.rosterWrap}>
            <table className={s.roster}>
              <tbody>
                {shown.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className={s.memberCell}>
                        <MemberAvatar name={m.name} photo={m.photo} size={34} />
                        <div>
                          <p className={s.memberName}>{m.name}</p>
                          <p className={s.sub}>{[m.code, m.phone].filter(Boolean).join(" · ")}</p>
                        </div>
                      </div>
                    </td>
                    <td>{m.plan || "—"}</td>
                    <td>{m.status && <MemberStatusPill status={m.status} />}</td>
                    <td className={s.right}>
                      <Button size="sm" disabled={booking !== null} onClick={() => book(m)}>
                        {booking === m.id ? "Booking…" : full ? "Waitlist" : "Book"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
