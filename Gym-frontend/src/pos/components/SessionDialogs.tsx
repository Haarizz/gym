import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDownCircle, ArrowRightLeft, ArrowUpCircle, Monitor, Play, Users } from "lucide-react";
import { TransferSessionDialog } from "./Terminals";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { posApi } from "../api";
import { usePos } from "../PosContext";
import { useApproval } from "./Approval";
import { DenominationCounter, Money, Pill } from "./Shared";
import { denominationTotal, emptyDenominations, fmtDateTime, fmtTime, r2, type Denominations } from "../pricing";
import { cashMovementDoc } from "../print/receiptModel";
import type { CashCategory, CashMovement, PosSession } from "../types";
import s from "../pos.module.css";

const primaryBtn = "bg-[#2B7A78] hover:bg-[#236862] text-white";

export function OpenSessionDialog({ open, onOpenChange, onOpened }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onOpened: (s: PosSession) => void;
}) {
  const { settings, terminalName, setTerminalName, currencyCode, openDrawer, terminal, dayStatus, refreshDayStatus, showZReport } = usePos();
  const { withApproval } = useApproval();
  const [counts, setCounts] = useState<Denominations>(() => emptyDenominations(settings.denominations));
  // Today already has a Day Close (e.g. closed by mistake): offer to reopen it right here.
  const [closedDay, setClosedDay] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [reopening, setReopening] = useState(false);
  const registered = terminal;
  const [terminalField, setTerminalField] = useState(terminalName);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const blocked = registered != null && registered.status !== "ACTIVE";
  // An earlier business day without a Day Close blocks new sessions (BillBull PREVIOUS_BUSINESS_DAY_OPEN).
  const [previousOpen, setPreviousOpen] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCounts(emptyDenominations(settings.denominations));
      setTerminalField(terminalName);
      setNotes("");
      setReopenReason("");
      setClosedDay(dayStatus?.dayClosed ? dayStatus.tradingDate : null);
      const pending = dayStatus?.pendingDayCloseDate;
      setPreviousOpen(pending && dayStatus && pending < dayStatus.tradingDate ? pending : null);
    }
  }, [open, settings.denominations, terminalName]); // eslint-disable-line react-hooks/exhaustive-deps

  const reopenToday = async () => {
    if (!closedDay) return;
    setReopening(true);
    try {
      const dc = await withApproval((pin) => posApi.reopenDay(closedDay, { reason: reopenReason.trim(), supervisorPin: pin }));
      if (!dc) return;
      toast.success(`Business day ${closedDay} reopened (${dc.closeNumber} removed) — you can start the session now`);
      setClosedDay(null);
      refreshDayStatus();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setReopening(false);
    }
  };

  const total = denominationTotal(counts);

  const start = async () => {
    setBusy(true);
    try {
      const name = registered ? registered.name : terminalField.trim();
      if (!registered && name !== terminalName) setTerminalName(name);
      const session = await posApi.openSession({
        openingCash: total,
        openingDenominations: JSON.stringify(counts),
        terminalName: name || null,
        terminalCode: registered?.terminalCode ?? null,
        notes: notes.trim() || undefined,
      });
      toast.success(`Session ${session.sessionNumber} opened`);
      openDrawer("Session opened — float placed in drawer");
      onOpened(session);
      onOpenChange(false);
    } catch (e) {
      const msg = (e as Error).message;
      const m = msg.match(/Business day (\d{4}-\d{2}-\d{2}) is already closed/);
      const prev = msg.match(/Business day (\d{4}-\d{2}-\d{2}) has not been closed yet/);
      if (prev) setPreviousOpen(prev[1]);
      else if (m) setClosedDay(m[1]);
      else toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 760, maxHeight: "92vh", overflowY: "auto" }}>
        <DialogHeader>
          <DialogTitle>Start POS session</DialogTitle>
          <DialogDescription>Count the opening float in the cash drawer. You'll close this session with a cash count at the end of your shift.</DialogDescription>
        </DialogHeader>
        <div className={s.grid2} style={{ gridTemplateColumns: "1fr 1fr" }}>
          {registered ? (
            <div className={s.field}>
              <Label>Terminal</Label>
              <div className="flex items-center gap-2" style={{ minHeight: 36 }}>
                <Monitor size={15} /><span className={s.strong}>{registered.name}</span>
                {registered.counterName && <span className={s.muted}>· {registered.counterName}</span>}
              </div>
              <span className={s.fieldHint}>{registered.terminalCode} · renamed by a supervisor in POS Console › Terminals.</span>
            </div>
          ) : (
            <div className={s.field}>
              <Label>Terminal / counter name</Label>
              <Input value={terminalField} onChange={(e) => setTerminalField(e.target.value)} placeholder="e.g. Front Desk 1" maxLength={100} />
              <span className={s.fieldHint}>Remembered on this computer; used to pick its receipt printer.</span>
            </div>
          )}
          <div className={s.field}>
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Shift notes" />
          </div>
        </div>
        {previousOpen && (
          <div className={`${s.callout} ${s.calloutWarn}`} style={{ alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div className={s.strong}>Business day {previousOpen} has not been closed</div>
              <div className={s.small}>Run its Z-Report and Day Close first — a new session can only start once every earlier day is closed.</div>
            </div>
            <Button variant="outline" onClick={() => { onOpenChange(false); showZReport(previousOpen); }}>Open Z-Report</Button>
          </div>
        )}
        {!previousOpen && closedDay && (
          <div className={`${s.callout} ${s.calloutWarn}`} style={{ alignItems: "flex-end", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div className={s.strong}>Business day {closedDay} is already closed</div>
              <div className={s.small} style={{ marginBottom: 8 }}>If it was closed by mistake, reopen it to start a session today. Needs a supervisor; the reopening is kept in the audit log.</div>
              <Input value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} placeholder="Reason, e.g. Closed by mistake before the evening shift" />
            </div>
            <Button variant="outline" className="border-[#E63946] text-[#E63946]" disabled={!reopenReason.trim() || reopening} onClick={reopenToday}>
              {reopening ? "Reopening…" : "Reopen today"}
            </Button>
          </div>
        )}
        {blocked && (
          <div className={`${s.callout} ${s.calloutWarn}`}>
            {registered.name} is {registered.status === "PENDING" ? "waiting for approval" : registered.status.toLowerCase()} — sessions can't be opened on it.
          </div>
        )}
        <DenominationCounter values={settings.denominations} counts={counts} onChange={setCounts} currency={currencyCode} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className={primaryBtn} disabled={busy || blocked || Boolean(closedDay) || Boolean(previousOpen)} onClick={start}>
            <Play className="h-4 w-4 mr-2" />{busy ? "Starting…" : <>Start session with <Money value={total} /></>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CashMovementDialog({ open, onOpenChange, onDone, initialType = "DROP_IN" }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone?: (m: CashMovement) => void;
  initialType?: "DROP_IN" | "CASH_OUT";
}) {
  const { session, settings, company, template, currencyCode, printDoc, openDrawer } = usePos();
  const { withApproval } = useApproval();
  const [type, setType] = useState<"DROP_IN" | "CASH_OUT">(initialType);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [printSlip, setPrintSlip] = useState(true);
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<CashMovement[]>([]);
  const [managed, setManaged] = useState<CashCategory[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setType(initialType);
    setAmount("");
    setCategory("");
    setReason("");
    setReference("");
    if (session) posApi.cashMovements(session.id).then(setRecent).catch(() => setRecent([]));
    // Managed categories (ledger mapping, note / approval rules); the settings labels are the fallback.
    posApi.cashCategories().then(setManaged).catch(() => setManaged(null));
  }, [open, initialType, session]);

  const options = managed
    ? managed.filter((c) => c.movementType === "BOTH" || c.movementType === type).map((c) => ({ key: String(c.id), label: c.name, cat: c as CashCategory | null }))
    : (type === "DROP_IN" ? settings.cashInCategories : settings.cashOutCategories).map((c) => ({ key: c, label: c, cat: null as CashCategory | null }));
  const chosen = options.find((o) => o.key === category) ?? null;
  const value = parseFloat(amount) || 0;
  const needsNote = Boolean(chosen?.cat?.notesRequired);
  const valid = value > 0 && (!settings.requireCashMovementCategory || category) && (!needsNote || reason.trim().length > 0);

  const submit = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const mv = await withApproval((pin) => posApi.addCashMovement(session.id, {
        type, amount: r2(value), category: chosen?.cat ? null : (chosen?.label ?? null), categoryId: chosen?.cat?.id ?? null, reason: reason.trim() || undefined,
        reference: reference.trim() || undefined, supervisorPin: pin,
      }));
      if (!mv) return;
      toast.success(`${type === "DROP_IN" ? "Cash in" : "Cash out"} of ${currencyCode} ${value.toFixed(2)} recorded`);
      openDrawer(`${type === "DROP_IN" ? "Cash in" : "Cash out"} ${value.toFixed(2)}`);
      if (printSlip && company) printDoc(cashMovementDoc(mv, session.sessionNumber, company, template, currencyCode));
      onDone?.(mv);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 560 }}>
        <DialogHeader>
          <DialogTitle>Cash drop / cash out</DialogTitle>
          <DialogDescription>
            {session ? <>Session {session.sessionNumber}. Cash movements adjust the expected drawer cash on the X-report.</> : "Open a session first."}
          </DialogDescription>
        </DialogHeader>
        <div className={s.segmented} style={{ width: "100%" }}>
          <button type="button" style={{ flex: 1 }} className={type === "DROP_IN" ? s.segOn : ""} onClick={() => { setType("DROP_IN"); setCategory(""); }}>
            <ArrowDownCircle size={14} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />Cash in
          </button>
          <button type="button" style={{ flex: 1 }} className={type === "CASH_OUT" ? s.segOn : ""} onClick={() => { setType("CASH_OUT"); setCategory(""); }}>
            <ArrowUpCircle size={14} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />Cash out
          </button>
        </div>
        <div className={s.grid2} style={{ gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className={s.field}>
            <Label>Amount ({currencyCode})</Label>
            <Input type="number" min="0" step="0.01" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className={s.field}>
            <Label>Category{settings.requireCashMovementCategory ? " *" : ""}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{options.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            {chosen?.cat?.accountCode && <span className={s.fieldHint}>Posted to {chosen.cat.accountCode} {chosen.cat.accountName}</span>}
          </div>
        </div>
        <div className={s.field}>
          <Label>Reason / description{needsNote ? " *" : ""}</Label>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={type === "DROP_IN" ? "e.g. Float top-up from safe" : "e.g. Bank deposit, petty cash for cleaning supplies"} />
        </div>
        <div className={s.field}>
          <Label>Reference (optional)</Label>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Deposit slip / voucher no." />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={printSlip} onChange={(e) => setPrintSlip(e.target.checked)} /> Print a cash slip
        </label>
        {((type === "CASH_OUT" && settings.requireSupervisorForCashOut) || chosen?.cat?.approvalRequired) && !settings.currentUserIsSupervisor && (
          <div className={`${s.callout} ${s.calloutWarn}`}>{chosen?.cat?.approvalRequired ? `"${chosen.label}" needs` : "Cash outs need"} supervisor approval — you'll be asked for the PIN.</div>
        )}
        {recent.length > 0 && (
          <div>
            <div className={`${s.small} ${s.muted}`} style={{ marginBottom: 6 }}>This session</div>
            <div style={{ maxHeight: 130, overflowY: "auto" }}>
              {recent.map((m) => (
                <div key={m.id} className={s.rowBetween} style={{ fontSize: 12, padding: "4px 0", borderBottom: "1px solid #F1F5F9" }}>
                  <span><Pill tone={m.type === "DROP_IN" ? "green" : "red"}>{m.type === "DROP_IN" ? "In" : "Out"}</Pill> <span className={s.muted}>{fmtTime(m.createdAt)} · {m.category || m.reason || "—"}</span></span>
                  <span className={s.mono}><Money value={m.amount} /></span>
                </div>
              ))}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className={type === "DROP_IN" ? primaryBtn : "bg-[#E63946] hover:bg-[#d32f3d] text-white"} disabled={!valid || busy || !session} onClick={submit}>
            {busy ? "Saving…" : type === "DROP_IN" ? "Record cash in" : "Record cash out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** "idle 25m" from a last-activity timestamp. */
function idleFor(iso: string | null): string | null {
  if (!iso) return null;
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return "active now";
  return mins < 60 ? `idle ${mins}m` : `idle ${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function LiveSessionsDialog({ open, onOpenChange, onForceClose, onTakenOver }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onForceClose?: (s: PosSession) => void;
  /** After the caller took over a session (supervisor-approved). */
  onTakenOver?: (s: PosSession) => void;
}) {
  const { settings, session: mine } = usePos();
  const { withApproval } = useApproval();
  const [sessions, setSessions] = useState<PosSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [moving, setMoving] = useState<PosSession | null>(null);
  const { setSession } = usePos();

  const takeOver = async (x: PosSession) => {
    setBusyId(x.id);
    try {
      const taken = await withApproval((pin) => posApi.takeoverSession(x.id, { supervisorPin: pin, reason: "Taken over from Live sessions" }));
      if (taken) onTakenOver?.(taken);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const reload = () => {
    setLoading(true);
    posApi.liveSessions().then(setSessions).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => {
    if (open) reload();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = useMemo(() => sessions.reduce((a, x) => a + x.totalSales, 0), [sessions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 960 }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-[#2B7A78]" /> Live sessions</DialogTitle>
          <DialogDescription>Every open or suspended till in this branch. Net sales across them: <Money value={total} /></DialogDescription>
        </DialogHeader>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr><th>Session</th><th>Cashier</th><th>Terminal</th><th>Opened</th><th className={s.num}>Float</th><th className={s.num}>Sales</th><th className={s.num}>Net</th><th>Activity</th><th /></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className={s.muted}>Loading…</td></tr>}
              {!loading && sessions.length === 0 && <tr><td colSpan={9} className={s.muted}>No open sessions.</td></tr>}
              {sessions.map((x) => (
                <tr key={x.id}>
                  <td>
                    <span className={s.strong}>{x.sessionNumber}</span> {x.mine && <Pill tone="green">You</Pill>} {x.stale && <Pill tone="red">Previous day</Pill>}
                    {" "}{x.status === "SUSPENDED" && <Pill tone="gray">Suspended</Pill>}{x.closingStartedAt && <Pill tone="amber">Closing</Pill>}
                  </td>
                  <td>{x.staffName || x.openedBy}{x.takenOverFrom ? <div className={`${s.small} ${s.muted}`}>from {x.takenOverFrom}</div> : null}</td>
                  <td>{x.terminalName ? <span className="flex items-center gap-1"><Monitor size={13} />{x.terminalName}</span> : "—"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(x.openedAt)}</td>
                  <td className={s.num}><Money value={x.openingCash} /></td>
                  <td className={s.num}>{x.transactionCount}</td>
                  <td className={s.num}><Money value={x.totalSales} /></td>
                  <td className={`${s.small} ${s.muted}`}>{x.status === "SUSPENDED" ? `since ${fmtTime(x.suspendedAt)}` : idleFor(x.lastActivityAt) ?? "—"}</td>
                  <td className={s.num} style={{ whiteSpace: "nowrap" }}>
                    {!x.mine && !mine && onTakenOver && (
                      <Button size="sm" variant="outline" disabled={busyId === x.id} onClick={() => takeOver(x)} title="Continue this session as yourself (needs a supervisor)">
                        <Play className="h-3.5 w-3.5 mr-1" />Take over
                      </Button>
                    )}{" "}
                    {(x.mine || settings.currentUserIsSupervisor) && !x.closingStartedAt && (
                      <Button size="sm" variant="outline" onClick={() => setMoving(x)} title="Move this session to another terminal">
                        <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />Transfer
                      </Button>
                    )}{" "}
                    {!x.mine && settings.currentUserIsSupervisor && onForceClose && (
                      <Button size="sm" variant="outline" className="border-[#E63946] text-[#E63946]" onClick={() => onForceClose(x)}>Close</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
        <TransferSessionDialog session={moving} onOpenChange={(o) => !o && setMoving(null)}
          onDone={(moved) => { if (moved.mine) setSession(moved); reload(); }} />
      </DialogContent>
    </Dialog>
  );
}
