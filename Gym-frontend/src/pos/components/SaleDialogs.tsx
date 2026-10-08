import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, FilePen, Mail, MessageCircle, Pause, Play, Printer, RotateCcw, Search, Tag, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import type { Product } from "../../utils/supabase/products-service";
import type { AccountHead } from "../../utils/supabase/account-heads-service";
import { posApi } from "../api";
import { usePos } from "../PosContext";
import { useApproval } from "./Approval";
import { Empty, Money, Pill, ReceiptPreview } from "./Shared";
import { fmtDateTime, money, r2, todayIso } from "../pricing";
import { saleReceipt } from "../print/receiptModel";
import { receiptHtmlBody, thermalDocument } from "../print/thermalHtml";
import type { HeldSale, RefundMethod, Sale } from "../types";
import s from "../pos.module.css";

const primaryBtn = "bg-[#2B7A78] hover:bg-[#236862] text-white";

export function statusPill(sale: Pick<Sale, "status" | "returnStatus">) {
  if (sale.status === "REFUNDED") return <Pill tone="red">Refunded</Pill>;
  if (sale.returnStatus === "PARTIAL") return <Pill tone="amber">Part returned</Pill>;
  if (sale.status === "VOIDED") return <Pill tone="gray">Voided</Pill>;
  return <Pill tone="green">Completed</Pill>;
}

// ── Receipt (after checkout / reprint) ────────────────────────────────────

export function ReceiptDialog({ sale, open, onOpenChange, reprint = false, onNewSale }: {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reprint?: boolean;
  onNewSale?: () => void;
}) {
  const { company, template, currencyCode, printSale, settings } = usePos();
  const [width, setWidth] = useState<58 | 80>(settings.defaultPrintFormat === "58mm" ? 58 : 80);
  const [printing, setPrinting] = useState(false);

  const html = useMemo(() => {
    if (!sale || !company) return "";
    return thermalDocument(receiptHtmlBody(saleReceipt(sale, company, template, currencyCode, { isReprint: reprint }), width), width, sale.transactionNumber, template.fontScale);
  }, [sale, company, template, currencyCode, reprint, width]);

  if (!sale) return null;

  const print = async (format: "80mm" | "58mm" | "A4") => {
    setPrinting(true);
    try {
      await printSale(sale, { reprint, format });
    } finally {
      setPrinting(false);
    }
  };

  const shareText = [
    `${company?.name ?? "GymBios"} — ${sale.taxAmount > 0 ? "Tax Invoice" : "Receipt"} ${sale.transactionNumber}`,
    `Date: ${fmtDateTime(sale.createdAt)}`,
    ...sale.items.map((i) => `${i.quantity} x ${i.productName} — ${money(sale.taxInclusive ? i.lineTotal : i.taxableAmount, currencyCode)}`),
    sale.discountAmount > 0 ? `Discount: -${money(sale.discountAmount, currencyCode)}` : null,
    sale.taxAmount > 0 ? `VAT: ${money(sale.taxAmount, currencyCode)}` : null,
    `Total: ${money(sale.totalAmount, currencyCode)}`,
    `Paid by: ${sale.paymentSummary}`,
    company?.trn ? `TRN: ${company.trn}` : null,
    "Thank you!",
  ].filter(Boolean).join("\n");
  const phone = (sale.memberPhone || "").replace(/[^\d]/g, "");
  const share = (channel: "whatsapp" | "email") => {
    const url = channel === "whatsapp"
      ? `https://wa.me/${phone}?text=${encodeURIComponent(shareText)}`
      : `mailto:?subject=${encodeURIComponent(`Receipt ${sale.transactionNumber}`)}&body=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener");
    posApi.logEvent("RECEIPT_SHARE", `${sale.transactionNumber} via ${channel}`, { referenceType: "SaleTransaction", referenceId: sale.id, referenceNumber: sale.transactionNumber });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 860, maxHeight: "94vh", overflowY: "auto" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {reprint ? <><Printer className="h-5 w-5 text-[#2B7A78]" /> Reprint {sale.transactionNumber}</> : <><CheckCircle2 className="h-5 w-5 text-[#2B7A78]" /> Payment complete</>}
          </DialogTitle>
          <DialogDescription>{sale.transactionNumber} · {fmtDateTime(sale.createdAt)} · {sale.memberName}</DialogDescription>
        </DialogHeader>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 280px", gap: 20 }}>
          <ReceiptPreview html={html} widthMm={width} />
          <div className={s.stack}>
            {!reprint && (sale.changeAmount ?? 0) > 0 && (
              <div className={s.changeBox}>
                <div className={`${s.small} ${s.muted}`}>Change due</div>
                <div className={s.changeValue}><Money value={sale.changeAmount} /></div>
              </div>
            )}
            <div className={s.panel}>
              <div className={s.panelBody} style={{ padding: 14 }}>
                <div className={s.rowBetween}><span className={s.muted}>Total</span><span className={s.strong}><Money value={sale.totalAmount} /></span></div>
                <div className={s.rowBetween}><span className={s.muted}>Paid by</span><span>{sale.paymentSummary}</span></div>
                {sale.creditOutstanding > 0 && <div className={s.rowBetween}><span className={s.muted}>On account</span><span className={s.warnText}><Money value={sale.creditOutstanding} /></span></div>}
                <div className={s.rowBetween}><span className={s.muted}>Status</span>{statusPill(sale)}</div>
              </div>
            </div>
            <div className={s.field}>
              <Label>Preview width</Label>
              <div className={s.segmented}>
                <button type="button" className={width === 80 ? s.segOn : ""} onClick={() => setWidth(80)}>80 mm</button>
                <button type="button" className={width === 58 ? s.segOn : ""} onClick={() => setWidth(58)}>58 mm</button>
              </div>
            </div>
            <Button className={primaryBtn} disabled={printing} onClick={() => print(width === 58 ? "58mm" : "80mm")}><Printer className="h-4 w-4 mr-2" />Print receipt</Button>
            <Button variant="outline" disabled={printing} onClick={() => print("A4")}><Printer className="h-4 w-4 mr-2" />Print A4 tax invoice</Button>
            {settings.receiptShareEnabled && (
              <div className={s.rowWrap}>
                <Button variant="outline" className="flex-1" onClick={() => share("whatsapp")}><MessageCircle className="h-4 w-4 mr-2" />WhatsApp</Button>
                <Button variant="outline" className="flex-1" onClick={() => share("email")}><Mail className="h-4 w-4 mr-2" />Email</Button>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {onNewSale && <Button className={primaryBtn} onClick={() => { onOpenChange(false); onNewSale(); }} autoFocus>New sale (Enter)</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Sales lookup (reprint / returns entry point) ───────────────────────────

export function SalesLookupDialog({ open, onOpenChange, mode, onPick }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: "reprint" | "return" | "correct";
  onPick: (sale: Sale) => void;
}) {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [status, setStatus] = useState("ALL");
  const [payment, setPayment] = useState("ALL");
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await posApi.sales({
        search: search.trim() || undefined, from, to,
        status: status === "ALL" ? undefined : status,
        paymentMethod: payment === "ALL" ? undefined : payment,
        size: 50,
      });
      setSales(page.transactions);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search, from, to, status, payment]);

  useEffect(() => { if (open) load(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const scan = async () => {
    const q = search.trim();
    if (!q) return load();
    try {
      onPick(await posApi.lookupSale(q));
    } catch {
      load();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 980, maxHeight: "92vh", overflowY: "auto" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "reprint" ? <><Printer className="h-5 w-5 text-[#2B7A78]" /> Reprint receipt</>
              : mode === "correct" ? <><FilePen className="h-5 w-5 text-[#2B7A78]" /> Correct a sale</>
              : <><RotateCcw className="h-5 w-5 text-[#2B7A78]" /> Sales return</>}
          </DialogTitle>
          <DialogDescription>Scan the receipt barcode or search by receipt number, member name, ID or phone.</DialogDescription>
        </DialogHeader>
        <div className={s.rowWrap}>
          <div style={{ flex: 2, minWidth: 220, position: "relative" }}>
            <Input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") scan(); }} placeholder="Receipt no. / customer…" />
          </div>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 150 }} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 150 }} />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger style={{ width: 140 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="REFUNDED">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <Select value={payment} onValueChange={setPayment}>
            <SelectTrigger style={{ width: 140 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All payments</SelectItem>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="CARD">Card</SelectItem>
              <SelectItem value="ONLINE">Online</SelectItem>
              <SelectItem value="CREDIT">Credit</SelectItem>
              <SelectItem value="MIXED">Mixed</SelectItem>
            </SelectContent>
          </Select>
          <Button className={primaryBtn} onClick={scan}><Search className="h-4 w-4 mr-2" />Search</Button>
        </div>
        <div className={s.tableWrap} style={{ maxHeight: "52vh", overflowY: "auto" }}>
          <table className={s.table}>
            <thead><tr><th>Receipt</th><th>Date</th><th>Customer</th><th>Cashier</th><th>Payment</th><th className={s.num}>Total</th><th>Status</th><th /></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={8} className={s.muted}>Loading…</td></tr>}
              {!loading && sales.length === 0 && <tr><td colSpan={8}><Empty icon={<Search size={28} />} title="No sales found" hint="Widen the date range or search another receipt number." /></td></tr>}
              {sales.map((x) => {
                const disabled = (mode === "return" && x.status !== "COMPLETED")
                  || (mode === "correct" && (x.status !== "COMPLETED" || x.refundedAmount > 0));
                return (
                  <tr key={x.id} className={s.clickRow} onClick={() => !disabled && onPick(x)} style={{ opacity: disabled ? 0.5 : 1 }}>
                    <td className={s.strong}>{x.transactionNumber}{x.reprintCount > 0 && <span className={`${s.small} ${s.muted}`}> · {x.reprintCount}× reprinted</span>}</td>
                    <td>{fmtDateTime(x.createdAt)}</td>
                    <td>{x.memberName}</td>
                    <td>{x.cashierName || "—"}</td>
                    <td>{x.paymentSummary}</td>
                    <td className={s.num}><Money value={x.totalAmount} /></td>
                    <td>{statusPill(x)}</td>
                    <td className={s.num}><Button size="sm" variant="outline" disabled={disabled}>{mode === "reprint" ? "Reprint" : mode === "correct" ? "Correct" : "Return"}</Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Return ────────────────────────────────────────────────────────────────

export function ReturnDialog({ sale, open, onOpenChange, bankAccounts, onReturned }: {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  bankAccounts: AccountHead[];
  onReturned: () => void;
}) {
  const { session, settings, printReturn, openDrawer, currencyCode } = usePos();
  const { withApproval } = useApproval();
  const [qty, setQty] = useState<Record<number, number>>({});
  const [method, setMethod] = useState<RefundMethod>("ORIGINAL");
  const [bank, setBank] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [restock, setRestock] = useState(true);
  const [print, setPrint] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQty({});
    setMethod("ORIGINAL");
    setBank("");
    setReason("");
    setNotes("");
    setRestock(true);
  }, [open, sale?.id]);

  const estimate = useMemo(() => {
    if (!sale) return 0;
    return r2(sale.items.reduce((t, i) => t + (i.quantity ? (i.lineTotal / i.quantity) * (qty[i.id] || 0) : 0), 0));
  }, [sale, qty]);

  if (!sale) return null;
  const selected = Object.entries(qty).filter(([, q]) => q > 0);
  const remaining = (id: number) => {
    const i = sale.items.find((x) => x.id === id)!;
    return i.quantity - i.returnedQuantity;
  };

  const submit = async () => {
    setBusy(true);
    try {
      const ret = await withApproval((pin) => posApi.createReturn(sale.id, {
        items: selected.map(([id, q]) => ({ transactionItemId: Number(id), quantity: q })),
        refundMethod: method,
        bankAccountId: method === "ONLINE" ? Number(bank) : null,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
        restock,
        posSessionId: session?.id ?? null,
        supervisorPin: pin,
      }));
      if (!ret) return;
      toast.success(`Return ${ret.returnNumber} recorded — refund ${money(ret.totalAmount, currencyCode)}`);
      if (ret.refundBreakdown?.some((l) => l.method === "Cash")) openDrawer(`Cash refund ${ret.returnNumber}`);
      if (print) printReturn(ret);
      onReturned();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 820, maxHeight: "92vh", overflowY: "auto" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><RotateCcw className="h-5 w-5 text-[#2B7A78]" /> Return items — {sale.transactionNumber}</DialogTitle>
          <DialogDescription>{fmtDateTime(sale.createdAt)} · {sale.memberName} · paid by {sale.paymentSummary}</DialogDescription>
        </DialogHeader>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead><tr><th>Item</th><th className={s.num}>Sold</th><th className={s.num}>Returned</th><th className={s.num}>Line total</th><th style={{ width: 170 }}>Return qty</th></tr></thead>
            <tbody>
              {sale.items.map((i) => {
                const left = i.quantity - i.returnedQuantity;
                return (
                  <tr key={i.id}>
                    <td><div className={s.strong}>{i.productName}</div><div className={`${s.small} ${s.muted}`}>{i.productSku}</div></td>
                    <td className={s.num}>{i.quantity}</td>
                    <td className={s.num}>{i.returnedQuantity}</td>
                    <td className={s.num}><Money value={i.lineTotal} /></td>
                    <td>
                      {left > 0 ? (
                        <div className={s.qty}>
                          <button type="button" className={s.qtyBtn} onClick={() => setQty((q) => ({ ...q, [i.id]: Math.max(0, (q[i.id] || 0) - 1) }))}>−</button>
                          <span className={s.qtyVal}>{qty[i.id] || 0}</span>
                          <button type="button" className={s.qtyBtn} onClick={() => setQty((q) => ({ ...q, [i.id]: Math.min(left, (q[i.id] || 0) + 1) }))}>+</button>
                          <button type="button" className={`${s.iconBtn}`} style={{ height: 28, fontSize: 12 }} onClick={() => setQty((q) => ({ ...q, [i.id]: left }))}>All</button>
                        </div>
                      ) : <Pill tone="gray">Fully returned</Pill>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className={s.grid2} style={{ gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className={s.field}>
            <Label>Refund to</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as RefundMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ORIGINAL">Original payment method(s)</SelectItem>
                <SelectItem value="CASH">Cash from drawer</SelectItem>
                <SelectItem value="CARD">Card (reverse on terminal)</SelectItem>
                <SelectItem value="ONLINE">Online / bank transfer</SelectItem>
                {sale.memberId != null && <SelectItem value="WALLET">Member wallet</SelectItem>}
                {sale.creditOutstanding > 0 && <SelectItem value="CREDIT">Reduce amount on account</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          {method === "ONLINE" ? (
            <div className={s.field}>
              <Label>Paid from bank account</Label>
              <Select value={bank} onValueChange={setBank}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>{bankAccounts.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.code} - {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ) : (
            <div className={s.field}>
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  {["Changed mind", "Wrong item / size", "Damaged / defective", "Expired product", "Billing error", "Other"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div className={s.field}>
          <Label>Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Condition of goods, customer comments…" />
        </div>
        <div className={s.rowWrap}>
          <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} /> Put items back in stock</label>
          <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={print} onChange={(e) => setPrint(e.target.checked)} /> Print return receipt</label>
        </div>
        {settings.requireSupervisorForReturn && !settings.currentUserIsSupervisor && (
          <div className={`${s.callout} ${s.calloutWarn}`}>Returns need supervisor approval — you'll be asked for the PIN.</div>
        )}
        <DialogFooter>
          <div style={{ marginRight: "auto" }} className={s.strong}>Estimated refund: <Money value={estimate} /></div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-[#E63946] hover:bg-[#d32f3d] text-white" disabled={busy || selected.length === 0 || (method === "ONLINE" && !bank) || selected.some(([id, q]) => q > remaining(Number(id)))} onClick={submit}>
            {busy ? "Processing…" : "Process return"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Held sales ────────────────────────────────────────────────────────────

export function HeldSalesDialog({ open, onOpenChange, onRecall, blockedReason = null }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onRecall: (h: HeldSale) => void;
  /** When set, recalling is not allowed right now (e.g. the cart already has items). */
  blockedReason?: string | null;
}) {
  const [list, setList] = useState<HeldSale[]>([]);
  const [loading, setLoading] = useState(false);
  const load = useCallback(() => {
    setLoading(true);
    posApi.heldSales().then(setList).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { if (open) load(); }, [open, load]);

  const recall = async (h: HeldSale) => {
    if (blockedReason) { toast.error(blockedReason); return; }
    try {
      onRecall(await posApi.recallSale(h.id));
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
      load();
    }
  };
  const discard = async (h: HeldSale) => {
    try {
      await posApi.discardHeldSale(h.id);
      toast.success(`${h.holdNumber} discarded`);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 760 }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Pause className="h-5 w-5 text-[#2B7A78]" /> Held sales</DialogTitle>
          <DialogDescription>Parked carts are shared across every terminal of the branch.</DialogDescription>
        </DialogHeader>
        {blockedReason && <div className={`${s.callout} ${s.calloutWarn}`}>{blockedReason}</div>}
        <div className={s.tableWrap} style={{ maxHeight: "55vh", overflowY: "auto" }}>
          <table className={s.table}>
            <thead><tr><th>Hold</th><th>Label / customer</th><th>Held by</th><th>When</th><th className={s.num}>Items</th><th className={s.num}>Total</th><th /></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7} className={s.muted}>Loading…</td></tr>}
              {!loading && list.length === 0 && <tr><td colSpan={7}><Empty icon={<Pause size={28} />} title="No held sales" /></td></tr>}
              {list.map((h) => (
                <tr key={h.id}>
                  <td className={s.strong}>{h.holdNumber}</td>
                  <td>{h.label || h.memberName || "—"}</td>
                  <td>{h.heldBy}{h.terminalName ? ` · ${h.terminalName}` : ""}</td>
                  <td>{fmtDateTime(h.createdAt)}</td>
                  <td className={s.num}>{h.itemCount}</td>
                  <td className={s.num}><Money value={h.total} /></td>
                  <td className={s.num} style={{ whiteSpace: "nowrap" }}>
                    <Button size="sm" className={primaryBtn} disabled={Boolean(blockedReason)} onClick={() => recall(h)}><Play className="h-3 w-3 mr-1" />Recall</Button>{" "}
                    <Button size="sm" variant="ghost" className="text-[#E63946]" onClick={() => discard(h)} aria-label="Discard"><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Price check ───────────────────────────────────────────────────────────

export function PriceCheckDialog({ open, onOpenChange, products, onAdd }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  products: Product[];
  onAdd: (p: Product) => void;
}) {
  const [q, setQ] = useState("");
  useEffect(() => { if (open) setQ(""); }, [open]);
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return products.filter((p) => p.barcode === q.trim() || p.sku?.toLowerCase() === t || p.name.toLowerCase().includes(t)).slice(0, 8);
  }, [q, products]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 620 }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Tag className="h-5 w-5 text-[#2B7A78]" /> Price check</DialogTitle>
          <DialogDescription>Scan a barcode or type a name / SKU. Nothing is added to the sale unless you choose to.</DialogDescription>
        </DialogHeader>
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Scan or search…" />
        <div className={s.stack} style={{ maxHeight: "50vh", overflowY: "auto" }}>
          {q.trim() && matches.length === 0 && <Empty icon={<Search size={26} />} title="No product matches" />}
          {matches.map((p) => (
            <div key={p.id} className={s.panel} style={{ padding: 14 }}>
              <div className={s.rowBetween}>
                <div>
                  <div className={s.strong}>{p.name}</div>
                  <div className={`${s.small} ${s.muted}`}>{[p.sku, p.barcode, p.categoryName].filter(Boolean).join(" · ")}</div>
                  <div className={s.small} style={{ marginTop: 4 }}>
                    In stock: <b>{p.totalStock ?? 0}</b> · VAT {p.taxRate ?? 0}%
                  </div>
                </div>
                <div className="text-right">
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#2B7A78" }}><Money value={p.sellingPrice} /></div>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => { onAdd(p); onOpenChange(false); }}>Add to sale</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
