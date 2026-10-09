import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Download, FileText, History, Lock, Printer, RefreshCw, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { posApi } from "./api";
import { usePos } from "./PosContext";
import { useApproval } from "./components/Approval";
import { Money, Pill, ReportSections } from "./components/Shared";
import { fmtDate, fmtDateTime, fmtTime, num, todayIso } from "./pricing";
import { zReportDoc } from "./print/receiptModel";
import { exportReportXlsx, printA4, reportA4Html } from "./print/reportA4";
import type { DayClose, ZReport } from "./types";
import s from "./pos.module.css";

export function ZReportView() {
  const { settings, company, template, currencyCode, go, printDoc, showXReport, zReportDate, refreshDayStatus } = usePos();
  const { withApproval } = useApproval();
  const [date, setDate] = useState(zReportDate || todayIso());
  const [reopenReason, setReopenReason] = useState("");
  const [reopening, setReopening] = useState(false);
  const [z, setZ] = useState<ZReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [closing, setClosing] = useState(false);
  const [history, setHistory] = useState<DayClose[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setZ(await posApi.zReport(date));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [date]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { posApi.dayCloseHistory().then(setHistory).catch(() => setHistory([])); }, [z?.dayClose?.id]);

  const doc = useMemo(() => (z && company ? zReportDoc(z, company, template, currencyCode) : null), [z, company, template, currencyCode]);
  const tables = (r: ZReport) => [
    {
      heading: "Sessions",
      columns: ["Session", "Cashier", "Terminal", "Opened", "Closed", "Float", "Expected", "Counted", "Variance"],
      numeric: [5, 6, 7, 8],
      rows: r.sessions.map((x) => [x.sessionNumber, x.staffName || x.openedBy || "", x.terminalName || "", fmtDateTime(x.openedAt), x.closedAt ? fmtDateTime(x.closedAt) : "OPEN",
        num(x.openingCash), num(x.expectedCash), num(x.closingCash), num(x.cashVariance)]),
    },
    {
      heading: "Invoices",
      columns: ["Receipt", "Time", "Customer", "Cashier", "Payment", "Total", "Returned"],
      numeric: [5, 6],
      rows: r.invoices.map((i) => [i.transactionNumber, fmtTime(i.createdAt), i.memberName, i.cashierName || "", i.paymentSummary, num(i.totalAmount), num(i.refundedAmount)]),
    },
  ];

  const print = async (format: "thermal" | "a4") => {
    if (!z || !doc) return;
    if (format === "a4") await printA4(reportA4Html(doc, tables(z)));
    else await printDoc(doc);
    posApi.logEvent("REPORT_PRINT", `Z-report ${z.businessDate} (${format})`);
  };

  const closeDay = async () => {
    if (!z) return;
    setClosing(true);
    try {
      const dc = await withApproval((pin) => posApi.closeDay({ businessDate: z.businessDate, remarks: remarks.trim() || undefined, supervisorPin: pin }));
      if (!dc) return;
      toast.success(`Day ${fmtDate(dc.businessDate)} closed (${dc.closeNumber})`);
      const fresh = await posApi.zReport(z.businessDate);
      setZ(fresh);
      refreshDayStatus();
      if (company) printDoc(zReportDoc(fresh, company, template, currencyCode));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setClosing(false);
    }
  };

  const reopenDay = async () => {
    if (!z?.dayClose) return;
    setReopening(true);
    try {
      const dc = await withApproval((pin) => posApi.reopenDay(z.businessDate, { reason: reopenReason.trim(), supervisorPin: pin }));
      if (!dc) return;
      toast.success(`${fmtDate(z.businessDate)} reopened — ${dc.closeNumber} was removed`);
      setReopenReason("");
      setZ(await posApi.zReport(z.businessDate));
      posApi.dayCloseHistory().then(setHistory).catch(() => undefined);
      refreshDayStatus();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setReopening(false);
    }
  };

  const openSnapshot = async (d: DayClose) => {
    try {
      const snap = await posApi.dayCloseSnapshot(d.businessDate);
      setDate(d.businessDate);
      setZ({ ...snap, dayClose: d });
      toast.info(`Showing the Z-report exactly as frozen at close (${d.closeNumber}).`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const sum = z?.summary;
  return (
    <div className={s.page}>
      <div className={s.hero}>
        <div>
          <button type="button" className={s.backLink} onClick={() => go("dashboard")}><ArrowLeft size={14} />POS dashboard</button>
          <div className={s.heroTitle}>Z-Report · Day close</div>
          <div className={s.heroSub}>Every session of the branch for one business day. Closing the day freezes these figures and stops new sessions for that date.</div>
        </div>
        <div className={s.rowWrap}>
          <Input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} style={{ width: 160 }} />
          {z?.dayClose ? <Pill tone="green" dot>Closed · {z.dayClose.closeNumber}</Pill> : <Pill tone="amber" dot>Not closed</Pill>}
          <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
          <Button variant="outline" onClick={() => print("thermal")} disabled={!z}><Printer className="h-4 w-4 mr-2" />Print</Button>
          <Button variant="outline" onClick={() => print("a4")} disabled={!z}><FileText className="h-4 w-4 mr-2" />A4</Button>
          <Button variant="outline" disabled={!z || !doc} onClick={() => z && doc && exportReportXlsx(doc, `Z-Report-${z.businessDate}.xlsx`, tables(z))}><Download className="h-4 w-4 mr-2" />Excel</Button>
        </div>
      </div>

      {sum && (
        <div className={s.stats}>
          {[
            { label: "Total sales", value: <Money value={sum.totalSales} />, foot: `${sum.invoiceCount} invoice(s) · ${z!.sessions.length} session(s)` },
            { label: "Net sales", value: <Money value={sum.netSales} />, foot: `Returns ${num(sum.returnTotal)}` },
            { label: "VAT collected", value: <Money value={sum.totalTax} />, foot: `Taxable ${num(sum.taxableAmount)}` },
            { label: "Discounts", value: <Money value={sum.totalDiscount} />, foot: `${sum.discountedInvoiceCount} discounted sale(s)` },
            { label: "Expected cash", value: <Money value={sum.cash.expectedCash} />, foot: `Float ${num(sum.cash.openingCash)}` },
          ].map((c) => (
            <div key={c.label} className={s.stat}>
              <div className={s.statBody}><div className={s.statHead}><span className={s.statLabel}>{c.label}</span></div><div className={s.statValue}>{c.value}</div></div>
              <div className={s.statFoot}>{c.foot}</div>
            </div>
          ))}
        </div>
      )}

      {z && (
        <div className={s.grid2}>
          <div className={s.panel}>
            <div className={s.panelHead}><div className={s.panelTitle}>Day-close checklist</div></div>
            <div className={s.panelBody}>
              {z.checklist.map((c) => {
                const warnOnly = c.key === "HELD_SALES" || c.key === "CASH_VARIANCE";
                return (
                  <div key={c.key} className={s.check}>
                    {c.ok ? <CheckCircle2 size={18} className="text-[#2B7A78]" /> : warnOnly ? <AlertTriangle size={18} color="#F59E0B" /> : <XCircle size={18} className="text-[#E63946]" />}
                    <div><div className={s.strong}>{c.label}</div><div className={`${s.small} ${s.muted}`}>{c.detail}</div></div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={s.panel}>
            <div className={s.panelHead}><div className={s.panelTitle}><Lock size={17} />Close business day</div></div>
            <div className={s.panelBody}>
              {z.dayClose ? (
                <table className={s.kv}>
                  <tbody>
                    <tr><td>Close no.</td><td>{z.dayClose.closeNumber}</td></tr>
                    <tr><td>Closed by</td><td>{z.dayClose.closedBy} · {fmtDateTime(z.dayClose.closedAt)}</td></tr>
                    <tr><td>Expected cash</td><td><Money value={z.dayClose.expectedCash} /></td></tr>
                    <tr><td>Counted cash</td><td><Money value={z.dayClose.countedCash} /></td></tr>
                    <tr className={s.kvBold}><td>Variance</td><td><Money value={z.dayClose.cashVariance} /></td></tr>
                    {z.dayClose.remarks && <tr><td>Remarks</td><td>{z.dayClose.remarks}</td></tr>}
                  </tbody>
                </table>
              ) : null}
              {z.dayClose && history[0]?.id === z.dayClose.id && (
                <div className={s.stack} style={{ marginTop: 14 }}>
                  <div className={s.field}>
                    <Label>Closed by mistake? Reason to reopen</Label>
                    <Input value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} placeholder="e.g. Closed before the evening shift" />
                  </div>
                  <Button variant="outline" className="border-[#E63946] text-[#E63946]" disabled={!reopenReason.trim() || reopening} onClick={reopenDay}>
                    <RefreshCw className="h-4 w-4 mr-2" />{reopening ? "Reopening…" : `Reopen ${fmtDate(z.businessDate)}`}
                  </Button>
                  <div className={`${s.small} ${s.muted}`}>Supervisor only. The day's sessions become open for day close again and the reopening is kept in the audit log.</div>
                </div>
              )}
              {z.dayClose ? null : (
                <div className={s.stack}>
                  <div className={s.field}>
                    <Label>Remarks</Label>
                    <Textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Anything the owner should know about today" />
                  </div>
                  {settings.zReportAccess === "SUPERVISOR" && !settings.currentUserIsSupervisor && (
                    <div className={`${s.callout} ${s.calloutWarn}`}>Closing the day needs supervisor approval — you'll be asked for the PIN.</div>
                  )}
                  <Button className="bg-[#E63946] hover:bg-[#d32f3d] text-white" disabled={!z.canClose || closing} onClick={closeDay}>
                    <Lock className="h-4 w-4 mr-2" />{closing ? "Closing…" : `Close ${fmtDate(z.businessDate)}`}
                  </Button>
                  {!z.canClose && <div className={`${s.small} ${s.muted}`}>Close every open session (X-Report) before closing the day.</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {z && (
        <div className={s.panel}>
          <div className={s.panelHead}><div className={s.panelTitle}>Sessions ({z.sessions.length})</div></div>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead><tr><th>Session</th><th>Cashier</th><th>Terminal</th><th>Opened</th><th>Closed</th><th className={s.num}>Sales</th><th className={s.num}>Expected</th><th className={s.num}>Counted</th><th className={s.num}>Variance</th><th /></tr></thead>
              <tbody>
                {z.sessions.length === 0 && <tr><td colSpan={10} className={s.muted}>No sessions on this day.</td></tr>}
                {z.sessions.map((x) => (
                  <tr key={x.id}>
                    <td className={s.strong}>{x.sessionNumber}</td>
                    <td>{x.staffName || x.openedBy}</td>
                    <td>{x.terminalName || "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(x.openedAt)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{x.closedAt ? fmtDateTime(x.closedAt) : <Pill tone="amber">Open</Pill>}</td>
                    <td className={s.num}><Money value={x.totalSales} /></td>
                    <td className={s.num}>{x.expectedCash != null ? <Money value={x.expectedCash} /> : "—"}</td>
                    <td className={s.num}>{x.closingCash != null ? <Money value={x.closingCash} /> : "—"}</td>
                    <td className={`${s.num} ${(x.cashVariance ?? 0) < 0 ? s.danger : ""}`}>{x.cashVariance != null ? num(x.cashVariance) : "—"}</td>
                    <td className={s.num}><Button size="sm" variant="outline" onClick={() => showXReport(x.id)}>{x.status === "OPEN" ? "Close" : "X-Report"}</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {z && z.cashiers.length > 0 && (
        <div className={s.panel}>
          <div className={s.panelHead}><div className={s.panelTitle}>By cashier</div></div>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead><tr><th>Cashier</th><th className={s.num}>Invoices</th><th className={s.num}>Gross</th><th className={s.num}>Discount</th><th className={s.num}>Returns</th><th className={s.num}>Net</th></tr></thead>
              <tbody>{z.cashiers.map((c) => (
                <tr key={c.cashier}><td className={s.strong}>{c.cashier}</td><td className={s.num}>{c.invoiceCount}</td><td className={s.num}><Money value={c.grossSales} /></td><td className={s.num}><Money value={c.discount} /></td><td className={s.num}><Money value={c.returns} /></td><td className={s.num}><Money value={c.netSales} /></td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {doc && <ReportSections sections={doc.sections.filter((x) => !["Sessions", "By Cashier", "Day Close"].includes(x.heading))} />}

      <div className={s.panel}>
        <div className={s.panelHead}><div className={s.panelTitle}><History size={17} />Closed days</div></div>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead><tr><th>Business date</th><th>Close no.</th><th className={s.num}>Sessions</th><th className={s.num}>Invoices</th><th className={s.num}>Net sales</th><th className={s.num}>Variance</th><th>Closed by</th><th /></tr></thead>
            <tbody>
              {history.length === 0 && <tr><td colSpan={8} className={s.muted}>No days closed yet.</td></tr>}
              {history.map((d) => (
                <tr key={d.id}>
                  <td className={s.strong}>{fmtDate(d.businessDate)}</td>
                  <td>{d.closeNumber}</td>
                  <td className={s.num}>{d.sessionCount}</td>
                  <td className={s.num}>{d.invoiceCount}</td>
                  <td className={s.num}><Money value={d.netSales} /></td>
                  <td className={`${s.num} ${d.cashVariance < 0 ? s.danger : ""}`}>{num(d.cashVariance)}</td>
                  <td>{d.closedBy}</td>
                  <td className={s.num}><Button size="sm" variant="outline" onClick={() => openSnapshot(d)}>View snapshot</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
