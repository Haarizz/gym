import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Banknote, FileText, Printer, Receipt, Users, Wallet } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { accountHeadsService, type AccountHead } from "../utils/supabase/account-heads-service";
import { posApi } from "./api";
import { usePos } from "./PosContext";
import { Empty, MemberPicker, Money, Pill, type PickedMember } from "./components/Shared";
import { ReceiptDialog, statusPill } from "./components/SaleDialogs";
import { fmtDate, fmtDateTime, num, r2 } from "./pricing";
import { creditPaymentDoc, type ReportDoc } from "./print/receiptModel";
import { printA4, reportA4Html } from "./print/reportA4";
import type { CustomerCredit, Sale } from "./types";
import s from "./pos.module.css";

const primaryBtn = "bg-[#2B7A78] hover:bg-[#236862] text-white";

export function CustomersView() {
  const { go, session, company, template, currencyCode, printDoc, openDrawer } = usePos();
  const [member, setMember] = useState<PickedMember | null>(null);
  const [credit, setCredit] = useState<CustomerCredit | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState<AccountHead[]>([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"CASH" | "CARD" | "ONLINE">("CASH");
  const [bank, setBank] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [viewSale, setViewSale] = useState<Sale | null>(null);

  useEffect(() => { accountHeadsService.getBankAccounts().then(setBanks).catch(() => setBanks([])); }, []);

  const load = useCallback(async (m: PickedMember) => {
    setLoading(true);
    try {
      const [c, page] = await Promise.all([posApi.memberCredit(m.id), posApi.sales({ memberId: m.id, size: 50 })]);
      setCredit(c);
      setSales(page.transactions);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (member) load(member);
    else { setCredit(null); setSales([]); }
    setAmount("");
  }, [member, load]);

  const receive = async () => {
    if (!member || !credit) return;
    const value = r2(parseFloat(amount) || 0);
    if (value <= 0) return;
    setBusy(true);
    try {
      const p = await posApi.receiveCredit({
        memberId: member.id, amount: value, paymentMethod: method,
        bankAccountId: method === "ONLINE" ? Number(bank) : null,
        reference: reference.trim() || undefined, notes: notes.trim() || undefined,
        posSessionId: session?.id ?? null,
      });
      toast.success(`${p.paymentNumber}: ${currencyCode} ${num(p.amount)} received from ${p.memberName}`);
      if (method === "CASH") openDrawer(`Credit collection ${p.paymentNumber}`);
      const after = r2(credit.outstanding - p.amount);
      if (company) printDoc(creditPaymentDoc(p, after, company, template, currencyCode));
      setReference("");
      setNotes("");
      await load(member);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const statementDoc = (): ReportDoc | null => {
    if (!credit || !company) return null;
    return {
      title: "POS ACCOUNT STATEMENT",
      number: credit.memberCode || String(credit.memberId),
      meta: [
        { label: "Member", value: credit.memberName },
        { label: "Member ID", value: credit.memberCode || "—" },
        { label: "Phone", value: credit.phone || "—" },
        { label: "Date", value: fmtDate(new Date().toISOString()) },
      ],
      sections: [
        { heading: "Summary", rows: [
          { label: "Charged to account", value: `${currencyCode} ${num(credit.totalCredit)}` },
          { label: "Settled", value: `${currencyCode} ${num(credit.totalSettled)}` },
          { label: "Outstanding", value: `${currencyCode} ${num(credit.outstanding)}`, bold: true },
        ] },
        { heading: "Open invoices", rows: credit.openSales.map((o) => ({ label: `${o.transactionNumber} · ${fmtDate(o.createdAt)}`, value: `${currencyCode} ${num(o.outstanding)}` })) },
        { heading: "Recent payments", rows: credit.recentPayments.map((p) => ({ label: `${p.paymentNumber} · ${fmtDate(p.createdAt)} · ${p.paymentMethod}`, value: `${currencyCode} ${num(p.amount)}` })) },
      ],
      footer: template.footerText || null,
      company,
      template,
      barcode: null,
    };
  };

  const outstanding = credit?.outstanding ?? 0;
  const value = parseFloat(amount) || 0;

  return (
    <div className={s.page}>
      <div className={s.hero}>
        <div>
          <button type="button" className={s.backLink} onClick={() => go("dashboard")}><ArrowLeft size={14} />POS dashboard</button>
          <div className={s.heroTitle}>Customers & credit</div>
          <div className={s.heroSub}>POS sales charged to a member's account, collections against them and purchase history.</div>
        </div>
        <div style={{ width: 380, maxWidth: "100%" }}>
          <MemberPicker value={member} onChange={setMember} allowWalkIn={false} autoFocus placeholder="Find a member by name, ID or phone…" />
        </div>
      </div>

      {!member && <div className={s.panel}><Empty icon={<Users size={36} />} title="Select a member" hint="Search above to see their POS account, collect a payment or reprint a past receipt." /></div>}

      {member && credit && (
        <>
          <div className={s.stats}>
            {[
              { label: "Outstanding (POS)", value: <Money value={credit.outstanding} />, foot: `${credit.openSales.length} open invoice(s)`, icon: <Wallet size={18} /> },
              { label: "Charged to account", value: <Money value={credit.totalCredit} />, foot: `Settled ${num(credit.totalSettled)}`, icon: <Receipt size={18} /> },
              { label: "Membership dues", value: <Money value={credit.membershipOutstanding} />, foot: "Collected from Members › Billing", icon: <FileText size={18} /> },
              { label: "POS purchases", value: String(sales.length), foot: sales.length ? `Last ${fmtDate(sales[0].createdAt)}` : "No purchases yet", icon: <Banknote size={18} /> },
            ].map((c) => (
              <div key={c.label} className={s.stat}>
                <div className={s.statBody}><div className={s.statHead}><span className={s.statLabel}>{c.label}</span><span className={s.statIcon}>{c.icon}</span></div><div className={s.statValue}>{c.value}</div></div>
                <div className={s.statFoot}>{c.foot}</div>
              </div>
            ))}
          </div>

          <div className={s.grid2}>
            <div className={s.panel}>
              <div className={s.panelHead}>
                <div className={s.panelTitle}><Banknote size={17} />Receive payment</div>
                <div className={s.rowWrap}>
                  <Button size="sm" variant="outline" onClick={() => { const d = statementDoc(); if (d) printDoc(d); }}><Printer className="h-4 w-4 mr-1" />Statement</Button>
                  <Button size="sm" variant="outline" onClick={() => { const d = statementDoc(); if (d) printA4(reportA4Html(d)); }}><FileText className="h-4 w-4 mr-1" />A4</Button>
                </div>
              </div>
              <div className={s.panelBody}>
                {outstanding <= 0 ? (
                  <div className={`${s.callout} ${s.calloutOk}`}>{credit.memberName} has nothing outstanding on POS credit.</div>
                ) : (
                  <div className={s.stack}>
                    <div className={s.grid2} style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div className={s.field}>
                        <Label>Amount ({currencyCode})</Label>
                        <Input type="number" step="0.01" min="0" max={outstanding} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={num(outstanding)} />
                        <button type="button" className={s.backLink} style={{ fontSize: 12 }} onClick={() => setAmount(String(outstanding))}>Pay full balance (<Money value={outstanding} />)</button>
                      </div>
                      <div className={s.field}>
                        <Label>Method</Label>
                        <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="CASH">Cash</SelectItem><SelectItem value="CARD">Card</SelectItem><SelectItem value="ONLINE">Online / bank transfer</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    {method === "ONLINE" && (
                      <div className={s.field}>
                        <Label>Received into</Label>
                        <Select value={bank} onValueChange={setBank}>
                          <SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger>
                          <SelectContent>{banks.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.code} - {b.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className={s.grid2} style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div className={s.field}><Label>Reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Card slip / transfer ref." /></div>
                      <div className={s.field}><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
                    </div>
                    {method === "CASH" && !session && <div className={`${s.callout} ${s.calloutWarn}`}>Open a POS session to take cash into a drawer.</div>}
                    {value > outstanding + 0.001 && <div className={`${s.callout} ${s.calloutBad}`}>The amount is more than the {currencyCode} {num(outstanding)} outstanding.</div>}
                    <Button className={primaryBtn} disabled={busy || value <= 0 || value > outstanding + 0.001 || (method === "ONLINE" && !bank) || (method === "CASH" && !session)} onClick={receive}>
                      {busy ? "Saving…" : <>Receive <Money value={value} /></>}
                    </Button>
                    <div className={`${s.small} ${s.muted}`}>Applied to the oldest open invoices first. Posts Cash/Bank against Accounts Receivable and creates a receipt voucher.</div>
                  </div>
                )}
              </div>
            </div>

            <div className={s.panel}>
              <div className={s.panelHead}><div className={s.panelTitle}>Open invoices on account</div></div>
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <thead><tr><th>Invoice</th><th>Date</th><th className={s.num}>Charged</th><th className={s.num}>Settled</th><th className={s.num}>Outstanding</th></tr></thead>
                  <tbody>
                    {credit.openSales.length === 0 && <tr><td colSpan={5} className={s.muted}>None.</td></tr>}
                    {credit.openSales.map((o) => (
                      <tr key={o.transactionId} className={s.clickRow} onClick={() => posApi.sale(o.transactionId).then(setViewSale).catch((e) => toast.error(e.message))}>
                        <td className={s.strong}>{o.transactionNumber}</td>
                        <td>{fmtDate(o.createdAt)}</td>
                        <td className={s.num}><Money value={o.creditAmount} /></td>
                        <td className={s.num}><Money value={o.settledAmount} /></td>
                        <td className={`${s.num} ${s.warnText}`}><Money value={o.outstanding} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {credit.recentPayments.length > 0 && (
                <>
                  <div className={s.panelHead} style={{ borderTop: "1px solid #EEF2F6" }}><div className={s.panelTitle}>Recent payments</div></div>
                  <div className={s.tableWrap}>
                    <table className={s.table}>
                      <thead><tr><th>Receipt</th><th>Date</th><th>Method</th><th className={s.num}>Amount</th><th /></tr></thead>
                      <tbody>
                        {credit.recentPayments.map((p) => (
                          <tr key={p.id}>
                            <td className={s.strong}>{p.paymentNumber}</td>
                            <td>{fmtDateTime(p.createdAt)}</td>
                            <td>{p.paymentMethod}</td>
                            <td className={s.num}><Money value={p.amount} /></td>
                            <td className={s.num}><Button size="sm" variant="ghost" onClick={() => company && printDoc(creditPaymentDoc(p, null, company, template, currencyCode))}><Printer className="h-4 w-4" /></Button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={s.panel}>
            <div className={s.panelHead}><div className={s.panelTitle}>POS purchase history</div>{loading && <span className={s.muted}>Loading…</span>}</div>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead><tr><th>Receipt</th><th>Date</th><th>Items</th><th>Payment</th><th className={s.num}>Total</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {sales.length === 0 && <tr><td colSpan={7} className={s.muted}>No POS purchases.</td></tr>}
                  {sales.map((x) => (
                    <tr key={x.id}>
                      <td className={s.strong}>{x.transactionNumber}</td>
                      <td>{fmtDateTime(x.createdAt)}</td>
                      <td>{x.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")}</td>
                      <td>{x.paymentSummary}{x.creditOutstanding > 0 && <> <Pill tone="amber">Due <Money value={x.creditOutstanding} /></Pill></>}</td>
                      <td className={s.num}><Money value={x.totalAmount} /></td>
                      <td>{statusPill(x)}</td>
                      <td className={s.num}><Button size="sm" variant="outline" onClick={() => setViewSale(x)}>View</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      <ReceiptDialog sale={viewSale} open={Boolean(viewSale)} reprint onOpenChange={(o) => !o && setViewSale(null)} />
    </div>
  );
}
