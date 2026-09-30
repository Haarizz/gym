import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, CheckCircle2, ChevronDown, FileText, History, Info, Package, Plus,
  Trash2, Truck, User, UserPlus, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { CurrencyGlyph, CurrencyValue, useCurrency } from '../../utils/currency';
import type { SupplierBill, SupplierBillRequest } from '../../utils/supabase/supplier-bill-service';
import type { PurchaseOrder, Supplier } from '../../utils/supabase/purchase-service';
import type { Product, Warehouse } from '../../utils/supabase/products-service';
import styles from './PurchaseInvoice.module.css';
import { FastEntry, ProductSelector, Thumb } from './lineEntry';
import {
  PAYMENT_TERMS, addDays, balanceOf, billTotals, displayDate, displayStatus, lineAmounts, money,
  normaliseTerms, priorityMeta, statusMeta, todayIso,
} from './purchaseInvoiceUtils';

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ');
const fmt2 = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
let keySeq = 0;
const newKey = () => `l${Date.now().toString(36)}${(keySeq++).toString(36)}`;

// Purchase orders that can still be billed (stock has been / is being received).
const BILLABLE_PO_STATUSES = ['APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED'];

type Line = {
  key: string;
  productId?: number;
  productName: string;
  productSku: string;
  unitOfMeasure: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  notes: string;
};

type Form = {
  invoiceType: 'DIRECT' | 'PO';
  purchaseOrderId?: number;
  supplierId: number;
  invoiceNumber: string;
  billDate: string;
  dueDate: string;
  paymentTerms: string;
  priority: string;
  warehouseId?: number;
  receivedBy: string;
  notes: string;
  shippingCost: number;
  lines: Line[];
};

const blankForm = (warehouseId?: number): Form => ({
  invoiceType: 'DIRECT',
  supplierId: 0,
  invoiceNumber: '',
  billDate: todayIso(),
  dueDate: '',
  paymentTerms: '',
  priority: 'MEDIUM',
  warehouseId,
  receivedBy: '',
  notes: '',
  shippingCost: 0,
  lines: [],
});

const formFromBill = (b: SupplierBill): Form => ({
  invoiceType: b.purchaseOrderId ? 'PO' : 'DIRECT',
  purchaseOrderId: b.purchaseOrderId,
  supplierId: b.supplierId,
  invoiceNumber: b.invoiceNumber ?? '',
  billDate: b.billDate || todayIso(),
  dueDate: b.dueDate ?? '',
  paymentTerms: '',
  priority: b.priority || 'MEDIUM',
  warehouseId: b.warehouseId,
  receivedBy: b.receivedBy ?? '',
  notes: b.notes ?? '',
  shippingCost: b.shippingCost || 0,
  lines: b.items.map(i => ({
    key: newKey(),
    productId: i.productId,
    productName: i.productName,
    productSku: i.productSku ?? '',
    unitOfMeasure: i.unitOfMeasure ?? 'pcs',
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    discountPercent: i.discountPercent,
    taxPercent: i.taxPercent,
    notes: i.notes ?? '',
  })),
});

const customLine = (name: string): Line => ({
  key: newKey(),
  productName: name,
  productSku: '',
  unitOfMeasure: 'pcs',
  quantity: 1,
  unitPrice: 0,
  discountPercent: 0,
  taxPercent: 0,
  notes: '',
});

const lineFromProduct = (p: Product): Line => ({
  key: newKey(),
  productId: p.id,
  productName: p.name,
  productSku: p.sku ?? '',
  unitOfMeasure: p.defaultUnit ?? 'pcs',
  quantity: 1,
  unitPrice: p.costPrice ?? 0,
  discountPercent: 0,
  taxPercent: p.taxRate ?? 0,
  notes: '',
});

export type PurchaseInvoiceEditorHandle = {
  save: (confirm: boolean) => void;
  print: () => void;
  isDirty: () => boolean;
};

type Props = {
  bill: SupplierBill | null;          // null → new invoice
  allBills: SupplierBill[];           // for supplier outstanding + price history
  suppliers: Supplier[];
  warehouses: Warehouse[];
  products: Product[];
  purchaseOrders: PurchaseOrder[];
  saving: boolean;
  selectSupplier?: { id: number; nonce: number } | null; // supplier just created from this editor
  initialPurchaseOrderId?: number;                        // new invoice pre-linked to this PO
  onSave: (req: SupplierBillRequest, confirm: boolean) => void;
  onPrint: (draft: SupplierBill) => void;
  onAddSupplier: () => void;
  onRecordPayment: (bill: SupplierBill) => void;
  onRefreshProducts?: () => Promise<unknown> | void;
};

export const PurchaseInvoiceEditor = forwardRef<PurchaseInvoiceEditorHandle, Props>(function PurchaseInvoiceEditor(
  { bill, allBills, suppliers, warehouses, products, purchaseOrders, saving, selectSupplier, initialPurchaseOrderId, onSave, onPrint, onAddSupplier, onRecordPayment, onRefreshProducts },
  ref,
) {
  const { currencyCode } = useCurrency();
  const readOnly = !!bill && bill.status !== 'DRAFT';
  const initial = useMemo(() => (bill ? formFromBill(bill) : blankForm(warehouses[0]?.id)), [bill?.id, bill?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const [form, setForm] = useState<Form>(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [focusedProductId, setFocusedProductId] = useState<number | undefined>();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const openCatalog = (typed = '') => { setCatalogSearch(typed); setCatalogOpen(true); };
  const entryRef = useRef<HTMLInputElement>(null);
  const pendingFocus = useRef<string | null>(null);

  useEffect(() => { setForm(initial); setBaseline(JSON.stringify(initial)); }, [initial]);

  // Default warehouse once warehouses arrive (new invoices only).
  useEffect(() => {
    if (!bill && !form.warehouseId && warehouses[0]) setForm(f => ({ ...f, warehouseId: warehouses[0].id }));
  }, [warehouses]); // eslint-disable-line react-hooks/exhaustive-deps

  // Move focus to a freshly added line's qty cell.
  useEffect(() => {
    if (!pendingFocus.current) return;
    const el = document.getElementById(`pi-qty-${pendingFocus.current}`) as HTMLInputElement | null;
    pendingFocus.current = null;
    el?.focus();
    el?.select();
  }, [form.lines.length]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }));
  const updateLine = (key: string, patch: Partial<Line>) =>
    setForm(f => ({ ...f, lines: f.lines.map(l => (l.key === key ? { ...l, ...patch } : l)) }));
  const removeLine = (key: string) => setForm(f => ({ ...f, lines: f.lines.filter(l => l.key !== key) }));

  const addLines = (lines: Line[], focus = true) => {
    if (lines.length === 0) return;
    setForm(f => {
      // Adding a product that's already on the invoice bumps its qty instead of duplicating it.
      const next = [...f.lines];
      let firstNew: string | null = null;
      for (const l of lines) {
        const dup = l.productId ? next.findIndex(x => x.productId === l.productId) : -1;
        if (dup >= 0) next[dup] = { ...next[dup], quantity: next[dup].quantity + l.quantity };
        else { next.push(l); firstNew ??= l.key; }
      }
      if (focus && firstNew) pendingFocus.current = firstNew;
      return { ...f, lines: next };
    });
    if (lines[0].productId) setFocusedProductId(lines[0].productId);
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const supplier = suppliers.find(s => s.id === form.supplierId);
  const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const totals = useMemo(() => billTotals(form.lines, form.shippingCost), [form.lines, form.shippingCost]);
  const amountPaid = bill?.amountPaid ?? 0;

  const previousOutstanding = useMemo(() => {
    if (!form.supplierId) return 0;
    return allBills
      .filter(b => b.supplierId === form.supplierId && b.status === 'CONFIRMED' && b.id !== bill?.id)
      .reduce((s, b) => s + balanceOf(b), 0);
  }, [allBills, form.supplierId, bill?.id]);
  const thisBalance = readOnly && bill ? balanceOf(bill) : Math.max(0, totals.net - amountPaid);
  const newOutstanding = previousOutstanding + (bill?.status === 'CANCELLED' ? 0 : thisBalance);
  const creditLimit = Number(supplier?.creditLimit) || 0;
  const overCredit = !readOnly && creditLimit > 0 && newOutstanding > creditLimit;

  const billablePOs = useMemo(() => {
    const taken = new Set(
      allBills.filter(b => b.purchaseOrderId && b.status !== 'CANCELLED' && b.id !== bill?.id).map(b => b.purchaseOrderId),
    );
    return purchaseOrders.filter(p => (BILLABLE_PO_STATUSES.includes(p.status) && !taken.has(p.id)) || p.id === form.purchaseOrderId);
  }, [purchaseOrders, allBills, bill?.id, form.purchaseOrderId]);
  const linkedPO = purchaseOrders.find(p => p.id === form.purchaseOrderId);
  const poPendingByProduct = useMemo(() => {
    const m = new Map<number, number>();
    for (const i of linkedPO?.items ?? []) {
      if (i.productId) m.set(i.productId, (m.get(i.productId) ?? 0) + Math.max(0, (i.quantityOrdered || 0) - (i.quantityReceived || 0)));
    }
    return m;
  }, [linkedPO]);

  const priceHistory = useMemo(() => {
    if (!focusedProductId) return [];
    const rows: { billNumber: string; date: string; supplier: string; price: number; qty: number }[] = [];
    for (const b of allBills) {
      if (b.status !== 'CONFIRMED' || b.id === bill?.id) continue;
      for (const i of b.items) {
        if (i.productId === focusedProductId) rows.push({ billNumber: b.billNumber, date: b.billDate, supplier: b.supplierName, price: i.unitPrice, qty: i.quantity });
      }
    }
    return rows.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
  }, [allBills, focusedProductId, bill?.id]);
  const focusedProduct = focusedProductId ? productById.get(focusedProductId) : undefined;

  // ── Field behaviours ──────────────────────────────────────────────────────
  const applyTerms = (terms: string, billDate: string) => {
    const t = PAYMENT_TERMS.find(x => x.value === terms);
    return t ? addDays(billDate, t.days) : undefined;
  };

  const onSupplierChange = (id: number) => {
    const s = suppliers.find(x => x.id === id);
    const terms = normaliseTerms(s?.paymentTerms);
    setForm(f => {
      const due = terms ? applyTerms(terms, f.billDate) : undefined;
      return { ...f, supplierId: id, paymentTerms: terms || f.paymentTerms, dueDate: due ?? f.dueDate };
    });
  };

  const onTermsChange = (terms: string) =>
    setForm(f => ({ ...f, paymentTerms: terms, dueDate: applyTerms(terms, f.billDate) ?? f.dueDate }));

  const onBillDateChange = (d: string) =>
    setForm(f => ({ ...f, billDate: d, dueDate: (f.paymentTerms && applyTerms(f.paymentTerms, d)) || f.dueDate }));

  const onTypeChange = (t: Form['invoiceType']) =>
    setForm(f => ({ ...f, invoiceType: t, purchaseOrderId: undefined, ...(t === 'PO' ? { lines: [], shippingCost: 0 } : {}) }));

  const onPOChange = (id: number) => {
    const po = purchaseOrders.find(p => p.id === id);
    if (!po) { set('purchaseOrderId', undefined); return; }
    const terms = normaliseTerms(po.paymentTerms) || normaliseTerms(suppliers.find(s => s.id === po.supplierId)?.paymentTerms);
    setForm(f => ({
      ...f,
      purchaseOrderId: po.id,
      supplierId: po.supplierId,
      priority: po.priority || f.priority,
      shippingCost: po.shippingCost || 0,
      paymentTerms: terms || f.paymentTerms,
      dueDate: (terms && applyTerms(terms, f.billDate)) || f.dueDate,
      lines: po.items.map(i => ({
        key: newKey(),
        productId: i.productId,
        productName: i.productName,
        productSku: i.productSku ?? '',
        unitOfMeasure: i.unitOfMeasure ?? 'pcs',
        quantity: i.quantityReceived > 0 ? i.quantityReceived : i.quantityOrdered,
        unitPrice: i.unitPrice,
        discountPercent: i.discountPercent,
        taxPercent: i.taxPercent,
        notes: i.notes ?? '',
      })),
    }));
  };

  // A supplier created via "New supplier" is selected once it shows up in the list.
  const consumedNonce = useRef<number | null>(null);
  useEffect(() => {
    if (!selectSupplier || readOnly || consumedNonce.current === selectSupplier.nonce) return;
    if (!suppliers.some(s => s.id === selectSupplier.id)) return;
    consumedNonce.current = selectSupplier.nonce;
    onSupplierChange(selectSupplier.id);
  }, [selectSupplier, suppliers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefill from a purchase order (e.g. "Create Invoice" on a received PO).
  const prefilledPo = useRef(false);
  useEffect(() => {
    if (bill || !initialPurchaseOrderId || prefilledPo.current) return;
    if (!purchaseOrders.some(p => p.id === initialPurchaseOrderId)) return;
    prefilledPo.current = true;
    onTypeChange('PO');
    onPOChange(initialPurchaseOrderId);
  }, [initialPurchaseOrderId, purchaseOrders]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save ──────────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (form.invoiceType === 'PO' && !form.purchaseOrderId) return 'Select the purchase order this invoice is for';
    if (!form.supplierId) return 'Please select a supplier';
    if (!form.warehouseId) return 'Please select the warehouse receiving the stock';
    if (!form.billDate) return 'Invoice date is required';
    if (form.dueDate && form.dueDate < form.billDate) return 'Due date cannot be before the invoice date';
    if (form.lines.length === 0) return 'Add at least one item to the invoice';
    for (const [i, l] of form.lines.entries()) {
      const n = `Line ${i + 1}`;
      if (!l.productName.trim()) return `${n}: item name is required`;
      if (!Number.isInteger(l.quantity) || l.quantity < 1) return `${n}: quantity must be a whole number of at least 1`;
      if (!(l.unitPrice >= 0)) return `${n}: unit price cannot be negative`;
      if (l.discountPercent < 0 || l.discountPercent > 100) return `${n}: discount must be between 0 and 100%`;
      if (l.taxPercent < 0 || l.taxPercent > 100) return `${n}: tax must be between 0 and 100%`;
    }
    if (form.shippingCost < 0) return 'Shipping cost cannot be negative';
    return null;
  };

  const buildRequest = (): SupplierBillRequest => ({
    supplierId: form.supplierId,
    purchaseOrderId: form.invoiceType === 'PO' ? form.purchaseOrderId : undefined,
    invoiceNumber: form.invoiceNumber.trim() || undefined,
    billDate: form.billDate,
    dueDate: form.dueDate || undefined,
    priority: form.priority,
    shippingCost: form.shippingCost || 0,
    warehouseId: form.warehouseId,
    notes: form.notes.trim() || undefined,
    receivedBy: form.receivedBy.trim() || undefined,
    taxCode: bill?.taxCode,
    items: form.lines.map(l => ({
      productId: l.productId,
      productName: l.productName.trim(),
      productSku: l.productSku.trim() || undefined,
      unitOfMeasure: l.unitOfMeasure.trim() || undefined,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPercent: l.discountPercent,
      taxPercent: l.taxPercent,
      notes: l.notes.trim() || undefined,
    })),
  });

  const draftAsBill = (): SupplierBill => ({
    ...(bill ?? ({} as SupplierBill)),
    id: bill?.id ?? 0,
    billNumber: bill?.billNumber ?? 'NEW (unsaved)',
    supplierId: form.supplierId,
    supplierName: supplier?.name ?? '',
    purchaseOrderId: form.purchaseOrderId,
    invoiceNumber: form.invoiceNumber,
    billDate: form.billDate,
    dueDate: form.dueDate || undefined,
    status: bill?.status ?? 'DRAFT',
    paymentStatus: bill?.paymentStatus ?? 'UNPAID',
    amountPaid,
    subtotal: totals.gross,
    discountAmount: totals.discount,
    taxAmount: totals.tax,
    shippingCost: totals.shipping,
    totalAmount: totals.net,
    warehouseId: form.warehouseId,
    priority: form.priority,
    notes: form.notes,
    receivedBy: form.receivedBy,
    createdAt: bill?.createdAt ?? '',
    items: form.lines.map((l, i) => ({
      id: i, billId: bill?.id ?? 0, productId: l.productId, productName: l.productName, productSku: l.productSku,
      unitOfMeasure: l.unitOfMeasure, quantity: l.quantity, unitPrice: l.unitPrice, discountPercent: l.discountPercent,
      taxPercent: l.taxPercent, totalAmount: lineAmounts(l).total, notes: l.notes,
    })),
  });

  const save = (confirm: boolean) => {
    if (readOnly || saving) return;
    const err = validate();
    if (err) { toast.error(err); return; }
    onSave(buildRequest(), confirm);
  };

  const print = () => {
    if (form.lines.length === 0) { toast.error('Nothing to print — add items first'); return; }
    onPrint(readOnly && bill ? bill : draftAsBill());
  };

  useImperativeHandle(ref, () => ({
    save,
    print,
    isDirty: () => !readOnly && JSON.stringify(form) !== baseline,
  }));

  const statusLabel = bill ? statusMeta(displayStatus(bill)) : { label: 'Draft (new)', cls: styles.pillGray };
  const lockedByPO = form.invoiceType === 'PO';

  return (
    <div className={cx(styles.editor, styles.fadeIn)}>
      {readOnly && bill && (
        <div className={cx(styles.notice, styles.noticeInfo)}>
          <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>View only.</strong> This invoice is {statusLabel.label.toLowerCase()} — confirmed and cancelled invoices can’t be edited.
            {bill.status === 'CONFIRMED' && balanceOf(bill) > 0 && (
              <> You can still <button type="button" className={styles.copyBtn} style={{ textDecoration: 'underline', fontWeight: 600 }} onClick={() => onRecordPayment(bill)}>record a payment</button>.</>
            )}
          </div>
        </div>
      )}
      {!readOnly && lockedByPO && (
        <div className={cx(styles.notice, styles.noticeWarn)}>
          <Zap size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Against Purchase Order.</strong> Items, supplier and shipping are copied from the PO. On confirm, any quantity the PO
            hasn’t received yet is received into the selected warehouse — goods already received on the PO are never added twice.
          </div>
        </div>
      )}

      {/* Invoice details — one label-over-control cell per field */}
      <div className={cx(styles.panel, styles.detailsGrid)}>
        <div className={styles.cell}>
          <label className={styles.eyebrow}>Status</label>
          <div><span className={cx(styles.pill, statusLabel.cls)}>{statusLabel.label}</span></div>
        </div>
        <div className={styles.cell}>
          <label className={styles.eyebrow}>Bill No.</label>
          <input className={cx(styles.field, styles.fieldStrong)} readOnly value={bill?.billNumber ?? ''} placeholder="Auto generated" />
        </div>
        <div className={styles.cell}>
          <label className={styles.eyebrow} htmlFor="pi-date">Invoice Date</label>
          <input id="pi-date" type="date" className={styles.field} value={form.billDate} disabled={readOnly} onChange={e => onBillDateChange(e.target.value)} />
        </div>
        <div className={styles.cell}>
          <label className={styles.eyebrow} htmlFor="pi-due">Due Date</label>
          <input id="pi-due" type="date" className={styles.field} value={form.dueDate} min={form.billDate} disabled={readOnly}
            onChange={e => setForm(f => ({ ...f, dueDate: e.target.value, paymentTerms: '' }))} />
        </div>
        <div className={styles.cell}>
          <label className={styles.eyebrow} htmlFor="pi-supinv">Supplier Invoice No.</label>
          <input id="pi-supinv" className={styles.field} value={form.invoiceNumber} readOnly={readOnly} placeholder="e.g. INV-2041"
            onChange={e => set('invoiceNumber', e.target.value)} />
        </div>
        <div className={styles.cell}>
          <label className={styles.eyebrow} htmlFor="pi-terms">Payment Terms</label>
          <div className={styles.selectWrap}>
            <select id="pi-terms" className={cx(styles.field, styles.fieldSelect)} value={form.paymentTerms} disabled={readOnly} onChange={e => onTermsChange(e.target.value)}>
              <option value="">Custom</option>
              {PAYMENT_TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <ChevronDown size={14} />
          </div>
        </div>
        <div className={styles.cell}>
          <label className={styles.eyebrow} htmlFor="pi-priority">Priority</label>
          <div className={styles.selectWrap}>
            <select id="pi-priority" className={cx(styles.field, styles.fieldSelect)} value={form.priority} disabled={readOnly} onChange={e => set('priority', e.target.value)}>
              {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => <option key={p} value={p}>{priorityMeta(p).label}</option>)}
            </select>
            <ChevronDown size={14} />
          </div>
        </div>
        <div className={styles.cell}>
          <label className={styles.eyebrow} htmlFor="pi-type">Invoice Type</label>
          <div className={styles.selectWrap}>
            <select id="pi-type" className={cx(styles.field, styles.fieldSelect)} value={form.invoiceType} disabled={readOnly || !!bill}
              onChange={e => onTypeChange(e.target.value as Form['invoiceType'])}>
              <option value="DIRECT">Direct Purchase</option>
              <option value="PO">Against Purchase Order</option>
            </select>
            <ChevronDown size={14} />
          </div>
        </div>
        {lockedByPO && (
          <div className={styles.cell}>
            <label className={styles.eyebrow} htmlFor="pi-po">Purchase Order</label>
            <div className={styles.selectWrap}>
              <select id="pi-po" className={cx(styles.field, styles.fieldSelect)} value={form.purchaseOrderId ?? ''} disabled={readOnly}
                onChange={e => onPOChange(Number(e.target.value))}>
                <option value="">{billablePOs.length ? 'Select PO…' : 'No open POs'}</option>
                {billablePOs.map(p => <option key={p.id} value={p.id}>{p.poNumber} — {p.supplierName}</option>)}
              </select>
              <ChevronDown size={14} />
            </div>
          </div>
        )}
      </div>

      <div className={styles.editorGrid}>
        {/* ── MAIN COLUMN ── */}
        <div className={styles.mainCol}>
          {/* Supplier + receiving */}
          <div className={cx(styles.panel, styles.partyGrid)}>
            <div className={styles.partyCol}>
              <div className={styles.cardLine} style={{ marginBottom: 10 }}>
                <h3 className={styles.panelTitle}><User size={14} /> Supplier</h3>
                {!readOnly && !lockedByPO && (
                  <button type="button" className={cx(styles.copyBtn, styles.tiny)} style={{ color: 'var(--primary)', fontWeight: 600 }} onClick={onAddSupplier}>
                    <UserPlus size={13} /> New supplier
                  </button>
                )}
              </div>
              <div className={styles.selectWrap}>
                <select className={cx(styles.field, styles.fieldSelect, styles.fieldStrong)} value={form.supplierId || ''} disabled={readOnly || lockedByPO}
                  onChange={e => onSupplierChange(Number(e.target.value))} aria-label="Supplier">
                  <option value="">Select supplier…</option>
                  {suppliers.filter(s => s.isActive !== false || s.id === form.supplierId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown size={14} />
              </div>
              {supplier ? (
                <>
                  <div className={styles.partyFacts}>
                    <div><span className={styles.eyebrow}>Contact</span><span>{supplier.contactPerson || '—'}</span></div>
                    <div><span className={styles.eyebrow}>Phone</span><span>{supplier.phone || '—'}</span></div>
                    <div><span className={styles.eyebrow}>Email</span><span style={{ overflowWrap: 'anywhere' }}>{supplier.email || '—'}</span></div>
                    <div><span className={styles.eyebrow}>TRN / Tax ID</span><span>{supplier.taxId || '—'}</span></div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span className={styles.eyebrow}>Address</span>
                      <span>{[supplier.address, supplier.city, supplier.country].filter(Boolean).join(', ') || '—'}</span>
                    </div>
                  </div>
                  {overCredit && (
                    <div className={styles.alert}>
                      <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>
                        <strong>Credit limit warning:</strong> outstanding to this supplier would become{' '}
                        <CurrencyValue amount={newOutstanding} options={fmt2} />, above the agreed limit of{' '}
                        <CurrencyValue amount={creditLimit} options={fmt2} />.
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.partyEmpty} style={{ marginTop: 12 }}>
                  <User size={18} style={{ opacity: 0.5 }} />
                  {lockedByPO ? 'Pick a purchase order — its supplier is filled in automatically.' : 'Choose who you’re buying from to see their details.'}
                </div>
              )}
            </div>

            <div className={styles.partyCol}>
              <h3 className={styles.panelTitle} style={{ marginBottom: 10 }}><Truck size={14} /> Receiving</h3>
              <div className={styles.cell} style={{ marginBottom: 12 }}>
                <label className={styles.eyebrow} htmlFor="pi-wh">Warehouse *</label>
                <div className={styles.selectWrap}>
                  <select id="pi-wh" className={cx(styles.field, styles.fieldSelect)} value={form.warehouseId ?? ''} disabled={readOnly}
                    onChange={e => set('warehouseId', e.target.value ? Number(e.target.value) : undefined)}>
                    <option value="">Select warehouse…</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                  <ChevronDown size={14} />
                </div>
              </div>
              <div className={styles.cell}>
                <label className={styles.eyebrow} htmlFor="pi-recv">Received By</label>
                <input id="pi-recv" className={styles.field} value={form.receivedBy} readOnly={readOnly} placeholder="Staff member name"
                  onChange={e => set('receivedBy', e.target.value)} />
              </div>
              <p className={cx(styles.tiny, styles.muted)} style={{ marginTop: 10, lineHeight: 1.5 }}>
                {form.invoiceType === 'DIRECT'
                  ? 'Stock for every catalog item on this invoice is added to this warehouse when the invoice is confirmed.'
                  : 'Any PO quantity not yet received is added to this warehouse when the invoice is confirmed.'}
              </p>
            </div>
          </div>

          {/* Items */}
          <div className={cx(styles.panel, styles.panelPad)}>
            <div className={styles.itemsHead}>
              <h3 className={styles.panelTitle}>
                <FileText size={14} /> Invoice Items
                {!readOnly && !lockedByPO && <span className={styles.fastEntry}><Zap size={10} /> Fast Entry</span>}
              </h3>
              {!readOnly && !lockedByPO && (
                <Button size="sm" onClick={() => openCatalog()}><Plus className="h-4 w-4" /> Select from Catalog</Button>
              )}
            </div>

            <div className={styles.gridBox}>
              <div className={styles.gridScroll}>
                <table className={styles.lineTable}>
                  <thead>
                    <tr>
                      <th className={styles.center} style={{ width: 36 }}>#</th>
                      <th style={{ minWidth: 280 }}>Item / Description</th>
                      <th className={styles.center} style={{ width: 80 }}>Unit</th>
                      <th className={styles.center} style={{ width: 80 }}>Qty</th>
                      <th className={styles.right} style={{ width: 110 }}>Price</th>
                      <th className={styles.right} style={{ width: 80 }}>Disc %</th>
                      <th className={styles.right} style={{ width: 80 }}>Tax %</th>
                      <th className={styles.right} style={{ width: 120 }}>Line Total</th>
                      <th style={{ width: 40 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {form.lines.map((l, idx) => {
                      const a = lineAmounts(l);
                      const p = l.productId ? productById.get(l.productId) : undefined;
                      const lockItem = readOnly || lockedByPO;
                      return (
                        <tr key={l.key} onFocus={() => l.productId && setFocusedProductId(l.productId)}>
                          <td className={cx(styles.center, styles.muted)}>{idx + 1}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <Thumb product={p} size={40} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                            {l.productId ? (
                              <div className={styles.lineName}>{l.productName}</div>
                            ) : (
                              <input className={cx(styles.cellInput, styles.lineName)} value={l.productName} placeholder="Item name *"
                                disabled={lockItem} onChange={e => updateLine(l.key, { productName: e.target.value })} />
                            )}
                            <div className={styles.lineSub}>
                              {l.productSku && <span className={styles.mono}>{l.productSku}</span>}
                              {!l.productId && <span className={cx(styles.pill, styles.pillGray)} style={{ fontSize: 11, padding: '0 6px' }}>Custom item — no stock</span>}
                              {p && <span>In stock: {p.totalStock ?? 0} {p.defaultUnit ?? ''}</span>}
                            </div>
                            <input className={styles.cellInput} style={{ fontWeight: 400, fontSize: 13 }} value={l.notes} disabled={readOnly}
                              placeholder={readOnly ? '' : 'Add a line note…'} onChange={e => updateLine(l.key, { notes: e.target.value })} />
                            </div>
                            </div>
                          </td>
                          <td>
                            <input className={cx(styles.cellInput, styles.center)} value={l.unitOfMeasure} disabled={lockItem}
                              onChange={e => updateLine(l.key, { unitOfMeasure: e.target.value })} />
                          </td>
                          <td>
                            <input id={`pi-qty-${l.key}`} type="number" min={1} step={1} className={cx(styles.cellInput, styles.center)}
                              value={l.quantity || ''} placeholder="0" disabled={lockItem}
                              onChange={e => updateLine(l.key, { quantity: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById(`pi-price-${l.key}`)?.focus(); } }} />
                          </td>
                          <td>
                            <input id={`pi-price-${l.key}`} type="number" min={0} step="0.01" className={cx(styles.cellInput, styles.right)}
                              value={l.unitPrice === 0 ? '' : l.unitPrice} placeholder="0.00" disabled={readOnly}
                              onChange={e => updateLine(l.key, { unitPrice: Math.max(0, Number(e.target.value) || 0) })}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); entryRef.current?.focus(); } }} />
                          </td>
                          <td>
                            <input type="number" min={0} max={100} step="0.01" className={cx(styles.cellInput, styles.right)}
                              value={l.discountPercent === 0 ? '' : l.discountPercent} placeholder="0" disabled={readOnly}
                              onChange={e => updateLine(l.key, { discountPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} />
                          </td>
                          <td>
                            <input type="number" min={0} max={100} step="0.01" className={cx(styles.cellInput, styles.right)}
                              value={l.taxPercent === 0 ? '' : l.taxPercent} placeholder="0" disabled={readOnly}
                              onChange={e => updateLine(l.key, { taxPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} />
                          </td>
                          <td className={styles.lineTotal}>
                            {money(a.total)}
                            {a.discount > 0 && <div className={cx(styles.tiny, styles.danger)} style={{ fontWeight: 500 }}>− {money(a.discount)}</div>}
                          </td>
                          <td className={styles.center}>
                            {!lockItem && (
                              <button type="button" className={styles.removeBtn} onClick={() => removeLine(l.key)} title="Remove line"><Trash2 size={15} /></button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {!readOnly && !lockedByPO && (
                      <tr>
                        <td className={cx(styles.center, styles.muted)}>{form.lines.length + 1}</td>
                        <td colSpan={8}>
                          <FastEntry inputRef={entryRef} products={products} onPick={p => addLines([lineFromProduct(p)])}
                            onCustom={name => addLines([customLine(name)])}
                            onBrowse={openCatalog} />
                        </td>
                      </tr>
                    )}
                    {form.lines.length === 0 && (readOnly || lockedByPO) && (
                      <tr><td colSpan={9} className={styles.empty}>{lockedByPO && !readOnly ? 'Select a purchase order to load its items.' : 'No items.'}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className={styles.gridFoot}>
                <span>Lines: <b>{form.lines.length}</b></span>
                <span>Total qty: <b>{totals.qty}</b></span>
                <span>Gross: <b>{money(totals.gross)}</b></span>
                {!readOnly && <span style={{ marginLeft: 'auto' }}>Tip: type to search · Enter adds · Enter in Price jumps back here</span>}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className={styles.notesGrid}>
            <div className={cx(styles.panel, styles.panelPad)}>
              <h3 className={styles.panelTitle} style={{ marginBottom: 8 }}><FileText size={14} /> Notes</h3>
              <label className={cx(styles.tiny, styles.muted)} htmlFor="pi-notes" style={{ display: 'block', marginBottom: 4 }}>Prints on the purchase invoice</label>
              <textarea id="pi-notes" className={styles.textarea} rows={3} value={form.notes} readOnly={readOnly}
                placeholder="Delivery remarks, supplier reference, etc." onChange={e => set('notes', e.target.value)} />
            </div>
            <div className={cx(styles.panel, styles.panelPad)}>
              <h3 className={styles.panelTitle} style={{ marginBottom: 8 }}><Info size={14} /> What happens on Confirm</h3>
              <ul className={cx(styles.tiny, styles.muted)} style={{ margin: 0, paddingLeft: 16, lineHeight: 1.7 }}>
                <li>The invoice is locked and posted to Accounts Payable.</li>
                <li>{form.invoiceType === 'DIRECT' ? 'Stock is added to the selected warehouse at the line price.' : 'Pending PO quantity is received into the warehouse (already-received goods are not added again).'}</li>
                <li>You can then record full or partial payments against it.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── RIGHT RAIL ── */}
        <div className={cx(styles.mainCol, styles.railSticky)} style={{ gap: 14 }}>
          <div className={cx(styles.panel, styles.panelPad)}>
            <h3 className={styles.panelTitle} style={{ marginBottom: 12 }}>Totals & Payment Summary</h3>
            <div className={styles.sumRow}><span>Subtotal</span><CurrencyValue amount={totals.gross} options={fmt2} /></div>
            <div className={styles.sumRow}><span>Line Discounts</span><span className={styles.danger}>− <CurrencyValue amount={totals.discount} options={fmt2} /></span></div>
            <div className={styles.sumRow}><span>Taxable Amount</span><CurrencyValue amount={totals.taxable} options={fmt2} /></div>
            <div className={styles.sumRow}><span>Total Tax (VAT)</span><CurrencyValue amount={totals.tax} options={fmt2} /></div>
            <div className={styles.sumRow}>
              <span>Shipping / Freight</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <CurrencyGlyph />
                <input type="number" min={0} step="0.01" className={styles.inlineNum} value={form.shippingCost || ''} placeholder="0.00"
                  disabled={readOnly} onChange={e => set('shippingCost', Math.max(0, Number(e.target.value) || 0))} aria-label="Shipping cost" />
              </span>
            </div>
            <div className={styles.sumTotal}><span>Net Invoice Amount</span><CurrencyValue amount={totals.net} options={fmt2} /></div>

            <div className={styles.sumDivider} />
            {form.supplierId ? (
              <div className={styles.sumRow}><span>Previous Outstanding</span><CurrencyValue amount={previousOutstanding} options={fmt2} /></div>
            ) : null}
            <div className={styles.sumRow}><span>This Invoice</span><CurrencyValue amount={totals.net} options={fmt2} /></div>
            {amountPaid > 0 && (
              <div className={styles.sumRow}><span>Paid on this Invoice</span><span className={styles.success}>− <CurrencyValue amount={amountPaid} options={fmt2} /></span></div>
            )}
            {form.supplierId ? (
              <div className={styles.sumTotal} style={{ color: newOutstanding > 0 ? '#dc2626' : undefined, fontSize: 16 }}>
                <span>Total Payable to Supplier</span><CurrencyValue amount={newOutstanding} options={fmt2} />
              </div>
            ) : (
              <p className={cx(styles.tiny, styles.muted)} style={{ marginTop: 6 }}>Select a supplier to see what you owe them.</p>
            )}
          </div>

          <div className={cx(styles.panel, styles.panelPad)}>
            <h3 className={styles.panelTitle} style={{ marginBottom: 10 }}><Package size={14} /> Stock After Receipt</h3>
            {form.warehouseId && <div className={cx(styles.tiny, styles.muted)} style={{ margin: '-4px 0 8px' }}>In {warehouses.find(w => w.id === form.warehouseId)?.name ?? 'selected warehouse'}</div>}
            <div className={styles.railScroll}>
              {form.lines.some(l => l.productId) ? form.lines.filter(l => l.productId).map(l => {
                const p = productById.get(l.productId!);
                const whStock = p?.stockByWarehouse?.find(w => w.warehouseId === form.warehouseId);
                const current = whStock ? whStock.currentStock : form.warehouseId && p?.stockByWarehouse?.length ? 0 : p?.totalStock ?? 0;
                const pending = !bill || bill.status === 'DRAFT';
                const incoming = !pending ? 0 : form.invoiceType === 'DIRECT' ? l.quantity : poPendingByProduct.get(l.productId!) ?? 0;
                const adds = incoming > 0;
                const tone = p?.stockStatus === 'OUT_OF_STOCK' ? styles.stockOut : p?.stockStatus === 'LOW_STOCK' ? styles.stockLow : styles.stockOk;
                return (
                  <div key={l.key} className={cx(styles.stockCard, tone)}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.productName}</div>
                    <div className={styles.cardLine} style={{ marginTop: 3 }}>
                      <span>Now: <b>{current}</b></span>
                      {adds ? <span>+{incoming} → <b>{current + incoming}</b> {p?.defaultUnit ?? ''}</span> : <span className={styles.muted}>{form.invoiceType === 'PO' && pending ? 'already received on PO' : 'no change'}</span>}
                    </div>
                    {p?.stockStatus === 'LOW_STOCK' && <div style={{ marginTop: 2, fontWeight: 600, color: '#b45309' }}>Low stock item</div>}
                    {p?.stockStatus === 'OUT_OF_STOCK' && <div style={{ marginTop: 2, fontWeight: 600, color: '#b91c1c' }}>Currently out of stock</div>}
                  </div>
                );
              }) : (
                <div className={styles.empty} style={{ padding: '14px 0', fontSize: 13 }}>Add catalog items to preview stock.</div>
              )}
            </div>
          </div>

          <div className={cx(styles.panel, styles.panelPad)}>
            <h3 className={styles.panelTitle} style={{ marginBottom: 10 }}><History size={14} /> Purchase Price History</h3>
            {focusedProduct ? (
              <>
                <div className={cx(styles.tiny, styles.muted)} style={{ marginBottom: 8 }}>
                  {focusedProduct.name} · catalog cost <b style={{ color: 'var(--foreground)' }}>{money(focusedProduct.costPrice ?? 0)}</b>
                </div>
                {priceHistory.length ? priceHistory.map((h, i) => (
                  <div key={i} className={styles.infoRow}>
                    <span className={styles.infoLabel}>
                      {displayDate(h.date)}
                      <span style={{ display: 'block', fontSize: 12 }}>{h.supplier} · {h.billNumber}</span>
                    </span>
                    <span className={cx(styles.infoValue, styles.num)}>{money(h.price)}<span className={styles.muted} style={{ display: 'block', fontSize: 12, fontWeight: 400 }}>× {h.qty}</span></span>
                  </div>
                )) : <div className={styles.empty} style={{ padding: '10px 0', fontSize: 13 }}>No earlier confirmed purchases of this item.</div>}
              </>
            ) : (
              <div className={styles.empty} style={{ padding: '14px 0', fontSize: 13 }}>Click an item line to see what you paid for it before.</div>
            )}
          </div>

          {!readOnly && form.lines.length > 0 && !validate() && (
            <div className={cx(styles.notice)} style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' }}>
              <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 1 }} /> Ready to save.
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className={styles.actionBar}>
        <div className={styles.actionBarMeta}>
          <span className={cx(styles.pill, statusLabel.cls)}>{statusLabel.label}</span>
          <span>Bill No: <strong>{bill?.billNumber ?? '—'}</strong></span>
          <span>Net: <strong><CurrencyValue amount={totals.net} options={fmt2} /></strong> <span className={styles.muted}>({currencyCode})</span></span>
        </div>
        <div className={styles.headerActions}>
          {!readOnly && (
            <>
              <Button variant="outline" size="sm" disabled={saving} onClick={() => save(false)}>Save Draft</Button>
              <Button size="sm" disabled={saving} onClick={() => save(true)}>
                <CheckCircle2 className="h-4 w-4" /> {bill ? 'Save & Confirm' : 'Confirm'}
              </Button>
            </>
          )}
          {readOnly && bill?.status === 'CONFIRMED' && balanceOf(bill) > 0 && (
            <Button size="sm" onClick={() => onRecordPayment(bill)}>Record Payment</Button>
          )}
          <Button variant="outline" size="sm" onClick={print}>Print</Button>
        </div>
      </div>

      <ProductSelector open={catalogOpen} onOpenChange={setCatalogOpen} products={products} target="Invoice"
        initialSearch={catalogSearch} warehouseId={form.warehouseId} onRefresh={onRefreshProducts}
        onAdd={(p, e) => addLines([{ ...lineFromProduct(p), quantity: e.quantity, unitPrice: e.unitPrice, discountPercent: e.discountPercent }])} />
    </div>
  );
});
