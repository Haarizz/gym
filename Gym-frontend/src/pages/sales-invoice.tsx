import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowUp, CheckCircle, CheckCircle2, CreditCard, DollarSign, Download, Edit, Eye, FileText,
  Loader2, Plus, Printer, Receipt, Save, Search, ShoppingCart, Trash2, TrendingUp, User, Wallet, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { CurrencyValue, useCurrency } from '../utils/currency';
import { useBranch } from '../utils/branch-context';
import { accountHeadsService, AccountHead } from '../utils/supabase/account-heads-service';
import { financialSettingsService } from '../utils/supabase/financial-settings-service';
import { membersService } from '../utils/supabase/members-service';
import { staffService } from '../utils/supabase/staff-service';
import { productsService, Product, Warehouse } from '../utils/supabase/products-service';
import { salesInvoiceService, SalesInvoice, SalesInvoiceRequest } from '../utils/supabase/sales-invoice-service';
import { SalesInvoiceSettleDialog, type SettleRequest } from '../components/sales-invoice/SalesInvoiceSettleDialog';
import styles from '../components/purchase/PurchaseInvoice.module.css';
import { IconBtn, ModuleHeader, NativeSelect, StatCard, cx } from '../components/purchase/purchaseUi';
import { displayDate, todayIso } from '../components/purchase/purchaseInvoiceUtils';
import { SalesInvoiceEditor, SalesInvoiceEditorHandle } from '../components/sales-invoice/SalesInvoiceEditor';
import { SalesInvoicePreview } from '../components/sales-invoice/SalesInvoicePreview';
import {
  STATUS_FILTERS, DisplayStatus, balanceOf, customerTypeMeta, displayStatus, exportInvoicesCsv, fetchAllInvoices,
  invoiceActions, paymentSummaryLabel, statusMeta,
} from '../components/sales-invoice/salesInvoiceUtils';
import { printPurchaseDocument } from '../components/print-templates/purchasePrint';
import { buildSalesInvoiceDocument } from '../components/print-templates/salesInvoicePrint';

const fmt2 = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
const PAGE_SIZE = 20;

type View = 'list' | 'preview' | 'editor';
type SortKey = 'invoiceNumber' | 'invoiceDate' | 'customerName' | 'totalAmount' | 'amountPaid' | 'balance';
type Period = 'ALL' | 'TODAY' | 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_90' | 'THIS_YEAR';
type Settle = SettleRequest;

const PERIODS: { value: Period; label: string }[] = [
  { value: 'ALL', label: 'All Time' },
  { value: 'TODAY', label: 'Today' },
  { value: 'THIS_MONTH', label: 'This Month' },
  { value: 'LAST_MONTH', label: 'Last Month' },
  { value: 'LAST_90', label: 'Last 90 Days' },
  { value: 'THIS_YEAR', label: 'This Year' },
];

function periodRange(p: Period): [string, string] | null {
  const now = new Date();
  const iso = (d: Date) => format(d, 'yyyy-MM-dd');
  switch (p) {
    case 'TODAY': return [iso(now), iso(now)];
    case 'THIS_MONTH': return [iso(new Date(now.getFullYear(), now.getMonth(), 1)), iso(now)];
    case 'LAST_MONTH': return [iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), iso(new Date(now.getFullYear(), now.getMonth(), 0))];
    case 'LAST_90': { const d = new Date(now); d.setDate(d.getDate() - 90); return [iso(d), iso(now)]; }
    case 'THIS_YEAR': return [iso(new Date(now.getFullYear(), 0, 1)), iso(now)];
    default: return null;
  }
}

export function SalesInvoicePage() {
  const { currencyCode } = useCurrency();
  const { activeBranchName } = useBranch();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [bankAccounts, setBankAccounts] = useState<AccountHead[]>([]);
  const [staffNames, setStaffNames] = useState<string[]>([]);
  const [stockCheckEnabled, setStockCheckEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  // ── Navigation ────────────────────────────────────────────────────────────
  const [view, setView] = useState<View>('list');
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [editing, setEditing] = useState<SalesInvoice | null>(null);
  const [editorSession, setEditorSession] = useState(0);
  const editorRef = useRef<SalesInvoiceEditorHandle>(null);
  // Member IDs (e.g. GYM-0042) for printing, keyed by member DB id.
  const memberCodes = useRef(new Map<number, string>());

  // ── List filters ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DisplayStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState('');
  const [period, setPeriod] = useState<Period>('ALL');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'invoiceDate', dir: 'desc' });
  const [page, setPage] = useState(1);

  // ── Dialogs ───────────────────────────────────────────────────────────────
  const [settle, setSettle] = useState<Settle | null>(null);
  const [pendingCancel, setPendingCancel] = useState<SalesInvoice | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SalesInvoice | null>(null);

  // ── Loading ───────────────────────────────────────────────────────────────
  const loadInvoices = useCallback(async () => {
    try {
      setInvoices(await fetchAllInvoices());
    } catch (err: any) {
      toast.error(err.message || 'Failed to load sales invoices');
    }
  }, []);

  const refreshProducts = () =>
    productsService.getProducts({ size: 500 }).then(r => setProducts(r.products ?? [])).catch(() => undefined);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [invRes, whRes, prodRes, bankRes, staffRes, settingsRes] = await Promise.allSettled([
        fetchAllInvoices(),
        productsService.getActiveWarehouses(),
        productsService.getProducts({ size: 500 }),
        accountHeadsService.getBankAccounts(),
        staffService.getStaff({}, 1, 200),
        financialSettingsService.getSettings('SALES_SETTINGS'),
      ]);
      if (invRes.status === 'fulfilled') setInvoices(invRes.value);
      else toast.error(invRes.reason?.message || 'Failed to load sales invoices');
      if (whRes.status === 'fulfilled') setWarehouses(whRes.value);
      if (prodRes.status === 'fulfilled') setProducts(prodRes.value.products ?? []);
      if (bankRes.status === 'fulfilled') setBankAccounts(bankRes.value);
      if (staffRes.status === 'fulfilled') {
        setStaffNames([...new Set((staffRes.value.items ?? []).filter(s => s.status !== 'inactive').map(s => s.name).filter(Boolean))].sort());
      }
      // Stock Check defaults to ON until it's explicitly turned off — same as the backend.
      setStockCheckEnabled(settingsRes.status === 'fulfilled'
        ? settingsRes.value.find(s => s.settingKey === 'stock_check_enabled')?.settingValue !== 'false'
        : true);
      setLoading(false);
    })();
  }, []);

  const warehouseName = useCallback(
    (id?: number) => (id ? warehouses.find(w => w.id === id)?.name ?? `Warehouse #${id}` : '—'),
    [warehouses],
  );

  // Deep link: ?invoice=<id> opens that invoice.
  useEffect(() => {
    if (loading) return;
    const id = Number(searchParams.get('invoice'));
    if (!id) return;
    const inv = invoices.find(i => i.id === id);
    if (inv) openPreview(inv); else toast.error('That sales invoice could not be found');
    setSearchParams({}, { replace: true });
  }, [searchParams, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtering / sorting / paging ──────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const range = periodRange(period);
    const rows = invoices.filter(i => {
      if (statusFilter !== 'ALL' && displayStatus(i) !== statusFilter) return false;
      if (typeFilter && i.customerType !== typeFilter) return false;
      if (range && (i.invoiceDate < range[0] || i.invoiceDate > range[1])) return false;
      if (!q) return true;
      return [i.invoiceNumber, i.customerName, i.customerPhone, i.reference, i.salesperson, ...i.items.map(x => x.productName)]
        .some(v => (v ?? '').toLowerCase().includes(q));
    });
    const val = (i: SalesInvoice): string | number => (sort.key === 'balance' ? balanceOf(i) : (i[sort.key] as string | number) ?? '');
    rows.sort((a, b) => {
      const x = val(a), y = val(b);
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return (sort.dir === 'asc' ? c : -c) || b.id - a.id;
    });
    return rows;
  }, [invoices, search, statusFilter, typeFilter, period, sort]);

  useEffect(() => { setPage(1); }, [search, statusFilter, typeFilter, period]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: SortKey) =>
    setSort(s => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'customerName' || key === 'invoiceNumber' ? 'asc' : 'desc' }));

  // ── KPIs (BillBull: today, this month, outstanding AR, invoices this month) ──
  const kpi = useMemo(() => {
    const today = todayIso();
    const monthStart = format(new Date(), 'yyyy-MM-01');
    const confirmed = invoices.filter(i => i.status === 'CONFIRMED');
    const todays = confirmed.filter(i => i.invoiceDate === today);
    const month = confirmed.filter(i => i.invoiceDate >= monthStart && i.invoiceDate <= today);
    return {
      todayRevenue: todays.reduce((s, i) => s + i.totalAmount, 0),
      todayCount: todays.length,
      monthRevenue: month.reduce((s, i) => s + i.totalAmount, 0),
      monthCount: month.length,
      outstanding: confirmed.reduce((s, i) => s + balanceOf(i), 0),
      outstandingCount: confirmed.filter(i => balanceOf(i) > 0).length,
      drafts: invoices.filter(i => i.status === 'DRAFT').length,
    };
  }, [invoices]);

  // ── Navigation helpers ────────────────────────────────────────────────────
  const leaveEditorOk = () =>
    view !== 'editor' || !editorRef.current?.isDirty() || window.confirm('Discard your unsaved changes to this invoice?');

  const goList = () => { if (leaveEditorOk()) setView('list'); };
  const openPreview = (i: SalesInvoice) => { setPreviewId(i.id); setView('preview'); };
  const openNew = () => {
    if (!leaveEditorOk()) return;
    setEditing(null);
    setEditorSession(n => n + 1);
    setView('editor');
  };
  const openEdit = (i: SalesInvoice) => {
    setEditing(i);
    setEditorSession(n => n + 1);
    setView('editor');
  };

  const handlePrint = async (inv: SalesInvoice, memberCode?: string) => {
    let code = memberCode ?? (inv.memberId ? memberCodes.current.get(inv.memberId) : undefined);
    if (!code && inv.memberId) {
      code = await membersService.getMemberById(String(inv.memberId)).then(m => m.member_id || undefined).catch(() => undefined);
      if (code) memberCodes.current.set(inv.memberId, code);
    }
    printPurchaseDocument({
      docType: 'sales-invoice',
      branchId: inv.branchId,
      fallbackCurrency: currencyCode,
      build: (company, currency) => buildSalesInvoiceDocument(inv, company, currency, { memberCode: code }, products),
      onError: msg => toast.error(msg),
    });
  };

  // ── Mutations ─────────────────────────────────────────────────────────────
  const onEditorSave = async (req: SalesInvoiceRequest, confirm: boolean, memberCode?: string) => {
    setSaving(true);
    try {
      const saved = editing
        ? await salesInvoiceService.updateInvoice(editing.id, req)
        : await salesInvoiceService.createInvoice(req);
      if (saved.memberId && memberCode) memberCodes.current.set(saved.memberId, memberCode);
      setEditing(saved);
      await loadInvoices();
      if (confirm) {
        // Saved as draft first; confirming happens in the settlement window.
        openSettle(saved, 'confirm');
      } else {
        toast.success(`${saved.invoiceNumber} saved as draft`);
        setPreviewId(saved.id);
        setView('preview');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save sales invoice');
    } finally {
      setSaving(false);
    }
  };

  const openSettle = (inv: SalesInvoice, mode: Settle['mode']) => setSettle({ inv, mode });

  const closeSettle = () => {
    if (settle?.mode === 'confirm') toast.info(`${settle.inv.invoiceNumber} is saved as a draft — confirm it when ready`);
    setSettle(null);
  };

  const onSettled = async (res: SalesInvoice, mode: Settle['mode']) => {
    setSettle(null);
    await loadInvoices();
    if (mode === 'confirm') {
      refreshProducts();
      setEditing(null);
      setPreviewId(res.id);
      setView('preview');
    }
  };

  const cancelInvoice = async (inv: SalesInvoice) => {
    setBusyId(inv.id);
    try {
      await salesInvoiceService.cancelInvoice(inv.id);
      toast.success(`${inv.invoiceNumber} cancelled`);
      await loadInvoices();
      if (inv.status === 'CONFIRMED') refreshProducts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel invoice');
    } finally {
      setBusyId(null);
    }
  };

  const deleteInvoice = async (inv: SalesInvoice) => {
    setBusyId(inv.id);
    try {
      await salesInvoiceService.deleteInvoice(inv.id);
      toast.success(`${inv.invoiceNumber} deleted`);
      await loadInvoices();
      if (previewId === inv.id) { setPreviewId(null); setView('list'); }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete invoice');
    } finally {
      setBusyId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const editorReadOnly = !!editing && editing.status !== 'DRAFT';
  const SortIcon = ({ k }: { k: SortKey }) => (sort.key === k ? (sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : null);
  const sortTh = (k: SortKey, label: string, right = false) => (
    <th className={cx(styles.sortable, right && styles.right)} onClick={() => toggleSort(k)}>
      <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>{label} <SortIcon k={k} /></span>
    </th>
  );

  return (
    <div className={styles.page}>
      <ModuleHeader
        title="Sales Invoices"
        icon={ShoppingCart}
        subtitle="Direct sales to members and walk-in customers — issue tax invoices, take stock out and collect payments"
        meta={view === 'editor' ? (
          <>
            {editing
              ? <span className={cx(styles.pill, statusMeta(displayStatus(editing)).cls)}>{statusMeta(displayStatus(editing)).label}</span>
              : <span className={cx(styles.pill, styles.pillGray)}>Draft (new)</span>}
            <span>Invoice No: <strong>{editing?.invoiceNumber ?? '—'}</strong></span>
          </>
        ) : undefined}
        actions={
          <>
            {view !== 'list' && <Button variant="outline" size="sm" onClick={goList}><ArrowLeft className="h-4 w-4" /> Back</Button>}
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
              <Button variant="outline" size="sm" disabled={filtered.length === 0} onClick={() => exportInvoicesCsv(filtered, currencyCode)}>
                <Download className="h-4 w-4" /> Export
              </Button>
            )}
            {view !== 'editor' && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> Create New</Button>}
          </>
        }
        tabs={[
          { key: 'list', label: 'Invoice List', icon: FileText, active: view !== 'editor', onClick: goList },
          { key: 'editor', label: 'Invoice Editor', icon: ShoppingCart, active: view === 'editor', onClick: () => { if (view !== 'editor') openNew(); } },
        ]}
      />

      {/* ── LIST ── */}
      {view === 'list' && (
        <div className={styles.fadeIn} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className={styles.kpiGrid}>
            <StatCard title="Today's Revenue" icon={TrendingUp} tone="orange" loading={loading}
              value={<CurrencyValue amount={kpi.todayRevenue} options={fmt2} />} sub={`${kpi.todayCount} invoice${kpi.todayCount === 1 ? '' : 's'} today`} />
            <StatCard title="This Month Revenue" icon={DollarSign} tone="green" loading={loading}
              value={<CurrencyValue amount={kpi.monthRevenue} options={fmt2} />} sub={`${kpi.monthCount} confirmed invoice${kpi.monthCount === 1 ? '' : 's'}`} />
            <StatCard title="Outstanding AR" icon={CreditCard} tone="red" loading={loading}
              value={<CurrencyValue amount={kpi.outstanding} options={fmt2} />} sub={`${kpi.outstandingCount} unpaid invoice${kpi.outstandingCount === 1 ? '' : 's'}`} />
            <StatCard title="Drafts to Confirm" icon={Receipt} tone="blue" loading={loading}
              value={kpi.drafts} sub="Not yet posted — no stock taken" />
          </div>

          <div className={cx(styles.panel, styles.panelPad)}>
            <div className={styles.toolbar}>
              <h3 className={styles.panelTitle}>
                All Invoices <span className={cx(styles.muted, styles.tiny)} style={{ fontWeight: 500 }}>({filtered.length})</span>
              </h3>
              <div className={styles.filters}>
                <div className={styles.searchBox}>
                  <Search size={14} />
                  <input className={styles.searchInput} placeholder="Search invoice, customer, item…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <NativeSelect value={period} onChange={v => setPeriod(v as Period)} options={PERIODS} label="Period" />
                <NativeSelect value={statusFilter} onChange={v => setStatusFilter(v as DisplayStatus | 'ALL')} options={STATUS_FILTERS} label="Status" />
                <NativeSelect value={typeFilter} onChange={setTypeFilter} label="Customer type"
                  options={[{ value: '', label: 'All Customers' }, { value: 'MEMBER', label: 'Members' }, { value: 'WALK_IN', label: 'Walk-in' }]} />
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.center} style={{ width: 56 }}>S.No.</th>
                    {sortTh('invoiceNumber', 'Invoice No')}
                    {sortTh('invoiceDate', 'Date')}
                    {sortTh('customerName', 'Customer')}
                    <th>Salesperson</th>
                    <th>Pay Mode</th>
                    {sortTh('totalAmount', 'Net Amount', true)}
                    {sortTh('amountPaid', 'Paid', true)}
                    {sortTh('balance', 'Balance / Status')}
                    <th className={styles.right}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && invoices.length === 0 && Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`sk${i}`}>{Array.from({ length: 10 }).map((__, j) => <td key={j}><div className={styles.skeleton} style={{ width: j === 3 ? 120 : 60 }} /></td>)}</tr>
                  ))}
                  {pageRows.map((inv, idx) => {
                    const st = statusMeta(displayStatus(inv));
                    const ct = customerTypeMeta(inv);
                    const a = invoiceActions(inv);
                    const busy = busyId === inv.id;
                    return (
                      <tr key={inv.id} className={cx(styles.row, inv.id === previewId && styles.rowSelected)} onClick={() => openPreview(inv)}>
                        <td className={cx(styles.center, styles.muted, styles.mono)}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{inv.invoiceNumber}</div>
                          {inv.reference && <div className={cx(styles.tiny, styles.muted)}>Ref: {inv.reference}</div>}
                        </td>
                        <td>
                          <div>{displayDate(inv.invoiceDate)}</div>
                          {inv.dueDate && inv.dueDate !== inv.invoiceDate && (
                            <div className={cx(styles.tiny, displayStatus(inv) === 'OVERDUE' ? styles.danger : styles.muted)}>Due {displayDate(inv.dueDate)}</div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{inv.customerName}</div>
                          <span className={cx(styles.pill, ct.cls)} style={{ fontSize: 11, padding: '0 6px' }}>{ct.label}</span>
                        </td>
                        <td className={styles.muted}>{inv.salesperson || '—'}</td>
                        <td className={styles.muted}>{inv.amountPaid > 0 ? paymentSummaryLabel(inv) : '—'}</td>
                        <td className={cx(styles.right, styles.num)} style={{ fontWeight: 600 }}>
                          <CurrencyValue amount={inv.totalAmount} options={fmt2} />
                          <div className={cx(styles.tiny, styles.muted)} style={{ fontWeight: 400 }}>{inv.items.length} item{inv.items.length === 1 ? '' : 's'}</div>
                        </td>
                        <td className={cx(styles.right, styles.num, styles.success)}><CurrencyValue amount={inv.amountPaid} options={fmt2} /></td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            {inv.status === 'CONFIRMED' && balanceOf(inv) > 0 && (
                              <CurrencyValue amount={balanceOf(inv)} options={fmt2} className={cx(styles.danger, styles.num)} />
                            )}
                            <span className={cx(styles.pill, st.cls)}>{st.label}</span>
                          </span>
                        </td>
                        <td>
                          <div className={styles.rowActions} onClick={e => e.stopPropagation()}>
                            <IconBtn title="View" onClick={() => openPreview(inv)}><Eye size={15} /></IconBtn>
                            {a.edit && <IconBtn title="Edit" onClick={() => openEdit(inv)}><Edit size={15} /></IconBtn>}
                            {a.confirm && <IconBtn title="Confirm" tone={styles.iconBtnPrimary} disabled={busy} onClick={() => openSettle(inv, 'confirm')}>
                              {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                            </IconBtn>}
                            {a.recordPayment && <IconBtn title="Receive payment" tone={styles.iconBtnGreen} onClick={() => openSettle(inv, 'payment')}><Wallet size={15} /></IconBtn>}
                            <IconBtn title="Print" onClick={() => handlePrint(inv)}><Printer size={15} /></IconBtn>
                            {a.cancel && <IconBtn title="Cancel" tone={styles.iconBtnAmber} disabled={busy} onClick={() => setPendingCancel(inv)}><XCircle size={15} /></IconBtn>}
                            {a.delete && <IconBtn title="Delete" tone={styles.iconBtnRed} disabled={busy} onClick={() => setPendingDelete(inv)}><Trash2 size={15} /></IconBtn>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={10} className={styles.emptyCell}>
                        <Receipt size={32} style={{ margin: '0 auto 8px', opacity: 0.35 }} />
                        <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>
                          {invoices.length === 0 ? 'No sales invoices yet' : 'No invoices match these filters'}
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          {invoices.length === 0 ? 'Invoice a member or walk-in customer for products sold from the back office.' : 'Try clearing the search or changing the filters.'}
                        </div>
                        {invoices.length === 0 && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> Create New</Button>}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.mobileList}>
              {pageRows.map(inv => {
                const st = statusMeta(displayStatus(inv));
                return (
                  <button key={inv.id} type="button" className={styles.mobileCard} onClick={() => openPreview(inv)}>
                    <div className={styles.cardLine}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{inv.invoiceNumber}</span>
                      <span className={cx(styles.pill, st.cls)}>{st.label}</span>
                    </div>
                    <div className={cx(styles.tiny, styles.muted)} style={{ margin: '2px 0 8px' }}>{displayDate(inv.invoiceDate)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, marginBottom: 10 }}><User size={12} /> {inv.customerName}</div>
                    <div className={styles.cardLine} style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                      <span><span className={styles.eyebrow} style={{ display: 'block' }}>Net</span><CurrencyValue amount={inv.totalAmount} options={fmt2} className="font-bold" /></span>
                      <span style={{ textAlign: 'right' }}><span className={styles.eyebrow} style={{ display: 'block' }}>Balance</span><CurrencyValue amount={balanceOf(inv)} options={fmt2} className={cx('font-bold', styles.danger)} /></span>
                    </div>
                  </button>
                );
              })}
              {!loading && filtered.length === 0 && <div className={styles.empty}>No invoices found.</div>}
            </div>

            {filtered.length > 0 && (
              <div className={styles.pager}>
                <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} invoices</span>
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
        <SalesInvoicePreview
          invoices={filtered}
          products={products}
          loading={loading}
          selectedId={previewId}
          onSelect={i => setPreviewId(i.id)}
          searchTerm={search}
          onSearchChange={setSearch}
          warehouseName={warehouseName}
          busyId={busyId}
          onBack={goList}
          onEdit={openEdit}
          onConfirm={i => openSettle(i, 'confirm')}
          onRecordPayment={i => openSettle(i, 'payment')}
          onCancel={setPendingCancel}
          onDelete={setPendingDelete}
          onPrint={inv => handlePrint(inv)}
        />
      )}

      {/* ── EDITOR ── */}
      {view === 'editor' && (
        <SalesInvoiceEditor
          key={`${editorSession}-${editing?.id ?? 'new'}`}
          ref={editorRef}
          invoice={editing}
          allInvoices={invoices}
          warehouses={warehouses}
          products={products}
          staffNames={staffNames}
          branchName={activeBranchName}
          stockCheckEnabled={stockCheckEnabled}
          saving={saving}
          onSave={onEditorSave}
          onPrint={handlePrint}
          onRecordPayment={i => openSettle(i, 'payment')}
          onRefreshProducts={refreshProducts}
        />
      )}

      {/* ── Confirm / receive payment ── */}
      <SalesInvoiceSettleDialog
        request={settle}
        bankAccounts={bankAccounts}
        stockCheckEnabled={stockCheckEnabled}
        onClose={closeSettle}
        onDone={onSettled}
      />

      {/* ── Cancel ── */}
      <AlertDialog open={!!pendingCancel} onOpenChange={o => { if (!o) setPendingCancel(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {pendingCancel?.invoiceNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCancel?.status === 'CONFIRMED'
                ? `${pendingCancel.stockDeducted ? 'The stock it issued is returned to its warehouses and the ' : 'The '}receivable, revenue and VAT it posted are reversed. `
                : ''}
              This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Invoice</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const i = pendingCancel; setPendingCancel(null); if (i) cancelInvoice(i); }}>Cancel Invoice</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete ── */}
      <AlertDialog open={!!pendingDelete} onOpenChange={o => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete draft {pendingDelete?.invoiceNumber}?</AlertDialogTitle>
            <AlertDialogDescription>The draft and its lines will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600" onClick={() => { const i = pendingDelete; setPendingDelete(null); if (i) deleteInvoice(i); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
