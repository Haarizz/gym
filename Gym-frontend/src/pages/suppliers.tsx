import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, Building2, ClipboardList, Copy, CreditCard, Download, Edit, Eye, FileText,
  ListFilter, Mail, MessageSquare, Phone, Plus, Power, Receipt, Search, ShoppingBag, Star, Trash2, TrendingUp, Truck, User, Users, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SupplierStatement } from '../components/purchase/SupplierStatement';
import { Button } from '../components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { CurrencyValue, useCurrency } from '../utils/currency';
import { purchaseService, type PurchaseOrder, type Supplier } from '../utils/supabase/purchase-service';
import type { SupplierBill } from '../utils/supabase/supplier-bill-service';
import styles from '../components/purchase/PurchaseInvoice.module.css';
import { IconBtn, InfoRow, ModuleHeader, NativeSelect, RailCard, StatCard, SupplierFormDialog, copy, cx } from '../components/purchase/purchaseUi';
import { balanceOf, displayDate, displayStatus, fetchAllBills, fetchAllOrders, statusMeta, todayIso } from '../components/purchase/purchaseInvoiceUtils';
import { isoDay, poStatusMeta } from '../components/purchase/purchaseOrderUtils';
import { useGlobalSearchPrefill } from "../components/global-search/use-global-search";

const fmt2 = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
const PAGE_SIZE = 20;
const OPEN_PO = ['PENDING_APPROVAL', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'];

type SortKey = 'name' | 'purchased' | 'outstanding' | 'openOrders' | 'lastPurchase';

type Stats = {
  purchased: number;       // confirmed invoice value
  outstanding: number;
  overdue: number;
  bills: SupplierBill[];
  orders: PurchaseOrder[];
  openOrders: number;
  lastPurchase: string;
};

const emptyStats = (): Stats => ({ purchased: 0, outstanding: 0, overdue: 0, bills: [], orders: [], openOrders: 0, lastPurchase: '' });

export function Suppliers() {
  const navigate = useNavigate();
  const { currencyCode } = useCurrency();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [view, setView] = useState<'list' | 'preview'>('list');
  // Tabs: Suppliers | Supplier SOA  (/suppliers?tab=soa&supplier=<id> deep-links the statement)
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'soa' ? 'soa' : 'suppliers';
  const soaSupplierId = Number(params.get('supplier')) || undefined;
  const openStatement = (sup?: Supplier) => setParams(sup ? { tab: 'soa', supplier: String(sup.id) } : { tab: 'soa' });
  const showSuppliers = () => setParams({});
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  useGlobalSearchPrefill(setSearch);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' });
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Supplier | null>(null);

  const loadSuppliers = useCallback(async () => {
    try { setSuppliers(await purchaseService.getAllSuppliers()); }
    catch (err: any) { toast.error(err.message || 'Failed to load suppliers'); }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [s, b, o] = await Promise.allSettled([purchaseService.getAllSuppliers(), fetchAllBills(), fetchAllOrders()]);
      if (s.status === 'fulfilled') setSuppliers(s.value); else toast.error('Failed to load suppliers');
      if (b.status === 'fulfilled') setBills(b.value);
      if (o.status === 'fulfilled') setOrders(o.value);
      setLoading(false);
    })();
  }, []);

  // Per-supplier purchasing stats from invoices and orders.
  const stats = useMemo(() => {
    const m = new Map<number, Stats>();
    const get = (id: number) => { let s = m.get(id); if (!s) { s = emptyStats(); m.set(id, s); } return s; };
    for (const b of bills) {
      const s = get(b.supplierId);
      s.bills.push(b);
      if (b.status !== 'CONFIRMED') continue;
      s.purchased += b.totalAmount;
      s.outstanding += balanceOf(b);
      if (displayStatus(b) === 'OVERDUE') s.overdue += balanceOf(b);
      if (b.billDate > s.lastPurchase) s.lastPurchase = b.billDate;
    }
    for (const o of orders) {
      const s = get(o.supplierId);
      s.orders.push(o);
      if (OPEN_PO.includes(o.status)) s.openOrders += 1;
    }
    m.forEach(s => {
      s.bills.sort((a, b) => (a.billDate < b.billDate ? 1 : -1));
      s.orders.sort((a, b) => (a.orderDate < b.orderDate ? 1 : -1));
    });
    return m;
  }, [bills, orders]);
  const statsOf = (id: number) => stats.get(id) ?? emptyStats();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = suppliers.filter(s => {
      if (activeFilter === 'ACTIVE' && s.isActive === false) return false;
      if (activeFilter === 'INACTIVE' && s.isActive !== false) return false;
      if (activeFilter === 'OUTSTANDING' && statsOf(s.id).outstanding <= 0) return false;
      if (!q) return true;
      return [s.name, s.contactPerson, s.email, s.phone, s.city, s.country, s.taxId].some(v => (v ?? '').toLowerCase().includes(q));
    });
    const val = (s: Supplier): string | number => {
      const st = statsOf(s.id);
      switch (sort.key) {
        case 'purchased': return st.purchased;
        case 'outstanding': return st.outstanding;
        case 'openOrders': return st.openOrders;
        case 'lastPurchase': return st.lastPurchase;
        default: return s.name.toLowerCase();
      }
    };
    rows.sort((a, b) => {
      const x = val(a), y = val(b);
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return sort.dir === 'asc' ? c : -c;
    });
    return rows;
  }, [suppliers, search, activeFilter, sort, stats]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setPage(1); }, [search, activeFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const toggleSort = (key: SortKey) => setSort(s => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' }));

  const kpi = useMemo(() => {
    const monthStart = format(new Date(), 'yyyy-MM-01');
    const month = bills.filter(b => b.status === 'CONFIRMED' && b.billDate >= monthStart && b.billDate <= todayIso());
    let outstanding = 0, owing = 0;
    stats.forEach(s => { outstanding += s.outstanding; if (s.outstanding > 0) owing += 1; });
    return {
      active: suppliers.filter(s => s.isActive !== false).length,
      total: suppliers.length,
      outstanding,
      owing,
      monthSpend: month.reduce((s, b) => s + b.totalAmount, 0),
      monthSuppliers: new Set(month.map(b => b.supplierId)).size,
      openOrders: orders.filter(o => OPEN_PO.includes(o.status)).length,
    };
  }, [suppliers, bills, orders, stats]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEditForm = (s: Supplier) => { setEditing(s); setFormOpen(true); };
  const openPreview = (s: Supplier) => { setPreviewId(s.id); setView('preview'); };

  const toggleActive = async (s: Supplier) => {
    setBusyId(s.id);
    try {
      const updated = await purchaseService.updateSupplier(s.id, { ...s, isActive: s.isActive === false });
      setSuppliers(prev => prev.map(x => (x.id === s.id ? updated : x)));
      toast.success(`${s.name} ${updated.isActive === false ? 'deactivated' : 'activated'}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update supplier');
    } finally {
      setBusyId(null);
    }
  };

  const requestDelete = (s: Supplier) => {
    const st = statsOf(s.id);
    if (st.bills.length || st.orders.length) {
      toast.error(`${s.name} has ${st.bills.length} invoice(s) and ${st.orders.length} order(s) on record — deactivate it instead so history stays intact.`);
      return;
    }
    setPendingDelete(s);
  };

  const deleteSupplier = async (s: Supplier) => {
    setBusyId(s.id);
    try {
      await purchaseService.deleteSupplier(s.id);
      setSuppliers(prev => prev.filter(x => x.id !== s.id));
      toast.success(`${s.name} deleted`);
      if (previewId === s.id) { setPreviewId(null); setView('list'); }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete supplier');
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = () => {
    const head = ['Name', 'Contact', 'Phone', 'Email', 'City', 'Country', 'TRN', 'Payment Terms', `Credit Limit (${currencyCode})`,
      'Status', `Purchased (${currencyCode})`, `Outstanding (${currencyCode})`, 'Open Orders', 'Last Purchase'];
    const esc = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = filtered.map(s => {
      const st = statsOf(s.id);
      return [s.name, s.contactPerson, s.phone, s.email, s.city, s.country, s.taxId, s.paymentTerms, s.creditLimit ?? 0,
        s.isActive === false ? 'Inactive' : 'Active', st.purchased.toFixed(2), st.outstanding.toFixed(2), st.openOrders, st.lastPurchase];
    });
    const url = URL.createObjectURL(new Blob(['﻿' + [head, ...rows].map(r => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `Suppliers_${todayIso()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const SortIcon = ({ k }: { k: SortKey }) => (sort.key === k ? (sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : null);
  const Th = ({ k, children, right }: { k: SortKey; children: React.ReactNode; right?: boolean }) => (
    <th className={cx(styles.sortable, right && styles.right)} onClick={() => toggleSort(k)}>
      <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>{children} <SortIcon k={k} /></span>
    </th>
  );

  return (
    <div className={styles.page}>
      <ModuleHeader
        title="Suppliers"
        icon={Users}
        subtitle="Everyone you buy stock, equipment and services from — contacts, terms, what you’ve bought and what you owe"
        actions={
          <>
            {tab === 'suppliers' && view !== 'list' && <Button variant="outline" size="sm" onClick={() => setView('list')}><ArrowLeft className="h-4 w-4" /> Back</Button>}
            {tab === 'suppliers' && view === 'list' && <Button variant="outline" size="sm" disabled={filtered.length === 0} onClick={exportCsv}><Download className="h-4 w-4" /> Export</Button>}
            <Button variant="outline" size="sm" onClick={() => navigate('/purchase-order')}><ClipboardList className="h-4 w-4" /> Purchase Orders</Button>
            <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> Add Supplier</Button>
          </>
        }
        tabs={[
          { key: 'suppliers', label: 'Suppliers', icon: Users, active: tab === 'suppliers', onClick: showSuppliers },
          { key: 'soa', label: 'Supplier SOA', icon: FileText, active: tab === 'soa', onClick: () => openStatement(previewId ? suppliers.find(x => x.id === previewId) : undefined) },
        ]}
      />

      {tab === 'soa' && <SupplierStatement suppliers={suppliers} initialSupplierId={soaSupplierId} />}

      {tab === 'suppliers' && view === 'list' && (
        <div className={styles.fadeIn} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className={styles.kpiGrid}>
            <StatCard title="Active Suppliers" icon={Users} tone="blue" loading={loading} value={kpi.active} sub={`${kpi.total} on record`} />
            <StatCard title="Outstanding Payable" icon={CreditCard} tone="red" loading={loading}
              value={<CurrencyValue amount={kpi.outstanding} options={fmt2} />} sub={`Owed to ${kpi.owing} supplier${kpi.owing === 1 ? '' : 's'}`} />
            <StatCard title="Purchased This Month" icon={TrendingUp} tone="green" loading={loading}
              value={<CurrencyValue amount={kpi.monthSpend} options={fmt2} />} sub={`From ${kpi.monthSuppliers} supplier${kpi.monthSuppliers === 1 ? '' : 's'}`} />
            <StatCard title="Open Purchase Orders" icon={Truck} tone="purple" loading={loading} value={kpi.openOrders} sub="Awaiting approval or delivery" />
          </div>

          <div className={cx(styles.panel, styles.panelPad)}>
            <div className={styles.toolbar}>
              <h3 className={styles.panelTitle}>All Suppliers <span className={cx(styles.muted, styles.tiny)} style={{ fontWeight: 500 }}>({filtered.length})</span></h3>
              <div className={styles.filters}>
                <div className={styles.searchBox}>
                  <Search size={14} />
                  <input className={styles.searchInput} placeholder="Search name, contact, phone, TRN…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <NativeSelect value={activeFilter} onChange={setActiveFilter} label="Status" options={[
                  { value: 'ALL', label: 'All Suppliers' },
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'INACTIVE', label: 'Inactive' },
                  { value: 'OUTSTANDING', label: 'With Balance Due' },
                ]} />
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <Th k="name">Supplier</Th>
                    <th>Contact</th>
                    <th>Location</th>
                    <th>Terms</th>
                    <Th k="openOrders">Open POs</Th>
                    <Th k="lastPurchase">Last Purchase</Th>
                    <Th k="purchased" right>Purchased</Th>
                    <Th k="outstanding" right>Outstanding</Th>
                    <th>Status</th>
                    <th className={styles.right}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && suppliers.length === 0 && Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`sk${i}`}>{Array.from({ length: 10 }).map((__, j) => <td key={j}><div className={styles.skeleton} style={{ width: j === 0 ? 140 : 60 }} /></td>)}</tr>
                  ))}
                  {pageRows.map(s => {
                    const st = statsOf(s.id);
                    const busy = busyId === s.id;
                    return (
                      <tr key={s.id} className={cx(styles.row, s.id === previewId && styles.rowSelected)} onClick={() => openPreview(s)}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{s.name}</div>
                          {s.taxId && <div className={cx(styles.tiny, styles.muted)}>TRN {s.taxId}</div>}
                        </td>
                        <td>
                          <div>{s.contactPerson || <span className={styles.muted}>—</span>}</div>
                          <div className={cx(styles.tiny, styles.muted)}>{[s.phone, s.email].filter(Boolean).join(' · ')}</div>
                        </td>
                        <td className={styles.muted}>{[s.city, s.country].filter(Boolean).join(', ') || '—'}</td>
                        <td>{s.paymentTerms ? <span className={cx(styles.pill, styles.pillGray)}>{s.paymentTerms}</span> : <span className={styles.muted}>—</span>}</td>
                        <td>{st.openOrders ? <span className={cx(styles.pill, styles.pillPurple)}>{st.openOrders}</span> : <span className={styles.muted}>0</span>}</td>
                        <td className={styles.muted}>{st.lastPurchase ? displayDate(st.lastPurchase) : '—'}</td>
                        <td className={cx(styles.right, styles.num)} style={{ fontWeight: 600 }}><CurrencyValue amount={st.purchased} options={fmt2} /></td>
                        <td className={cx(styles.right, styles.num)}>
                          <CurrencyValue amount={st.outstanding} options={fmt2} className={st.outstanding > 0 ? styles.danger : styles.muted} />
                          {st.overdue > 0 && <div className={cx(styles.tiny, styles.danger)}>overdue <CurrencyValue amount={st.overdue} options={fmt2} /></div>}
                        </td>
                        <td><span className={cx(styles.pill, s.isActive === false ? styles.pillGray : styles.pillGreen)}>{s.isActive === false ? 'Inactive' : 'Active'}</span></td>
                        <td>
                          <div className={styles.rowActions} onClick={e => e.stopPropagation()}>
                            <IconBtn title="View" onClick={() => openPreview(s)}><Eye size={15} /></IconBtn>
                            <IconBtn title="Statement of account" tone={styles.iconBtnPrimary} onClick={() => openStatement(s)}><FileText size={15} /></IconBtn>
                            <IconBtn title="Edit" onClick={() => openEditForm(s)}><Edit size={15} /></IconBtn>
                            <IconBtn title={s.isActive === false ? 'Activate' : 'Deactivate'} tone={s.isActive === false ? styles.iconBtnGreen : styles.iconBtnAmber}
                              disabled={busy} onClick={() => toggleActive(s)}><Power size={15} /></IconBtn>
                            <IconBtn title="Delete" tone={styles.iconBtnRed} disabled={busy} onClick={() => requestDelete(s)}><Trash2 size={15} /></IconBtn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={10} className={styles.emptyCell}>
                        <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.35 }} />
                        <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{suppliers.length === 0 ? 'No suppliers yet' : 'No suppliers match these filters'}</div>
                        <div style={{ marginBottom: 12 }}>{suppliers.length === 0 ? 'Add the companies you buy from to start raising orders and invoices.' : 'Try clearing the search or filter.'}</div>
                        {suppliers.length === 0 && <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> Add Supplier</Button>}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.mobileList}>
              {pageRows.map(s => {
                const st = statsOf(s.id);
                return (
                  <button key={s.id} type="button" className={styles.mobileCard} onClick={() => openPreview(s)}>
                    <div className={styles.cardLine}>
                      <span style={{ fontWeight: 700 }}>{s.name}</span>
                      <span className={cx(styles.pill, s.isActive === false ? styles.pillGray : styles.pillGreen)}>{s.isActive === false ? 'Inactive' : 'Active'}</span>
                    </div>
                    <div className={cx(styles.tiny, styles.muted)} style={{ margin: '2px 0 8px' }}>{[s.contactPerson, s.phone].filter(Boolean).join(' · ') || '—'}</div>
                    <div className={styles.cardLine} style={{ borderTop: '1px solid var(--pi-edge)', paddingTop: 8 }}>
                      <span className={styles.muted}>Outstanding</span>
                      <CurrencyValue amount={st.outstanding} options={fmt2} className={cx('font-bold', st.outstanding > 0 && styles.danger)} />
                    </div>
                  </button>
                );
              })}
            </div>

            {filtered.length > 0 && (
              <div className={styles.pager}>
                <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} suppliers</span>
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

      {tab === 'suppliers' && view === 'preview' && (
        <SupplierPreview
          suppliers={filtered}
          loading={loading}
          selectedId={previewId}
          onSelect={s => setPreviewId(s.id)}
          search={search}
          onSearch={setSearch}
          statsOf={statsOf}
          busyId={busyId}
          onBack={() => setView('list')}
          onEdit={openEditForm}
          onToggle={toggleActive}
          onDelete={requestDelete}
          onOpenBill={b => navigate(`/purchase?bill=${b.id}`)}
          onOpenOrders={() => navigate('/purchase-order')}
          onStatement={openStatement}
        />
      )}

      <SupplierFormDialog
        open={formOpen}
        supplier={editing}
        onOpenChange={setFormOpen}
        onSaved={saved => {
          if (editing) setSuppliers(prev => prev.map(x => (x.id === saved.id ? saved : x)));
          else loadSuppliers();
        }}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={o => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This supplier has no orders or invoices. It will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600" onClick={() => { const s = pendingDelete; setPendingDelete(null); if (s) deleteSupplier(s); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Supplier profile (split preview) ─────────────────────────────────────────

function SupplierPreview({ suppliers, loading, selectedId, onSelect, search, onSearch, statsOf, busyId, onBack, onEdit, onToggle, onDelete, onOpenBill, onOpenOrders, onStatement }: {
  suppliers: Supplier[];
  loading: boolean;
  selectedId: number | null;
  onSelect: (s: Supplier) => void;
  search: string;
  onSearch: (v: string) => void;
  statsOf: (id: number) => Stats;
  busyId: number | null;
  onBack: () => void;
  onEdit: (s: Supplier) => void;
  onToggle: (s: Supplier) => void;
  onDelete: (s: Supplier) => void;
  onOpenBill: (b: SupplierBill) => void;
  onOpenOrders: () => void;
  onStatement: (s: Supplier) => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState('invoices');
  const s = suppliers.find(x => x.id === selectedId) ?? null;
  useEffect(() => { setTab('invoices'); }, [selectedId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      if (drawerOpen) setDrawerOpen(false); else onBack();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen, onBack]);

  const st = s ? statsOf(s.id) : emptyStats();
  const limit = Number(s?.creditLimit) || 0;
  const used = limit > 0 ? Math.min(100, Math.round((st.outstanding / limit) * 100)) : 0;

  return (
    <div className={styles.fadeIn}>
      <button type="button" className={cx(styles.tab, styles.browseBtn)} style={{ marginBottom: 12 }} onClick={() => setDrawerOpen(true)}>
        <ListFilter size={14} className="text-primary" /> Browse suppliers
      </button>
      <div className={styles.split}>
        <div className={cx(styles.panel, styles.splitList, drawerOpen && styles.splitListOpen)}>
          <div className={styles.splitListHead}>
            <div className={styles.cardLine} style={{ marginBottom: 8 }}>
              <span className={styles.panelTitle} style={{ fontSize: 15 }}>All Suppliers</span>
              {drawerOpen && <button type="button" className={styles.iconBtn} onClick={() => setDrawerOpen(false)} aria-label="Close list"><X size={15} /></button>}
            </div>
            <div className={styles.searchBox} style={{ width: '100%' }}>
              <Search size={14} />
              <input className={styles.searchInput} value={search} onChange={e => onSearch(e.target.value)} placeholder="Search suppliers..." />
            </div>
          </div>
          <div className={styles.splitListBody}>
            {!loading && suppliers.length === 0 && <div className={styles.empty}>No suppliers found.</div>}
            {suppliers.map(x => {
              const xs = statsOf(x.id);
              return (
                <button key={x.id} type="button" onClick={() => { onSelect(x); setDrawerOpen(false); }}
                  className={cx(styles.card, x.id === selectedId && styles.cardSelected)}>
                  <div className={styles.cardLine} style={{ marginBottom: 4 }}>
                    <span className={styles.cardName}>{x.name}</span>
                    <span className={cx(styles.pill, x.isActive === false ? styles.pillGray : styles.pillGreen)}>{x.isActive === false ? 'Inactive' : 'Active'}</span>
                  </div>
                  <div className={cx(styles.tiny, styles.muted)} style={{ marginBottom: 6 }}>{[x.contactPerson, x.city].filter(Boolean).join(' · ') || '—'}</div>
                  <div className={styles.cardLine}>
                    <span className={cx(styles.tiny, styles.muted)}>{xs.openOrders} open PO{xs.openOrders === 1 ? '' : 's'}</span>
                    {xs.outstanding > 0
                      ? <span className={cx(styles.tiny, styles.danger)} style={{ fontWeight: 600 }}>Due <CurrencyValue amount={xs.outstanding} options={fmt2} /></span>
                      : <span className={cx(styles.tiny, styles.success)} style={{ fontWeight: 600 }}>Nothing due</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        {drawerOpen && <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(15,23,42,0.4)' }} />}

        <div style={{ minWidth: 0 }}>
          {!s ? (
            <div className={cx(styles.panel, styles.empty)} style={{ padding: 64 }}>This supplier is no longer in the list. Pick another one on the left.</div>
          ) : (
            <div className={styles.previewStack}>
              <div className={cx(styles.panel, styles.previewHead)}>
                <div style={{ minWidth: 0 }}>
                  <div className={styles.previewTitle}>
                    <h2>{s.name}</h2>
                    <span className={cx(styles.pill, s.isActive === false ? styles.pillGray : styles.pillGreen)}>{s.isActive === false ? 'Inactive' : 'Active'}</span>
                    {s.paymentTerms && <span className={cx(styles.pill, styles.pillPrimary)}>{s.paymentTerms}</span>}
                    {s.rating != null && <span className={cx(styles.pill, styles.pillAmber)}><Star size={11} /> {Number(s.rating).toFixed(1)}</span>}
                  </div>
                  <div className={styles.metaLine}>
                    {s.contactPerson && <span style={{ color: 'var(--foreground)', fontWeight: 500 }}><User size={12} /> {s.contactPerson}</span>}
                    {s.phone && <><span className={styles.dot}>•</span><span><Phone size={11} /> {s.phone}</span></>}
                    {s.email && <><span className={styles.dot}>•</span><span><Mail size={11} /> {s.email}</span></>}
                  </div>
                </div>
                <div className={styles.headerActions}>
                  <Button size="sm" onClick={() => onEdit(s)}><Edit className="h-4 w-4" /> Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => onStatement(s)}><FileText className="h-4 w-4" /> Statement</Button>
                  <Button size="sm" variant="outline" onClick={onOpenOrders}><ClipboardList className="h-4 w-4" /> Purchase Orders</Button>
                  <Button size="sm" variant="outline" disabled={busyId === s.id} onClick={() => onToggle(s)}>
                    <Power className="h-4 w-4" /> {s.isActive === false ? 'Activate' : 'Deactivate'}
                  </Button>
                  <button type="button" className={cx(styles.iconBtn, styles.iconBtnRed)} title="Delete supplier" onClick={() => onDelete(s)}><Trash2 size={16} /></button>
                  <button type="button" className={styles.iconBtn} title="Close (Esc)" onClick={onBack}><X size={16} /></button>
                </div>
              </div>

              <div className={styles.summaryStrip}>
                {[
                  { label: 'Purchased', value: <CurrencyValue amount={st.purchased} options={fmt2} /> },
                  { label: 'Outstanding', value: <CurrencyValue amount={st.outstanding} options={fmt2} className={st.outstanding > 0 ? styles.danger : styles.success} />, tone: st.outstanding > 0 ? styles.tileRed : styles.tileGreen },
                  { label: 'Overdue', value: <CurrencyValue amount={st.overdue} options={fmt2} className={st.overdue > 0 ? styles.danger : undefined} /> },
                  { label: 'Invoices', value: st.bills.length },
                  { label: 'Orders', value: st.orders.length },
                  { label: 'Open POs', value: st.openOrders },
                  { label: 'Credit Used', value: limit > 0 ? `${used}%` : '—', tone: used >= 90 ? styles.tileRed : undefined },
                ].map(t => (
                  <div key={t.label} className={cx(styles.tile, t.tone)}>
                    <div className={styles.tileLabel}>{t.label}</div>
                    <div className={styles.tileValue}>{t.value}</div>
                  </div>
                ))}
              </div>

              <div className={styles.workspace}>
                <section className={styles.panel} style={{ overflow: 'hidden' }}>
                  <div className={styles.tabBar} role="tablist">
                    {[
                      { key: 'invoices', label: 'Purchase Invoices', icon: Receipt, count: st.bills.length },
                      { key: 'orders', label: 'Purchase Orders', icon: ShoppingBag, count: st.orders.length },
                      ...(s.notes ? [{ key: 'notes', label: 'Notes', icon: MessageSquare, count: 0 }] : []),
                    ].map(t => (
                      <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
                        className={cx(styles.docTab, tab === t.key && styles.docTabActive)} onClick={() => setTab(t.key)}>
                        <t.icon size={13} /> {t.label} {t.count ? <span className={styles.count}>{t.count}</span> : null}
                      </button>
                    ))}
                  </div>
                  <div className={styles.tabPanel} role="tabpanel">
                    {tab === 'invoices' && (st.bills.length === 0 ? (
                      <div className={styles.empty}><FileText size={20} style={{ margin: '0 auto 6px', opacity: 0.4 }} />No purchase invoices from this supplier yet.</div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table className={styles.itemsTable} style={{ minWidth: 560 }}>
                          <thead><tr><th>Bill No</th><th>Date</th><th>Due</th><th>Status</th><th className={styles.right}>Amount</th><th className={styles.right}>Balance</th></tr></thead>
                          <tbody>
                            {st.bills.map(b => {
                              const m = statusMeta(displayStatus(b));
                              return (
                                <tr key={b.id} className={styles.row} onClick={() => onOpenBill(b)}>
                                  <td style={{ fontWeight: 600 }}>{b.billNumber}</td>
                                  <td>{displayDate(b.billDate)}</td>
                                  <td className={displayStatus(b) === 'OVERDUE' ? styles.danger : styles.muted}>{b.dueDate ? displayDate(b.dueDate) : '—'}</td>
                                  <td><span className={cx(styles.pill, m.cls)}>{m.label}</span></td>
                                  <td className={cx(styles.right, styles.num)}><CurrencyValue amount={b.totalAmount} options={fmt2} /></td>
                                  <td className={cx(styles.right, styles.num)}>
                                    {b.status === 'CONFIRMED' ? <CurrencyValue amount={balanceOf(b)} options={fmt2} className={balanceOf(b) > 0 ? styles.danger : styles.muted} /> : <span className={styles.muted}>—</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ))}
                    {tab === 'orders' && (st.orders.length === 0 ? (
                      <div className={styles.empty}><ClipboardList size={20} style={{ margin: '0 auto 6px', opacity: 0.4 }} />No purchase orders with this supplier yet.</div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table className={styles.itemsTable} style={{ minWidth: 520 }}>
                          <thead><tr><th>PO No</th><th>Order Date</th><th>Expected</th><th>Status</th><th className={styles.right}>Total</th></tr></thead>
                          <tbody>
                            {st.orders.map(o => {
                              const m = poStatusMeta(o.status);
                              return (
                                <tr key={o.id} className={styles.row} onClick={onOpenOrders}>
                                  <td style={{ fontWeight: 600 }}>{o.poNumber}</td>
                                  <td>{displayDate(isoDay(o.orderDate))}</td>
                                  <td className={styles.muted}>{o.expectedDeliveryDate ? displayDate(isoDay(o.expectedDeliveryDate)) : '—'}</td>
                                  <td><span className={cx(styles.pill, m.cls)}>{m.label}</span></td>
                                  <td className={cx(styles.right, styles.num)}><CurrencyValue amount={o.totalAmount} options={fmt2} /></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ))}
                    {tab === 'notes' && <div style={{ whiteSpace: 'pre-wrap' }}>{s.notes}</div>}
                  </div>
                </section>

                <div className={cx(styles.rail, styles.railSticky)}>
                  <RailCard title="Contact" icon={User}>
                    <InfoRow label="Contact person" value={s.contactPerson} />
                    <InfoRow label="Phone" value={s.phone} copyable />
                    <InfoRow label="Email" value={s.email} copyable />
                    <InfoRow label="Address" value={[s.address, s.city, s.country].filter(Boolean).join(', ')} />
                  </RailCard>
                  <RailCard title="Terms & Credit" icon={Building2}>
                    <InfoRow label="TRN / Tax ID" value={s.taxId} copyable />
                    <InfoRow label="Payment terms" value={s.paymentTerms} />
                    <InfoRow label="Credit limit" value={limit > 0 ? <CurrencyValue amount={limit} options={fmt2} /> : undefined} />
                    <InfoRow label="Last purchase" value={st.lastPurchase ? displayDate(st.lastPurchase) : undefined} />
                    {limit > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ height: 6, borderRadius: 999, background: 'var(--muted)', overflow: 'hidden' }}>
                          <div style={{ width: `${used}%`, height: '100%', background: used >= 90 ? '#dc2626' : 'var(--primary)' }} />
                        </div>
                        <div className={cx(styles.tiny, styles.muted)} style={{ marginTop: 4 }}>{used}% of credit limit in use</div>
                      </div>
                    )}
                  </RailCard>
                  {st.overdue > 0 && (
                    <div className={cx(styles.notice, styles.noticeError)}>
                      <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span><CurrencyValue amount={st.overdue} options={fmt2} /> is past due to this supplier.</span>
                    </div>
                  )}
                  <button type="button" className={cx(styles.copyBtn, styles.tiny, styles.muted)} onClick={() => copy(
                    [s.name, s.contactPerson, s.phone, s.email, [s.address, s.city, s.country].filter(Boolean).join(', '), s.taxId && `TRN ${s.taxId}`].filter(Boolean).join('\n'),
                    'Supplier details',
                  )}>
                    <Copy size={12} /> Copy supplier details
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
