import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, CheckCircle, ClipboardList, Clock, Download, Edit, Eye, FileText,
  Loader2, PackageCheck, Plus, Printer, Save, Search, Send, Trash2, Truck, Users, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { CurrencyValue, useCurrency } from '../utils/currency';
import { authService } from '../utils/supabase/auth-service';
import { purchaseService, type PurchaseOrder as PO, PurchaseOrderRequest, Supplier } from '../utils/supabase/purchase-service';
import { productsService, Product, Warehouse } from '../utils/supabase/products-service';
import type { SupplierBill } from '../utils/supabase/supplier-bill-service';
import { PurchaseOrderPreview } from '../components/purchase/PurchaseOrderPreview';
import { PurchaseOrderEditor, PurchaseOrderEditorHandle } from '../components/purchase/PurchaseOrderEditor';
import styles from '../components/purchase/PurchaseInvoice.module.css';
import { IconBtn, ModuleHeader, NativeSelect, StatCard, SupplierFormDialog, cx } from '../components/purchase/purchaseUi';
import { displayDate, fetchAllBills, fetchAllOrders, priorityMeta, todayIso } from '../components/purchase/purchaseInvoiceUtils';
import {
  PO_STATUS_FILTERS, exportOrdersCsv, isLate, isoDay, poActions, poStatusMeta, receipt,
} from '../components/purchase/purchaseOrderUtils';
import { buildOrderDocument, printPurchaseDocument } from '../components/print-templates/purchasePrint';

const fmt2 = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
const PAGE_SIZE = 20;

type View = 'list' | 'preview' | 'editor';
type SortKey = 'poNumber' | 'orderDate' | 'supplierName' | 'expectedDeliveryDate' | 'totalAmount';
type Period = 'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_90' | 'THIS_YEAR';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'ALL', label: 'All Time' },
  { value: 'THIS_MONTH', label: 'This Month' },
  { value: 'LAST_MONTH', label: 'Last Month' },
  { value: 'LAST_90', label: 'Last 90 Days' },
  { value: 'THIS_YEAR', label: 'This Year' },
];

function periodRange(p: Period): [string, string] | null {
  const now = new Date();
  const iso = (d: Date) => format(d, 'yyyy-MM-dd');
  switch (p) {
    case 'THIS_MONTH': return [iso(new Date(now.getFullYear(), now.getMonth(), 1)), iso(now)];
    case 'LAST_MONTH': return [iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), iso(new Date(now.getFullYear(), now.getMonth(), 0))];
    case 'LAST_90': { const d = new Date(now); d.setDate(d.getDate() - 90); return [iso(d), iso(now)]; }
    case 'THIS_YEAR': return [iso(new Date(now.getFullYear(), 0, 1)), iso(now)];
    default: return null;
  }
}

const STATUS_VERB: Partial<Record<PO['status'], string>> = {
  PENDING_APPROVAL: 'submitted for approval',
  APPROVED: 'approved',
  ORDERED: 'marked as ordered',
  DRAFT: 'sent back to draft',
  CANCELLED: 'cancelled',
};

export function PurchaseOrder() {
  const { currencyCode } = useCurrency();
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const userName = currentUser?.staffName || currentUser?.name || currentUser?.email;

  // ── Data ──────────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<PO[]>([]);
  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  // ── Navigation ────────────────────────────────────────────────────────────
  const [view, setView] = useState<View>('list');
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [editingOrder, setEditingOrder] = useState<PO | null>(null);
  const [editorSession, setEditorSession] = useState(0);
  const editorRef = useRef<PurchaseOrderEditorHandle>(null);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [period, setPeriod] = useState<Period>('ALL');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'orderDate', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // ── Dialogs ───────────────────────────────────────────────────────────────
  const [pendingCancel, setPendingCancel] = useState<PO | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PO | null>(null);
  const [receiving, setReceiving] = useState<PO | null>(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [newSupplier, setNewSupplier] = useState<{ id: number; nonce: number } | null>(null);

  const loadOrders = useCallback(async () => {
    try { setOrders(await fetchAllOrders()); }
    catch (err: any) { toast.error(err.message || 'Failed to load purchase orders'); }
  }, []);

  const refreshProducts = () => productsService.getProducts({ size: 500 }).then(r => setProducts(r.products ?? [])).catch(() => undefined);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [o, s, p, w, b] = await Promise.allSettled([
        fetchAllOrders(),
        purchaseService.getAllSuppliers(),
        productsService.getProducts({ size: 500 }),
        productsService.getActiveWarehouses(),
        fetchAllBills(),
      ]);
      if (o.status === 'fulfilled') setOrders(o.value); else toast.error(o.reason?.message || 'Failed to load purchase orders');
      if (s.status === 'fulfilled') setSuppliers(s.value); else toast.error('Failed to load suppliers');
      if (p.status === 'fulfilled') setProducts(p.value.products ?? []);
      if (w.status === 'fulfilled') setWarehouses(w.value);
      if (b.status === 'fulfilled') setBills(b.value);
      setLoading(false);
    })();
  }, []);

  const defaultDeliveryAddress = useMemo(() => {
    const w = warehouses[0];
    return w ? [w.name, w.location].filter(Boolean).join('\n') : '';
  }, [warehouses]);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const range = periodRange(period);
    const rows = orders.filter(o => {
      if (statusFilter === 'LATE' ? !isLate(o) : statusFilter !== 'ALL' && o.status !== statusFilter) return false;
      if (supplierFilter && String(o.supplierId) !== supplierFilter) return false;
      const d = isoDay(o.orderDate);
      if (range && (d < range[0] || d > range[1])) return false;
      if (!q) return true;
      return [o.poNumber, o.supplierName, o.notes, ...o.items.map(i => i.productName)].some(v => (v ?? '').toLowerCase().includes(q));
    });
    rows.sort((a, b) => {
      const x = a[sort.key] ?? '', y = b[sort.key] ?? '';
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return (sort.dir === 'asc' ? c : -c) || b.id - a.id;
    });
    return rows;
  }, [orders, search, statusFilter, supplierFilter, period, sort]);

  useEffect(() => { setPage(1); setSelected(new Set()); }, [search, statusFilter, supplierFilter, period]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const toggleSort = (key: SortKey) =>
    setSort(s => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'supplierName' || key === 'poNumber' ? 'asc' : 'desc' }));

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const monthStart = format(new Date(), 'yyyy-MM-01');
    const live = orders.filter(o => o.status !== 'CANCELLED' && o.status !== 'DRAFT');
    const month = live.filter(o => isoDay(o.orderDate) >= monthStart && isoDay(o.orderDate) <= todayIso());
    const awaiting = orders.filter(o => o.status === 'ORDERED' || o.status === 'PARTIALLY_RECEIVED');
    return {
      monthValue: month.reduce((s, o) => s + o.totalAmount, 0),
      monthCount: month.length,
      pending: orders.filter(o => o.status === 'PENDING_APPROVAL').length,
      drafts: orders.filter(o => o.status === 'DRAFT').length,
      awaitingValue: awaiting.reduce((s, o) => s + o.totalAmount, 0),
      awaitingCount: awaiting.length,
      late: orders.filter(isLate).length,
    };
  }, [orders]);

  // ── Navigation helpers ────────────────────────────────────────────────────
  const leaveEditorOk = () =>
    view !== 'editor' || !editorRef.current?.isDirty() || window.confirm('Discard your unsaved changes to this order?');
  const goList = () => { if (leaveEditorOk()) setView('list'); };
  const openPreview = (o: PO) => { setPreviewId(o.id); setView('preview'); };
  const openNew = () => {
    if (!leaveEditorOk()) return;
    setEditingOrder(null);
    setEditorSession(n => n + 1);
    setView('editor');
  };
  const openEdit = (o: PO) => { setEditingOrder(o); setEditorSession(n => n + 1); setView('editor'); };

  const replaceOrder = (o: PO) => setOrders(prev => (prev.some(x => x.id === o.id) ? prev.map(x => (x.id === o.id ? o : x)) : [o, ...prev]));
  const supplierOf = (o: PO) => suppliers.find(s => s.id === o.supplierId);
  const handlePrint = (o: PO) => {
    printPurchaseDocument({
      docType: 'purchase-order',
      branchId: o.branchId,
      fallbackCurrency: currencyCode,
      build: (company, currency) => buildOrderDocument(o, supplierOf(o), company, currency, products),
      onError: msg => toast.error(msg),
    });
  };

  // ── Mutations ─────────────────────────────────────────────────────────────
  const onEditorSave = async (req: PurchaseOrderRequest, submit: boolean) => {
    setSaving(true);
    let saved: PO | null = null;
    try {
      saved = editingOrder ? await purchaseService.updateOrder(editingOrder.id, req) : await purchaseService.createOrder(req);
      if (submit && saved.status === 'DRAFT') saved = await purchaseService.updateStatus(saved.id, 'PENDING_APPROVAL');
      replaceOrder(saved);
      toast.success(`${saved.poNumber} ${submit ? 'submitted for approval' : editingOrder ? 'saved' : 'saved as draft'}`);
      setPreviewId(saved.id);
      setView('preview');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save purchase order');
      if (saved) { setEditingOrder(saved); replaceOrder(saved); } // saved but submit failed — keep editing that draft
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (o: PO, next: PO['status']) => {
    setBusyId(o.id);
    try {
      replaceOrder(await purchaseService.updateStatus(o.id, next));
      toast.success(`${o.poNumber} ${STATUS_VERB[next] ?? 'updated'}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order');
    } finally {
      setBusyId(null);
    }
  };

  const deleteOrder = async (o: PO) => {
    setBusyId(o.id);
    try {
      await purchaseService.deleteOrder(o.id);
      setOrders(prev => prev.filter(x => x.id !== o.id));
      toast.success(`${o.poNumber} deleted`);
      if (previewId === o.id) { setPreviewId(null); setView('list'); }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete order');
    } finally {
      setBusyId(null);
    }
  };

  const bulk = async (next: PO['status'], eligible: (o: PO) => boolean) => {
    const targets = orders.filter(o => selected.has(o.id));
    const ok = targets.filter(eligible);
    if (ok.length === 0) { toast.error('None of the selected orders can take this action'); return; }
    const res = await Promise.allSettled(ok.map(o => purchaseService.updateStatus(o.id, next)));
    res.forEach(r => { if (r.status === 'fulfilled') replaceOrder(r.value); });
    const done = res.filter(r => r.status === 'fulfilled').length;
    const skipped = targets.length - ok.length + (ok.length - done);
    toast.success(`${done} order${done === 1 ? '' : 's'} ${STATUS_VERB[next]}${skipped ? ` · ${skipped} skipped` : ''}`);
    setSelected(new Set());
  };

  const onSupplierSaved = async (created: Supplier) => {
    setSuppliers(await purchaseService.getAllSuppliers().catch(() => suppliers));
    if (view === 'editor' && created?.id) setNewSupplier({ id: created.id, nonce: Date.now() });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const editorReadOnly = !!editingOrder && !(editingOrder.status === 'DRAFT' || editingOrder.status === 'PENDING_APPROVAL');
  const canSubmitNew = !editingOrder || editingOrder.status === 'DRAFT';
  const SortIcon = ({ k }: { k: SortKey }) => (sort.key === k ? (sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : null);
  const Th = ({ k, children, right }: { k: SortKey; children: React.ReactNode; right?: boolean }) => (
    <th className={cx(styles.sortable, right && styles.right)} onClick={() => toggleSort(k)}>
      <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>{children} <SortIcon k={k} /></span>
    </th>
  );
  const allOnPage = pageRows.length > 0 && pageRows.every(o => selected.has(o.id));

  return (
    <div className={styles.page}>
      <ModuleHeader
        title="Purchase Orders"
        icon={ClipboardList}
        subtitle="Order stock and equipment from suppliers — approve, send, track deliveries and receive goods into your warehouses"
        meta={view === 'editor' ? (
          <>
            <span className={cx(styles.pill, editingOrder ? poStatusMeta(editingOrder.status).cls : styles.pillGray)}>
              {editingOrder ? poStatusMeta(editingOrder.status).label : 'Draft (new)'}
            </span>
            <span>PO No: <strong>{editingOrder?.poNumber ?? '—'}</strong></span>
          </>
        ) : undefined}
        actions={
          <>
            {view !== 'list' && <Button variant="outline" size="sm" onClick={goList}><ArrowLeft className="h-4 w-4" /> Back</Button>}
            {view === 'editor' && !editorReadOnly && (
              <>
                <Button variant="outline" size="sm" disabled={saving} onClick={() => editorRef.current?.save(false)}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {canSubmitNew ? 'Save Draft' : 'Save Changes'}
                </Button>
                {canSubmitNew && (
                  <Button size="sm" disabled={saving} onClick={() => editorRef.current?.save(true)}><Send className="h-4 w-4" /> Submit for Approval</Button>
                )}
              </>
            )}
            {view === 'editor' && <Button variant="outline" size="sm" onClick={() => editorRef.current?.print()}><Printer className="h-4 w-4" /> Print</Button>}
            {view === 'list' && (
              <>
                <Button variant="outline" size="sm" disabled={filtered.length === 0} onClick={() => exportOrdersCsv(filtered, currencyCode)}>
                  <Download className="h-4 w-4" /> Export
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/suppliers')}><Users className="h-4 w-4" /> Suppliers</Button>
              </>
            )}
            {view !== 'editor' && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> New Purchase Order</Button>}
          </>
        }
        tabs={[
          { key: 'list', label: 'Order List', icon: FileText, active: view !== 'editor', onClick: goList },
          { key: 'editor', label: 'Order Editor', icon: ClipboardList, active: view === 'editor', onClick: () => { if (view !== 'editor') openNew(); } },
        ]}
      />

      {view === 'list' && (
        <div className={styles.fadeIn} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className={styles.kpiGrid}>
            <StatCard title="Ordered This Month" icon={ClipboardList} tone="green" loading={loading}
              value={<CurrencyValue amount={kpi.monthValue} options={fmt2} />} sub={`${kpi.monthCount} order${kpi.monthCount === 1 ? '' : 's'} raised`} />
            <StatCard title="Pending Approval" icon={Clock} tone="orange" loading={loading}
              value={kpi.pending} sub={`${kpi.drafts} more in draft`} />
            <StatCard title="Awaiting Delivery" icon={Truck} tone="blue" loading={loading}
              value={<CurrencyValue amount={kpi.awaitingValue} options={fmt2} />} sub={`${kpi.awaitingCount} order${kpi.awaitingCount === 1 ? '' : 's'} with suppliers`} />
            <StatCard title="Late Deliveries" icon={AlertTriangle} tone="red" loading={loading}
              value={kpi.late} sub="Past expected delivery date" />
          </div>

          <div className={cx(styles.panel, styles.panelPad)}>
            <div className={styles.toolbar}>
              <h3 className={styles.panelTitle}>
                All Purchase Orders <span className={cx(styles.muted, styles.tiny)} style={{ fontWeight: 500 }}>({filtered.length})</span>
              </h3>
              <div className={styles.filters}>
                <div className={styles.searchBox}>
                  <Search size={14} />
                  <input className={styles.searchInput} placeholder="Search PO no, supplier, item…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <NativeSelect value={period} onChange={v => setPeriod(v as Period)} options={PERIODS} label="Period" />
                <NativeSelect value={statusFilter} onChange={setStatusFilter} options={PO_STATUS_FILTERS} label="Status" />
                <NativeSelect value={supplierFilter} onChange={setSupplierFilter} label="Supplier"
                  options={[{ value: '', label: 'All Suppliers' }, ...suppliers.map(s => ({ value: String(s.id), label: s.name }))]} />
              </div>
            </div>

            {selected.size > 0 && (
              <div className={cx(styles.notice, styles.noticeInfo)} style={{ marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong>{selected.size} selected</strong>
                <span style={{ flex: 1 }} />
                <Button size="sm" variant="outline" onClick={() => bulk('APPROVED', o => o.status === 'PENDING_APPROVAL')}><CheckCircle className="h-4 w-4" /> Approve</Button>
                <Button size="sm" variant="outline" onClick={() => bulk('ORDERED', o => o.status === 'APPROVED')}><Send className="h-4 w-4" /> Mark Ordered</Button>
                <Button size="sm" variant="outline" onClick={() => bulk('CANCELLED', o => o.status === 'APPROVED' || o.status === 'ORDERED')}><XCircle className="h-4 w-4" /> Cancel</Button>
                <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>Clear</Button>
              </div>
            )}

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input type="checkbox" aria-label="Select page" checked={allOnPage}
                        onChange={e => setSelected(prev => { const n = new Set(prev); pageRows.forEach(o => (e.target.checked ? n.add(o.id) : n.delete(o.id))); return n; })} />
                    </th>
                    <Th k="poNumber">PO No</Th>
                    <Th k="orderDate">Order Date</Th>
                    <Th k="supplierName">Supplier</Th>
                    <Th k="expectedDeliveryDate">Expected Delivery</Th>
                    <th>Priority</th>
                    <th style={{ width: 150 }}>Received</th>
                    <Th k="totalAmount" right>Total</Th>
                    <th>Status</th>
                    <th className={styles.right}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && orders.length === 0 && Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`sk${i}`}>{Array.from({ length: 10 }).map((__, j) => <td key={j}><div className={styles.skeleton} style={{ width: j === 3 ? 120 : 60 }} /></td>)}</tr>
                  ))}
                  {pageRows.map(o => {
                    const st = poStatusMeta(o.status);
                    const pr = priorityMeta(o.priority);
                    const a = poActions(o);
                    const r = receipt(o);
                    const busy = busyId === o.id;
                    return (
                      <tr key={o.id} className={cx(styles.row, o.id === previewId && styles.rowSelected)} onClick={() => openPreview(o)}>
                        <td onClick={e => e.stopPropagation()}>
                          <input type="checkbox" aria-label={`Select ${o.poNumber}`} checked={selected.has(o.id)}
                            onChange={() => setSelected(prev => { const n = new Set(prev); if (n.has(o.id)) n.delete(o.id); else n.add(o.id); return n; })} />
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{o.poNumber}</div>
                          {o.createdBy && <div className={cx(styles.tiny, styles.muted)}>by {o.createdBy}</div>}
                        </td>
                        <td>{displayDate(isoDay(o.orderDate))}</td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{o.supplierName}</div>
                          {supplierOf(o)?.contactPerson && <div className={cx(styles.tiny, styles.muted)}>{supplierOf(o)!.contactPerson}</div>}
                        </td>
                        <td className={isLate(o) ? styles.danger : undefined}>
                          {o.expectedDeliveryDate ? displayDate(isoDay(o.expectedDeliveryDate)) : '—'}
                          {isLate(o) && <div className={styles.tiny}>Late</div>}
                        </td>
                        <td><span className={cx(styles.pill, pr.cls)}>{pr.label}</span></td>
                        <td>
                          <div style={{ height: 6, borderRadius: 999, background: 'var(--muted)', overflow: 'hidden' }}>
                            <div style={{ width: `${r.pct}%`, height: '100%', background: r.pct >= 100 ? '#059669' : 'var(--primary)' }} />
                          </div>
                          <div className={cx(styles.tiny, styles.muted)} style={{ marginTop: 3 }}>{r.received}/{r.ordered} · {o.items.length} item{o.items.length === 1 ? '' : 's'}</div>
                        </td>
                        <td className={cx(styles.right, styles.num)} style={{ fontWeight: 600 }}><CurrencyValue amount={o.totalAmount} options={fmt2} /></td>
                        <td><span className={cx(styles.pill, st.cls)}>{st.label}</span></td>
                        <td>
                          <div className={styles.rowActions} onClick={e => e.stopPropagation()}>
                            <IconBtn title="View" onClick={() => openPreview(o)}><Eye size={15} /></IconBtn>
                            {a.edit && <IconBtn title="Edit" onClick={() => openEdit(o)}><Edit size={15} /></IconBtn>}
                            {a.submit && <IconBtn title="Submit for approval" tone={styles.iconBtnPrimary} disabled={busy} onClick={() => changeStatus(o, 'PENDING_APPROVAL')}><Send size={15} /></IconBtn>}
                            {a.approve && <IconBtn title="Approve" tone={styles.iconBtnPrimary} disabled={busy} onClick={() => changeStatus(o, 'APPROVED')}><CheckCircle size={15} /></IconBtn>}
                            {a.markOrdered && <IconBtn title="Mark as ordered" tone={styles.iconBtnPrimary} disabled={busy} onClick={() => changeStatus(o, 'ORDERED')}><Send size={15} /></IconBtn>}
                            {a.receive && <IconBtn title="Receive goods" tone={styles.iconBtnGreen} disabled={busy} onClick={() => setReceiving(o)}><PackageCheck size={15} /></IconBtn>}
                            <IconBtn title="Print" onClick={() => handlePrint(o)}><Printer size={15} /></IconBtn>
                            {a.cancel && <IconBtn title="Cancel" tone={styles.iconBtnAmber} disabled={busy} onClick={() => setPendingCancel(o)}><XCircle size={15} /></IconBtn>}
                            {a.delete && <IconBtn title="Delete" tone={styles.iconBtnRed} disabled={busy} onClick={() => setPendingDelete(o)}><Trash2 size={15} /></IconBtn>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={10} className={styles.emptyCell}>
                        <ClipboardList size={32} style={{ margin: '0 auto 8px', opacity: 0.35 }} />
                        <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{orders.length === 0 ? 'No purchase orders yet' : 'No orders match these filters'}</div>
                        <div style={{ marginBottom: 12 }}>{orders.length === 0 ? 'Raise your first order to restock products or buy equipment.' : 'Try clearing the search or changing the filters.'}</div>
                        {orders.length === 0 && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> New Purchase Order</Button>}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.mobileList}>
              {pageRows.map(o => {
                const st = poStatusMeta(o.status);
                return (
                  <button key={o.id} type="button" className={styles.mobileCard} onClick={() => openPreview(o)}>
                    <div className={styles.cardLine}>
                      <span style={{ fontWeight: 700 }}>{o.poNumber}</span>
                      <span className={cx(styles.pill, st.cls)}>{st.label}</span>
                    </div>
                    <div className={cx(styles.tiny, styles.muted)} style={{ margin: '2px 0 8px' }}>{displayDate(isoDay(o.orderDate))} · {o.supplierName}</div>
                    <div className={styles.cardLine} style={{ borderTop: '1px solid var(--pi-edge)', paddingTop: 8 }}>
                      <span className={styles.muted}>{receipt(o).received}/{receipt(o).ordered} received</span>
                      <CurrencyValue amount={o.totalAmount} options={fmt2} className="font-bold" />
                    </div>
                  </button>
                );
              })}
              {!loading && filtered.length === 0 && <div className={styles.empty}>No orders found.</div>}
            </div>

            {filtered.length > 0 && (
              <div className={styles.pager}>
                <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} orders</span>
                <div className={styles.pagerBtns}>
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <span>Page {page} of {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'preview' && (
        <PurchaseOrderPreview
          orders={filtered}
          loading={loading}
          selectedId={previewId}
          onSelect={o => setPreviewId(o.id)}
          searchTerm={search}
          onSearchChange={setSearch}
          suppliers={suppliers}
          bills={bills}
          products={products}
          busyId={busyId}
          onBack={goList}
          onEdit={openEdit}
          onStatus={changeStatus}
          onReceive={setReceiving}
          onCancel={setPendingCancel}
          onDelete={setPendingDelete}
          onPrint={handlePrint}
          onCreateInvoice={o => navigate(`/purchase?fromPo=${o.id}`)}
          onOpenInvoice={b => navigate(`/purchase?bill=${b.id}`)}
        />
      )}

      {view === 'editor' && (
        <PurchaseOrderEditor
          key={`${editorSession}-${editingOrder?.id ?? 'new'}`}
          ref={editorRef}
          order={editingOrder}
          allOrders={orders}
          allBills={bills}
          suppliers={suppliers}
          products={products}
          defaultDeliveryAddress={defaultDeliveryAddress}
          saving={saving}
          createdBy={userName}
          selectSupplier={newSupplier}
          onSave={onEditorSave}
          onPrint={handlePrint}
          onAddSupplier={() => setShowSupplierForm(true)}
          onRefreshProducts={refreshProducts}
        />
      )}

      <ReceiveGoodsDialog
        order={receiving}
        warehouses={warehouses}
        onClose={() => setReceiving(null)}
        onReceived={o => { replaceOrder(o); refreshProducts(); }}
      />

      <AlertDialog open={!!pendingCancel} onOpenChange={o => { if (!o) setPendingCancel(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {pendingCancel?.poNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              The order will be closed and can no longer be received against. Let {pendingCancel?.supplierName} know if it was already sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Order</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const o = pendingCancel; setPendingCancel(null); if (o) changeStatus(o, 'CANCELLED'); }}>Cancel Order</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={o => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.poNumber}?</AlertDialogTitle>
            <AlertDialogDescription>The order and its lines will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600" onClick={() => { const o = pendingDelete; setPendingDelete(null); if (o) deleteOrder(o); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SupplierFormDialog open={showSupplierForm} supplier={null} onOpenChange={setShowSupplierForm} onSaved={onSupplierSaved} />
    </div>
  );
}

// ── Receive goods ────────────────────────────────────────────────────────────

function ReceiveGoodsDialog({ order, warehouses, onClose, onReceived }: {
  order: PO | null;
  warehouses: Warehouse[];
  onClose: () => void;
  onReceived: (o: PO) => void;
}) {
  const [warehouseId, setWarehouseId] = useState<number | ''>('');
  const [qty, setQty] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!order) return;
    setWarehouseId(warehouses[0]?.id ?? '');
    setQty(Object.fromEntries(order.items.map(i => [i.id, Math.max(0, i.quantityOrdered - i.quantityReceived)])));
  }, [order, warehouses]);

  if (!order) return null;
  const lines = order.items.map(i => ({ ...i, pending: Math.max(0, i.quantityOrdered - i.quantityReceived), now: qty[i.id] ?? 0 }));
  const totalNow = lines.reduce((s, l) => s + l.now, 0);
  const completes = lines.every(l => l.now >= l.pending);

  const submit = async () => {
    if (!warehouseId) { toast.error('Choose the warehouse receiving the goods'); return; }
    const items = lines.filter(l => l.now > 0).map(l => ({ purchaseOrderItemId: l.id, quantityReceived: l.now, warehouseId: Number(warehouseId) }));
    if (items.length === 0) { toast.error('Enter a quantity for at least one item'); return; }
    setSaving(true);
    try {
      const updated = await purchaseService.receiveItems(order.id, items);
      toast.success(`${totalNow} unit${totalNow === 1 ? '' : 's'} received into ${warehouses.find(w => w.id === warehouseId)?.name ?? 'warehouse'}`);
      onReceived(updated);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to receive goods');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!order} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PackageCheck className="h-5 w-5" /> Receive Goods — {order.poNumber}</DialogTitle>
          <DialogDescription>Enter what arrived from {order.supplierName}. Catalog items are added to stock and their average cost is updated.</DialogDescription>
        </DialogHeader>
        <div className={styles.cell}>
          <label className={styles.eyebrow}>Receive into warehouse *</label>
          <select className={cx(styles.field, styles.fieldSelect)} value={warehouseId} onChange={e => setWarehouseId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Select warehouse…</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div className={styles.gridBox} style={{ maxHeight: '45vh', overflowY: 'auto' }}>
          <table className={styles.itemsTable}>
            <thead>
              <tr><th>Item</th><th className={styles.center}>Ordered</th><th className={styles.center}>Received</th><th className={styles.center}>Pending</th><th className={styles.center} style={{ width: 120 }}>Receive now</th></tr>
            </thead>
            <tbody>
              {lines.map(l => (
                <tr key={l.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{l.productName}</div>
                    {!l.productId && <div className={cx(styles.tiny, styles.muted)}>Custom item — no stock update</div>}
                  </td>
                  <td className={styles.center}>{l.quantityOrdered}</td>
                  <td className={styles.center}>{l.quantityReceived}</td>
                  <td className={styles.center}>{l.pending}</td>
                  <td>
                    <input type="number" min={0} max={l.pending} step={1} className={cx(styles.field, styles.center)} style={{ height: 34 }}
                      value={l.now} disabled={l.pending === 0}
                      onChange={e => setQty(q => ({ ...q, [l.id]: Math.min(l.pending, Math.max(0, Math.round(Number(e.target.value) || 0))) }))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.cardLine}>
          <span className={cx(styles.tiny, styles.muted)}>
            {totalNow} unit{totalNow === 1 ? '' : 's'} now · order will be <strong>{completes ? 'fully received' : 'partially received'}</strong>
          </span>
          <div className={styles.headerActions}>
            <Button variant="outline" size="sm" onClick={() => setQty(Object.fromEntries(lines.map(l => [l.id, 0])))}>Clear</Button>
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={saving || totalNow === 0} onClick={submit}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />} Receive {totalNow || ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
