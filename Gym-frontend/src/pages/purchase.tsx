import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, CheckCircle, CheckCircle2, Clock,
  CreditCard, Download, Edit, Eye, FileText, Loader2, Plus, Printer, Receipt, Save, ScanBarcode, Search, ShoppingBag, Trash2,
  TrendingUp, User, Users, Wallet, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { CurrencyValue, useCurrency } from '../utils/currency';
import { accountHeadsService, AccountHead } from '../utils/supabase/account-heads-service';
import { usePaymentManager } from '../payments/usePaymentManager';
import { PaymentAllocationPanel } from '../payments/PaymentAllocationPanel';
import { PAYMENT_TYPES } from '../payments/paymentModel';
import { buildPaymentPayload } from '../payments/paymentPayload';
import { toLegacyPayment } from '../payments/legacyPaymentBridge';
import { supplierBillService, SupplierBill, SupplierBillRequest } from '../utils/supabase/supplier-bill-service';
import { purchaseService, Supplier, PurchaseOrder } from '../utils/supabase/purchase-service';
import { productsService, Product, Warehouse } from '../utils/supabase/products-service';
import { PurchaseInvoicePreview } from '../components/purchase/PurchaseInvoicePreview';
import { PurchaseInvoiceEditor, PurchaseInvoiceEditorHandle } from '../components/purchase/PurchaseInvoiceEditor';
import styles from '../components/purchase/PurchaseInvoice.module.css';
import { IconBtn, ModuleHeader, NativeSelect, StatCard, SupplierFormDialog, cx } from '../components/purchase/purchaseUi';
import {
  STATUS_FILTERS, DisplayStatus, balanceOf, billActions, displayDate, displayStatus, exportBillsCsv, paymentSummaryLabel,
  fetchAllBills, fetchAllOrders, priorityMeta, statusMeta, todayIso,
} from '../components/purchase/purchaseInvoiceUtils';
import { buildBillDocument, printPurchaseDocument } from '../components/print-templates/purchasePrint';
import type { BarcodePrintRequest } from './barcode-print';

const fmt2 = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
const PAGE_SIZE = 20;

type View = 'list' | 'preview' | 'editor';
type SortKey = 'billNumber' | 'billDate' | 'supplierName' | 'totalAmount' | 'amountPaid' | 'balance';
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

export function Purchase() {
  const { currencyCode } = useCurrency();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [prefillPoId, setPrefillPoId] = useState<number | undefined>();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [bankAccounts, setBankAccounts] = useState<AccountHead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  // ── Navigation ────────────────────────────────────────────────────────────
  const [view, setView] = useState<View>('list');
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [editingBill, setEditingBill] = useState<SupplierBill | null>(null);
  const [editorSession, setEditorSession] = useState(0);
  const editorRef = useRef<PurchaseInvoiceEditorHandle>(null);

  // ── List filters ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DisplayStatus | 'ALL'>('ALL');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [period, setPeriod] = useState<Period>('ALL');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'billDate', dir: 'desc' });
  const [page, setPage] = useState(1);

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [pendingConfirm, setPendingConfirm] = useState<{ req?: SupplierBillRequest; bill?: SupplierBill } | null>(null);
  const [pendingCancel, setPendingCancel] = useState<SupplierBill | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SupplierBill | null>(null);
  const [payingBill, setPayingBill] = useState<SupplierBill | null>(null);
  const payingBillBalance = payingBill ? balanceOf(payingBill) : 0;
  // Paying less than the balance leaves the rest on credit (supplier outstanding).
  const [payNowInput, setPayNowInput] = useState('');
  const payNow = Math.min(payingBillBalance, Math.max(0, Math.round((Number(payNowInput) || 0) * 100) / 100));
  const [payDate, setPayDate] = useState(todayIso());
  const paymentManager = usePaymentManager({ invoiceTotal: payNow });
  // A Credit line inside the allocation is money NOT paid now either — it stays on the
  // bill (Accounts Payable) together with whatever wasn't entered as "Paying now".
  const creditAllocated = paymentManager.totalByType(PAYMENT_TYPES.CREDIT);
  const paidNow = Math.max(0, Math.round((payNow - creditAllocated) * 100) / 100);
  const leftOnCredit = Math.max(0, Math.round((payingBillBalance - paidNow) * 100) / 100);
  const [payNotes, setPayNotes] = useState('');
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [newSupplier, setNewSupplier] = useState<{ id: number; nonce: number } | null>(null);

  // ── Loading ───────────────────────────────────────────────────────────────
  const loadBills = useCallback(async () => {
    try {
      setBills(await fetchAllBills());
    } catch (err: any) {
      toast.error(err.message || 'Failed to load purchase invoices');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [billsRes, suppliersRes, warehousesRes, productsRes, posRes, banksRes] = await Promise.allSettled([
        fetchAllBills(),
        purchaseService.getAllSuppliers(),
        productsService.getActiveWarehouses(),
        productsService.getProducts({ size: 500 }),
        fetchAllOrders(),
        accountHeadsService.getBankAccounts(),
      ]);
      if (billsRes.status === 'fulfilled') setBills(billsRes.value);
      else toast.error(billsRes.reason?.message || 'Failed to load purchase invoices');
      if (suppliersRes.status === 'fulfilled') setSuppliers(suppliersRes.value);
      else toast.error('Failed to load suppliers');
      if (warehousesRes.status === 'fulfilled') setWarehouses(warehousesRes.value);
      if (productsRes.status === 'fulfilled') setProducts(productsRes.value.products ?? []);
      if (posRes.status === 'fulfilled') setPurchaseOrders(posRes.value);
      if (banksRes.status === 'fulfilled') setBankAccounts(banksRes.value);
      setLoading(false);
    })();
  }, []);

  const refreshProducts = () =>
    productsService.getProducts({ size: 500 }).then(r => setProducts(r.products ?? [])).catch(() => undefined);

  const warehouseName = useCallback(
    (id?: number) => (id ? warehouses.find(w => w.id === id)?.name ?? `Warehouse #${id}` : '—'),
    [warehouses],
  );

  // Deep links from Purchase Orders: ?bill=<id> opens that invoice, ?fromPo=<id> starts a new invoice against the PO.
  useEffect(() => {
    if (loading) return;
    const billId = Number(searchParams.get('bill'));
    if (billId) {
      const b = bills.find(x => x.id === billId);
      if (b) openPreview(b); else toast.error('That purchase invoice could not be found');
      setSearchParams({}, { replace: true });
      return;
    }
    const po = Number(searchParams.get('fromPo'));
    if (!po) return;
    const existing = bills.find(b => b.purchaseOrderId === po && b.status !== 'CANCELLED');
    if (existing) {
      toast.info(`This purchase order is already billed on ${existing.billNumber}`);
      openPreview(existing);
    } else {
      setEditingBill(null);
      setPrefillPoId(po);
      setEditorSession(n => n + 1);
      setView('editor');
    }
    setSearchParams({}, { replace: true });
  }, [searchParams, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtering / sorting / paging ──────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const range = periodRange(period);
    const rows = bills.filter(b => {
      if (statusFilter !== 'ALL' && displayStatus(b) !== statusFilter) return false;
      if (supplierFilter && String(b.supplierId) !== supplierFilter) return false;
      if (range && (b.billDate < range[0] || b.billDate > range[1])) return false;
      if (!q) return true;
      return [b.billNumber, b.supplierName, b.invoiceNumber, b.receivedBy, ...b.items.map(i => i.productName)]
        .some(v => (v ?? '').toLowerCase().includes(q));
    });
    const val = (b: SupplierBill): string | number =>
      sort.key === 'balance' ? balanceOf(b) : (b[sort.key] as string | number) ?? '';
    rows.sort((a, b) => {
      const x = val(a), y = val(b);
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return (sort.dir === 'asc' ? c : -c) || b.id - a.id;
    });
    return rows;
  }, [bills, search, statusFilter, supplierFilter, period, sort]);

  useEffect(() => { setPage(1); }, [search, statusFilter, supplierFilter, period]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: SortKey) =>
    setSort(s => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'supplierName' || key === 'billNumber' ? 'asc' : 'desc' }));

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const monthStart = format(new Date(), 'yyyy-MM-01');
    const today = todayIso();
    const confirmed = bills.filter(b => b.status === 'CONFIRMED');
    const month = confirmed.filter(b => b.billDate >= monthStart && b.billDate <= today);
    const overdue = confirmed.filter(b => displayStatus(b) === 'OVERDUE');
    return {
      monthSpend: month.reduce((s, b) => s + b.totalAmount, 0),
      monthCount: month.length,
      outstanding: confirmed.reduce((s, b) => s + balanceOf(b), 0),
      outstandingCount: confirmed.filter(b => balanceOf(b) > 0).length,
      overdueAmount: overdue.reduce((s, b) => s + balanceOf(b), 0),
      overdueCount: overdue.length,
      drafts: bills.filter(b => b.status === 'DRAFT').length,
    };
  }, [bills]);

  // ── Navigation helpers ────────────────────────────────────────────────────
  const leaveEditorOk = () =>
    view !== 'editor' || !editorRef.current?.isDirty() || window.confirm('Discard your unsaved changes to this invoice?');

  const goList = () => { if (leaveEditorOk()) setView('list'); };
  const openPreview = (b: SupplierBill) => { setPreviewId(b.id); setView('preview'); };
  const openNew = () => {
    if (!leaveEditorOk()) return;
    setEditingBill(null);
    setPrefillPoId(undefined);
    setEditorSession(n => n + 1);
    setView('editor');
  };
  const openEdit = (b: SupplierBill) => {
    setEditingBill(b);
    setEditorSession(n => n + 1);
    setView('editor');
  };

  const supplierOf = (b: SupplierBill) => suppliers.find(s => s.id === b.supplierId);
  // One label per unit received, opened in Sales & Purchases › Barcode Print.
  const handlePrintBarcodes = (b: SupplierBill) => {
    const request: BarcodePrintRequest = { billId: b.id };
    navigate('/barcode-print', { state: { barcodePrint: request } });
  };
  const handlePrint = (b: SupplierBill) => {
    const extras = {
      warehouse: b.warehouseId ? warehouseName(b.warehouseId) : undefined,
      poNumber: b.purchaseOrderId ? purchaseOrders.find(p => p.id === b.purchaseOrderId)?.poNumber : undefined,
    };
    printPurchaseDocument({
      docType: 'purchase-invoice',
      branchId: b.branchId,
      fallbackCurrency: currencyCode,
      build: (company, currency) => buildBillDocument(b, supplierOf(b), company, currency, extras, products),
      onError: msg => toast.error(msg),
    });
  };

  // ── Mutations ─────────────────────────────────────────────────────────────
  // A PO-linked invoice never adds stock itself — receiving on the PO does, so the same goods
  // can't be counted twice. If the PO still has unreceived quantity when its invoice is
  // confirmed, receive it now into the invoice's warehouse; already-received units are untouched.
  const receivePendingForPO = async (poId: number, warehouseId?: number): Promise<number> => {
    const po = await purchaseService.getOrderById(poId);
    const items = po.items
      .map(i => ({ purchaseOrderItemId: i.id, quantityReceived: Math.max(0, (i.quantityOrdered || 0) - (i.quantityReceived || 0)), warehouseId: warehouseId ?? 0 }))
      .filter(i => i.quantityReceived > 0);
    if (items.length === 0) return 0;
    if (!warehouseId) throw new Error('Select the warehouse receiving the goods before confirming');
    const updated = await purchaseService.receiveItems(poId, items);
    setPurchaseOrders(prev => prev.map(o => (o.id === updated.id ? updated : o)));
    return items.reduce((s, i) => s + i.quantityReceived, 0);
  };

  const confirmedMessage = (billNumber: string, poLinked: boolean, received: number) =>
    !poLinked
      ? `${billNumber} confirmed — stock received & payable posted`
      : received > 0
        ? `${billNumber} confirmed — ${received} pending unit${received === 1 ? '' : 's'} received from the PO & payable posted`
        : `${billNumber} confirmed — payable posted (PO goods were already received)`;

  const persist = async (req: SupplierBillRequest, confirm: boolean): Promise<SupplierBill | null> => {
    setSaving(true);
    let saved: SupplierBill | null = null;
    try {
      saved = editingBill
        ? await supplierBillService.updateBill(editingBill.id, req)
        : await supplierBillService.createBill(req);
      if (confirm) {
        const received = req.purchaseOrderId ? await receivePendingForPO(req.purchaseOrderId, req.warehouseId) : 0;
        saved = await supplierBillService.confirmBill(saved.id);
        toast.success(confirmedMessage(saved.billNumber, !!req.purchaseOrderId, received));
      } else {
        toast.success(`${saved.billNumber} saved as draft`);
      }
      await loadBills();
      if (confirm) refreshProducts();
      setPreviewId(saved.id);
      setView('preview');
      return confirm ? saved : null;
    } catch (err: any) {
      toast.error(err.message || 'Failed to save purchase invoice');
      if (saved) {
        // Saved as draft but confirm failed — keep editing that draft so a retry doesn't create a duplicate.
        setEditingBill(saved);
        await loadBills();
      }
      return null;
    } finally {
      setSaving(false);
    }
  };

  const onEditorSave = (req: SupplierBillRequest, confirm: boolean) => {
    if (confirm) setPendingConfirm({ req });
    else persist(req, false);
  };

  const confirmExisting = async (b: SupplierBill): Promise<SupplierBill | null> => {
    setBusyId(b.id);
    try {
      const received = b.purchaseOrderId ? await receivePendingForPO(b.purchaseOrderId, b.warehouseId) : 0;
      const res = await supplierBillService.confirmBill(b.id);
      toast.success(confirmedMessage(res.billNumber, !!b.purchaseOrderId, received));
      await loadBills();
      refreshProducts();
      return res;
    } catch (err: any) {
      toast.error(err.message || 'Failed to confirm invoice');
      return null;
    } finally {
      setBusyId(null);
    }
  };

  // payNow = false → the whole invoice stays on credit (supplier outstanding) until paid.
  const runPendingConfirm = async (payNow: boolean) => {
    const p = pendingConfirm;
    setPendingConfirm(null);
    if (!p) return;
    const confirmed = p.req ? await persist(p.req, true) : p.bill ? await confirmExisting(p.bill) : null;
    if (payNow && confirmed && balanceOf(confirmed) > 0) openPayment(confirmed);
  };

  const cancelBill = async (b: SupplierBill) => {
    setBusyId(b.id);
    try {
      await supplierBillService.cancelBill(b.id);
      toast.success(`${b.billNumber} cancelled`);
      await loadBills();
      if (b.status === 'CONFIRMED') refreshProducts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel invoice');
    } finally {
      setBusyId(null);
    }
  };

  const deleteBill = async (b: SupplierBill) => {
    setBusyId(b.id);
    try {
      await supplierBillService.deleteBill(b.id);
      toast.success(`${b.billNumber} deleted`);
      await loadBills();
      if (previewId === b.id) { setPreviewId(null); setView('list'); }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete invoice');
    } finally {
      setBusyId(null);
    }
  };

  const openPayment = (b: SupplierBill) => {
    paymentManager.clearLines();
    setPayNotes('');
    setPayNowInput(balanceOf(b).toFixed(2));
    setPayDate(todayIso());
    setPayingBill(b);
  };

  const handleRecordPayment = async () => {
    if (!payingBill) return;
    if (payNow <= 0) {
      toast.error('Enter the amount you are paying now — or close this and leave the invoice on credit');
      return;
    }
    if (!paymentManager.settleable) {
      toast.error('Allocate the amount being paid now across the payment methods');
      return;
    }
    if (payDate > todayIso()) {
      toast.error('Payment date cannot be in the future');
      return;
    }
    if (paidNow <= 0) {
      // Everything allocated to Credit — nothing changes hands, the bill simply stays payable.
      toast.success(`${payingBill.billNumber} kept on credit`);
      setPayingBill(null);
      paymentManager.clearLines();
      setPayNotes('');
      return;
    }
    setSaving(true);
    try {
      const payload = buildPaymentPayload(paymentManager.paymentLines, payNow);
      // Credit lines are excluded from what's posted as paid (payload.paidAmount already
      // nets them out); the legacy bridge would otherwise book a Credit leg as CASH.
      const legacy = toLegacyPayment(paymentManager.paymentLines.filter(l => l.paymentType !== PAYMENT_TYPES.CREDIT));
      const paymentMethod = legacy.paymentMethod === 'CASH' ? 'cash'
        : legacy.paymentMethod === 'CARD' ? 'credit_card'
        : legacy.paymentMethod === 'ONLINE' ? 'bank_transfer'
        : 'Mixed';
      await supplierBillService.recordPayment(payingBill.id, payload.paidAmount, paymentMethod, payNotes || undefined, legacy.paymentBreakdown, payDate);
      toast.success(leftOnCredit > 0
        ? `Paid ${paidNow.toFixed(2)} on ${payingBill.billNumber} — ${leftOnCredit.toFixed(2)} left on credit`
        : `${payingBill.billNumber} paid in full`);
      setPayingBill(null);
      paymentManager.clearLines();
      setPayNotes('');
      await loadBills();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  // ── Suppliers (quick add from the editor; full management lives in the Suppliers module) ──
  const openCreateSupplier = () => setShowSupplierForm(true);

  const onSupplierSaved = async (created: Supplier) => {
    setSuppliers(await purchaseService.getAllSuppliers().catch(() => suppliers));
    if (view === 'editor' && created?.id) setNewSupplier({ id: created.id, nonce: Date.now() });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const editorReadOnly = !!editingBill && editingBill.status !== 'DRAFT';
  const SortIcon = ({ k }: { k: SortKey }) => (sort.key === k ? (sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : null);

  return (
    <div className={styles.page}>
      <ModuleHeader
        title="Purchase Invoices"
        icon={ShoppingBag}
        subtitle="Supplier bills for stock and services you buy — receive stock, track payables and pay suppliers"
        meta={view === 'editor' ? (
          <>
            {editingBill
              ? <span className={cx(styles.pill, statusMeta(displayStatus(editingBill)).cls)}>{statusMeta(displayStatus(editingBill)).label}</span>
              : <span className={cx(styles.pill, styles.pillGray)}>Draft (new)</span>}
            <span>Bill No: <strong>{editingBill?.billNumber ?? '—'}</strong></span>
          </>
        ) : undefined}
        actions={
          <>
            {view !== 'list' && (
              <Button variant="outline" size="sm" onClick={goList}><ArrowLeft className="h-4 w-4" /> Back</Button>
            )}
            {view === 'editor' && !editorReadOnly && (
              <>
                <Button variant="outline" size="sm" disabled={saving} onClick={() => editorRef.current?.save(false)}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Draft
                </Button>
                <Button size="sm" disabled={saving} onClick={() => editorRef.current?.save(true)}>
                  <CheckCircle2 className="h-4 w-4" /> Confirm
                </Button>
              </>
            )}
            {view === 'editor' && (
              <Button variant="outline" size="sm" onClick={() => editorRef.current?.print()}><Printer className="h-4 w-4" /> Print</Button>
            )}
            {view === 'list' && (
              <>
                <Button variant="outline" size="sm" disabled={filtered.length === 0}
                  onClick={() => exportBillsCsv(filtered, currencyCode, warehouseName)}>
                  <Download className="h-4 w-4" /> Export
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/suppliers')}><Users className="h-4 w-4" /> Suppliers</Button>
              </>
            )}
            {view !== 'editor' && (
              <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> New Purchase Invoice</Button>
            )}
          </>
        }
        tabs={[
          { key: 'list', label: 'Invoice List', icon: FileText, active: view !== 'editor', onClick: goList },
          { key: 'editor', label: 'Invoice Editor', icon: ShoppingBag, active: view === 'editor', onClick: () => { if (view !== 'editor') openNew(); } },
        ]}
      />

      {/* ── LIST ── */}
      {view === 'list' && (
        <div className={styles.fadeIn} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className={styles.kpiGrid}>
            <StatCard title="This Month Spend" icon={TrendingUp} tone="green" loading={loading}
              value={<CurrencyValue amount={kpi.monthSpend} options={fmt2} />} sub={`${kpi.monthCount} confirmed invoice${kpi.monthCount === 1 ? '' : 's'}`} />
            <StatCard title="Outstanding Payable" icon={CreditCard} tone="red" loading={loading}
              value={<CurrencyValue amount={kpi.outstanding} options={fmt2} />} sub={`${kpi.outstandingCount} unpaid invoice${kpi.outstandingCount === 1 ? '' : 's'}`} />
            <StatCard title="Overdue" icon={AlertTriangle} tone="orange" loading={loading}
              value={<CurrencyValue amount={kpi.overdueAmount} options={fmt2} />} sub={`${kpi.overdueCount} past due date`} />
            <StatCard title="Drafts to Confirm" icon={Clock} tone="blue" loading={loading}
              value={kpi.drafts} sub="Not yet posted to stock" />
          </div>

          <div className={cx(styles.panel, styles.panelPad)}>
            <div className={styles.toolbar}>
              <h3 className={styles.panelTitle}>
                All Purchase Invoices <span className={cx(styles.muted, styles.tiny)} style={{ fontWeight: 500 }}>({filtered.length})</span>
              </h3>
              <div className={styles.filters}>
                <div className={styles.searchBox}>
                  <Search size={14} />
                  <input className={styles.searchInput} placeholder="Search bill no, supplier, item…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <NativeSelect value={period} onChange={v => setPeriod(v as Period)} options={PERIODS} label="Period" />
                <NativeSelect value={statusFilter} onChange={v => setStatusFilter(v as DisplayStatus | 'ALL')} options={STATUS_FILTERS} label="Status" />
                <NativeSelect value={supplierFilter} onChange={setSupplierFilter} label="Supplier"
                  options={[{ value: '', label: 'All Suppliers' }, ...suppliers.map(s => ({ value: String(s.id), label: s.name }))]} />
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.center} style={{ width: 56 }}>S.No.</th>
                    <th className={styles.sortable} onClick={() => toggleSort('billNumber')}><span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>Bill No <SortIcon k="billNumber" /></span></th>
                    <th className={styles.sortable} onClick={() => toggleSort('billDate')}><span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>Date <SortIcon k="billDate" /></span></th>
                    <th className={styles.sortable} onClick={() => toggleSort('supplierName')}><span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>Supplier <SortIcon k="supplierName" /></span></th>
                    <th>Source</th>
                    <th>Warehouse</th>
                    <th>Priority</th>
                    <th className={cx(styles.sortable, styles.right)} onClick={() => toggleSort('totalAmount')}><span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>Net Amount <SortIcon k="totalAmount" /></span></th>
                    <th className={cx(styles.sortable, styles.right)} onClick={() => toggleSort('amountPaid')}><span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>Paid <SortIcon k="amountPaid" /></span></th>
                    <th className={styles.sortable} onClick={() => toggleSort('balance')}><span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>Balance / Status <SortIcon k="balance" /></span></th>
                    <th className={styles.right}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && bills.length === 0 && Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`sk${i}`}>{Array.from({ length: 11 }).map((__, j) => <td key={j}><div className={styles.skeleton} style={{ width: j === 3 ? 120 : 60 }} /></td>)}</tr>
                  ))}
                  {pageRows.map((b, idx) => {
                    const st = statusMeta(displayStatus(b));
                    const pr = priorityMeta(b.priority);
                    const a = billActions(b);
                    const po = b.purchaseOrderId ? purchaseOrders.find(p => p.id === b.purchaseOrderId) : undefined;
                    const busy = busyId === b.id;
                    return (
                      <tr key={b.id} className={cx(styles.row, b.id === previewId && styles.rowSelected)} onClick={() => openPreview(b)}>
                        <td className={cx(styles.center, styles.muted, styles.mono)}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{b.billNumber}</div>
                          {b.invoiceNumber && <div className={cx(styles.tiny, styles.muted)}>Supp. inv: {b.invoiceNumber}</div>}
                        </td>
                        <td>
                          <div>{displayDate(b.billDate)}</div>
                          {b.dueDate && <div className={cx(styles.tiny, displayStatus(b) === 'OVERDUE' ? styles.danger : styles.muted)}>Due {displayDate(b.dueDate)}</div>}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{b.supplierName}</div>
                          {supplierOf(b)?.contactPerson && <div className={cx(styles.tiny, styles.muted)}>{supplierOf(b)!.contactPerson}</div>}
                        </td>
                        <td>
                          <span className={cx(styles.pill, po || b.purchaseOrderId ? styles.pillPurple : styles.pillPrimary)}>
                            {po ? `PO ${po.poNumber}` : b.purchaseOrderId ? 'Purchase Order' : 'Direct'}
                          </span>
                        </td>
                        <td className={styles.muted}>{warehouseName(b.warehouseId)}</td>
                        <td><span className={cx(styles.pill, pr.cls)}>{pr.label}</span></td>
                        <td className={cx(styles.right, styles.num)} style={{ fontWeight: 600 }}>
                          <CurrencyValue amount={b.totalAmount} options={fmt2} />
                          <div className={cx(styles.tiny, styles.muted)} style={{ fontWeight: 400 }}>{b.items.length} item{b.items.length === 1 ? '' : 's'}</div>
                        </td>
                        <td className={cx(styles.right, styles.num, styles.success)}>
                          <CurrencyValue amount={b.amountPaid} options={fmt2} />
                          {b.amountPaid > 0 && <div className={cx(styles.tiny, styles.muted)}>{paymentSummaryLabel(b)}</div>}
                        </td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            {b.status === 'CONFIRMED' && balanceOf(b) > 0 && (
                              <CurrencyValue amount={balanceOf(b)} options={fmt2} className={cx(styles.danger, styles.num)} />
                            )}
                            <span className={cx(styles.pill, st.cls)}>{st.label}</span>
                          </span>
                        </td>
                        <td>
                          <div className={styles.rowActions} onClick={e => e.stopPropagation()}>
                            <IconBtn title="View" onClick={() => openPreview(b)}><Eye size={15} /></IconBtn>
                            {a.edit && <IconBtn title="Edit" onClick={() => openEdit(b)}><Edit size={15} /></IconBtn>}
                            {a.confirm && <IconBtn title="Confirm" tone={styles.iconBtnPrimary} disabled={busy} onClick={() => setPendingConfirm({ bill: b })}>
                              {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                            </IconBtn>}
                            {a.recordPayment && <IconBtn title="Record payment" tone={styles.iconBtnGreen} onClick={() => openPayment(b)}><Wallet size={15} /></IconBtn>}
                            <IconBtn title="Print" onClick={() => handlePrint(b)}><Printer size={15} /></IconBtn>
                            {b.items.some(i => i.productId != null) && (
                              <IconBtn title="Print barcode labels" onClick={() => handlePrintBarcodes(b)}><ScanBarcode size={15} /></IconBtn>
                            )}
                            {a.cancel && <IconBtn title="Cancel" tone={styles.iconBtnAmber} disabled={busy} onClick={() => setPendingCancel(b)}><XCircle size={15} /></IconBtn>}
                            {a.delete && <IconBtn title="Delete" tone={styles.iconBtnRed} disabled={busy} onClick={() => setPendingDelete(b)}><Trash2 size={15} /></IconBtn>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={11} className={styles.emptyCell}>
                        <Receipt size={32} style={{ margin: '0 auto 8px', opacity: 0.35 }} />
                        <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>
                          {bills.length === 0 ? 'No purchase invoices yet' : 'No invoices match these filters'}
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          {bills.length === 0 ? 'Record your first supplier bill to start tracking stock and payables.' : 'Try clearing the search or changing the filters.'}
                        </div>
                        {bills.length === 0 && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> New Purchase Invoice</Button>}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className={styles.mobileList}>
              {pageRows.map(b => {
                const st = statusMeta(displayStatus(b));
                return (
                  <button key={b.id} type="button" className={styles.mobileCard} onClick={() => openPreview(b)}>
                    <div className={styles.cardLine}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{b.billNumber}</span>
                      <span className={cx(styles.pill, st.cls)}>{st.label}</span>
                    </div>
                    <div className={cx(styles.tiny, styles.muted)} style={{ margin: '2px 0 8px' }}>{displayDate(b.billDate)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, marginBottom: 10 }}><User size={12} /> {b.supplierName}</div>
                    <div className={styles.cardLine} style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                      <span><span className={styles.eyebrow} style={{ display: 'block' }}>Net</span><CurrencyValue amount={b.totalAmount} options={fmt2} className="font-bold" /></span>
                      <span style={{ textAlign: 'right' }}><span className={styles.eyebrow} style={{ display: 'block' }}>Balance</span><CurrencyValue amount={balanceOf(b)} options={fmt2} className={cx('font-bold', styles.danger)} /></span>
                    </div>
                  </button>
                );
              })}
              {!loading && filtered.length === 0 && <div className={styles.empty}>No invoices found.</div>}
            </div>

            {filtered.length > 0 && (
              <div className={styles.pager}>
                <span>
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} invoices
                </span>
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

      {/* ── PREVIEW ── */}
      {view === 'preview' && (
        <PurchaseInvoicePreview
          bills={filtered}
          loading={loading}
          selectedId={previewId}
          onSelect={b => setPreviewId(b.id)}
          searchTerm={search}
          onSearchChange={setSearch}
          suppliers={suppliers}
          purchaseOrders={purchaseOrders}
          products={products}
          warehouseName={warehouseName}
          busyId={busyId}
          onBack={goList}
          onEdit={openEdit}
          onConfirm={b => setPendingConfirm({ bill: b })}
          onRecordPayment={openPayment}
          onCancel={setPendingCancel}
          onDelete={setPendingDelete}
          onPrint={handlePrint}
          onPrintBarcodes={handlePrintBarcodes}
        />
      )}

      {/* ── EDITOR ── */}
      {view === 'editor' && (
        <PurchaseInvoiceEditor
          key={`${editorSession}-${editingBill?.id ?? 'new'}`}
          ref={editorRef}
          bill={editingBill}
          allBills={bills}
          suppliers={suppliers}
          warehouses={warehouses}
          products={products}
          purchaseOrders={purchaseOrders}
          saving={saving}
          selectSupplier={newSupplier}
          initialPurchaseOrderId={editingBill ? undefined : prefillPoId}
          onSave={onEditorSave}
          onPrint={handlePrint}
          onAddSupplier={openCreateSupplier}
          onRecordPayment={openPayment}
          onRefreshProducts={refreshProducts}
        />
      )}

      {/* ── Confirm (post) ── */}
      <AlertDialog open={!!pendingConfirm} onOpenChange={o => { if (!o) setPendingConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm purchase invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingConfirm?.bill ? `${pendingConfirm.bill.billNumber} will be locked. ` : 'The invoice will be saved and locked. '}
              {(pendingConfirm?.req?.purchaseOrderId ?? pendingConfirm?.bill?.purchaseOrderId)
                ? `It is linked to a purchase order: any quantity not yet received on that PO is received into ${warehouseName(pendingConfirm?.req?.warehouseId ?? pendingConfirm?.bill?.warehouseId)} now, and the supplier payable is posted. Goods already received on the PO are not added again.`
                : `Stock for its catalog items will be added to ${warehouseName(pendingConfirm?.req?.warehouseId ?? pendingConfirm?.bill?.warehouseId)} and the supplier payable is posted.`}
              {' '}Confirmed invoices can’t be edited — only cancelled.
              <br /><br />
              <strong>Confirm on Credit</strong> leaves the full amount as supplier outstanding to pay later;{' '}
              <strong>Confirm &amp; Pay Now</strong> opens the payment window straight after (full or part payment).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction className="bg-secondary text-secondary-foreground" onClick={() => runPendingConfirm(false)}>Confirm on Credit</AlertDialogAction>
            <AlertDialogAction onClick={() => runPendingConfirm(true)}>Confirm &amp; Pay Now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Cancel ── */}
      <AlertDialog open={!!pendingCancel} onOpenChange={o => { if (!o) setPendingCancel(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {pendingCancel?.billNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCancel?.status === 'CONFIRMED' && !pendingCancel.purchaseOrderId
                ? 'Stock that this invoice added will be reversed. '
                : ''}
              This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Invoice</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const b = pendingCancel; setPendingCancel(null); if (b) cancelBill(b); }}>Cancel Invoice</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete ── */}
      <AlertDialog open={!!pendingDelete} onOpenChange={o => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete draft {pendingDelete?.billNumber}?</AlertDialogTitle>
            <AlertDialogDescription>The draft and its lines will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600" onClick={() => { const b = pendingDelete; setPendingDelete(null); if (b) deleteBill(b); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Record payment ── */}
      <Dialog open={!!payingBill} onOpenChange={open => {
        if (!open) { setPayingBill(null); paymentManager.clearLines(); setPayNotes(''); }
      }}>
        {/* Header / scrolling body / pinned footer: the allocation panel grows with every
            payment line, and an uncapped centered dialog then overflows the screen on both
            ends (title and Record button unreachable). Height is capped to the real
            viewport — body is at zoom 0.9, hence the /0.9 (same as the sidebar's fix). */}
        <DialogContent
          style={{
            display: 'flex', flexDirection: 'column', gap: 0, padding: 0, overflow: 'hidden',
            width: '100%', maxWidth: 'min(28rem, calc(100% - 2rem))',
            maxHeight: 'calc(100dvh / 0.9 - 2rem)',
          }}
        >
          <DialogHeader style={{ flexShrink: 0, padding: '20px 48px 12px 20px', textAlign: 'left' }}>
            <DialogTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Record Payment</DialogTitle>
            <DialogDescription>
              {payingBill && <>{payingBill.billNumber} · {payingBill.supplierName} — balance <CurrencyValue amount={payingBillBalance} options={fmt2} /></>}
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: '4px 20px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              <div>
                <Label htmlFor="pay-now">Paying now</Label>
                <Input id="pay-now" type="number" min={0} max={payingBillBalance} step="0.01" value={payNowInput}
                  onChange={e => { setPayNowInput(e.target.value); paymentManager.clearLines(); }} />
              </div>
              <div>
                <Label htmlFor="pay-date">Payment date</Label>
                <Input id="pay-date" type="date" max={todayIso()} value={payDate} onChange={e => setPayDate(e.target.value)} />
              </div>
            </div>
            <div className={cx(styles.notice, leftOnCredit > 0 ? styles.noticeWarn : styles.noticeInfo)} style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <span>Balance due <strong><CurrencyValue amount={payingBillBalance} options={fmt2} /></strong></span>
              <span>{leftOnCredit > 0
                ? <>Left on credit <strong><CurrencyValue amount={leftOnCredit} options={fmt2} /></strong> (supplier outstanding)</>
                : <>Settles the invoice in full</>}</span>
              <span style={{ display: 'flex', gap: 6 }}>
                <Button type="button" variant="outline" size="sm" onClick={() => { setPayNowInput(payingBillBalance.toFixed(2)); paymentManager.clearLines(); }}>Full</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => { setPayNowInput((Math.round(payingBillBalance * 50) / 100).toFixed(2)); paymentManager.clearLines(); }}>Half</Button>
              </span>
            </div>
            <PaymentAllocationPanel
              manager={paymentManager}
              invoiceTotal={payNow}
              bankAccounts={bankAccounts}
              offeredTypes={[PAYMENT_TYPES.CASH, PAYMENT_TYPES.CARD, PAYMENT_TYPES.ONLINE, PAYMENT_TYPES.CREDIT]}
              creditParty={payingBill ? {
                code: String(payingBill.supplierId),
                name: payingBill.supplierName,
                roleLabel: 'Supplier',
                accountLabel: 'Accounts Payable',
              } : undefined}
            />
            <div>
              <Label>Notes</Label>
              <Textarea placeholder="Payment reference or notes..." rows={2} value={payNotes} onChange={e => setPayNotes(e.target.value)} />
            </div>
          </div>
          <div style={{ flexShrink: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, padding: '12px 20px 16px', borderTop: '1px solid var(--border)' }}>
            <Button variant="outline" onClick={() => setPayingBill(null)}>{leftOnCredit >= payingBillBalance ? 'Keep on Credit' : 'Cancel'}</Button>
            <Button onClick={handleRecordPayment} disabled={saving || payNow <= 0 || !paymentManager.settleable}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
              {leftOnCredit > 0 ? 'Record Part Payment' : 'Record Payment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SupplierFormDialog open={showSupplierForm} supplier={null} onOpenChange={setShowSupplierForm} onSaved={onSupplierSaved} />
    </div>
  );
}
