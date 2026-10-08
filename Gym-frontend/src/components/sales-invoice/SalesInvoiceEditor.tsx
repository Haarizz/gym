import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, CheckCircle2, ChevronDown, FileText, History, Info, Lock, Package, Plus, Search,
  Trash2, User, UserCheck, Users, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { CurrencyGlyph, CurrencyValue, useCurrency } from '../../utils/currency';
import { membersService, type Member } from '../../utils/supabase/members-service';
import type { SalesCustomerType, SalesInvoice, SalesInvoiceRequest } from '../../utils/supabase/sales-invoice-service';
import type { Product, Warehouse } from '../../utils/supabase/products-service';
import { getTaxDefaults, salesDiscountFor, salesTaxFor, type TaxDefaults } from '../../utils/supabase/tax-defaults-service';
import styles from '../purchase/PurchaseInvoice.module.css';
import { FastEntry, ProductSelector, Thumb } from '../purchase/lineEntry';
import { PAYMENT_TERMS, addDays, displayDate, money, round2, todayIso } from '../purchase/purchaseInvoiceUtils';
import { balanceOf, displayStatus, invoiceTotals, roundOffToWhole, statusMeta } from './salesInvoiceUtils';

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ');
const fmt2 = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
let keySeq = 0;
const newKey = () => `s${Date.now().toString(36)}${(keySeq++).toString(36)}`;

type Line = {
  key: string;
  productId: number;
  productName: string;
  productSku: string;
  unitOfMeasure: string;
  warehouseId?: number;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  notes: string;
};

type RoundMode = 'off' | 'auto' | 'manual';

type Form = {
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  reference: string;
  salesperson: string;
  customerType: SalesCustomerType;
  memberId?: number;
  memberCode?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerTrn: string;
  pricesIncludeTax: boolean;
  footerMode: 'percent' | 'amount';
  footerValue: number;
  deliveryCharge: number;
  roundMode: RoundMode;
  roundOff: number;
  notes: string;
  internalNotes: string;
  lines: Line[];
};

const blankForm = (): Form => ({
  invoiceDate: todayIso(),
  dueDate: todayIso(),
  paymentTerms: 'IMMEDIATE',
  reference: '',
  salesperson: '',
  customerType: 'WALK_IN',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  customerAddress: '',
  customerTrn: '',
  pricesIncludeTax: false,
  footerMode: 'amount',
  footerValue: 0,
  deliveryCharge: 0,
  roundMode: 'off',
  roundOff: 0,
  notes: '',
  internalNotes: '',
  lines: [],
});

const formFromInvoice = (inv: SalesInvoice): Form => ({
  invoiceDate: inv.invoiceDate || todayIso(),
  dueDate: inv.dueDate ?? '',
  paymentTerms: inv.paymentTerms ?? '',
  reference: inv.reference ?? '',
  salesperson: inv.salesperson ?? '',
  customerType: inv.customerType,
  memberId: inv.memberId,
  customerName: inv.customerType === 'WALK_IN' && inv.customerName === 'Walk-in Customer' ? '' : inv.customerName,
  customerPhone: inv.customerPhone ?? '',
  customerEmail: inv.customerEmail ?? '',
  customerAddress: inv.customerAddress ?? '',
  customerTrn: inv.customerTrn ?? '',
  pricesIncludeTax: inv.pricesIncludeTax,
  footerMode: 'amount',
  footerValue: inv.footerDiscount || 0,
  deliveryCharge: inv.deliveryCharge || 0,
  roundMode: inv.roundOff ? 'manual' : 'off',
  roundOff: inv.roundOff || 0,
  notes: inv.notes ?? '',
  internalNotes: inv.internalNotes ?? '',
  lines: inv.items.map(i => ({
    key: newKey(),
    productId: i.productId,
    productName: i.productName,
    productSku: i.productSku ?? '',
    unitOfMeasure: i.unitOfMeasure ?? 'pcs',
    warehouseId: i.warehouseId,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    discountPercent: i.discountPercent,
    taxPercent: i.taxPercent,
    notes: i.notes ?? '',
  })),
});

/** Stock of a product in one warehouse (or across all when none is picked). */
export function stockAt(p: Product | undefined, warehouseId?: number) {
  if (!p) return 0;
  if (warehouseId) return p.stockByWarehouse?.find(s => s.warehouseId === warehouseId)?.currentStock ?? 0;
  return p.totalStock ?? 0;
}

export type SalesInvoiceEditorHandle = {
  save: (confirm: boolean) => void;
  print: () => void;
  isDirty: () => boolean;
};

type Props = {
  invoice: SalesInvoice | null;          // null → new invoice
  allInvoices: SalesInvoice[];           // member outstanding + price history
  warehouses: Warehouse[];
  products: Product[];
  staffNames: string[];
  branchName: string;
  /** Sales Settings › Stock Check — null while it's still loading. */
  stockCheckEnabled: boolean | null;
  saving: boolean;
  onSave: (req: SalesInvoiceRequest, confirm: boolean, memberCode?: string) => void;
  onPrint: (draft: SalesInvoice, memberCode?: string) => void;
  onRecordPayment: (inv: SalesInvoice) => void;
  onRefreshProducts?: () => Promise<unknown> | void;
};

export const SalesInvoiceEditor = forwardRef<SalesInvoiceEditorHandle, Props>(function SalesInvoiceEditor(
  { invoice, allInvoices, warehouses, products, staffNames, branchName, stockCheckEnabled, saving, onSave, onPrint, onRecordPayment, onRefreshProducts },
  ref,
) {
  const { currencyCode } = useCurrency();
  const readOnly = !!invoice && invoice.status !== 'DRAFT';
  const initial = useMemo(() => (invoice ? formFromInvoice(invoice) : blankForm()), [invoice?.id, invoice?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const [form, setForm] = useState<Form>(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [focusedProductId, setFocusedProductId] = useState<number | undefined>();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const entryRef = useRef<HTMLInputElement>(null);
  const pendingFocus = useRef<string | null>(null);

  useEffect(() => { setForm(initial); setBaseline(JSON.stringify(initial)); }, [initial]);
  // Branch tax policy (Settings › Tax Configuration) — the server applies the same rule on save.
  const [taxDefaults, setTaxDefaults] = useState<TaxDefaults | null>(null);
  useEffect(() => { getTaxDefaults().then(setTaxDefaults).catch(() => setTaxDefaults(null)); }, []);

  useEffect(() => {
    if (!pendingFocus.current) return;
    const el = document.getElementById(`si-qty-${pendingFocus.current}`) as HTMLInputElement | null;
    pendingFocus.current = null;
    el?.focus();
    el?.select();
  }, [form.lines.length]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }));
  const updateLine = (key: string, patch: Partial<Line>) =>
    setForm(f => ({ ...f, lines: f.lines.map(l => (l.key === key ? { ...l, ...patch } : l)) }));
  const removeLine = (key: string) => setForm(f => ({ ...f, lines: f.lines.filter(l => l.key !== key) }));

  const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const activeWarehouses = useMemo(() => warehouses.filter(w => w.isActive !== false), [warehouses]);

  /** The warehouse holding the most of this product (falls back to the first warehouse). */
  const bestWarehouse = (p: Product) => {
    let best = activeWarehouses[0]?.id;
    let bestQty = 0;
    for (const w of activeWarehouses) {
      const q = stockAt(p, w.id);
      if (q > bestQty) { best = w.id; bestQty = q; }
    }
    return best;
  };

  // BillBull: the product's discount is pre-filled on the line, and is the most it can carry.
  const lineFromProduct = (p: Product, qty = 1, price = p.sellingPrice ?? 0, disc = salesDiscountFor(p)): Line => ({
    key: newKey(),
    productId: p.id,
    productName: p.name,
    productSku: p.sku ?? '',
    unitOfMeasure: p.defaultUnit ?? 'pcs',
    warehouseId: bestWarehouse(p),
    quantity: qty,
    unitPrice: price,
    discountPercent: disc || salesDiscountFor(p),
    taxPercent: salesTaxFor(p, taxDefaults),
    notes: '',
  });

  /** The discount a line may carry: none when the product doesn't allow discounts, else up to its maximum. */
  const discountCap = (productId: number | null | undefined) => {
    const p = productId != null ? productById.get(productId) : undefined;
    if (!p) return 100;
    if (p.allowDiscount === false) return 0;
    return p.maxDiscountPercent > 0 ? p.maxDiscountPercent : 100;
  };
  const setLineDiscount = (key: string, productId: number | null | undefined, raw: string) => {
    const cap = discountCap(productId);
    const v = Math.min(100, Math.max(0, Number(raw) || 0));
    if (v > cap) toast.error(cap === 0 ? 'Discounts are not allowed on this product.' : `The maximum discount for this product is ${cap}%.`);
    updateLine(key, { discountPercent: Math.min(v, cap) });
  };

  const addLine = (line: Line) => {
    setForm(f => {
      // The same product from the same warehouse bumps the qty instead of duplicating the line.
      const dup = f.lines.findIndex(x => x.productId === line.productId && x.warehouseId === line.warehouseId);
      if (dup >= 0) {
        const next = [...f.lines];
        next[dup] = { ...next[dup], quantity: next[dup].quantity + line.quantity };
        return { ...f, lines: next };
      }
      pendingFocus.current = line.key;
      return { ...f, lines: [...f.lines, line] };
    });
    setFocusedProductId(line.productId);
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const lineNetSum = useMemo(
    () => round2(form.lines.reduce((s, l) => s + round2(l.unitPrice * l.quantity) - round2((round2(l.unitPrice * l.quantity) * l.discountPercent) / 100), 0)),
    [form.lines],
  );
  const footerAmount = form.footerMode === 'percent'
    ? round2((lineNetSum * Math.min(100, Math.max(0, form.footerValue))) / 100)
    : round2(Math.max(0, form.footerValue));
  const exact = useMemo(
    () => invoiceTotals(form.lines, { pricesIncludeTax: form.pricesIncludeTax, footerDiscount: footerAmount, deliveryCharge: form.deliveryCharge, roundOff: 0 }),
    [form.lines, form.pricesIncludeTax, footerAmount, form.deliveryCharge],
  );
  const effectiveRoundOff = form.roundMode === 'auto' ? roundOffToWhole(exact.net) : form.roundMode === 'manual' ? round2(form.roundOff) : 0;
  const totals = { ...exact, roundOff: effectiveRoundOff, net: round2(exact.net + effectiveRoundOff) };

  const amountPaid = invoice?.amountPaid ?? 0;
  const isMember = form.customerType === 'MEMBER';
  const previousOutstanding = useMemo(() => {
    if (!isMember || !form.memberId) return 0;
    return allInvoices
      .filter(i => i.memberId === form.memberId && i.status === 'CONFIRMED' && i.id !== invoice?.id)
      .reduce((s, i) => s + balanceOf(i), 0);
  }, [allInvoices, isMember, form.memberId, invoice?.id]);
  const thisBalance = readOnly && invoice ? balanceOf(invoice) : Math.max(0, totals.net - amountPaid);
  const newOutstanding = previousOutstanding + (invoice?.status === 'CANCELLED' ? 0 : thisBalance);

  // Requested qty per product × warehouse across all lines — what the stock check compares.
  const requested = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of form.lines) m.set(`${l.productId}:${l.warehouseId ?? ''}`, (m.get(`${l.productId}:${l.warehouseId ?? ''}`) ?? 0) + (l.quantity || 0));
    return m;
  }, [form.lines]);
  const shortage = (l: Line) => {
    const need = requested.get(`${l.productId}:${l.warehouseId ?? ''}`) ?? 0;
    return stockAt(productById.get(l.productId), l.warehouseId) < need;
  };
  const checkingStock = stockCheckEnabled !== false && !readOnly;

  const priceHistory = useMemo(() => {
    if (!focusedProductId) return [];
    const rows: { invoiceNumber: string; date: string; customer: string; price: number; qty: number; same: boolean }[] = [];
    for (const i of allInvoices) {
      if (i.status !== 'CONFIRMED' || i.id === invoice?.id) continue;
      for (const it of i.items) {
        if (it.productId === focusedProductId) {
          rows.push({ invoiceNumber: i.invoiceNumber, date: i.invoiceDate, customer: i.customerName, price: it.unitPrice, qty: it.quantity,
            same: isMember && !!form.memberId && i.memberId === form.memberId });
        }
      }
    }
    return rows.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
  }, [allInvoices, focusedProductId, invoice?.id, isMember, form.memberId]);
  const focusedProduct = focusedProductId ? productById.get(focusedProductId) : undefined;

  // ── Customer ──────────────────────────────────────────────────────────────
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<Member[]>([]);
  const [memberOpen, setMemberOpen] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);

  useEffect(() => {
    if (!memberQuery.trim()) { setMemberResults([]); return; }
    const t = setTimeout(async () => {
      setMemberLoading(true);
      try {
        const res = await membersService.getMembers({ search: memberQuery.trim() }, { limit: 8 });
        setMemberResults(res.members ?? []);
        setMemberOpen(true);
      } catch {
        setMemberResults([]);
      } finally {
        setMemberLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [memberQuery]);

  // Member ID for an invoice opened from the list (the invoice only stores the DB id).
  useEffect(() => {
    if (!form.memberId || form.memberCode) return;
    membersService.getMemberById(String(form.memberId))
      .then(m => setForm(f => (f.memberId === form.memberId ? { ...f, memberCode: m.member_id || undefined } : f)))
      .catch(() => undefined);
  }, [form.memberId]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickMember = (m: Member) => {
    setForm(f => ({
      ...f,
      customerType: 'MEMBER',
      memberId: Number(m.id),
      memberCode: m.member_id || undefined,
      customerName: m.name,
      customerPhone: m.phone ?? '',
      customerEmail: m.email ?? '',
      customerAddress: m.address ?? '',
    }));
    setMemberQuery('');
    setMemberOpen(false);
  };

  const setCustomerType = (t: SalesCustomerType) =>
    setForm(f => (f.customerType === t ? f : {
      ...f, customerType: t, memberId: undefined, memberCode: undefined,
      customerName: '', customerPhone: '', customerEmail: '', customerAddress: '', customerTrn: '',
      // A walk-in sale is paid on the spot.
      ...(t === 'WALK_IN' ? { paymentTerms: 'IMMEDIATE', dueDate: f.invoiceDate } : {}),
    }));

  // ── Terms & dates ─────────────────────────────────────────────────────────
  const applyTerms = (terms: string, date: string) => {
    const t = PAYMENT_TERMS.find(x => x.value === terms);
    return t ? addDays(date, t.days) : undefined;
  };
  const onTermsChange = (terms: string) =>
    setForm(f => ({ ...f, paymentTerms: terms, dueDate: applyTerms(terms, f.invoiceDate) ?? f.dueDate }));
  const onDateChange = (d: string) =>
    setForm(f => ({ ...f, invoiceDate: d, dueDate: (f.paymentTerms && applyTerms(f.paymentTerms, d)) || f.dueDate }));

  // ── Save ──────────────────────────────────────────────────────────────────
  const validate = (confirm: boolean): string | null => {
    if (isMember && !form.memberId) return 'Select the member this invoice is for — or switch to Walk-in';
    if (!form.invoiceDate) return 'Invoice date is required';
    if (form.dueDate && form.dueDate < form.invoiceDate) return 'Due date cannot be before the invoice date';
    if (form.lines.length === 0) return 'Add at least one item to the invoice';
    for (const [i, l] of form.lines.entries()) {
      const n = `Line ${i + 1} (${l.productName})`;
      if (!Number.isInteger(l.quantity) || l.quantity < 1) return `${n}: quantity must be a whole number of at least 1`;
      if (!(l.unitPrice >= 0)) return `${n}: price cannot be negative`;
      if (l.discountPercent < 0 || l.discountPercent > 100) return `${n}: discount must be between 0 and 100%`;
    }
    if (footerAmount > lineNetSum + 0.001) return 'Footer discount cannot be more than the items total';
    if (Math.abs(totals.roundOff) > 1) return 'Round off must be between -1.00 and 1.00';
    if (confirm && stockCheckEnabled !== false) {
      for (const l of form.lines) {
        if (!l.warehouseId) return `${l.productName}: select the warehouse it is sold from`;
        if (shortage(l)) {
          const wh = warehouses.find(w => w.id === l.warehouseId)?.name ?? 'the selected warehouse';
          return `Insufficient stock for ${l.productName} in ${wh}: available ${stockAt(productById.get(l.productId), l.warehouseId)}, required ${requested.get(`${l.productId}:${l.warehouseId}`)}`;
        }
      }
    }
    return null;
  };

  const buildRequest = (): SalesInvoiceRequest => ({
    invoiceDate: form.invoiceDate,
    dueDate: form.dueDate || undefined,
    paymentTerms: form.paymentTerms || undefined,
    reference: form.reference.trim() || undefined,
    salesperson: form.salesperson || undefined,
    customerType: form.customerType,
    memberId: isMember ? form.memberId : undefined,
    customerName: form.customerName.trim() || undefined,
    customerPhone: form.customerPhone.trim() || undefined,
    customerEmail: form.customerEmail.trim() || undefined,
    customerAddress: form.customerAddress.trim() || undefined,
    customerTrn: form.customerTrn.trim() || undefined,
    pricesIncludeTax: form.pricesIncludeTax,
    footerDiscount: footerAmount,
    deliveryCharge: round2(form.deliveryCharge),
    roundOff: totals.roundOff,
    notes: form.notes.trim() || undefined,
    internalNotes: form.internalNotes.trim() || undefined,
    items: form.lines.map(l => ({
      productId: l.productId,
      productName: l.productName,
      productSku: l.productSku || undefined,
      unitOfMeasure: l.unitOfMeasure || undefined,
      warehouseId: l.warehouseId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPercent: l.discountPercent,
      notes: l.notes.trim() || undefined,
    })),
  });

  const draftAsInvoice = (): SalesInvoice => ({
    ...(invoice ?? ({} as SalesInvoice)),
    id: invoice?.id ?? 0,
    invoiceNumber: invoice?.invoiceNumber ?? 'NEW (unsaved)',
    invoiceDate: form.invoiceDate,
    dueDate: form.dueDate || undefined,
    paymentTerms: form.paymentTerms || undefined,
    reference: form.reference || undefined,
    salesperson: form.salesperson || undefined,
    customerType: form.customerType,
    memberId: form.memberId,
    customerName: form.customerName || 'Walk-in Customer',
    customerPhone: form.customerPhone || undefined,
    customerEmail: form.customerEmail || undefined,
    customerAddress: form.customerAddress || undefined,
    customerTrn: form.customerTrn || undefined,
    status: invoice?.status ?? 'DRAFT',
    paymentStatus: invoice?.paymentStatus ?? 'UNPAID',
    pricesIncludeTax: form.pricesIncludeTax,
    subtotal: totals.gross,
    discountAmount: totals.discount,
    footerDiscount: totals.footerDiscount,
    taxableAmount: totals.taxable,
    taxAmount: totals.tax,
    deliveryCharge: totals.delivery,
    roundOff: totals.roundOff,
    totalAmount: totals.net,
    amountPaid,
    stockDeducted: invoice?.stockDeducted ?? false,
    notes: form.notes,
    internalNotes: form.internalNotes,
    createdAt: invoice?.createdAt ?? '',
    items: form.lines.map((l, i) => {
      const a = totals.perLine[i];
      return {
        id: i, productId: l.productId, productName: l.productName, productSku: l.productSku, unitOfMeasure: l.unitOfMeasure,
        warehouseId: l.warehouseId, quantity: l.quantity, unitPrice: l.unitPrice, discountPercent: l.discountPercent,
        discountAmount: a.discount, footerDiscountShare: a.footerShare, taxPercent: l.taxPercent, taxableAmount: a.taxable,
        taxAmount: a.tax, totalAmount: a.total, notes: l.notes,
      };
    }),
  });

  const save = (confirm: boolean) => {
    if (readOnly || saving) return;
    const err = validate(confirm);
    if (err) { toast.error(err); return; }
    onSave(buildRequest(), confirm, form.memberCode);
  };

  const print = () => {
    if (form.lines.length === 0) { toast.error('Nothing to print — add items first'); return; }
    onPrint(readOnly && invoice ? invoice : draftAsInvoice(), form.memberCode);
  };

  useImperativeHandle(ref, () => ({
    save,
    print,
    isDirty: () => !readOnly && JSON.stringify(form) !== baseline,
  }));

  const statusLabel = invoice ? statusMeta(displayStatus(invoice)) : { label: 'Draft (new)', cls: styles.pillGray };
  const salespeople = form.salesperson && !staffNames.includes(form.salesperson) ? [form.salesperson, ...staffNames] : staffNames;

  return (
    <div className={cx(styles.editor, styles.fadeIn)}>
      {readOnly && invoice && (
        <div className={cx(styles.notice, styles.noticeInfo)}>
          <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>View only.</strong> This invoice is {statusLabel.label.toLowerCase()} — confirmed and cancelled invoices can’t be edited.
            {invoice.status === 'CONFIRMED' && balanceOf(invoice) > 0 && (
              <> You can still <button type="button" className={styles.copyBtn} style={{ textDecoration: 'underline', fontWeight: 600 }} onClick={() => onRecordPayment(invoice)}>receive a payment</button>.</>
            )}
          </div>
        </div>
      )}
      {!readOnly && stockCheckEnabled === false && (
        <div className={cx(styles.notice, styles.noticeWarn)}>
          <Zap size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Stock Check is off</strong> (Sales &amp; Purchases › Settings). Confirming this invoice posts the sale but won’t reduce stock.
          </div>
        </div>
      )}

      {/* Invoice details */}
      <div className={cx(styles.panel, styles.detailsGrid)}>
        <div className={styles.cell}>
          <label className={styles.eyebrow}>Status</label>
          <div><span className={cx(styles.pill, statusLabel.cls)}>{statusLabel.label}</span></div>
        </div>
        <div className={styles.cell}>
          <label className={styles.eyebrow}>Invoice No.</label>
          <input className={cx(styles.field, styles.fieldStrong)} readOnly value={invoice?.invoiceNumber ?? ''} placeholder="Auto generated" />
        </div>
        <div className={styles.cell}>
          <label className={styles.eyebrow} htmlFor="si-date">Date</label>
          <input id="si-date" type="date" className={styles.field} value={form.invoiceDate} disabled={readOnly} onChange={e => onDateChange(e.target.value)} />
        </div>
        <div className={styles.cell}>
          <label className={styles.eyebrow} htmlFor="si-due">Due Date</label>
          <input id="si-due" type="date" className={styles.field} value={form.dueDate} min={form.invoiceDate} disabled={readOnly}
            onChange={e => setForm(f => ({ ...f, dueDate: e.target.value, paymentTerms: '' }))} />
        </div>
        <div className={styles.cell}>
          <label className={styles.eyebrow} htmlFor="si-ref">Reference</label>
          <input id="si-ref" className={styles.field} value={form.reference} readOnly={readOnly} placeholder="e.g. PO Number"
            onChange={e => set('reference', e.target.value)} />
        </div>
        <div className={styles.cell}>
          <label className={styles.eyebrow} htmlFor="si-terms">Payment Terms</label>
          <div className={styles.selectWrap}>
            <select id="si-terms" className={cx(styles.field, styles.fieldSelect)} value={form.paymentTerms} disabled={readOnly} onChange={e => onTermsChange(e.target.value)}>
              <option value="">Custom</option>
              {PAYMENT_TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <ChevronDown size={14} />
          </div>
        </div>
        <div className={styles.cell}>
          <label className={styles.eyebrow}>Invoice Type</label>
          <input className={styles.field} readOnly value="Direct Sale" title="Sales invoices are direct sales to members or walk-in customers" />
        </div>
        <div className={styles.cell}>
          <label className={styles.eyebrow}>Branch</label>
          <input className={styles.field} readOnly value={branchName} title={branchName} />
        </div>
        <div className={styles.cell}>
          <label className={styles.eyebrow} htmlFor="si-sp">Salesperson</label>
          <div className={styles.selectWrap}>
            <select id="si-sp" className={cx(styles.field, styles.fieldSelect)} value={form.salesperson} disabled={readOnly} onChange={e => set('salesperson', e.target.value)}>
              <option value="">Select salesperson…</option>
              {salespeople.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      <div className={styles.editorGrid}>
        {/* ── MAIN COLUMN ── */}
        <div className={styles.mainCol}>
          {/* Customer */}
          <div className={cx(styles.panel, styles.partyGrid)}>
            <div className={styles.partyCol}>
              <div className={styles.cardLine} style={{ marginBottom: 10 }}>
                <h3 className={styles.panelTitle}><User size={14} /> Customer</h3>
                <div style={{ display: 'inline-flex', gap: 6 }}>
                  {(['WALK_IN', 'MEMBER'] as const).map(t => (
                    <button key={t} type="button" disabled={readOnly} onClick={() => setCustomerType(t)}
                      className={cx(styles.tab, form.customerType === t && styles.tabActive)} style={{ height: 30 }}>
                      {t === 'WALK_IN' ? <><Users size={13} /> Walk-in</> : <><UserCheck size={13} /> Member</>}
                    </button>
                  ))}
                </div>
              </div>

              {isMember && !readOnly && (
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <div className={styles.searchBox} style={{ width: '100%' }}>
                    <Search size={14} />
                    <input className={styles.searchInput} value={memberQuery} placeholder={form.memberId ? 'Change member — search name, phone or member ID…' : 'Search member by name, phone or member ID…'}
                      onChange={e => setMemberQuery(e.target.value)} onFocus={() => memberResults.length && setMemberOpen(true)}
                      onBlur={() => setTimeout(() => setMemberOpen(false), 150)} aria-label="Search member" />
                  </div>
                  {memberOpen && (memberResults.length > 0 || memberLoading) && (
                    <div className={styles.suggest} role="listbox">
                      {memberLoading && memberResults.length === 0 && <div className={styles.suggestItem}>Searching…</div>}
                      {memberResults.map(m => (
                        <button key={m.id} type="button" className={styles.suggestItem} onMouseDown={e => { e.preventDefault(); pickMember(m); }}>
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{m.name}</span>
                            <span className={cx(styles.tiny, styles.muted)}>{[m.member_id, m.phone].filter(Boolean).join(' · ')}</span>
                          </span>
                          <span className={cx(styles.pill, m.membership_status === 'active' ? styles.pillGreen : styles.pillGray)}>{m.membership_status}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {isMember && !form.memberId ? (
                <div className={styles.partyEmpty}>
                  <UserCheck size={18} style={{ opacity: 0.5 }} />
                  Search and pick the member you’re selling to — members can buy on account.
                </div>
              ) : (
                <div className={styles.partyFacts}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span className={styles.eyebrow}>{isMember ? 'Member' : 'Customer name'}</span>
                    <input className={cx(styles.cellInput, styles.fieldStrong)} value={form.customerName} readOnly={readOnly}
                      placeholder={isMember ? '' : 'Walk-in Customer'} onChange={e => set('customerName', e.target.value)} />
                    {isMember && form.memberCode && <span className={cx(styles.tiny, styles.muted)}>Member ID {form.memberCode}</span>}
                  </div>
                  <div><span className={styles.eyebrow}>Phone</span>
                    <input className={styles.cellInput} value={form.customerPhone} readOnly={readOnly} placeholder="—"
                      onChange={e => { const v = e.target.value; if (/^[\d+\-\s()]*$/.test(v)) set('customerPhone', v); }} /></div>
                  <div><span className={styles.eyebrow}>Email</span>
                    <input className={styles.cellInput} value={form.customerEmail} readOnly={readOnly} placeholder="—" onChange={e => set('customerEmail', e.target.value)} /></div>
                  <div><span className={styles.eyebrow}>TRN / VAT No.</span>
                    <input className={styles.cellInput} value={form.customerTrn} readOnly={readOnly} placeholder="—" onChange={e => set('customerTrn', e.target.value)} /></div>
                  <div><span className={styles.eyebrow}>Address</span>
                    <input className={styles.cellInput} value={form.customerAddress} readOnly={readOnly} placeholder="—" onChange={e => set('customerAddress', e.target.value)} /></div>
                </div>
              )}
            </div>

            <div className={styles.partyCol}>
              <h3 className={styles.panelTitle} style={{ marginBottom: 10 }}><Lock size={14} /> Account</h3>
              {isMember ? (
                <>
                  <div className={styles.sumRow}><span>Previous outstanding</span><CurrencyValue amount={previousOutstanding} options={fmt2} /></div>
                  <div className={styles.sumRow}><span>This invoice</span><CurrencyValue amount={thisBalance} options={fmt2} /></div>
                  <div className={styles.sumTotal} style={{ color: newOutstanding > 0 ? '#dc2626' : undefined }}>
                    <span>Total due from member</span><CurrencyValue amount={newOutstanding} options={fmt2} />
                  </div>
                  <p className={cx(styles.tiny, styles.muted)} style={{ marginTop: 8, lineHeight: 1.5 }}>
                    Members can pay now, in part, or later — anything unpaid stays on their account (Accounts Receivable).
                  </p>
                </>
              ) : (
                <p className={cx(styles.tiny, styles.muted)} style={{ lineHeight: 1.6 }}>
                  Walk-in sales are cash sales: the full amount is collected when the invoice is confirmed. To sell on account, switch to <strong>Member</strong>.
                </p>
              )}
            </div>
          </div>

          {/* Items */}
          <div className={cx(styles.panel, styles.panelPad)}>
            <div className={styles.itemsHead}>
              <h3 className={styles.panelTitle}>
                <FileText size={14} /> Invoice Items
                {!readOnly && <span className={styles.fastEntry}><Zap size={10} /> Fast Entry</span>}
              </h3>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'inline-flex', gap: 4 }} role="group" aria-label="VAT mode">
                  {[{ v: false, l: 'VAT Excl.', t: 'Prices exclude VAT — tax is added on top' }, { v: true, l: 'VAT Incl.', t: 'Prices already include VAT — tax is extracted' }].map(o => (
                    <button key={o.l} type="button" title={o.t} disabled={readOnly} onClick={() => set('pricesIncludeTax', o.v)}
                      className={cx(styles.tab, form.pricesIncludeTax === o.v && styles.tabActive)} style={{ height: 30 }}>{o.l}</button>
                  ))}
                </div>
                {!readOnly && (
                  <Button size="sm" onClick={() => { setCatalogSearch(''); setCatalogOpen(true); }}><Plus className="h-4 w-4" /> Select from Catalog</Button>
                )}
              </div>
            </div>

            <div className={styles.gridBox}>
              <div className={styles.gridScroll}>
                <table className={styles.lineTable}>
                  <thead>
                    <tr>
                      <th className={styles.center} style={{ width: 36 }}>#</th>
                      <th style={{ minWidth: 260 }}>Item / Description</th>
                      <th className={styles.center} style={{ width: 70 }}>Unit</th>
                      <th className={styles.center} style={{ width: 80 }}>Qty</th>
                      <th className={styles.right} style={{ width: 110 }}>Price</th>
                      <th className={styles.right} style={{ width: 76 }}>Disc %</th>
                      <th className={styles.right} style={{ width: 70 }}>VAT %</th>
                      <th className={styles.right} style={{ width: 115 }}>Line Total</th>
                      <th style={{ width: 150 }}>Warehouse</th>
                      <th style={{ width: 40 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {form.lines.map((l, idx) => {
                      const a = totals.perLine[idx];
                      const p = productById.get(l.productId);
                      const avail = stockAt(p, l.warehouseId);
                      const short = checkingStock && shortage(l);
                      return (
                        <tr key={l.key} onFocus={() => setFocusedProductId(l.productId)} onClick={() => setFocusedProductId(l.productId)}>
                          <td className={cx(styles.center, styles.muted)}>{idx + 1}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                              <Thumb product={p} size={40} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className={styles.lineName}>{l.productName}</div>
                                <div className={styles.lineSub}>
                                  {l.productSku && <span className={styles.mono}>{l.productSku}</span>}
                                  {!readOnly && (
                                    <span style={{ color: short ? '#dc2626' : '#059669', fontWeight: 600 }}>
                                      Avail: {avail} {p?.defaultUnit ?? ''}{short ? ' — insufficient' : ''}
                                    </span>
                                  )}
                                </div>
                                <input className={styles.cellInput} style={{ fontWeight: 400, fontSize: 13 }} value={l.notes} disabled={readOnly}
                                  placeholder={readOnly ? '' : 'Add a line description…'} onChange={e => updateLine(l.key, { notes: e.target.value })} />
                              </div>
                            </div>
                          </td>
                          <td className={cx(styles.center, styles.muted)}>{l.unitOfMeasure}</td>
                          <td>
                            <input id={`si-qty-${l.key}`} type="number" min={1} step={1} className={cx(styles.cellInput, styles.center)}
                              style={short ? { color: '#dc2626' } : undefined}
                              value={l.quantity || ''} placeholder="0" disabled={readOnly}
                              onChange={e => updateLine(l.key, { quantity: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById(`si-price-${l.key}`)?.focus(); } }} />
                          </td>
                          <td>
                            <input id={`si-price-${l.key}`} type="number" min={0} step="0.01" className={cx(styles.cellInput, styles.right)}
                              value={l.unitPrice === 0 ? '' : l.unitPrice} placeholder="0.00" disabled={readOnly}
                              onChange={e => updateLine(l.key, { unitPrice: Math.max(0, Number(e.target.value) || 0) })}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); entryRef.current?.focus(); } }} />
                          </td>
                          <td>
                            <input type="number" min={0} max={discountCap(l.productId)} step="0.01" className={cx(styles.cellInput, styles.right)}
                              value={l.discountPercent === 0 ? '' : l.discountPercent} placeholder="0" disabled={readOnly || discountCap(l.productId) === 0}
                              title={discountCap(l.productId) === 0 ? 'No discount on this product' : discountCap(l.productId) < 100 ? `Max ${discountCap(l.productId)}%` : undefined}
                              onChange={e => setLineDiscount(l.key, l.productId, e.target.value)} />
                          </td>
                          <td className={cx(styles.right, styles.muted)} title={taxDefaults && !taxDefaults.vatRegistered ? "Not VAT registered — no tax" : "Branch sales tax, or the product's own rate"}>{l.taxPercent ? `${l.taxPercent}%` : '—'}</td>
                          <td className={styles.lineTotal}>
                            {money(a?.total ?? 0)}
                            {(a?.discount ?? 0) > 0 && <div className={cx(styles.tiny, styles.danger)} style={{ fontWeight: 500 }}>− {money(a.discount)}</div>}
                          </td>
                          <td>
                            <div className={styles.selectWrap}>
                              <select className={styles.cellInput} style={{ width: '100%', paddingRight: 24, cursor: 'pointer' }} value={l.warehouseId ?? ''} disabled={readOnly}
                                onChange={e => updateLine(l.key, { warehouseId: e.target.value ? Number(e.target.value) : undefined })} aria-label="Warehouse">
                                <option value="">Select…</option>
                                {warehouses.filter(w => w.isActive !== false || w.id === l.warehouseId).map(w => (
                                  <option key={w.id} value={w.id}>{w.name} ({stockAt(p, w.id)})</option>
                                ))}
                              </select>
                              <ChevronDown size={12} />
                            </div>
                          </td>
                          <td className={styles.center}>
                            {!readOnly && (
                              <button type="button" className={styles.removeBtn} onClick={() => removeLine(l.key)} title="Remove line"><Trash2 size={15} /></button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {!readOnly && (
                      <tr>
                        <td className={cx(styles.center, styles.muted)}>{form.lines.length + 1}</td>
                        <td colSpan={9}>
                          <FastEntry inputRef={entryRef} products={products} priceBasis="sell"
                            onPick={p => addLine(lineFromProduct(p))}
                            onBrowse={t => { setCatalogSearch(t); setCatalogOpen(true); }} />
                        </td>
                      </tr>
                    )}
                    {form.lines.length === 0 && readOnly && (
                      <tr><td colSpan={10} className={styles.empty}>No items.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className={styles.gridFoot}>
                <span>Lines: <b>{form.lines.length}</b></span>
                <span>Total qty: <b>{totals.qty}</b></span>
                <span>Gross: <b>{money(totals.gross)}</b></span>
                {!readOnly && <span style={{ marginLeft: 'auto' }}>Quick entry: type name → Enter → qty → Enter → price → Enter adds the next item</span>}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className={styles.notesGrid}>
            <div className={cx(styles.panel, styles.panelPad)}>
              <h3 className={styles.panelTitle} style={{ marginBottom: 8 }}><FileText size={14} /> Customer Notes</h3>
              <label className={cx(styles.tiny, styles.muted)} htmlFor="si-notes" style={{ display: 'block', marginBottom: 4 }}>Notes to customer (prints on invoice)</label>
              <textarea id="si-notes" className={styles.textarea} rows={3} value={form.notes} readOnly={readOnly}
                placeholder="Thank you for your business!" onChange={e => set('notes', e.target.value)} />
            </div>
            <div className={cx(styles.panel, styles.panelPad)}>
              <h3 className={styles.panelTitle} style={{ marginBottom: 8 }}><Lock size={14} /> Internal Notes</h3>
              <label className={cx(styles.tiny, styles.muted)} htmlFor="si-inotes" style={{ display: 'block', marginBottom: 4 }}>Only visible to staff</label>
              <textarea id="si-inotes" className={styles.textarea} rows={3} value={form.internalNotes} readOnly={readOnly}
                placeholder="e.g. Special discount approved by manager" onChange={e => set('internalNotes', e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── RIGHT RAIL ── */}
        <div className={cx(styles.mainCol, styles.railSticky)} style={{ gap: 14 }}>
          <div className={cx(styles.panel, styles.panelPad)}>
            <h3 className={styles.panelTitle} style={{ marginBottom: 12 }}>Totals & Payment Summary</h3>
            <div className={styles.sumRow}><span>Subtotal</span><CurrencyValue amount={totals.gross} options={fmt2} /></div>
            <div className={styles.sumRow}><span>Line Discounts</span><span className={styles.danger}>− <CurrencyValue amount={totals.discount} options={fmt2} /></span></div>
            <div className={styles.sumRow}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Footer Discount
                <button type="button" disabled={readOnly} className={cx(styles.pill, styles.pillGray)} style={{ cursor: readOnly ? 'default' : 'pointer', border: 0 }}
                  title="Toggle between percentage and fixed amount"
                  onClick={() => setForm(f => ({ ...f, footerMode: f.footerMode === 'percent' ? 'amount' : 'percent', footerValue: 0 }))}>
                  {form.footerMode === 'percent' ? '%' : currencyCode}
                </button>
                <input type="number" min={0} max={form.footerMode === 'percent' ? 100 : undefined} step="0.01" className={styles.inlineNum}
                  value={form.footerValue || ''} placeholder="0" disabled={readOnly} aria-label="Footer discount"
                  onChange={e => set('footerValue', Math.max(0, Number(e.target.value) || 0))} />
              </span>
              <span className={styles.danger}>− <CurrencyValue amount={totals.footerDiscount} options={fmt2} /></span>
            </div>
            <div className={styles.sumRow}><span>Taxable Amount</span><CurrencyValue amount={totals.taxable} options={fmt2} /></div>
            <div className={styles.sumRow}><span>Total VAT{form.pricesIncludeTax ? ' (included)' : ''}</span><CurrencyValue amount={totals.tax} options={fmt2} /></div>
            <div className={styles.sumRow}>
              <span>Delivery Charge</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <CurrencyGlyph />
                <input type="number" min={0} step="0.01" className={styles.inlineNum} value={form.deliveryCharge || ''} placeholder="0.00"
                  disabled={readOnly} onChange={e => set('deliveryCharge', Math.max(0, Number(e.target.value) || 0))} aria-label="Delivery charge" />
              </span>
            </div>
            <div className={styles.sumRow}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Round Off
                {!readOnly && (['off', 'auto', 'manual'] as RoundMode[]).map(m => (
                  <button key={m} type="button" className={cx(styles.copyBtn, styles.tiny)}
                    style={{ fontWeight: form.roundMode === m ? 700 : 400, color: form.roundMode === m ? 'var(--primary)' : undefined, textDecoration: form.roundMode === m ? 'underline' : undefined }}
                    onClick={() => set('roundMode', m)}>
                    {m === 'off' ? 'None' : m === 'auto' ? 'Auto' : 'Edit'}
                  </button>
                ))}
              </span>
              {form.roundMode === 'manual' && !readOnly ? (
                <input type="number" min={-1} max={1} step="0.01" className={styles.inlineNum} value={form.roundOff || ''} placeholder="0.00"
                  onChange={e => set('roundOff', Math.max(-1, Math.min(1, Number(e.target.value) || 0)))} aria-label="Round off" />
              ) : (
                <span className={styles.num}>{totals.roundOff.toFixed(2)}</span>
              )}
            </div>
            <div className={styles.sumTotal}><span>Net Invoice Amount</span><CurrencyValue amount={totals.net} options={fmt2} /></div>

            <div className={styles.sumDivider} />
            <div className={styles.sumRow}><span>This Invoice</span><CurrencyValue amount={totals.net} options={fmt2} /></div>
            {amountPaid > 0 && (
              <div className={styles.sumRow}><span>Received on this Invoice</span><span className={styles.success}>− <CurrencyValue amount={amountPaid} options={fmt2} /></span></div>
            )}
            {isMember ? (
              <div className={styles.sumTotal} style={{ color: newOutstanding > 0 ? '#dc2626' : undefined, fontSize: 16 }}>
                <span>New Total Outstanding</span><CurrencyValue amount={newOutstanding} options={fmt2} />
              </div>
            ) : (
              <div style={{ marginTop: 6 }}><span className={cx(styles.pill, styles.pillGreen)}>Cash Invoice — paid in full on confirm</span></div>
            )}
          </div>

          <div className={cx(styles.panel, styles.panelPad)}>
            <h3 className={styles.panelTitle} style={{ marginBottom: 10 }}><Package size={14} /> Item Availability</h3>
            {readOnly ? (
              <div className={cx(styles.tiny, styles.muted)} style={{ padding: '6px 0' }}>
                {invoice?.stockDeducted ? (invoice.status === 'CANCELLED' ? 'Stock was returned when this invoice was cancelled.' : 'Stock was issued when this invoice was confirmed.') : 'This invoice did not change stock.'}
              </div>
            ) : (
              <div className={styles.railScroll}>
                {form.lines.length ? [...requested.entries()].map(([k, need]) => {
                  const [pid, wid] = k.split(':');
                  const p = productById.get(Number(pid));
                  const avail = stockAt(p, wid ? Number(wid) : undefined);
                  const ok = avail >= need;
                  const name = form.lines.find(l => `${l.productId}:${l.warehouseId ?? ''}` === k)?.productName ?? p?.name;
                  return (
                    <div key={k} className={cx(styles.stockCard, ok ? styles.stockOk : styles.stockOut)}>
                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                      <div className={cx(styles.tiny, styles.muted)}>{wid ? warehouses.find(w => w.id === Number(wid))?.name : 'No warehouse selected'}</div>
                      <div className={styles.cardLine} style={{ marginTop: 3 }}>
                        <span>Req: <b>{need}</b></span>
                        <span>Avail: <b>{avail}</b></span>
                      </div>
                      <div style={{ marginTop: 2, fontWeight: 600, color: ok ? '#047857' : '#b91c1c' }}>
                        {ok ? 'In stock' : stockCheckEnabled === false ? 'Short — Stock Check is off' : 'Insufficient — confirm is blocked'}
                      </div>
                    </div>
                  );
                }) : (
                  <div className={styles.empty} style={{ padding: '14px 0', fontSize: 13 }}>Add items to check stock.</div>
                )}
              </div>
            )}
          </div>

          <div className={cx(styles.panel, styles.panelPad)}>
            <h3 className={styles.panelTitle} style={{ marginBottom: 10 }}><History size={14} /> Sales Price History</h3>
            {focusedProduct ? (
              <>
                <div className={cx(styles.tiny, styles.muted)} style={{ marginBottom: 8 }}>
                  {focusedProduct.name} · list price <b style={{ color: 'var(--foreground)' }}>{money(focusedProduct.sellingPrice ?? 0)}</b>
                </div>
                {priceHistory.length ? priceHistory.map((h, i) => (
                  <div key={i} className={styles.infoRow}>
                    <span className={styles.infoLabel}>
                      {displayDate(h.date)}{h.same && <span className={cx(styles.pill, styles.pillPurple)} style={{ marginLeft: 6 }}>This member</span>}
                      <span style={{ display: 'block', fontSize: 12 }}>{h.customer} · {h.invoiceNumber}</span>
                    </span>
                    <span className={cx(styles.infoValue, styles.num)}>{money(h.price)}<span className={styles.muted} style={{ display: 'block', fontSize: 12, fontWeight: 400 }}>× {h.qty}</span></span>
                  </div>
                )) : <div className={styles.empty} style={{ padding: '10px 0', fontSize: 13 }}>Not sold on a confirmed invoice before.</div>}
              </>
            ) : (
              <div className={styles.empty} style={{ padding: '14px 0', fontSize: 13 }}>Click an item line to see what it sold for before.</div>
            )}
          </div>

          {!readOnly && form.lines.length > 0 && (() => {
            const err = validate(true);
            return err ? (
              <div className={styles.alert}><AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /><span>{err}</span></div>
            ) : (
              <div className={styles.notice} style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' }}>
                <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 1 }} /> Ready to confirm.
              </div>
            );
          })()}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className={styles.actionBar}>
        <div className={styles.actionBarMeta}>
          <span className={cx(styles.pill, statusLabel.cls)}>{statusLabel.label}</span>
          <span>Invoice No: <strong>{invoice?.invoiceNumber ?? '—'}</strong></span>
          <span>Net: <strong><CurrencyValue amount={totals.net} options={fmt2} /></strong> <span className={styles.muted}>({currencyCode})</span></span>
        </div>
        <div className={styles.headerActions}>
          {!readOnly && (
            <>
              <Button variant="outline" size="sm" disabled={saving} onClick={() => save(false)}>Save Draft</Button>
              <Button size="sm" disabled={saving} onClick={() => save(true)}>
                <CheckCircle2 className="h-4 w-4" /> Confirm
              </Button>
            </>
          )}
          {readOnly && invoice?.status === 'CONFIRMED' && balanceOf(invoice) > 0 && (
            <Button size="sm" onClick={() => onRecordPayment(invoice)}>Receive Payment</Button>
          )}
          <Button variant="outline" size="sm" onClick={print}>Print</Button>
        </div>
      </div>

      <ProductSelector open={catalogOpen} onOpenChange={setCatalogOpen} products={products} target="Invoice" priceBasis="sell"
        initialSearch={catalogSearch} onRefresh={onRefreshProducts}
        onAdd={(p, e) => addLine(lineFromProduct(p, e.quantity, e.unitPrice, e.discountPercent))} />
    </div>
  );
});
