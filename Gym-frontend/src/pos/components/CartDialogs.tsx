import React, { useEffect, useState } from "react";
import { Percent, StickyNote, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { usePos } from "../PosContext";
import { Money } from "./Shared";
import { discountLimit, r2, type BillDiscount, type CartLine } from "../pricing";
import s from "../pos.module.css";

const primaryBtn = "bg-[#2B7A78] hover:bg-[#236862] text-white";

export function LineEditDialog({ line, open, onOpenChange, onSave, onRemove }: {
  line: CartLine | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (patch: Partial<CartLine>) => void;
  onRemove: () => void;
}) {
  const { settings, currencyCode } = usePos();
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [discType, setDiscType] = useState<"PERCENT" | "AMOUNT">("PERCENT");
  const [disc, setDisc] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!line || !open) return;
    setQty(String(line.quantity));
    setPrice(String(line.unitPrice));
    setDiscType(line.discountType);
    setDisc(line.discountValue ? String(line.discountValue) : "");
    setNote(line.note ?? "");
  }, [line, open]);

  if (!line) return null;
  const q = Math.max(1, Math.floor(parseFloat(qty) || 1));
  const p = Math.max(0, parseFloat(price) || 0);
  const d = Math.max(0, parseFloat(disc) || 0);
  const gross = r2(q * p);
  const discAmt = discType === "PERCENT" ? r2((gross * Math.min(d, 100)) / 100) : Math.min(d, gross);
  const pct = gross > 0 ? (discAmt * 100) / gross : 0;
  const limit = discountLimit(line, settings.maxCashierDiscountPercent);
  const noDiscount = line.allowDiscount === false;
  const overLimit = pct > limit + 1e-9 && !settings.currentUserIsSupervisor;
  const priceChanged = r2(p) !== r2(line.listPrice);
  const stockShort = line.stock != null && q > line.stock;

  const save = () => {
    onSave({
      quantity: q,
      unitPrice: priceChanged ? r2(p) : line.listPrice,
      priceOverridden: priceChanged,
      discountType: discType,
      discountValue: noDiscount ? 0 : r2(d),
      note: note.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 520 }} onKeyDown={(e) => { if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); save(); } }}>
        <DialogHeader>
          <DialogTitle>{line.name}</DialogTitle>
          <DialogDescription>{[line.sku, line.categoryName].filter(Boolean).join(" · ")} · list price <Money value={line.listPrice} /></DialogDescription>
        </DialogHeader>
        <div className={s.grid2} style={{ gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className={s.field}>
            <Label>Quantity</Label>
            <Input type="number" min="1" step="1" autoFocus value={qty} onChange={(e) => setQty(e.target.value)} onFocus={(e) => e.target.select()} />
            {stockShort && <span className={`${s.fieldHint} ${s.warnText}`}>Only {line.stock} in stock.</span>}
          </div>
          <div className={s.field}>
            <Label>Unit price ({currencyCode})</Label>
            <Input type="number" min="0" step="0.01" value={price} disabled={!settings.allowPriceOverride} onChange={(e) => setPrice(e.target.value)} onFocus={(e) => e.target.select()} />
            {!settings.allowPriceOverride
              ? <span className={s.fieldHint}>Price overrides are disabled in POS settings.</span>
              : priceChanged && settings.requireSupervisorForPriceOverride && !settings.currentUserIsSupervisor
                ? <span className={`${s.fieldHint} ${s.warnText}`}>Needs supervisor approval at payment.</span>
                : null}
          </div>
        </div>
        <div className={s.field}>
          <Label>Line discount</Label>
          <div className="flex items-center gap-2">
            <div className={s.segmented}>
              <button type="button" className={discType === "PERCENT" ? s.segOn : ""} onClick={() => setDiscType("PERCENT")}>%</button>
              <button type="button" className={discType === "AMOUNT" ? s.segOn : ""} onClick={() => setDiscType("AMOUNT")}>{currencyCode}</button>
            </div>
            <Input type="number" min="0" step="0.01" value={noDiscount ? "" : disc} disabled={noDiscount} onChange={(e) => setDisc(e.target.value)} placeholder="0" onFocus={(e) => e.target.select()} />
          </div>
          <span className={`${s.fieldHint} ${overLimit ? s.warnText : ""}`}>
            {discAmt > 0 ? <>Discount <Money value={discAmt} /> ({pct.toFixed(1)}%). </> : null}
            {noDiscount ? "Discounts are not allowed on this product."
              : overLimit ? `Above the ${limit}% limit — needs supervisor approval at payment.`
              : line.maxDiscount ? `Product maximum ${line.maxDiscount}%.` : `Cashier limit ${settings.maxCashierDiscountPercent}%.`}
          </span>
        </div>
        <div className={s.field}>
          <Label>Line note</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. size, flavour" />
        </div>
        <div className={s.totalBar}><span>Line amount (before VAT)</span><span className={s.totalBarBig}><Money value={r2(gross - discAmt)} /></span></div>
        <DialogFooter>
          <Button variant="outline" className="border-[#E63946] text-[#E63946]" style={{ marginRight: "auto" }} onClick={() => { onRemove(); onOpenChange(false); }}><Trash2 className="h-4 w-4 mr-2" />Remove</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className={primaryBtn} onClick={save}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BillDiscountDialog({ open, onOpenChange, value, subtotal, onApply }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value: BillDiscount | null;
  subtotal: number;
  onApply: (d: BillDiscount | null) => void;
}) {
  const { settings, currencyCode } = usePos();
  const [type, setType] = useState<"PERCENT" | "AMOUNT">("PERCENT");
  const [v, setV] = useState("");
  useEffect(() => {
    if (!open) return;
    setType(value?.type ?? "PERCENT");
    setV(value?.value ? String(value.value) : "");
  }, [open, value]);
  const n = Math.max(0, parseFloat(v) || 0);
  const amount = type === "PERCENT" ? r2((subtotal * Math.min(n, 100)) / 100) : Math.min(n, subtotal);
  const pct = subtotal > 0 ? (amount * 100) / subtotal : 0;
  const quick = [5, 10, 15, 20];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 460 }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Percent className="h-5 w-5 text-[#2B7A78]" /> Bill discount</DialogTitle>
          <DialogDescription>Applied across the whole sale after line discounts, before VAT. Net amount: <Money value={subtotal} /></DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <div className={s.segmented}>
            <button type="button" className={type === "PERCENT" ? s.segOn : ""} onClick={() => setType("PERCENT")}>%</button>
            <button type="button" className={type === "AMOUNT" ? s.segOn : ""} onClick={() => setType("AMOUNT")}>{currencyCode}</button>
          </div>
          <Input type="number" min="0" step="0.01" autoFocus value={v} onChange={(e) => setV(e.target.value)} placeholder="0" />
        </div>
        {type === "PERCENT" && (
          <div className={s.rowWrap}>
            {quick.map((q) => <button key={q} type="button" className={s.action} onClick={() => setV(String(q))}>{q}%</button>)}
          </div>
        )}
        <div className={s.totalBar}><span>Discount</span><span className={s.totalBarBig}><Money value={amount} /></span></div>
        {pct > settings.maxCashierDiscountPercent && !settings.currentUserIsSupervisor && (
          <div className={`${s.callout} ${s.calloutWarn}`}>{pct.toFixed(1)}% is above your {settings.maxCashierDiscountPercent}% limit — a supervisor will need to approve it at payment.</div>
        )}
        <DialogFooter>
          {value && <Button variant="outline" style={{ marginRight: "auto" }} onClick={() => { onApply(null); onOpenChange(false); }}>Remove discount</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className={primaryBtn} disabled={n <= 0} onClick={() => { onApply({ type, value: r2(n) }); onOpenChange(false); }}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NoteDialog({ open, onOpenChange, value, onSave }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value: string;
  onSave: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  useEffect(() => { if (open) setV(value); }, [open, value]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 460 }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><StickyNote className="h-5 w-5 text-[#2B7A78]" /> Sale note</DialogTitle>
          <DialogDescription>Printed on the receipt and stored with the sale.</DialogDescription>
        </DialogHeader>
        <Textarea rows={4} autoFocus value={v} onChange={(e) => setV(e.target.value)} maxLength={500} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className={primaryBtn} onClick={() => { onSave(v.trim()); onOpenChange(false); }}>Save note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
