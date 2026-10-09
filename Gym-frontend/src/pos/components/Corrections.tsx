import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Banknote, CheckCircle2, FilePen, Plus, RotateCw, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { accountHeadsService, type AccountHead } from "../../utils/supabase/account-heads-service";
import { posApi } from "../api";
import { usePos } from "../PosContext";
import { DenominationCounter, Empty, Money, Pill, type PickedMember } from "./Shared";
import { searchMembers } from "./TerminalDialogs";
import { SalesLookupDialog } from "./SaleDialogs";
import { denominationTotal, emptyDenominations, fmtDateTime, num, r2, type Denominations } from "../pricing";
import type {
  CashCategory, CashMovement, Correction, CorrectionDashboard, CorrectionRequest, CorrectionStatus,
  PaymentAllocationRequest, PosSession, Sale,
} from "../types";
import s from "../pos.module.css";

const primaryBtn = "bg-[#2B7A78] hover:bg-[#236862] text-white";

export type CorrectionTargetRef =
  | { kind: "SALE"; sale: Sale }
  | { kind: "CASH_MOVEMENT"; movement: CashMovement; sessionNumber?: string | null }
  | { kind: "SESSION"; session: PosSession };

const STATUS_LABEL: Record<CorrectionStatus, string> = {
  REQUESTED: "Draft", PENDING_APPROVAL: "Awaiting approval", APPROVED: "Approved", APPLIED: "Applied",
  REJECTED: "Rejected", CANCELLED: "Cancelled", FAILED: "Failed",
};
const TYPE_LABEL: Record<string, string> = {
  PAYMENT_MODE: "Payment mode", CUSTOMER: "Customer", CATEGORY: "Cash category", DENOMINATION: "Counted cash",
};

export function correctionPill(c: Pick<Correction, "status">) {
  const tone = c.status === "APPLIED" ? "green" : c.status === "PENDING_APPROVAL" || c.status === "APPROVED" ? "amber"
    : c.status === "REJECTED" || c.status === "FAILED" ? "red" : c.status === "REQUESTED" ? "blue" : "gray";
  return <Pill tone={tone}>{STATUS_LABEL[c.status]}</Pill>;
}

const bucketOf = (method: string) => {
  const m = method.toUpperCase();
  if (m === "CASH" || m === "CASH IN HAND") return "CASH";
  if (m.includes("CARD") || m === "VISA" || m === "MASTERCARD") return "CARD";
  if (m.startsWith("ONLINE") || m.includes("TRANSFER") || m === "UPI") return "ONLINE";
  return m;
};

// ── Request dialog ─────────────────────────────────────────────────────────

export function CorrectionRequestDialog({ target, open, onOpenChange, onDone }: {
  target: CorrectionTargetRef | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone?: (c: Correction) => void;
}) {
  const { settings, currencyCode } = usePos();
  const [saleMode, setSaleMode] = useState<"PAYMENT_MODE" | "CUSTOMER">("PAYMENT_MODE");
  const [reason, setReason] = useState("");
  const [submitNow, setSubmitNow] = useState(true);
  const [busy, setBusy] = useState(false);
  // Payment mode
  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
  const [cardType, setCardType] = useState("");
  const [online, setOnline] = useState("");
  const [bankId, setBankId] = useState("");
  const [banks, setBanks] = useState<AccountHead[]>([]);
  // Customer
  const [memberQuery, setMemberQuery] = useState("");
  const [members, setMembers] = useState<PickedMember[]>([]);
  const [member, setMember] = useState<PickedMember | "WALK_IN" | null>(null);
  // Category
  const [categories, setCategories] = useState<CashCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  // Count
  const [counts, setCounts] = useState<Denominations>(() => emptyDenominations(settings.denominations));
  const [useCounter, setUseCounter] = useState(true);
  const [counted, setCounted] = useState("");

  useEffect(() => {
    if (!open || !target) return;
    setReason("");
    setSubmitNow(true);
    setSaleMode("PAYMENT_MODE");
    setMember(null);
    setMemberQuery("");
    setCategoryId("");
    if (target.kind === "SALE") {
      const legs = target.sale.paymentBreakdown?.length ? target.sale.paymentBreakdown
        : [{ method: target.sale.paymentMethod, amount: target.sale.totalAmount }];
      const sum = (b: string) => legs.filter((l) => bucketOf(l.method) === b).reduce((a, l) => a + l.amount, 0);
      setCash(sum("CASH") ? String(r2(sum("CASH"))) : "");
      setCard(sum("CARD") ? String(r2(sum("CARD"))) : "");
      setOnline(sum("ONLINE") ? String(r2(sum("ONLINE"))) : "");
      setCardType(legs.find((l) => bucketOf(l.method) === "CARD")?.cardType || "");
      accountHeadsService.getBankAccounts().then((list) => {
        setBanks(list);
        const code = legs.find((l) => bucketOf(l.method) === "ONLINE")?.bankAccountCode;
        const hit = list.find((a) => a.code === code);
        setBankId(hit ? String(hit.id) : "");
      }).catch(() => setBanks([]));
    }
    if (target.kind === "CASH_MOVEMENT") {
      posApi.cashCategories().then(setCategories).catch(() => setCategories([]));
    }
    if (target.kind === "SESSION") {
      let parsed: Denominations | null = null;
      try { parsed = target.session.closingDenominations ? JSON.parse(target.session.closingDenominations) : null; } catch { parsed = null; }
      setCounts(parsed && typeof parsed === "object" ? { ...emptyDenominations(settings.denominations), ...parsed } : emptyDenominations(settings.denominations));
      setUseCounter(Boolean(parsed));
      setCounted(target.session.closingCash != null ? String(target.session.closingCash) : "");
    }
  }, [open, target, settings.denominations]);

  useEffect(() => {
    if (!open || target?.kind !== "SALE" || saleMode !== "CUSTOMER") return;
    const t = setTimeout(() => searchMembers(memberQuery, 8).then(setMembers).catch(() => setMembers([])), 250);
    return () => clearTimeout(t);
  }, [open, target, saleMode, memberQuery]);

  if (!target) return null;

  const total = target.kind === "SALE" ? target.sale.totalAmount : 0;
  const split = r2((parseFloat(cash) || 0) + (parseFloat(card) || 0) + (parseFloat(online) || 0));
  const newCount = target.kind === "SESSION" ? (useCounter ? denominationTotal(counts) : parseFloat(counted) || 0) : 0;
  const options = target.kind === "CASH_MOVEMENT"
    ? categories.filter((c) => c.id !== target.movement.categoryId && (c.movementType === "BOTH" || c.movementType === target.movement.type))
    : [];
  const picked = options.find((c) => String(c.id) === categoryId);

  // Why the submit button is disabled, shown beside it — a silently greyed-out button
  // left cashiers guessing (BG: a 4-character reason blocked a valid payment split).
  const reasonLength = reason.trim().length;
  let blocker: string | null = null;
  if (target.kind === "SALE" && saleMode === "PAYMENT_MODE") {
    if (Math.abs(split - total) >= 0.005) blocker = `The corrected split must add up to ${num(total)}.`;
    else if (parseFloat(online) > 0 && !bankId) blocker = "Select the bank account that received the online payment.";
  }
  if (target.kind === "SALE" && saleMode === "CUSTOMER" && member === null) blocker = "Pick the corrected customer.";
  if (target.kind === "CASH_MOVEMENT" && !picked) blocker = "Pick the corrected category.";
  if (target.kind === "SESSION" && newCount < 0) blocker = "The corrected count cannot be negative.";
  if (!blocker && reasonLength < 5) blocker = reasonLength === 0 ? "Enter a reason for the correction." : `The reason needs at least 5 characters (${reasonLength}/5).`;
  const ready = blocker === null;

  const send = async () => {
    let body: CorrectionRequest;
    if (target.kind === "SALE" && saleMode === "PAYMENT_MODE") {
      const alloc: PaymentAllocationRequest[] = [];
      if (parseFloat(cash) > 0) alloc.push({ type: "CASH", amount: r2(parseFloat(cash)) });
      if (parseFloat(card) > 0) alloc.push({ type: "CARD", amount: r2(parseFloat(card)), subtype: cardType.trim() || null });
      if (parseFloat(online) > 0) alloc.push({ type: "ONLINE", amount: r2(parseFloat(online)), bankAccountId: Number(bankId) });
      body = { targetType: "SALE", targetId: target.sale.id, correctionType: "PAYMENT_MODE", reason: reason.trim(), paymentAllocations: alloc, submit: submitNow };
    } else if (target.kind === "SALE") {
      body = { targetType: "SALE", targetId: target.sale.id, correctionType: "CUSTOMER", reason: reason.trim(), memberId: member === "WALK_IN" || !member ? null : member.id, submit: submitNow };
    } else if (target.kind === "CASH_MOVEMENT") {
      body = { targetType: "CASH_MOVEMENT", targetId: target.movement.id, correctionType: "CATEGORY", reason: reason.trim(), categoryId: picked?.id ?? null, submit: submitNow };
    } else {
      body = {
        targetType: "SESSION", targetId: target.session.id, correctionType: "DENOMINATION", reason: reason.trim(),
        closingCash: r2(newCount), closingDenominations: useCounter ? JSON.stringify(counts) : null, submit: submitNow,
      };
    }
    setBusy(true);
    try {
      const c = await posApi.requestCorrection(body);
      toast.success(`${c.requestNumber} ${c.status === "PENDING_APPROVAL" ? "sent for approval" : "saved as a draft"}`);
      onDone?.(c);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const title = target.kind === "SALE" ? `Correct ${target.sale.transactionNumber}`
    : target.kind === "CASH_MOVEMENT" ? `Correct ${target.movement.type === "DROP_IN" ? "cash in" : "cash out"} #${target.movement.id}`
      : `Correct count — ${target.session.sessionNumber}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: target.kind === "SESSION" ? 760 : 580, maxHeight: "92vh", overflowY: "auto" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FilePen className="h-5 w-5 text-[#2B7A78]" />{title}</DialogTitle>
          <DialogDescription>Corrections are applied only after another supervisor approves them. Every change is journaled and audited.</DialogDescription>
        </DialogHeader>

        {target.kind === "SALE" && (
          <>
            <div className={s.panel}>
              <div className={s.panelBody} style={{ padding: 12 }}>
                <div className={s.rowBetween}><span className={s.muted}>Total</span><span className={s.strong}><Money value={target.sale.totalAmount} /></span></div>
                <div className={s.rowBetween}><span className={s.muted}>Paid by</span><span>{target.sale.paymentSummary}</span></div>
                <div className={s.rowBetween}><span className={s.muted}>Customer</span><span>{target.sale.memberName}</span></div>
              </div>
            </div>
            <div className={s.segmented} style={{ width: "100%" }}>
              <button type="button" style={{ flex: 1 }} className={saleMode === "PAYMENT_MODE" ? s.segOn : ""} onClick={() => setSaleMode("PAYMENT_MODE")}>Payment mode</button>
              <button type="button" style={{ flex: 1 }} className={saleMode === "CUSTOMER" ? s.segOn : ""} onClick={() => setSaleMode("CUSTOMER")}>Customer</button>
            </div>
            {saleMode === "PAYMENT_MODE" ? (
              <div className={s.stack}>
                <div className={s.grid2} style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className={s.field}><Label>Cash ({currencyCode})</Label><Input type="number" min="0" step="0.01" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="0.00" /></div>
                  <div className={s.field}><Label>Card ({currencyCode})</Label><Input type="number" min="0" step="0.01" value={card} onChange={(e) => setCard(e.target.value)} placeholder="0.00" /></div>
                  {parseFloat(card) > 0 && <div className={s.field}><Label>Card type</Label><Input value={cardType} onChange={(e) => setCardType(e.target.value)} placeholder="Visa, Mastercard…" /></div>}
                  <div className={s.field}><Label>Online ({currencyCode})</Label><Input type="number" min="0" step="0.01" value={online} onChange={(e) => setOnline(e.target.value)} placeholder="0.00" /></div>
                  {parseFloat(online) > 0 && (
                    <div className={s.field}>
                      <Label>Received in</Label>
                      <Select value={bankId} onValueChange={setBankId}>
                        <SelectTrigger><SelectValue placeholder="Bank account" /></SelectTrigger>
                        <SelectContent>{banks.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.code} - {a.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className={`${s.callout} ${Math.abs(split - total) < 0.005 ? "" : s.calloutWarn}`}>
                  Corrected split <span className={s.strong} style={{ margin: "0 4px" }}>{num(split)}</span> of {num(total)}
                  {Math.abs(split - total) >= 0.005 && <> — {split > total ? "over" : "short"} by {num(Math.abs(split - total))}</>}
                </div>
                <div className={`${s.small} ${s.muted}`}>Credit and wallet payments can't be corrected — return and re-ring those sales instead.</div>
              </div>
            ) : (
              <div className={s.stack}>
                <Input autoFocus value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} placeholder="Search member name, ID or phone…" />
                <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #EEF2F6", borderRadius: 8 }}>
                  <button type="button" className={s.clickRow} onClick={() => setMember("WALK_IN")}
                    style={{ display: "flex", width: "100%", padding: "8px 12px", background: member === "WALK_IN" ? "#E6F2F1" : undefined }}>Walk-in customer</button>
                  {members.map((m) => (
                    <button type="button" key={m.id} className={s.clickRow} onClick={() => setMember(m)}
                      style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "8px 12px", borderTop: "1px solid #F1F5F9", background: member !== "WALK_IN" && member?.id === m.id ? "#E6F2F1" : undefined }}>
                      <span className={s.strong}>{m.name}</span><span className={`${s.small} ${s.muted}`}>{m.memberCode || ""} {m.phone || ""}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {target.kind === "CASH_MOVEMENT" && (
          <div className={s.stack}>
            <div className={s.panel}>
              <div className={s.panelBody} style={{ padding: 12 }}>
                <div className={s.rowBetween}><span className={s.muted}>Amount</span><span className={s.strong}><Money value={target.movement.amount} /></span></div>
                <div className={s.rowBetween}><span className={s.muted}>Current category</span><span>{target.movement.category || "—"}{target.movement.postedAccountCode ? ` (${target.movement.postedAccountCode})` : ""}</span></div>
                {target.sessionNumber && <div className={s.rowBetween}><span className={s.muted}>Session</span><span>{target.sessionNumber}</span></div>}
              </div>
            </div>
            <div className={s.field}>
              <Label>Corrected category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{options.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}{c.accountCode ? ` → ${c.accountCode} ${c.accountName}` : ""}</SelectItem>)}</SelectContent>
              </Select>
              {picked && picked.accountCode !== target.movement.postedAccountCode && (
                <span className={s.fieldHint}>The ledger posting moves from {target.movement.postedAccountCode || "the till only"} to {picked.accountCode || "the till only"}.</span>
              )}
            </div>
          </div>
        )}

        {target.kind === "SESSION" && (
          <div className={s.stack}>
            <div className={s.grid2} style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <div className={s.panel}><div className={s.panelBody} style={{ padding: 10 }}><div className={`${s.small} ${s.muted}`}>Expected</div><div className={s.strong}><Money value={target.session.expectedCash} /></div></div></div>
              <div className={s.panel}><div className={s.panelBody} style={{ padding: 10 }}><div className={`${s.small} ${s.muted}`}>Counted (recorded)</div><div className={s.strong}><Money value={target.session.closingCash} /></div></div></div>
              <div className={s.panel}><div className={s.panelBody} style={{ padding: 10 }}><div className={`${s.small} ${s.muted}`}>New variance</div><div className={s.strong}>{num(r2(newCount - (target.session.expectedCash ?? 0)))}</div></div></div>
            </div>
            <div className={s.segmented}>
              <button type="button" className={useCounter ? s.segOn : ""} onClick={() => setUseCounter(true)}>Count notes & coins</button>
              <button type="button" className={!useCounter ? s.segOn : ""} onClick={() => setUseCounter(false)}>Enter total</button>
            </div>
            {useCounter
              ? <DenominationCounter values={settings.denominations} counts={counts} onChange={setCounts} currency={currencyCode} />
              : <div className={s.field}><Label>Corrected counted cash ({currencyCode})</Label><Input type="number" min="0" step="0.01" value={counted} onChange={(e) => setCounted(e.target.value)} /></div>}
            <div className={s.rowBetween}><span className={s.muted}>Corrected count</span><span className={s.strong}><Money value={newCount} /></span></div>
          </div>
        )}

        <div className={s.field}>
          <Label>Reason *</Label>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What went wrong and how you know (e.g. card slip found)" />
          <span className={s.fieldHint}>At least 5 characters.</span>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={submitNow} onChange={(e) => setSubmitNow(e.target.checked)} /> Send for approval now
        </label>
        <DialogFooter>
          {blocker && <span className={`${s.small} ${s.muted}`} style={{ alignSelf: "center", marginRight: "auto" }}>{blocker}</span>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className={primaryBtn} disabled={!ready || busy} onClick={send}>{busy ? "Sending…" : submitNow ? "Request approval" : "Save draft"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Detail / decision dialog ───────────────────────────────────────────────

function Snapshot({ json }: { json: string }) {
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(json); } catch { /* unreadable snapshot */ }
  const rows = Object.entries(data).filter(([k]) => !k.endsWith("_id") && k !== "closing_denominations");
  return (
    <div className={s.stack} style={{ gap: 4 }}>
      {rows.map(([k, v]) => (
        <div key={k} className={s.rowBetween} style={{ fontSize: 13 }}>
          <span className={s.muted}>{k.replace(/_/g, " ")}</span>
          <span style={{ textAlign: "right" }}>
            {Array.isArray(v)
              ? (v as Record<string, unknown>[]).map((l, i) => <div key={i}>{String(l.method)} {num(Number(l.amount))}{l.bank_account_code ? ` · ${l.bank_account_code}` : ""}{l.card_type ? ` · ${l.card_type}` : ""}</div>)
              : v == null || v === "" ? "—" : String(v)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CorrectionDetailDialog({ correction, onOpenChange, onChanged }: {
  correction: Correction | null;
  onOpenChange: (o: boolean) => void;
  onChanged: (c: Correction) => void;
}) {
  const { settings } = usePos();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setNotes(""); }, [correction?.id]);
  if (!correction) return null;
  const c = correction;
  const mine = c.requestedBy === settings.currentUsername;

  const act = async (fn: () => Promise<Correction>, done: (r: Correction) => string) => {
    setBusy(true);
    try {
      const r = await fn();
      onChanged(r);
      if (r.status === "FAILED") toast.error(`${r.requestNumber} could not be applied: ${r.executionError}`);
      else toast.success(done(r));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const timeline: [string, string | null, string | null][] = [
    ["Requested", c.requestedBy, c.requestedAt],
    ["Submitted", null, c.submittedAt],
    ["Approved", c.approvedBy, c.approvedAt],
    ["Applied", c.appliedBy, c.appliedAt],
    ["Rejected", c.rejectedBy, c.rejectedAt],
    ["Cancelled", c.cancelledBy, c.cancelledAt],
  ];

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 720, maxHeight: "92vh", overflowY: "auto" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FilePen className="h-5 w-5 text-[#2B7A78]" />{c.requestNumber} {correctionPill(c)}</DialogTitle>
          <DialogDescription>{TYPE_LABEL[c.correctionType] ?? c.correctionType} · {c.targetLabel}</DialogDescription>
        </DialogHeader>
        <div className={s.callout}><div><div className={s.strong}>{c.summary}</div><div className={s.small}>Reason: {c.reason}</div></div></div>
        <div className={s.grid2} style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className={s.panel}><div className={s.panelHead}><div className={s.panelTitle}>Original</div></div><div className={s.panelBody}><Snapshot json={c.originalJson} /></div></div>
          <div className={s.panel}><div className={s.panelHead}><div className={s.panelTitle}>Corrected</div></div><div className={s.panelBody}><Snapshot json={c.correctedJson} /></div></div>
        </div>
        {c.executionError && <div className={`${s.callout} ${s.calloutBad}`}><XCircle size={16} />{c.executionError}</div>}
        {c.rejectionReason && <div className={`${s.callout} ${s.calloutWarn}`}>Rejected: {c.rejectionReason}</div>}
        <div className={`${s.small} ${s.muted}`}>
          {timeline.filter(([, , at]) => at).map(([label, by, at]) => <div key={label}>{label} {by ? `by ${by} ` : ""}· {fmtDateTime(at)}</div>)}
          {c.approvalNotes && <div>Approval note: {c.approvalNotes}</div>}
          {c.journalReference && <div>Journal voucher {c.journalReference}</div>}
        </div>
        {c.canDecide && (
          <div className={s.field}>
            <Label>Decision note {`(required to reject)`}</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Checked against the card terminal batch" />
          </div>
        )}
        {c.status === "PENDING_APPROVAL" && !c.canDecide && (
          <div className={`${s.small} ${s.muted}`}>{mine ? "Waiting for another supervisor to approve your request." : "Only a supervisor who didn't raise it can approve this request."}</div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {(c.status === "REQUESTED" || c.status === "PENDING_APPROVAL") && (mine || settings.currentUserIsSupervisor) && (
            <Button variant="outline" disabled={busy} onClick={() => act(() => posApi.cancelCorrection(c.id), (r) => `${r.requestNumber} cancelled`)}>Cancel request</Button>
          )}
          {c.status === "REQUESTED" && (mine || settings.currentUserIsSupervisor) && (
            <Button className={primaryBtn} disabled={busy} onClick={() => act(() => posApi.submitCorrection(c.id), (r) => `${r.requestNumber} sent for approval`)}>Send for approval</Button>
          )}
          {c.canDecide && (
            <>
              <Button variant="outline" className="text-[#E63946]" disabled={busy || !notes.trim()} onClick={() => act(() => posApi.rejectCorrection(c.id, notes.trim()), (r) => `${r.requestNumber} rejected`)}>Reject</Button>
              <Button className={primaryBtn} disabled={busy} onClick={() => act(() => posApi.approveCorrection(c.id, notes.trim() || undefined), (r) => `${r.requestNumber} approved and applied`)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />Approve & apply
              </Button>
            </>
          )}
          {(c.status === "FAILED" || c.status === "APPROVED") && settings.currentUserIsSupervisor && (
            <Button className={primaryBtn} disabled={busy} onClick={() => act(() => posApi.applyCorrection(c.id), (r) => `${r.requestNumber} applied`)}><RotateCw className="h-4 w-4 mr-2" />Retry apply</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Console tab ────────────────────────────────────────────────────────────

export function CorrectionsTab() {
  const [status, setStatus] = useState("OPEN");
  const [targetType, setTargetType] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Correction[]>([]);
  const [pages, setPages] = useState(1);
  const [dash, setDash] = useState<CorrectionDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<Correction | null>(null);
  const [lookup, setLookup] = useState(false);
  const [target, setTarget] = useState<CorrectionTargetRef | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, d] = await Promise.all([
        posApi.corrections({ status, targetType: targetType === "ALL" ? undefined : targetType, search: search.trim() || undefined, page, size: 25 }),
        posApi.correctionDashboard(),
      ]);
      setRows(r.corrections);
      setPages(Math.max(1, r.pagination.totalPages));
      setDash(d);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [status, targetType, search, page]);
  useEffect(() => { load(); }, [load]);

  const changed = (c: Correction) => { setOpen(c); load(); };
  const tiles: [string, number, string][] = dash ? [
    ["Awaiting my decision", dash.awaitingMyDecision, "MINE"],
    ["Awaiting approval", dash.byStatus.PENDING_APPROVAL ?? 0, "PENDING_APPROVAL"],
    ["Drafts", dash.byStatus.REQUESTED ?? 0, "REQUESTED"],
    ["Applied", dash.byStatus.APPLIED ?? 0, "APPLIED"],
    ["Rejected", dash.byStatus.REJECTED ?? 0, "REJECTED"],
    ["Failed", dash.byStatus.FAILED ?? 0, "FAILED"],
  ] : [];

  return (
    <div className={s.stack}>
      {dash && (
        <div className={s.grid2} style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 10 }}>
          {tiles.map(([label, n, st]) => (
            <button key={label} type="button" className={s.panel} style={{ textAlign: "left", cursor: "pointer", outline: status === st ? "2px solid #2B7A78" : undefined }}
              onClick={() => { setStatus(st === "MINE" ? "PENDING_APPROVAL" : st); setPage(1); }}>
              <div className={s.panelBody} style={{ padding: 12 }}>
                <div className={`${s.small} ${s.muted}`}>{label}</div>
                <div className={s.strong} style={{ fontSize: 22, color: st === "MINE" && n > 0 ? "#B45309" : undefined }}>{n}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      <div className={s.panel}>
        <div className={s.panelHead}>
          <div className={s.panelTitle}><FilePen size={16} />Corrections</div>
          <div className={s.rowWrap}>
            <div style={{ position: "relative" }}>
              <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Request / receipt / user" style={{ width: 200 }} />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger style={{ width: 170 }}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Open (not finished)</SelectItem>
                <SelectItem value="ALL">All statuses</SelectItem>
                {(Object.keys(STATUS_LABEL) as CorrectionStatus[]).map((k) => <SelectItem key={k} value={k}>{STATUS_LABEL[k]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={targetType} onValueChange={(v) => { setTargetType(v); setPage(1); }}>
              <SelectTrigger style={{ width: 150 }}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All records</SelectItem>
                <SelectItem value="SALE">Sales</SelectItem>
                <SelectItem value="CASH_MOVEMENT">Cash movements</SelectItem>
                <SelectItem value="SESSION">Sessions</SelectItem>
              </SelectContent>
            </Select>
            <Button className={primaryBtn} onClick={() => setLookup(true)}><Plus className="h-4 w-4 mr-2" />Correct a sale</Button>
          </div>
        </div>
        <div className={`${s.small} ${s.muted}`} style={{ padding: "8px 16px 0" }}>
          Cash movements and closed-session counts are corrected from Session history (Cash movements / Correct count).
        </div>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead><tr><th>Request</th><th>Record</th><th>Type</th><th>Change</th><th>Requested</th><th>Status</th><th /></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7} className={s.muted}>Loading…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={7}><Empty icon={<FilePen size={28} />} title="No corrections" hint="Requests to fix a sale's payment or customer, a cash movement's category or a session count appear here." /></td></tr>}
              {rows.map((c) => (
                <tr key={c.id} className={s.clickRow} onClick={() => setOpen(c)}>
                  <td className={s.strong} style={{ whiteSpace: "nowrap" }}>{c.requestNumber}</td>
                  <td>{c.targetLabel}</td>
                  <td>{TYPE_LABEL[c.correctionType] ?? c.correctionType}</td>
                  <td className={s.small} style={{ maxWidth: 360 }}>{c.summary}</td>
                  <td className={s.small} style={{ whiteSpace: "nowrap" }}>{c.requestedBy}<br /><span className={s.muted}>{fmtDateTime(c.requestedAt)}</span></td>
                  <td>{correctionPill(c)}{c.canDecide && <div className={`${s.small} ${s.warnText}`}>Your decision</div>}</td>
                  <td className={s.num}><Button size="sm" variant="outline">Open</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={s.panelHead} style={{ borderTop: "1px solid #EEF2F6", borderBottom: 0 }}>
          <span className={s.muted}>Page {page} of {pages}</span>
          <div className={s.rowWrap}>
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </div>
      <CorrectionDetailDialog correction={open} onOpenChange={(o) => !o && setOpen(null)} onChanged={changed} />
      <SalesLookupDialog open={lookup} onOpenChange={setLookup} mode="correct" onPick={(sale) => { setLookup(false); setTarget({ kind: "SALE", sale }); }} />
      <CorrectionRequestDialog target={target} open={Boolean(target)} onOpenChange={(o) => !o && setTarget(null)} onDone={(c) => { setStatus("OPEN"); load(); setOpen(c); }} />
    </div>
  );
}

// ── Session cash movements (from Session history) ─────────────────────────

export function SessionMovementsDialog({ session, onOpenChange }: { session: PosSession | null; onOpenChange: (o: boolean) => void }) {
  const [rows, setRows] = useState<CashMovement[]>([]);
  const [target, setTarget] = useState<CorrectionTargetRef | null>(null);
  useEffect(() => {
    if (session) posApi.cashMovements(session.id).then(setRows).catch((e) => { setRows([]); toast.error((e as Error).message); });
  }, [session]);
  if (!session) return null;
  return (
    <>
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent style={{ maxWidth: 820 }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-[#2B7A78]" />Cash movements — {session.sessionNumber}</DialogTitle>
            <DialogDescription>{session.staffName || session.openedBy} · {session.terminalName || "—"}</DialogDescription>
          </DialogHeader>
          <div className={s.tableWrap} style={{ maxHeight: "60vh", overflowY: "auto" }}>
            <table className={s.table}>
              <thead><tr><th>When</th><th>Type</th><th>Category</th><th>Ledger</th><th>Reason</th><th className={s.num}>Amount</th><th /></tr></thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={7} className={s.muted}>No cash in / out in this session.</td></tr>}
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(m.createdAt)}</td>
                    <td><Pill tone={m.type === "DROP_IN" ? "green" : "red"}>{m.type === "DROP_IN" ? "In" : "Out"}</Pill></td>
                    <td>{m.category || "—"}</td>
                    <td className={s.small}>{m.postedAccountCode ? `${m.postedAccountCode} ${m.postedAccountName ?? ""}` : <span className={s.muted}>Till only</span>}</td>
                    <td className={s.small}>{m.reason || "—"}</td>
                    <td className={s.num}><Money value={m.amount} /></td>
                    <td className={s.num}><Button size="sm" variant="outline" onClick={() => setTarget({ kind: "CASH_MOVEMENT", movement: m, sessionNumber: session.sessionNumber })}>Correct</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <CorrectionRequestDialog target={target} open={Boolean(target)} onOpenChange={(o) => !o && setTarget(null)} />
    </>
  );
}

// ── Cash categories (Console) ──────────────────────────────────────────────

const MOVEMENT_LABEL = { DROP_IN: "Cash in", CASH_OUT: "Cash out", BOTH: "Both" } as const;

export function CashCategoriesPanel({ canEdit }: { canEdit: boolean }) {
  const [rows, setRows] = useState<CashCategory[]>([]);
  const [accounts, setAccounts] = useState<AccountHead[]>([]);
  const [editing, setEditing] = useState<Partial<CashCategory> | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => posApi.cashCategories(true).then(setRows).catch((e) => toast.error((e as Error).message)), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (editing && accounts.length === 0) accountHeadsService.getAll(undefined, true).then(setAccounts).catch(() => setAccounts([]));
  }, [editing, accounts.length]);
  const selectable = useMemo(() => accounts.filter((a) => a.code !== "1000"), [accounts]);

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      const body: Partial<CashCategory> = {
        name: editing.name?.trim(), code: editing.code?.trim() || undefined, description: editing.description ?? "",
        movementType: editing.movementType ?? "BOTH", accountCode: editing.accountCode ?? "",
        notesRequired: Boolean(editing.notesRequired), approvalRequired: Boolean(editing.approvalRequired),
        displayOrder: editing.displayOrder,
      };
      if (editing.id) await posApi.updateCashCategory(editing.id, body);
      else await posApi.createCashCategory(body);
      toast.success("Category saved");
      setEditing(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (c: CashCategory) => {
    try {
      await posApi.setCashCategoryActive(c.id, !c.active);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className={s.panel}>
      <div className={s.panelHead}>
        <div className={s.panelTitle}>Cash movement categories</div>
        {canEdit && <Button size="sm" className={primaryBtn} onClick={() => setEditing({ movementType: "BOTH", notesRequired: false, approvalRequired: false })}><Plus className="h-4 w-4 mr-1" />Add</Button>}
      </div>
      <div className={`${s.small} ${s.muted}`} style={{ padding: "8px 16px 0" }}>
        A category mapped to a ledger account journals its cash in / out against that account (e.g. Bank deposit → bank, Petty cash → expense).
      </div>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead><tr><th>Category</th><th>For</th><th>Ledger account</th><th>Rules</th><th>Status</th><th /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className={s.muted}>Loading…</td></tr>}
            {rows.map((c) => (
              <tr key={c.id} style={{ opacity: c.active ? 1 : 0.55 }}>
                <td><span className={s.strong}>{c.name}</span><div className={`${s.small} ${s.muted}`}>{c.code}</div></td>
                <td>{MOVEMENT_LABEL[c.movementType]}</td>
                <td className={s.small}>{c.accountCode ? `${c.accountCode} ${c.accountName ?? ""}` : <span className={s.muted}>Till only</span>}</td>
                <td className={s.small}>{[c.notesRequired && "Note", c.approvalRequired && "Supervisor"].filter(Boolean).join(" · ") || "—"}</td>
                <td>{c.active ? <Pill tone="green">Active</Pill> : <Pill tone="gray">Inactive</Pill>}</td>
                <td className={s.num} style={{ whiteSpace: "nowrap" }}>
                  {canEdit && <>
                    <Button size="sm" variant="outline" onClick={() => setEditing(c)}>Edit</Button>{" "}
                    <Button size="sm" variant="outline" onClick={() => toggle(c)}>{c.active ? "Deactivate" : "Activate"}</Button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent style={{ maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit category" : "New cash category"}</DialogTitle>
            <DialogDescription>Shown in the cash in / cash out dialog at the till.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className={s.stack}>
              <div className={s.grid2} style={{ gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                <div className={s.field}><Label>Name *</Label><Input autoFocus value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Petty cash — cleaning" /></div>
                <div className={s.field}><Label>Code</Label><Input value={editing.code ?? ""} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="Auto" /></div>
              </div>
              <div className={s.grid2} style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className={s.field}>
                  <Label>Used for</Label>
                  <Select value={editing.movementType ?? "BOTH"} onValueChange={(v) => setEditing({ ...editing, movementType: v as CashCategory["movementType"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{(Object.keys(MOVEMENT_LABEL) as (keyof typeof MOVEMENT_LABEL)[]).map((k) => <SelectItem key={k} value={k}>{MOVEMENT_LABEL[k]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className={s.field}>
                  <Label>Ledger account</Label>
                  <Select value={editing.accountCode || "NONE"} onValueChange={(v) => setEditing({ ...editing, accountCode: v === "NONE" ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Till only (no journal)</SelectItem>
                      {selectable.map((a) => <SelectItem key={a.id} value={a.code}>{a.code} - {a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className={s.field}><Label>Description</Label><Input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={Boolean(editing.notesRequired)} onChange={(e) => setEditing({ ...editing, notesRequired: e.target.checked })} /> Cashier must add a note</label>
              <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={Boolean(editing.approvalRequired)} onChange={(e) => setEditing({ ...editing, approvalRequired: e.target.checked })} /> Needs supervisor approval</label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button className={primaryBtn} disabled={busy || !editing?.name?.trim()} onClick={save}>{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

