import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ChevronDown, FileText, History, Info, MapPin, Package, Plus, Send, Trash2, User, UserPlus, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { CurrencyGlyph, CurrencyValue, useCurrency } from '../../utils/currency';
import type { PurchaseOrder, PurchaseOrderRequest, Supplier } from '../../utils/supabase/purchase-service';
import type { SupplierBill } from '../../utils/supabase/supplier-bill-service';
import { getTaxDefaults, purchaseDiscountFor, purchaseTaxFor, type TaxDefaults } from '../../utils/supabase/tax-defaults-service';
import type { Product } from '../../utils/supabase/products-service';
import styles from './PurchaseInvoice.module.css';
import { FastEntry, ProductSelector, Thumb } from './lineEntry';
import { cx } from './purchaseUi';
import {
  PAYMENT_TERMS, addDays, balanceOf, billTotals, displayDate, lineAmounts, money, normaliseTerms, priorityMeta, todayIso,
} from './purchaseInvoiceUtils';
import { isoDay, poStatusMeta } from './purchaseOrderUtils';

const fmt2 = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
let keySeq = 0;
const newKey = () => `o${Date.now().toString(36)}${(keySeq++).toString(36)}`;

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
  supplierId: number;
  orderDate: string;
  expectedDeliveryDate: string;
  paymentTerms: string;
  priority: string;
  deliveryAddress: string;
  notes: string;
  shippingCost: number;
  lines: Line[];
};

const blankForm = (deliveryAddress: string): Form => ({
  supplierId: 0,
  orderDate: todayIso(),
  expectedDeliveryDate: addDays(todayIso(), 7),
  paymentTerms: '',
  priority: 'MEDIUM',
  deliveryAddress,
  notes: '',
  shippingCost: 0,
  lines: [],
});

const formFromOrder = (o: PurchaseOrder): Form => ({
  supplierId: o.supplierId,
  orderDate: isoDay(o.orderDate) || todayIso(),
  expectedDeliveryDate: isoDay(o.expectedDeliveryDate),
  paymentTerms: normaliseTerms(o.paymentTerms) || o.paymentTerms || '',
  priority: (o.priority || 'MEDIUM').toUpperCase(),
  deliveryAddress: o.deliveryAddress ?? '',
  notes: o.notes ?? '',
  shippingCost: o.shippingCost || 0,
  lines: o.items.map(i => ({
    key: newKey(),
    productId: i.productId,
    productName: i.productName,
    productSku: i.productSku ?? '',
    unitOfMeasure: i.unitOfMeasure ?? 'pcs',
    quantity: i.quantityOrdered,
    unitPrice: i.unitPrice,
    discountPercent: i.discountPercent,
    taxPercent: i.taxPercent,
    notes: i.notes ?? '',
  })),
});

// BillBull: the product's purchase discount and the branch purchase tax are pre-filled.
const lineFromProduct = (p: Product, tax: TaxDefaults | null = null): Line => ({
  key: newKey(),
  productId: p.id,
  productName: p.name,
  productSku: p.sku ?? '',
  unitOfMeasure: p.defaultUnit ?? 'pcs',
  quantity: 1,
  unitPrice: p.costPrice ?? 0,
  discountPercent: purchaseDiscountFor(p),
  taxPercent: purchaseTaxFor(p, tax),
  notes: '',
});

const customLine = (name: string): Line => ({
  key: newKey(), productName: name, productSku: '', unitOfMeasure: 'pcs', quantity: 1, unitPrice: 0, discountPercent: 0, taxPercent: 0, notes: '',
});

export type PurchaseOrderEditorHandle = {
  save: (submit: boolean) => void;
  print: () => void;
  isDirty: () => boolean;
};

type Props = {
  order: PurchaseOrder | null;          // null → new order
  allOrders: PurchaseOrder[];
  allBills: SupplierBill[];
  suppliers: Supplier[];
  products: Product[];
  defaultDeliveryAddress: string;
  saving: boolean;
  createdBy?: string;
  selectSupplier?: { id: number; nonce: number } | null;
  onSave: (req: PurchaseOrderRequest, submit: boolean) => void;
  onPrint: (draft: PurchaseOrder) => void;
  onAddSupplier: () => void;
  onRefreshProducts?: () => Promise<unknown> | void;
};

export const PurchaseOrderEditor = forwardRef<PurchaseOrderEditorHandle, Props>(function PurchaseOrderEditor(
  { order, allOrders, allBills, suppliers, products, defaultDeliveryAddress, saving, createdBy, selectSupplier, onSave, onPrint, onAddSupplier, onRefreshProducts },
  ref,
) {
  const { currencyCode } = useCurrency();
  const readOnly = !!order && !(order.status === 'DRAFT' || order.status === 'PENDING_APPROVAL');
  const initial = useMemo(() => (order ? formFromOrder(order) : blankForm(defaultDeliveryAddress)), [order?.id, order?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const [form, setForm] = useState<Form>(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [focusedProductId, setFocusedProductId] = useState<number | undefined>();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const openCatalog = (typed = '') => { setCatalogSearch(typed); setCatalogOpen(true); };
  const entryRef = useRef<HTMLInputElement>(null);
  const pendingFocus = useRef<string | null>(null);

  useEffect(() => { setForm(initial); setBaseline(JSON.stringify(initial)); }, [initial]);

  useEffect(() => {
    if (!pendingFocus.current) return;
    const el = document.getElementById(`po-qty-${pendingFocus.current}`) as HTMLInputElement | null;
    pendingFocus.current = null;
    el?.focus();
    el?.select();
  }, [form.lines.length]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }));
  const updateLine = (key: string, patch: Partial<Line>) =>
    setForm(f => ({ ...f, lines: f.lines.map(l => (l.key === key ? { ...l, ...patch } : l)) }));
  const removeLine = (key: string) => setForm(f => ({ ...f, lines: f.lines.filter(l => l.key !== key) }));

  const addLines = (lines: Line[]) => {
    if (lines.length === 0) return;
    setForm(f => {
      const next = [...f.lines];
      let firstNew: string | null = null;
      for (const l of lines) {
        const dup = l.productId ? next.findIndex(x => x.productId === l.productId) : -1;
        if (dup >= 0) next[dup] = { ...next[dup], quantity: next[dup].quantity + l.quantity };
        else { next.push(l); firstNew ??= l.key; }
      }
      if (firstNew) pendingFocus.current = firstNew;
      return { ...f, lines: next };
    });
    if (lines[0].productId) setFocusedProductId(lines[0].productId);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const supplier = suppliers.find(s => s.id === form.supplierId);
  const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  // Branch tax policy (Settings › Tax Configuration): not VAT registered → no tax on purchases.
  const [taxDefaults, setTaxDefaults] = useState<TaxDefaults | null>(null);
  useEffect(() => { getTaxDefaults().then(setTaxDefaults).catch(() => setTaxDefaults(null)); }, []);
  const noTax = taxDefaults ? !taxDefaults.vatRegistered : false;
  const totals = useMemo(() => billTotals(form.lines, form.shippingCost), [form.lines, form.shippingCost]);

  // Quantity already on other open orders (not yet received) per product.
  const onOrder = useMemo(() => {
    const m = new Map<number, number>();
    for (const o of allOrders) {
      if (o.id === order?.id || !['APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(o.status)) continue;
      for (const i of o.items) {
        if (!i.productId) continue;
        m.set(i.productId, (m.get(i.productId) ?? 0) + Math.max(0, i.quantityOrdered - i.quantityReceived));
      }
    }
    return m;
  }, [allOrders, order?.id]);

  // What we already owe this supplier on confirmed invoices (credit purchases not yet paid).
  const supplierOutstanding = useMemo(
    () => allBills.filter(b => b.supplierId === form.supplierId && b.status === 'CONFIRMED').reduce((s, b) => s + balanceOf(b), 0),
    [allBills, form.supplierId],
  );

  const supplierOpenOrders = useMemo(
    () => allOrders.filter(o => o.supplierId === form.supplierId && o.id !== order?.id && ['PENDING_APPROVAL', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(o.status)),
    [allOrders, form.supplierId, order?.id],
  );

  const priceHistory = useMemo(() => {
    if (!focusedProductId) return [];
    const rows: { doc: string; date: string; supplier: string; price: number; qty: number }[] = [];
    for (const b of allBills) {
      if (b.status !== 'CONFIRMED') continue;
      for (const i of b.items) if (i.productId === focusedProductId) rows.push({ doc: b.billNumber, date: b.billDate, supplier: b.supplierName, price: i.unitPrice, qty: i.quantity });
    }
    for (const o of allOrders) {
      if (o.id === order?.id || !['ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(o.status)) continue;
      for (const i of o.items) if (i.productId === focusedProductId) rows.push({ doc: o.poNumber, date: isoDay(o.orderDate), supplier: o.supplierName, price: i.unitPrice, qty: i.quantityOrdered });
    }
    return rows.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
  }, [allBills, allOrders, focusedProductId, order?.id]);
  const focusedProduct = focusedProductId ? productById.get(focusedProductId) : undefined;

  // ── Field behaviours ──────────────────────────────────────────────────────
  const onSupplierChange = (id: number) => {
    const s = suppliers.find(x => x.id === id);
    const terms = normaliseTerms(s?.paymentTerms);
    setForm(f => ({ ...f, supplierId: id, paymentTerms: terms || f.paymentTerms }));
  };

  const consumedNonce = useRef<number | null>(null);
  useEffect(() => {
    if (!selectSupplier || readOnly || consumedNonce.current === selectSupplier.nonce) return;
    if (!suppliers.some(s => s.id === selectSupplier.id)) return;
    consumedNonce.current = selectSupplier.nonce;
    onSupplierChange(selectSupplier.id);
  }, [selectSupplier, suppliers]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save ──────────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!form.supplierId) return 'Please select a supplier';
    if (!form.orderDate) return 'Order date is required';
    if (form.expectedDeliveryDate && form.expectedDeliveryDate < form.orderDate) return 'Expected delivery cannot be before the order date';
    if (form.lines.length === 0) return 'Add at least one item to the order';
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

  const buildRequest = (): PurchaseOrderRequest => ({
    supplierId: form.supplierId,
    orderDate: form.orderDate,
    expectedDeliveryDate: form.expectedDeliveryDate || undefined,
    priority: form.priority,
    paymentTerms: form.paymentTerms || supplier?.paymentTerms || undefined,
    deliveryAddress: form.deliveryAddress.trim() || undefined,
    notes: form.notes.trim() || undefined,
    createdBy: order?.createdBy || createdBy,
    shippingCost: form.shippingCost || 0,
    items: form.lines.map(l => ({
      productId: l.productId,
      productName: l.productName.trim(),
      productSku: l.productSku.trim() || undefined,
      unitOfMeasure: l.unitOfMeasure.trim() || undefined,
      quantityOrdered: l.quantity,
      unitPrice: l.unitPrice,
      discountPercent: l.discountPercent,
      taxPercent: l.taxPercent,
      notes: l.notes.trim() || undefined,
    })),
  });

  const draftAsOrder = (): PurchaseOrder => ({
    ...(order ?? ({} as PurchaseOrder)),
    id: order?.id ?? 0,
    poNumber: order?.poNumber ?? 'NEW (unsaved)',
    supplierId: form.supplierId,
    supplierName: supplier?.name ?? '',
    orderDate: form.orderDate,
    expectedDeliveryDate: form.expectedDeliveryDate || undefined,
    status: order?.status ?? 'DRAFT',
    priority: form.priority as PurchaseOrder['priority'],
    subtotal: totals.gross,
    discountAmount: totals.discount,
    taxAmount: totals.tax,
    shippingCost: totals.shipping,
    totalAmount: totals.net,
    paymentTerms: form.paymentTerms,
    deliveryAddress: form.deliveryAddress,
    notes: form.notes,
    createdBy: order?.createdBy ?? createdBy,
    createdAt: order?.createdAt ?? '',
    items: form.lines.map((l, i) => ({
      id: i, purchaseOrderId: order?.id ?? 0, productId: l.productId, productName: l.productName, productSku: l.productSku,
      unitOfMeasure: l.unitOfMeasure, quantityOrdered: l.quantity, quantityReceived: 0, unitPrice: l.unitPrice,
      discountPercent: l.discountPercent, taxPercent: l.taxPercent, totalAmount: lineAmounts(l).total, notes: l.notes,
    })),
  });

  const save = (submit: boolean) => {
    if (readOnly || saving) return;
    const err = validate();
    if (err) { toast.error(err); return; }
    onSave(buildRequest(), submit);
  };

  const print = () => {
    if (form.lines.length === 0) { toast.error('Nothing to print — add items first'); return; }
    onPrint(readOnly && order ? order : draftAsOrder());
  };

  useImperativeHandle(ref, () => ({ save, print, isDirty: () => !readOnly && JSON.stringify(form) !== baseline }));

  const status = order ? poStatusMeta(order.status) : { label: 'Draft (new)', cls: styles.pillGray };
  const canSubmit = !order || order.status === 'DRAFT';

  return (
    <div className={cx(styles.editor, styles.fadeIn)}>
      {readOnly && order && (
        <div className={cx(styles.notice, styles.noticeInfo)}>
          <Info size={15} style={{ flexShrink: 0, marginTop: 2 }} />
          <div><strong>View only.</strong> This order is {status.label.toLowerCase()} — only draft and pending orders can be edited.</div>
        </div>
      )}
      {!readOnly && order?.status === 'PENDING_APPROVAL' && (
        <div className={cx(styles.notice, styles.noticeWarn)}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>This order is <strong>awaiting approval</strong>. Saving changes keeps it in the approval queue.</div>
        </div>
      )}

      {/* Order details */}
      <div className={cx(styles.panel, styles.detailsGrid)}>
        <div className={styles.cell}>
          <label className={styles.eyebrow}>Status</label>
          <div><span className={cx(styles.pill, status.cls)}>{status.label}</span></div>
        </div>
        <div className={styles.cell}>
          <label className={styles.eyebrow}>PO No.</label>
          <input className={cx(styles.field, styles.fieldStrong)} readOnly value={order?.poNumber ?? ''} placeholder="Auto generated" />
        </div>
        <div className={styles.cell}>
          <label className={styles.eyebrow} htmlFor="po-date">Order Date</label>
          <input id="po-date" type="date" className={styles.field} value={form.orderDate} disabled={readOnly} onChange={e => set('orderDate', e.target.value)} />
        </div>
        <div className={styles.cell}>
          <label className={styles.eyebrow} htmlFor="po-eta">Expected Delivery</label>
          <input id="po-eta" type="date" className={styles.field} value={form.expectedDeliveryDate} min={form.orderDate} disabled={readOnly}
            onChange={e => set('expectedDeliveryDate', e.target.value)} />
        </div>
        <div className={styles.cell}>
          <label className={styles.eyebrow} htmlFor="po-terms">Payment Terms</label>
          <div className={styles.selectWrap}>
            <select id="po-terms" className={cx(styles.field, styles.fieldSelect)} value={form.paymentTerms} disabled={readOnly} onChange={e => set('paymentTerms', e.target.value)}>
              <option value="">{form.paymentTerms && !PAYMENT_TERMS.some(t => t.value === form.paymentTerms) ? form.paymentTerms : 'Select terms'}</option>
              {PAYMENT_TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <ChevronDown size={14} />
          </div>
        </div>
        <div className={styles.cell}>
          <label className={styles.eyebrow} htmlFor="po-priority">Priority</label>
          <div className={styles.selectWrap}>
            <select id="po-priority" className={cx(styles.field, styles.fieldSelect)} value={form.priority} disabled={readOnly} onChange={e => set('priority', e.target.value)}>
              {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => <option key={p} value={p}>{priorityMeta(p).label}</option>)}
            </select>
            <ChevronDown size={14} />
          </div>
        </div>
        <div className={styles.cell}>
          <label className={styles.eyebrow}>Prepared By</label>
          <input className={styles.field} readOnly value={order?.createdBy || createdBy || ''} placeholder="—" />
        </div>
        <div className={styles.cell}>
          <label className={styles.eyebrow}>Lead Time</label>
          <input className={styles.field} readOnly
            value={form.expectedDeliveryDate && form.orderDate
              ? `${Math.max(0, Math.round((new Date(form.expectedDeliveryDate).getTime() - new Date(form.orderDate).getTime()) / 86400000))} days`
              : '—'} />
        </div>
      </div>

      <div className={styles.editorGrid}>
        <div className={styles.mainCol}>
          {/* Supplier + delivery */}
          <div className={cx(styles.panel, styles.partyGrid)}>
            <div className={styles.partyCol}>
              <div className={styles.cardLine} style={{ marginBottom: 10 }}>
                <h3 className={styles.panelTitle}><User size={14} /> Supplier</h3>
                {!readOnly && (
                  <button type="button" className={cx(styles.copyBtn, styles.tiny)} style={{ color: 'var(--primary)', fontWeight: 600 }} onClick={onAddSupplier}>
                    <UserPlus size={13} /> New supplier
                  </button>
                )}
              </div>
              <div className={styles.selectWrap}>
                <select className={cx(styles.field, styles.fieldSelect, styles.fieldStrong)} value={form.supplierId || ''} disabled={readOnly}
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
                  </div>
                  {supplierOpenOrders.length > 0 && (
                    <div className={styles.alert} style={{ background: '#eff6ff', color: '#1e40af' }}>
                      <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>
                        {supplierOpenOrders.length} other open order{supplierOpenOrders.length === 1 ? '' : 's'} with this supplier:{' '}
                        {supplierOpenOrders.slice(0, 3).map(o => o.poNumber).join(', ')}{supplierOpenOrders.length > 3 ? '…' : ''}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.partyEmpty} style={{ marginTop: 12 }}>
                  <User size={18} style={{ opacity: 0.5 }} /> Choose who you’re ordering from.
                </div>
              )}
            </div>
            <div className={styles.partyCol}>
              <h3 className={styles.panelTitle} style={{ marginBottom: 10 }}><MapPin size={14} /> Deliver To</h3>
              <textarea className={styles.textarea} rows={4} value={form.deliveryAddress} readOnly={readOnly}
                placeholder="Branch / warehouse address the supplier should deliver to" onChange={e => set('deliveryAddress', e.target.value)} />
              <p className={cx(styles.tiny, styles.muted)} style={{ marginTop: 8, lineHeight: 1.5 }}>
                Stock is added only when goods are received against this order — you choose the warehouse at that point.
              </p>
            </div>
          </div>

          {/* Items */}
          <div className={cx(styles.panel, styles.panelPad)}>
            <div className={styles.itemsHead}>
              <h3 className={styles.panelTitle}>
                <FileText size={14} /> Order Items
                {!readOnly && <span className={styles.fastEntry}><Zap size={10} /> Fast Entry</span>}
              </h3>
              {!readOnly && <Button size="sm" onClick={() => openCatalog()}><Plus className="h-4 w-4" /> Select from Catalog</Button>}
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
                      return (
                        <tr key={l.key} onFocus={() => l.productId && setFocusedProductId(l.productId)}>
                          <td className={cx(styles.center, styles.muted)}>{idx + 1}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <Thumb product={p} size={40} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                            {l.productId
                              ? <div className={styles.lineName}>{l.productName}</div>
                              : <input className={cx(styles.cellInput, styles.lineName)} value={l.productName} placeholder="Item name *" disabled={readOnly}
                                  onChange={e => updateLine(l.key, { productName: e.target.value })} />}
                            <div className={styles.lineSub}>
                              {l.productSku && <span className={styles.mono}>{l.productSku}</span>}
                              {!l.productId && <span className={cx(styles.pill, styles.pillGray)} style={{ fontSize: 11, padding: '0 6px' }}>Custom item — no stock</span>}
                              {p && <span>In stock: {p.totalStock ?? 0}{onOrder.get(p.id) ? ` · on order: ${onOrder.get(p.id)}` : ''}</span>}
                            </div>
                            <input className={styles.cellInput} style={{ fontWeight: 400, fontSize: 13 }} value={l.notes} disabled={readOnly}
                              placeholder={readOnly ? '' : 'Add a line note…'} onChange={e => updateLine(l.key, { notes: e.target.value })} />
                            </div>
                            </div>
                          </td>
                          <td><input className={cx(styles.cellInput, styles.center)} value={l.unitOfMeasure} disabled={readOnly} onChange={e => updateLine(l.key, { unitOfMeasure: e.target.value })} /></td>
                          <td>
                            <input id={`po-qty-${l.key}`} type="number" min={1} step={1} className={cx(styles.cellInput, styles.center)} value={l.quantity || ''} placeholder="0" disabled={readOnly}
                              onChange={e => updateLine(l.key, { quantity: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById(`po-price-${l.key}`)?.focus(); } }} />
                          </td>
                          <td>
                            <input id={`po-price-${l.key}`} type="number" min={0} step="0.01" className={cx(styles.cellInput, styles.right)} value={l.unitPrice === 0 ? '' : l.unitPrice} placeholder="0.00" disabled={readOnly}
                              onChange={e => updateLine(l.key, { unitPrice: Math.max(0, Number(e.target.value) || 0) })}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); entryRef.current?.focus(); } }} />
                          </td>
                          <td>
                            <input type="number" min={0} max={100} step="0.01" className={cx(styles.cellInput, styles.right)} value={l.discountPercent === 0 ? '' : l.discountPercent} placeholder="0" disabled={readOnly}
                              onChange={e => updateLine(l.key, { discountPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} />
                          </td>
                          <td>
                            <input type="number" min={0} max={100} step="0.01" className={cx(styles.cellInput, styles.right)} value={noTax ? '' : (l.taxPercent === 0 ? '' : l.taxPercent)} placeholder="0" disabled={readOnly || noTax}
                              onChange={e => updateLine(l.key, { taxPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} />
                          </td>
                          <td className={styles.lineTotal}>
                            {money(a.total)}
                            {a.discount > 0 && <div className={cx(styles.tiny, styles.danger)} style={{ fontWeight: 500 }}>− {money(a.discount)}</div>}
                          </td>
                          <td className={styles.center}>
                            {!readOnly && <button type="button" className={styles.removeBtn} onClick={() => removeLine(l.key)} title="Remove line"><Trash2 size={15} /></button>}
                          </td>
                        </tr>
                      );
                    })}
                    {!readOnly ? (
                      <tr>
                        <td className={cx(styles.center, styles.muted)}>{form.lines.length + 1}</td>
                        <td colSpan={8}>
                          <FastEntry inputRef={entryRef} products={products} onPick={p => addLines([lineFromProduct(p, taxDefaults)])}
                            onCustom={name => addLines([customLine(name)])} onBrowse={openCatalog} />
                        </td>
                      </tr>
                    ) : form.lines.length === 0 && (
                      <tr><td colSpan={9} className={styles.empty}>No items.</td></tr>
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

          <div className={styles.notesGrid}>
            <div className={cx(styles.panel, styles.panelPad)}>
              <h3 className={styles.panelTitle} style={{ marginBottom: 8 }}><FileText size={14} /> Notes to Supplier</h3>
              <textarea className={styles.textarea} rows={3} value={form.notes} readOnly={readOnly}
                placeholder="Delivery instructions, packing requirements, contact on arrival…" onChange={e => set('notes', e.target.value)} />
            </div>
            <div className={cx(styles.panel, styles.panelPad)}>
              <h3 className={styles.panelTitle} style={{ marginBottom: 8 }}><Info size={14} /> Order Workflow</h3>
              <ol className={styles.muted} style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8, fontSize: 13 }}>
                <li>Save as draft, then <strong>Submit for Approval</strong>.</li>
                <li>A manager <strong>approves</strong> it, then it’s <strong>marked as ordered</strong> once sent.</li>
                <li><strong>Receive goods</strong> (fully or in parts) — stock is added to the chosen warehouse.</li>
                <li>Record the supplier’s bill as a <strong>Purchase Invoice</strong> against this order.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div className={cx(styles.mainCol, styles.railSticky)}>
          <div className={cx(styles.panel, styles.panelPad)}>
            <h3 className={styles.panelTitle} style={{ marginBottom: 12 }}>Order Summary</h3>
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
            <div className={styles.sumTotal}><span>Order Total</span><CurrencyValue amount={totals.net} options={fmt2} /></div>
            {supplier && (
              <>
                <div className={styles.sumDivider} />
                <div className={styles.sumRow}><span>Supplier outstanding</span><CurrencyValue amount={supplierOutstanding} options={fmt2} className={supplierOutstanding > 0 ? styles.danger : undefined} /></div>
                <div className={styles.sumRow}><span>After this order is billed</span><CurrencyValue amount={supplierOutstanding + totals.net} options={fmt2} /></div>
                {Number(supplier.creditLimit) > 0 && (
                  <>
                    <div className={styles.sumRow}><span>Credit limit</span><CurrencyValue amount={Number(supplier.creditLimit)} options={fmt2} /></div>
                    <div className={styles.sumRow}>
                      <span>Available credit</span>
                      <CurrencyValue amount={Number(supplier.creditLimit) - supplierOutstanding} options={fmt2}
                        className={Number(supplier.creditLimit) - supplierOutstanding < totals.net ? styles.danger : styles.success} />
                    </div>
                    {supplierOutstanding + totals.net > Number(supplier.creditLimit) && (
                      <div className={styles.alert}>
                        <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>This order takes {supplier.name} over the agreed credit limit — pay down older invoices or arrange a higher limit.</span>
                      </div>
                    )}
                  </>
                )}
                <p className={cx(styles.tiny, styles.muted)} style={{ marginTop: 8, lineHeight: 1.5 }}>
                  Orders are bought on credit: the amount becomes payable when the supplier’s invoice is confirmed, and is paid from Purchase Invoices (full or in parts).
                </p>
              </>
            )}
          </div>

          <div className={cx(styles.panel, styles.panelPad)}>
            <h3 className={styles.panelTitle} style={{ marginBottom: 10 }}><Package size={14} /> Stock Outlook</h3>
            <div className={styles.railScroll}>
              {form.lines.some(l => l.productId) ? form.lines.filter(l => l.productId).map(l => {
                const p = productById.get(l.productId!);
                const current = p?.totalStock ?? 0;
                const pending = onOrder.get(l.productId!) ?? 0;
                const tone = p?.stockStatus === 'OUT_OF_STOCK' ? styles.stockOut : p?.stockStatus === 'LOW_STOCK' ? styles.stockLow : styles.stockOk;
                return (
                  <div key={l.key} className={cx(styles.stockCard, tone)}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.productName}</div>
                    <div className={styles.cardLine} style={{ marginTop: 3 }}>
                      <span>Now: <b>{current}</b>{pending ? ` (+${pending} incoming)` : ''}</span>
                      <span>After: <b>{current + pending + l.quantity}</b></span>
                    </div>
                  </div>
                );
              }) : <div className={styles.empty} style={{ padding: '14px 0', fontSize: 13 }}>Add catalog items to see stock levels.</div>}
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
                    <span className={styles.infoLabel}>{displayDate(h.date)}<span style={{ display: 'block', fontSize: 12 }}>{h.supplier} · {h.doc}</span></span>
                    <span className={cx(styles.infoValue, styles.num)}>{money(h.price)}<span className={styles.muted} style={{ display: 'block', fontSize: 12, fontWeight: 400 }}>× {h.qty}</span></span>
                  </div>
                )) : <div className={styles.empty} style={{ padding: '10px 0', fontSize: 13 }}>No earlier purchases of this item.</div>}
              </>
            ) : <div className={styles.empty} style={{ padding: '14px 0', fontSize: 13 }}>Click an item line to see what you paid for it before.</div>}
          </div>
        </div>
      </div>

      <div className={styles.actionBar}>
        <div className={styles.actionBarMeta}>
          <span className={cx(styles.pill, status.cls)}>{status.label}</span>
          <span>PO No: <strong>{order?.poNumber ?? '—'}</strong></span>
          <span>Total: <strong><CurrencyValue amount={totals.net} options={fmt2} /></strong> <span className={styles.muted}>({currencyCode})</span></span>
        </div>
        <div className={styles.headerActions}>
          {!readOnly && (
            <>
              <Button variant="outline" size="sm" disabled={saving} onClick={() => save(false)}>{canSubmit ? 'Save Draft' : 'Save Changes'}</Button>
              {canSubmit && <Button size="sm" disabled={saving} onClick={() => save(true)}><Send className="h-4 w-4" /> Submit for Approval</Button>}
            </>
          )}
          <Button variant="outline" size="sm" onClick={print}>Print</Button>
        </div>
      </div>

      <ProductSelector open={catalogOpen} onOpenChange={setCatalogOpen} products={products} target="Order"
        initialSearch={catalogSearch} onRefresh={onRefreshProducts}
        onAdd={(p, e) => addLines([{ ...lineFromProduct(p, taxDefaults), quantity: e.quantity, unitPrice: e.unitPrice, discountPercent: e.discountPercent || purchaseDiscountFor(p) }])} />
    </div>
  );
});
