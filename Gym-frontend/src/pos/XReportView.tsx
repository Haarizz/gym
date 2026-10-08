import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CreditCard, Download, FileText, Lock, Printer, RefreshCw, Undo2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { posApi } from "./api";
import { usePos } from "./PosContext";
import { useApproval } from "./components/Approval";
import { DenominationCounter, Empty, Money, Pill, ReportSections } from "./components/Shared";
import { denominationTotal, emptyDenominations, fmtDate, fmtDateTime, fmtTime, num, r2, type Denominations } from "./pricing";
import { xReportDoc } from "./print/receiptModel";
import { exportReportXlsx, printA4, reportA4Html } from "./print/reportA4";
import type { PosSession, XReport } from "./types";
import s from "./pos.module.css";

const primaryBtn = "bg-[#2B7A78] hover:bg-[#236862] text-white";

export function XReportView() {
  const { session: mySession, xSessionId, setSession, settings, company, template, currencyCode, go, printDoc, openDrawer, refreshDayStatus } = usePos();
  const { withApproval } = useApproval();
  const targetId = xSessionId ?? mySession?.id ?? null;
  const [x, setX] = useState<XReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Denominations>(() => emptyDenominations(settings.denominations));
  const [remarks, setRemarks] = useState("");
  const [notes, setNotes] = useState("");
  const [cardAmount, setCardAmount] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [cardVerified, setCardVerified] = useState(false);
  const [forceReason, setForceReason] = useState("");
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      setX(await posApi.xReport(targetId));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [targetId]);
  useEffect(() => { load(); }, [load]);

  const sess: PosSession | null = x?.session ?? null;
  /** Open or suspended: the drawer still has to be counted out. */
  const isOpen = sess?.status === "OPEN" || sess?.status === "SUSPENDED";
  const closingStarted = Boolean(sess?.closingStartedAt);
  const canSell = Boolean(mySession && sess?.mine && sess.status === "OPEN" && !closingStarted && !sess.stale);
  const [cancelling, setCancelling] = useState(false);

  const cancelClosing = async () => {
    if (!sess) return;
    setCancelling(true);
    try {
      const updated = await withApproval((pin) => posApi.cancelClosure(sess.id, { supervisorPin: pin, reason: "Cancelled from the X-Report" }));
      if (!updated) return;
      toast.success(`${updated.sessionNumber} is back in service`);
      if (mySession?.id === updated.id) setSession(updated);
      refreshDayStatus();
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCancelling(false);
    }
  };
  const someoneElses = Boolean(sess && sess.openedBy && !sess.mine);
  const counted = denominationTotal(counts);
  const expected = x?.summary.cash.expectedCash ?? 0;
  const variance = r2(counted - expected);
  const needsRemarks = Math.abs(variance) > settings.cashVarianceThreshold && variance !== 0;
  const cardTender = x?.summary.tenders.find((t) => t.method === "Card")?.amount ?? 0;

  const doc = useMemo(() => (x && company ? xReportDoc(x, company, template, currencyCode) : null), [x, company, template, currencyCode]);

  const print = async (format: "thermal" | "a4") => {
    if (!x || !company) return;
    const d = xReportDoc(x, company, template, currencyCode, isOpen && counted > 0 ? { counted, variance, denominations: counts } : undefined);
    if (format === "a4") await printA4(reportA4Html(d, [invoiceTable(x)]));
    else await printDoc(d);
    posApi.markXReportPrinted(x.session.id).catch(() => undefined);
  };

  const close = async () => {
    if (!sess) return;
    if (needsRemarks && !remarks.trim()) { toast.error("Explain the cash variance before closing."); return; }
    if (someoneElses && !forceReason.trim()) { toast.error(`Give a reason for closing ${sess.openedBy}'s session.`); return; }
    setClosing(true);
    try {
      const closed = await withApproval((pin) => posApi.closeSession(sess.id, {
        closingCash: counted,
        closingDenominations: JSON.stringify(counts),
        varianceRemarks: remarks.trim() || undefined,
        notes: notes.trim() || undefined,
        cardSettlementAmount: cardAmount ? r2(parseFloat(cardAmount)) : null,
        cardBatchNo: batchNo.trim() || undefined,
        cardSettlementVerified: cardVerified,
        force: someoneElses || undefined,
        forceCloseReason: forceReason.trim() || undefined,
        supervisorPin: pin,
      }));
      if (!closed) return;
      toast.success(`Session ${closed.sessionNumber} closed · variance ${currencyCode} ${num(closed.cashVariance)}`);
      if (sess.mine || mySession?.id === sess.id) setSession(null);
      refreshDayStatus();
      const fresh = await posApi.xReport(closed.id);
      setX(fresh);
      if (company) printDoc(xReportDoc(fresh, company, template, currencyCode, { counted, variance: closed.cashVariance ?? variance, denominations: counts }));
      openDrawer("Session closed — cash counted");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setClosing(false);
    }
  };

  const exportXlsx = () => {
    if (!x || !doc) return;
    const t = invoiceTable(x);
    exportReportXlsx(doc, `X-Report-${x.session.sessionNumber}.xlsx`, [{ heading: t.heading, columns: t.columns, rows: t.rows }]);
  };

  if (!targetId) {
    return (
      <div className={s.page}>
        <button type="button" className={s.backLink} onClick={() => go("dashboard")}><ArrowLeft size={14} />POS dashboard</button>
        <div className={s.panel}><Empty icon={<FileText size={34} />} title="No open session" hint="Start a session from the POS dashboard to see its X-report." /></div>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <div className={s.hero}>
        <div>
          <button type="button" className={s.backLink} onClick={() => go(canSell ? "terminal" : "dashboard")}><ArrowLeft size={14} />{canSell ? "Back to terminal" : "POS dashboard"}</button>
          <div className={s.heroTitle}>X-Report {isOpen ? "/ Close session" : "· Session closed"}</div>
          <div className={s.heroSub}>
            {sess ? <>{sess.sessionNumber} · {sess.staffName || sess.openedBy} · business date {fmtDate(sess.businessDate)} · opened {fmtDateTime(sess.openedAt)}{sess.closedAt ? ` · closed ${fmtDateTime(sess.closedAt)}` : ""}</> : "Loading…"}
          </div>
        </div>
        <div className={s.rowWrap}>
          {sess && (isOpen
            ? <Pill tone={sess.stale || closingStarted ? "amber" : sess.status === "SUSPENDED" ? "gray" : "green"} dot>
                {sess.stale ? "Open · previous day" : closingStarted ? `Closing · started by ${sess.closingStartedBy}` : sess.status === "SUSPENDED" ? "Suspended" : "Open"}
              </Pill>
            : <Pill tone="gray" dot>Closed{sess.forceClosed ? " (forced)" : ""}</Pill>)}
          {sess && isOpen && closingStarted && (
            <Button variant="outline" disabled={cancelling} onClick={cancelClosing} title="Put this session back into service (supervisor)">
              <Undo2 className="h-4 w-4 mr-2" />{cancelling ? "Cancelling…" : "Cancel closing"}
            </Button>
          )}
          <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
          <Button variant="outline" onClick={() => print("thermal")} disabled={!x}><Printer className="h-4 w-4 mr-2" />Print</Button>
          <Button variant="outline" onClick={() => print("a4")} disabled={!x}><FileText className="h-4 w-4 mr-2" />A4</Button>
          <Button variant="outline" onClick={exportXlsx} disabled={!x}><Download className="h-4 w-4 mr-2" />Excel</Button>
        </div>
      </div>

      {x && (
        <div className={s.stats}>
          {[
            { label: "Total sales", value: <Money value={x.summary.totalSales} />, foot: `${x.summary.invoiceCount} invoice(s)` },
            { label: "Net after returns", value: <Money value={x.summary.netSales} />, foot: `${x.summary.returnCount} return(s) · ${num(x.summary.returnTotal)}` },
            { label: "Expected cash", value: <Money value={expected} />, foot: `Float ${num(x.summary.cash.openingCash)} · cash sales ${num(x.summary.cash.cashSales)}` },
            { label: "Card", value: <Money value={cardTender} />, foot: "Compare with the card terminal batch" },
            { label: "On account", value: <Money value={x.summary.creditSales} />, foot: `Collected ${num(x.summary.creditCollections)}` },
          ].map((c) => (
            <div key={c.label} className={s.stat}>
              <div className={s.statBody}><div className={s.statHead}><span className={s.statLabel}>{c.label}</span></div><div className={s.statValue}>{c.value}</div></div>
              <div className={s.statFoot}>{c.foot}</div>
            </div>
          ))}
        </div>
      )}

      {x && isOpen && (
        <div className={s.panel}>
          <div className={s.panelHead}>
            <div>
              <div className={s.panelTitle}><Lock size={18} className="text-[#E63946]" />Close session</div>
              <div className={s.panelSub}>Count every note and coin in the drawer. The variance against the expected cash is recorded on the session.</div>
            </div>
          </div>
          <div className={s.panelBody}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(280px, 1fr)", gap: 20 }}>
              <DenominationCounter values={settings.denominations} counts={counts} onChange={setCounts} currency={currencyCode} />
              <div className={s.stack}>
                <table className={s.kv}>
                  <tbody>
                    <tr><td>Opening float</td><td><Money value={x.summary.cash.openingCash} /></td></tr>
                    <tr><td>+ Cash sales</td><td><Money value={x.summary.cash.cashSales} /></td></tr>
                    <tr><td>+ Credit collected (cash)</td><td><Money value={x.summary.cash.creditCollectionsCash} /></td></tr>
                    <tr><td>+ Cash in</td><td><Money value={x.summary.cash.cashIn} /></td></tr>
                    <tr><td>− Cash out</td><td><Money value={x.summary.cash.cashOut} /></td></tr>
                    <tr><td>− Cash refunds</td><td><Money value={x.summary.cash.cashRefunds} /></td></tr>
                    <tr className={s.kvBold}><td>Expected in drawer</td><td><Money value={expected} /></td></tr>
                    <tr className={s.kvBold}><td>Counted</td><td><Money value={counted} /></td></tr>
                  </tbody>
                </table>
                <div className={`${s.callout} ${variance === 0 ? s.calloutOk : needsRemarks ? s.calloutBad : s.calloutWarn}`}>
                  <div>
                    <div className={s.strong}>Variance {variance > 0 ? "+" : ""}{currencyCode} {num(variance)}</div>
                    <div className={s.small}>{variance === 0 ? "Drawer balances exactly." : variance > 0 ? "More cash than expected (over)." : "Less cash than expected (short)."}{needsRemarks ? " Remarks are required." : ""}{needsRemarks && settings.requireSupervisorForVariance && !settings.currentUserIsSupervisor ? " A supervisor must approve it." : ""}</div>
                  </div>
                </div>
                <div className={s.field}>
                  <Label>Variance remarks{needsRemarks ? " *" : ""}</Label>
                  <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Explain any shortage or excess" />
                </div>
                <div className={s.panel} style={{ padding: 12 }}>
                  <div className={s.strong} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><CreditCard size={15} />Card settlement</div>
                  <div className={s.grid2} style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div className={s.field}><Label>Terminal batch total</Label><Input type="number" step="0.01" value={cardAmount} onChange={(e) => setCardAmount(e.target.value)} placeholder={num(cardTender)} /></div>
                    <div className={s.field}><Label>Batch no.</Label><Input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} /></div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600 mt-2"><input type="checkbox" checked={cardVerified} onChange={(e) => setCardVerified(e.target.checked)} /> Card settlement matches the POS ({num(cardTender)})</label>
                  {cardAmount && Math.abs(r2(parseFloat(cardAmount) - cardTender)) > 0.009 && <div className={`${s.small} ${s.warnText}`} style={{ marginTop: 6 }}>Differs from POS card sales by {num(r2(parseFloat(cardAmount) - cardTender))}</div>}
                </div>
                <div className={s.field}><Label>Closing notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" /></div>
                {someoneElses && (
                  <div className={s.field}>
                    <Label>Reason for closing {sess?.openedBy}'s session *</Label>
                    <Input value={forceReason} onChange={(e) => setForceReason(e.target.value)} placeholder="e.g. Cashier left without closing" />
                  </div>
                )}
                <Button className="bg-[#E63946] hover:bg-[#d32f3d] text-white" disabled={closing} onClick={close}>
                  <Lock className="h-4 w-4 mr-2" />{closing ? "Closing…" : `Close session with ${currencyCode} ${num(counted)}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {x && !isOpen && sess && (
        <div className={`${s.callout} ${(sess.cashVariance ?? 0) === 0 ? s.calloutOk : s.calloutWarn}`}>
          Closed by {sess.closedBy} at {fmtDateTime(sess.closedAt)} — counted <b style={{ margin: "0 4px" }}><Money value={sess.closingCash} /></b> against expected <b style={{ margin: "0 4px" }}><Money value={sess.expectedCash} /></b>
          (variance {num(sess.cashVariance)}){sess.varianceRemarks ? ` · “${sess.varianceRemarks}”` : ""}{sess.varianceApprovedBy ? ` · approved by ${sess.varianceApprovedBy}` : ""}{sess.forceCloseReason ? ` · forced: ${sess.forceCloseReason}` : ""}
        </div>
      )}

      {doc && <ReportSections sections={doc.sections} />}

      {x && (
        <div className={s.panel}>
          <div className={s.panelHead}><div className={s.panelTitle}>Invoices ({x.invoices.length})</div><div className={s.panelSub}>{x.summary.firstInvoice ? `${x.summary.firstInvoice} → ${x.summary.lastInvoice}` : ""}</div></div>
          <div className={s.tableWrap} style={{ maxHeight: 420, overflowY: "auto" }}>
            <table className={s.table}>
              <thead><tr><th>Receipt</th><th>Time</th><th>Customer</th><th>Payment</th><th className={s.num}>Total</th><th className={s.num}>Returned</th><th>Status</th></tr></thead>
              <tbody>
                {x.invoices.length === 0 && <tr><td colSpan={7} className={s.muted}>No sales in this session yet.</td></tr>}
                {x.invoices.map((i) => (
                  <tr key={i.id}>
                    <td className={s.strong}>{i.transactionNumber}</td>
                    <td>{fmtTime(i.createdAt)}</td>
                    <td>{i.memberName}</td>
                    <td>{i.paymentSummary}</td>
                    <td className={s.num}><Money value={i.totalAmount} /></td>
                    <td className={s.num}>{i.refundedAmount > 0 ? <span className={s.danger}><Money value={i.refundedAmount} /></span> : "—"}</td>
                    <td>{i.status === "REFUNDED" ? <Pill tone="red">Refunded</Pill> : i.refundedAmount > 0 ? <Pill tone="amber">Part returned</Pill> : <Pill tone="green">Completed</Pill>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function invoiceTable(x: XReport) {
  return {
    heading: "Invoices",
    columns: ["Receipt", "Time", "Customer", "Payment", "Total", "Returned", "Status"],
    numeric: [4, 5],
    rows: x.invoices.map((i) => [i.transactionNumber, fmtTime(i.createdAt), i.memberName, i.paymentSummary, num(i.totalAmount), num(i.refundedAmount), i.status]),
  };
}
