import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, Boxes, Building2, Download, Edit, Eye, Globe, ListFilter, Loader2, MapPin,
  Package, PackageX, Plus, Power, Receipt, Save, Search, Trash2, Warehouse as WarehouseIcon, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { CurrencyValue } from '../utils/currency';
import { productsService, type Product, type Warehouse } from '../utils/supabase/products-service';
import type { SupplierBill } from '../utils/supabase/supplier-bill-service';
import styles from '../components/purchase/PurchaseInvoice.module.css';
import { IconBtn, InfoRow, ModuleHeader, NativeSelect, RailCard, StatCard, cx } from '../components/purchase/purchaseUi';
import { displayDate, fetchAllBills, todayIso } from '../components/purchase/purchaseInvoiceUtils';

const fmt2 = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

const TYPES: { value: string; label: string; icon: React.ElementType }[] = [
  { value: 'MAIN_WAREHOUSE', label: 'Main Warehouse', icon: Building2 },
  { value: 'BRANCH', label: 'Branch / Store', icon: WarehouseIcon },
  { value: 'ONLINE', label: 'Online Stock', icon: Globe },
];
const typeMeta = (t?: string) => TYPES.find(x => x.value === t) ?? TYPES[1];

type StockLine = {
  product: Product;
  onHand: number;
  reorderLevel: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  value: number;
};

type WhStats = { lines: StockLine[]; skus: number; units: number; value: number; low: number; out: number; receipts: SupplierBill[] };

type SortKey = 'name' | 'units' | 'value' | 'low';

export function Warehouses() {
  const navigate = useNavigate();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [view, setView] = useState<'list' | 'preview'>('list');
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Warehouse | null>(null);

  const loadWarehouses = () => productsService.getAllWarehouses().then(setWarehouses).catch(err => toast.error(err.message || 'Failed to load warehouses'));

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [w, p, b] = await Promise.allSettled([productsService.getAllWarehouses(), productsService.getProducts({ size: 500 }), fetchAllBills()]);
      if (w.status === 'fulfilled') setWarehouses(w.value); else toast.error('Failed to load warehouses');
      if (p.status === 'fulfilled') setProducts(p.value.products ?? []);
      if (b.status === 'fulfilled') setBills(b.value);
      setLoading(false);
    })();
  }, []);

  // Per-warehouse stock, derived from each product's stock-by-warehouse rows.
  const stats = useMemo(() => {
    const m = new Map<number, WhStats>();
    const get = (id: number) => {
      let s = m.get(id);
      if (!s) { s = { lines: [], skus: 0, units: 0, value: 0, low: 0, out: 0, receipts: [] }; m.set(id, s); }
      return s;
    };
    for (const p of products) {
      for (const row of p.stockByWarehouse ?? []) {
        const onHand = Number(row.currentStock) || 0;
        const reorderLevel = Number(row.reorderLevel) || 0;
        const status: StockLine['status'] = onHand <= 0 ? 'OUT_OF_STOCK' : reorderLevel > 0 && onHand <= reorderLevel ? 'LOW_STOCK' : 'IN_STOCK';
        const s = get(row.warehouseId);
        const value = onHand * (Number(p.costPrice) || 0);
        s.lines.push({ product: p, onHand, reorderLevel, status, value });
        if (onHand > 0) s.skus += 1;
        s.units += Math.max(0, onHand);
        s.value += Math.max(0, value);
        if (status === 'LOW_STOCK') s.low += 1;
        if (status === 'OUT_OF_STOCK') s.out += 1;
      }
    }
    for (const b of bills) {
      if (b.warehouseId && b.status === 'CONFIRMED' && !b.purchaseOrderId) get(b.warehouseId).receipts.push(b);
    }
    m.forEach(s => {
      s.lines.sort((a, b) => b.value - a.value);
      s.receipts.sort((a, b) => (a.billDate < b.billDate ? 1 : -1));
    });
    return m;
  }, [products, bills]);
  const statsOf = (id: number): WhStats => stats.get(id) ?? { lines: [], skus: 0, units: 0, value: 0, low: 0, out: 0, receipts: [] };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = warehouses.filter(w => {
      if (filter === 'ACTIVE' && !w.isActive) return false;
      if (filter === 'INACTIVE' && w.isActive) return false;
      if (filter === 'ATTENTION' && statsOf(w.id).low + statsOf(w.id).out === 0) return false;
      if (filter.startsWith('TYPE:') && w.type !== filter.slice(5)) return false;
      return !q || [w.name, w.location, typeMeta(w.type).label].some(v => (v ?? '').toLowerCase().includes(q));
    });
    const val = (w: Warehouse) => {
      const s = statsOf(w.id);
      return sort.key === 'units' ? s.units : sort.key === 'value' ? s.value : sort.key === 'low' ? s.low + s.out : w.name.toLowerCase();
    };
    rows.sort((a, b) => {
      const x = val(a), y = val(b);
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return sort.dir === 'asc' ? c : -c;
    });
    return rows;
  }, [warehouses, search, filter, sort, stats]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSort = (key: SortKey) => setSort(s => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' }));

  const kpi = useMemo(() => {
    let units = 0, value = 0, attention = 0;
    warehouses.forEach(w => { const s = statsOf(w.id); units += s.units; value += s.value; attention += s.low + s.out; });
    return { active: warehouses.filter(w => w.isActive).length, total: warehouses.length, units, value, attention };
  }, [warehouses, stats]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────────────────
  const activeCount = warehouses.filter(w => w.isActive).length;
  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (w: Warehouse) => { setEditing(w); setFormOpen(true); };
  const openPreview = (w: Warehouse) => { setPreviewId(w.id); setView('preview'); };

  const toggleActive = async (w: Warehouse) => {
    if (w.isActive && activeCount <= 1) {
      toast.error('Keep at least one active warehouse — stock receipts and sales need somewhere to go.');
      return;
    }
    setBusyId(w.id);
    try {
      const updated = await productsService.updateWarehouse(w.id, { ...w, isActive: !w.isActive });
      setWarehouses(prev => prev.map(x => (x.id === w.id ? updated : x)));
      toast.success(`${w.name} ${updated.isActive ? 'activated' : 'deactivated'}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update warehouse');
    } finally {
      setBusyId(null);
    }
  };

  const requestDelete = (w: Warehouse) => {
    const s = statsOf(w.id);
    const linkedBills = bills.filter(b => b.warehouseId === w.id).length;
    if (s.units > 0 || linkedBills > 0) {
      toast.error(`${w.name} still holds ${s.units} unit(s) and is used on ${linkedBills} purchase invoice(s). Move the stock out or deactivate it instead.`);
      return;
    }
    if (w.isActive && activeCount <= 1) { toast.error('You can’t delete the only active warehouse.'); return; }
    setPendingDelete(w);
  };

  const deleteWarehouse = async (w: Warehouse) => {
    setBusyId(w.id);
    try {
      await productsService.deleteWarehouse(w.id);
      setWarehouses(prev => prev.filter(x => x.id !== w.id));
      toast.success(`${w.name} deleted`);
      if (previewId === w.id) { setPreviewId(null); setView('list'); }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete warehouse');
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = () => {
    const head = ['Warehouse', 'Type', 'Location', 'Status', 'Products in stock', 'Units', 'Stock value', 'Low stock', 'Out of stock'];
    const esc = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = filtered.map(w => {
      const s = statsOf(w.id);
      return [w.name, typeMeta(w.type).label, w.location, w.isActive ? 'Active' : 'Inactive', s.skus, s.units, s.value.toFixed(2), s.low, s.out];
    });
    const url = URL.createObjectURL(new Blob(['﻿' + [head, ...rows].map(r => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `Warehouses_${todayIso()}.csv`;
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
        title="Warehouses"
        icon={WarehouseIcon}
        subtitle="Storage locations for your stock — see what each one holds, its value and what needs reordering"
        actions={
          <>
            {view !== 'list' && <Button variant="outline" size="sm" onClick={() => setView('list')}><ArrowLeft className="h-4 w-4" /> Back</Button>}
            {view === 'list' && <Button variant="outline" size="sm" disabled={filtered.length === 0} onClick={exportCsv}><Download className="h-4 w-4" /> Export</Button>}
            <Button variant="outline" size="sm" onClick={() => navigate('/products')}><Package className="h-4 w-4" /> Products</Button>
            <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> Add Warehouse</Button>
          </>
        }
      />

      {view === 'list' && (
        <div className={styles.fadeIn} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className={styles.kpiGrid}>
            <StatCard title="Active Warehouses" icon={WarehouseIcon} tone="blue" loading={loading} value={kpi.active} sub={`${kpi.total} location${kpi.total === 1 ? '' : 's'} in total`} />
            <StatCard title="Units in Stock" icon={Boxes} tone="purple" loading={loading} value={kpi.units.toLocaleString()} sub="Across all warehouses" />
            <StatCard title="Stock Value" icon={Package} tone="green" loading={loading} value={<CurrencyValue amount={kpi.value} options={fmt2} />} sub="At current cost price" />
            <StatCard title="Needs Reorder" icon={AlertTriangle} tone="red" loading={loading} value={kpi.attention} sub="Low or out-of-stock lines" />
          </div>

          <div className={cx(styles.panel, styles.panelPad)}>
            <div className={styles.toolbar}>
              <h3 className={styles.panelTitle}>All Warehouses <span className={cx(styles.muted, styles.tiny)} style={{ fontWeight: 500 }}>({filtered.length})</span></h3>
              <div className={styles.filters}>
                <div className={styles.searchBox}>
                  <Search size={14} />
                  <input className={styles.searchInput} placeholder="Search name or location…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <NativeSelect value={filter} onChange={setFilter} label="Filter" options={[
                  { value: 'ALL', label: 'All Warehouses' },
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'INACTIVE', label: 'Inactive' },
                  { value: 'ATTENTION', label: 'Needs Reorder' },
                  ...TYPES.map(t => ({ value: `TYPE:${t.value}`, label: t.label })),
                ]} />
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table} style={{ minWidth: 980 }}>
                <thead>
                  <tr>
                    <Th k="name">Warehouse</Th>
                    <th>Type</th>
                    <th>Location</th>
                    <th className={styles.right}>Products</th>
                    <Th k="units" right>Units</Th>
                    <Th k="value" right>Stock Value</Th>
                    <Th k="low">Reorder</Th>
                    <th>Status</th>
                    <th className={styles.right}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && warehouses.length === 0 && Array.from({ length: 4 }).map((_, i) => (
                    <tr key={`sk${i}`}>{Array.from({ length: 9 }).map((__, j) => <td key={j}><div className={styles.skeleton} style={{ width: j === 0 ? 140 : 60 }} /></td>)}</tr>
                  ))}
                  {filtered.map(w => {
                    const s = statsOf(w.id);
                    const T = typeMeta(w.type);
                    return (
                      <tr key={w.id} className={cx(styles.row, w.id === previewId && styles.rowSelected)} onClick={() => openPreview(w)}>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                            <span className="bg-primary/10 p-2 rounded-lg" style={{ display: 'inline-flex', color: 'var(--primary)' }}><T.icon size={16} /></span>
                            <span style={{ fontWeight: 600 }}>{w.name}</span>
                          </span>
                        </td>
                        <td><span className={cx(styles.pill, w.type === 'MAIN_WAREHOUSE' ? styles.pillPrimary : w.type === 'ONLINE' ? styles.pillBlue : styles.pillGray)}>{T.label}</span></td>
                        <td className={styles.muted}>{w.location ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {w.location}</span> : '—'}</td>
                        <td className={cx(styles.right, styles.num)}>{s.skus}</td>
                        <td className={cx(styles.right, styles.num)} style={{ fontWeight: 600 }}>{s.units.toLocaleString()}</td>
                        <td className={cx(styles.right, styles.num)}><CurrencyValue amount={s.value} options={fmt2} /></td>
                        <td>
                          {s.low + s.out === 0 ? <span className={styles.muted}>—</span> : (
                            <span style={{ display: 'inline-flex', gap: 6 }}>
                              {s.low > 0 && <span className={cx(styles.pill, styles.pillAmber)}>{s.low} low</span>}
                              {s.out > 0 && <span className={cx(styles.pill, styles.pillRed)}>{s.out} out</span>}
                            </span>
                          )}
                        </td>
                        <td><span className={cx(styles.pill, w.isActive ? styles.pillGreen : styles.pillGray)}>{w.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td>
                          <div className={styles.rowActions} onClick={e => e.stopPropagation()}>
                            <IconBtn title="View stock" onClick={() => openPreview(w)}><Eye size={15} /></IconBtn>
                            <IconBtn title="Edit" onClick={() => openEdit(w)}><Edit size={15} /></IconBtn>
                            <IconBtn title={w.isActive ? 'Deactivate' : 'Activate'} tone={w.isActive ? styles.iconBtnAmber : styles.iconBtnGreen}
                              disabled={busyId === w.id} onClick={() => toggleActive(w)}><Power size={15} /></IconBtn>
                            <IconBtn title="Delete" tone={styles.iconBtnRed} disabled={busyId === w.id} onClick={() => requestDelete(w)}><Trash2 size={15} /></IconBtn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className={styles.emptyCell}>
                        <WarehouseIcon size={32} style={{ margin: '0 auto 8px', opacity: 0.35 }} />
                        <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{warehouses.length === 0 ? 'No warehouses yet' : 'No warehouses match these filters'}</div>
                        <div style={{ marginBottom: 12 }}>{warehouses.length === 0 ? 'Add a storage location so you can receive and track stock.' : 'Try clearing the search or filter.'}</div>
                        {warehouses.length === 0 && <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> Add Warehouse</Button>}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.mobileList}>
              {filtered.map(w => {
                const s = statsOf(w.id);
                return (
                  <button key={w.id} type="button" className={styles.mobileCard} onClick={() => openPreview(w)}>
                    <div className={styles.cardLine}>
                      <span style={{ fontWeight: 700 }}>{w.name}</span>
                      <span className={cx(styles.pill, w.isActive ? styles.pillGreen : styles.pillGray)}>{w.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className={cx(styles.tiny, styles.muted)} style={{ margin: '2px 0 8px' }}>{typeMeta(w.type).label}{w.location ? ` · ${w.location}` : ''}</div>
                    <div className={styles.cardLine} style={{ borderTop: '1px solid var(--pi-edge)', paddingTop: 8 }}>
                      <span className={styles.muted}>{s.units} units</span>
                      <CurrencyValue amount={s.value} options={fmt2} className="font-bold" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {view === 'preview' && (
        <WarehousePreview
          warehouses={filtered}
          selectedId={previewId}
          onSelect={w => setPreviewId(w.id)}
          search={search}
          onSearch={setSearch}
          statsOf={statsOf}
          totalValue={kpi.value}
          busyId={busyId}
          onBack={() => setView('list')}
          onEdit={openEdit}
          onToggle={toggleActive}
          onDelete={requestDelete}
          onOpenBill={b => navigate(`/purchase?bill=${b.id}`)}
        />
      )}

      <WarehouseFormDialog
        open={formOpen}
        warehouse={editing}
        existing={warehouses}
        activeCount={activeCount}
        onOpenChange={setFormOpen}
        onSaved={saved => {
          if (editing) setWarehouses(prev => prev.map(x => (x.id === saved.id ? saved : x)));
          else loadWarehouses();
        }}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={o => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This warehouse holds no stock and isn’t used on any purchase invoice. It will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600" onClick={() => { const w = pendingDelete; setPendingDelete(null); if (w) deleteWarehouse(w); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Warehouse profile ────────────────────────────────────────────────────────

const STOCK_STATUS = {
  IN_STOCK: { label: 'In Stock', cls: styles.pillGreen },
  LOW_STOCK: { label: 'Low Stock', cls: styles.pillAmber },
  OUT_OF_STOCK: { label: 'Out of Stock', cls: styles.pillRed },
};

function WarehousePreview({ warehouses, selectedId, onSelect, search, onSearch, statsOf, totalValue, busyId, onBack, onEdit, onToggle, onDelete, onOpenBill }: {
  warehouses: Warehouse[];
  selectedId: number | null;
  onSelect: (w: Warehouse) => void;
  search: string;
  onSearch: (v: string) => void;
  statsOf: (id: number) => WhStats;
  totalValue: number;
  busyId: number | null;
  onBack: () => void;
  onEdit: (w: Warehouse) => void;
  onToggle: (w: Warehouse) => void;
  onDelete: (w: Warehouse) => void;
  onOpenBill: (b: SupplierBill) => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState('stock');
  const [stockQuery, setStockQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL');
  const w = warehouses.find(x => x.id === selectedId) ?? null;
  useEffect(() => { setTab('stock'); setStockQuery(''); setStockFilter('ALL'); }, [selectedId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      if (drawerOpen) setDrawerOpen(false); else onBack();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen, onBack]);

  const s = w ? statsOf(w.id) : null;
  const lines = useMemo(() => {
    if (!s) return [];
    const q = stockQuery.trim().toLowerCase();
    return s.lines.filter(l => (stockFilter === 'ALL' || l.status === stockFilter)
      && (!q || [l.product.name, l.product.sku, l.product.categoryName].some(v => (v ?? '').toLowerCase().includes(q))));
  }, [s, stockQuery, stockFilter]);

  return (
    <div className={styles.fadeIn}>
      <button type="button" className={cx(styles.tab, styles.browseBtn)} style={{ marginBottom: 12 }} onClick={() => setDrawerOpen(true)}>
        <ListFilter size={14} className="text-primary" /> Browse warehouses
      </button>
      <div className={styles.split}>
        <div className={cx(styles.panel, styles.splitList, drawerOpen && styles.splitListOpen)}>
          <div className={styles.splitListHead}>
            <div className={styles.cardLine} style={{ marginBottom: 8 }}>
              <span className={styles.panelTitle} style={{ fontSize: 15 }}>All Warehouses</span>
              {drawerOpen && <button type="button" className={styles.iconBtn} onClick={() => setDrawerOpen(false)} aria-label="Close list"><X size={15} /></button>}
            </div>
            <div className={styles.searchBox} style={{ width: '100%' }}>
              <Search size={14} />
              <input className={styles.searchInput} value={search} onChange={e => onSearch(e.target.value)} placeholder="Search warehouses..." />
            </div>
          </div>
          <div className={styles.splitListBody}>
            {warehouses.length === 0 && <div className={styles.empty}>No warehouses found.</div>}
            {warehouses.map(x => {
              const xs = statsOf(x.id);
              return (
                <button key={x.id} type="button" onClick={() => { onSelect(x); setDrawerOpen(false); }} className={cx(styles.card, x.id === selectedId && styles.cardSelected)}>
                  <div className={styles.cardLine} style={{ marginBottom: 4 }}>
                    <span className={styles.cardName}>{x.name}</span>
                    <span className={cx(styles.pill, x.isActive ? styles.pillGreen : styles.pillGray)}>{x.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className={cx(styles.tiny, styles.muted)} style={{ marginBottom: 6 }}>{typeMeta(x.type).label}{x.location ? ` · ${x.location}` : ''}</div>
                  <div className={styles.cardLine}>
                    <span className={cx(styles.tiny, styles.muted)}>{xs.units.toLocaleString()} units · {xs.skus} products</span>
                    {xs.low + xs.out > 0 && <span className={cx(styles.tiny, styles.danger)} style={{ fontWeight: 600 }}>{xs.low + xs.out} to reorder</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        {drawerOpen && <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(15,23,42,0.4)' }} />}

        <div style={{ minWidth: 0 }}>
          {!w || !s ? (
            <div className={cx(styles.panel, styles.empty)} style={{ padding: 64 }}>This warehouse is no longer in the list. Pick another one on the left.</div>
          ) : (
            <div className={styles.previewStack}>
              <div className={cx(styles.panel, styles.previewHead)}>
                <div style={{ minWidth: 0 }}>
                  <div className={styles.previewTitle}>
                    <h2>{w.name}</h2>
                    <span className={cx(styles.pill, w.isActive ? styles.pillGreen : styles.pillGray)}>{w.isActive ? 'Active' : 'Inactive'}</span>
                    <span className={cx(styles.pill, styles.pillPrimary)}>{typeMeta(w.type).label}</span>
                  </div>
                  <div className={styles.metaLine}>
                    {w.location && <span><MapPin size={12} /> {w.location}</span>}
                  </div>
                </div>
                <div className={styles.headerActions}>
                  <Button size="sm" onClick={() => onEdit(w)}><Edit className="h-4 w-4" /> Edit</Button>
                  <Button size="sm" variant="outline" disabled={busyId === w.id} onClick={() => onToggle(w)}><Power className="h-4 w-4" /> {w.isActive ? 'Deactivate' : 'Activate'}</Button>
                  <button type="button" className={cx(styles.iconBtn, styles.iconBtnRed)} title="Delete warehouse" onClick={() => onDelete(w)}><Trash2 size={16} /></button>
                  <button type="button" className={styles.iconBtn} title="Close (Esc)" onClick={onBack}><X size={16} /></button>
                </div>
              </div>

              <div className={styles.summaryStrip}>
                {[
                  { label: 'Products', value: s.skus },
                  { label: 'Units', value: s.units.toLocaleString() },
                  { label: 'Stock Value', value: <CurrencyValue amount={s.value} options={fmt2} /> },
                  { label: 'Share of Value', value: totalValue > 0 ? `${Math.round((s.value / totalValue) * 100)}%` : '—' },
                  { label: 'Low Stock', value: s.low, tone: s.low > 0 ? styles.tileRed : undefined },
                  { label: 'Out of Stock', value: s.out, tone: s.out > 0 ? styles.tileRed : undefined },
                  { label: 'Receipts', value: s.receipts.length },
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
                      { key: 'stock', label: 'Stock on Hand', icon: Boxes, count: s.lines.length },
                      { key: 'receipts', label: 'Purchase Receipts', icon: Receipt, count: s.receipts.length },
                    ].map(t => (
                      <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
                        className={cx(styles.docTab, tab === t.key && styles.docTabActive)} onClick={() => setTab(t.key)}>
                        <t.icon size={13} /> {t.label} {t.count ? <span className={styles.count}>{t.count}</span> : null}
                      </button>
                    ))}
                  </div>
                  <div className={styles.tabPanel} role="tabpanel">
                    {tab === 'stock' && (
                      <>
                        <div className={styles.filters} style={{ marginBottom: 14 }}>
                          <div className={styles.searchBox}>
                            <Search size={14} />
                            <input className={styles.searchInput} placeholder="Search products…" value={stockQuery} onChange={e => setStockQuery(e.target.value)} />
                          </div>
                          <NativeSelect value={stockFilter} onChange={setStockFilter} label="Stock status" options={[
                            { value: 'ALL', label: 'All Stock' },
                            { value: 'IN_STOCK', label: 'In Stock' },
                            { value: 'LOW_STOCK', label: 'Low Stock' },
                            { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
                          ]} />
                        </div>
                        {lines.length === 0 ? (
                          <div className={styles.empty}><PackageX size={20} style={{ margin: '0 auto 6px', opacity: 0.4 }} />{s.lines.length === 0 ? 'No products are stocked here yet.' : 'No products match.'}</div>
                        ) : (
                          <div style={{ overflowX: 'auto' }}>
                            <table className={styles.itemsTable} style={{ minWidth: 620 }}>
                              <thead><tr><th>Product</th><th>Category</th><th className={styles.right}>On Hand</th><th className={styles.right}>Reorder At</th><th>Status</th><th className={styles.right}>Value</th></tr></thead>
                              <tbody>
                                {lines.map(l => (
                                  <tr key={l.product.id}>
                                    <td><div style={{ fontWeight: 600 }}>{l.product.name}</div>{l.product.sku && <div className={cx(styles.tiny, styles.muted, styles.mono)}>{l.product.sku}</div>}</td>
                                    <td className={styles.muted}>{l.product.categoryName || '—'}</td>
                                    <td className={cx(styles.right, styles.num)} style={{ fontWeight: 600 }}>{l.onHand} <span className={styles.muted} style={{ fontWeight: 400 }}>{l.product.defaultUnit ?? ''}</span></td>
                                    <td className={cx(styles.right, styles.num, styles.muted)}>{l.reorderLevel || '—'}</td>
                                    <td><span className={cx(styles.pill, STOCK_STATUS[l.status].cls)}>{STOCK_STATUS[l.status].label}</span></td>
                                    <td className={cx(styles.right, styles.num)}><CurrencyValue amount={l.value} options={fmt2} /></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    )}
                    {tab === 'receipts' && (s.receipts.length === 0 ? (
                      <div className={styles.empty}><Receipt size={20} style={{ margin: '0 auto 6px', opacity: 0.4 }} />No confirmed purchase invoices have received stock into this warehouse.</div>
                    ) : (
                      <table className={styles.itemsTable}>
                        <thead><tr><th>Bill No</th><th>Date</th><th>Supplier</th><th className={styles.right}>Items</th><th className={styles.right}>Amount</th></tr></thead>
                        <tbody>
                          {s.receipts.map(b => (
                            <tr key={b.id} className={styles.row} onClick={() => onOpenBill(b)}>
                              <td style={{ fontWeight: 600 }}>{b.billNumber}</td>
                              <td>{displayDate(b.billDate)}</td>
                              <td>{b.supplierName}</td>
                              <td className={cx(styles.right, styles.num)}>{b.items.reduce((n, i) => n + i.quantity, 0)}</td>
                              <td className={cx(styles.right, styles.num)}><CurrencyValue amount={b.totalAmount} options={fmt2} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ))}
                  </div>
                </section>

                <div className={cx(styles.rail, styles.railSticky)}>
                  <RailCard title="Details" icon={WarehouseIcon}>
                    <InfoRow label="Name" value={w.name} />
                    <InfoRow label="Type" value={typeMeta(w.type).label} />
                    <InfoRow label="Location" value={w.location} />
                    <InfoRow label="Status" value={w.isActive ? 'Active' : 'Inactive'} />
                  </RailCard>
                  <RailCard title="Top Items by Value" icon={Package}>
                    {s.lines.filter(l => l.value > 0).slice(0, 5).map(l => (
                      <InfoRow key={l.product.id} label={l.product.name} value={<CurrencyValue amount={l.value} options={fmt2} />} />
                    ))}
                    {s.lines.every(l => l.value <= 0) && <div className={styles.empty} style={{ padding: '8px 0', fontSize: 13 }}>No stock value yet.</div>}
                  </RailCard>
                  {s.low + s.out > 0 && (
                    <div className={cx(styles.notice, styles.noticeWarn)}>
                      <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>{s.low + s.out} product{s.low + s.out === 1 ? '' : 's'} here {s.low + s.out === 1 ? 'is' : 'are'} low or out of stock — consider raising a purchase order.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Create / edit ────────────────────────────────────────────────────────────

function WarehouseFormDialog({ open, warehouse, existing, activeCount, onOpenChange, onSaved }: {
  open: boolean;
  warehouse: Warehouse | null;
  existing: Warehouse[];
  activeCount: number;
  onOpenChange: (o: boolean) => void;
  onSaved: (w: Warehouse) => void;
}) {
  const [form, setForm] = useState({ name: '', type: 'BRANCH', location: '', isActive: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(warehouse
      ? { name: warehouse.name, type: warehouse.type || 'BRANCH', location: warehouse.location ?? '', isActive: warehouse.isActive }
      : { name: '', type: 'BRANCH', location: '', isActive: true });
  }, [open, warehouse]);

  const save = async () => {
    const name = form.name.trim();
    if (!name) { toast.error('Warehouse name is required'); return; }
    if (existing.some(w => w.id !== warehouse?.id && w.name.trim().toLowerCase() === name.toLowerCase())) {
      toast.error('A warehouse with this name already exists');
      return;
    }
    if (warehouse?.isActive && !form.isActive && activeCount <= 1) {
      toast.error('Keep at least one active warehouse');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, name, location: form.location.trim() };
      const saved = warehouse ? await productsService.updateWarehouse(warehouse.id, payload) : await productsService.createWarehouse(payload);
      toast.success(warehouse ? 'Warehouse updated' : 'Warehouse created');
      onSaved(saved);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save warehouse');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{warehouse ? 'Edit Warehouse' : 'Add Warehouse'}</DialogTitle>
          <DialogDescription>{warehouse ? `Update details for ${warehouse.name}` : 'Create a new storage location for your inventory'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Warehouse Name *</Label>
            <Input placeholder="e.g. Main Warehouse, Downtown Store" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <div className={styles.selectWrap}>
              <select className={cx(styles.field, styles.fieldSelect)} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Location / Address</Label>
            <Input placeholder="e.g. Dubai Marina, JBR Walk" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Active</Label>
              <p className="text-sm text-muted-foreground">Inactive warehouses are hidden when receiving or selling stock</p>
            </div>
            <Switch checked={form.isActive} onCheckedChange={v => setForm(p => ({ ...p, isActive: v }))} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {warehouse ? 'Update Warehouse' : 'Create Warehouse'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
