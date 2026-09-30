import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Loader2, Package, Plus, RefreshCw, Search, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { CurrencyGlyph } from '../../utils/currency';
import type { Product } from '../../utils/supabase/products-service';
import styles from './PurchaseInvoice.module.css';
import { money } from './purchaseInvoiceUtils';

// Shared product entry for the line grids of the purchase documents (invoice + order)
// and the sales invoice. `priceBasis` picks the price a product is added at:
// its cost (buying) or its selling price.

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ');

export type PriceBasis = 'cost' | 'sell';
const priceOf = (p: Product, basis: PriceBasis) => (basis === 'sell' ? p.sellingPrice : p.costPrice) ?? 0;

function productMatches(p: Product, q: string) {
  const s = q.trim().toLowerCase();
  return !s || p.name.toLowerCase().includes(s) || (p.sku ?? '').toLowerCase().includes(s)
    || (p.barcode ?? '').toLowerCase().includes(s) || (p.categoryName ?? '').toLowerCase().includes(s)
    || (p.brand ?? '').toLowerCase().includes(s);
}

/** Product photo (first image) or a package placeholder. */
export function Thumb({ product, size = 36 }: { product?: Pick<Product, 'imageUrls' | 'name'> | null; size?: number }) {
  const src = product?.imageUrls?.[0];
  const [broken, setBroken] = useState(false);
  return (
    <span className={styles.thumb} style={{ width: size, height: size }}>
      {src && !broken
        ? <img src={src} alt={product?.name ?? ''} loading="lazy" onError={() => setBroken(true)} />
        : <Package size={Math.round(size * 0.45)} />}
    </span>
  );
}

// ── Inline product search (last row of the grid) ─────────────────────────────

export function FastEntry({ inputRef, products, onPick, onCustom, onBrowse, priceBasis = 'cost', stockOf }: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  products: Product[];
  onPick: (p: Product) => void;
  /** Omit to allow catalog products only (no free-text custom lines). */
  onCustom?: (name: string) => void;
  onBrowse: (typed: string) => void;
  priceBasis?: PriceBasis;
  /** Stock shown per suggestion (defaults to the product's total stock). */
  stockOf?: (p: Product) => number;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const results = useMemo(() => products.filter(p => p.isActive !== false && productMatches(p, q)).slice(0, 8), [products, q]);
  const hasCustom = !!onCustom && q.trim().length > 0;
  const count = results.length + (hasCustom ? 1 : 0);

  const choose = (i: number) => {
    if (i < results.length) onPick(results[i]);
    else if (hasCustom) onCustom!(q.trim());
    else return;
    setQ('');
    setOpen(false);
    setActive(0);
  };

  return (
    <div className={styles.searchCell}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Search size={14} className="text-primary" />
        <input
          ref={inputRef}
          className={styles.cellInput}
          value={q}
          placeholder="Type item name, SKU or barcode to add…"
          onChange={e => { setQ(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => Math.min(count - 1, a + 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
            else if (e.key === 'Enter') { e.preventDefault(); if (count) choose(active); }
            else if (e.key === 'F2') { e.preventDefault(); const t = q; setQ(''); setOpen(false); onBrowse(t); }
            else if (e.key === 'Escape') setOpen(false);
          }}
          aria-label="Add item"
        />
        <button type="button" className={cx(styles.copyBtn, styles.tiny)} style={{ color: 'var(--primary)', fontWeight: 600, whiteSpace: 'nowrap' }}
          onClick={() => { const t = q; setQ(''); onBrowse(t); }} title="Open product search (F2)">
          Browse catalog
        </button>
      </div>
      {open && count > 0 && (
        <div className={styles.suggest} role="listbox">
          {results.map((p, i) => (
            <button key={p.id} type="button" role="option" aria-selected={i === active}
              className={cx(styles.suggestItem, i === active && styles.suggestActive)}
              onMouseDown={e => { e.preventDefault(); choose(i); }} onMouseEnter={() => setActive(i)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <Thumb product={p} size={34} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{p.name}</span>
                  <span className={cx(styles.tiny, styles.muted)}>{[p.sku, p.categoryName].filter(Boolean).join(' · ')}</span>
                </span>
              </span>
              <span style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}><CurrencyGlyph /> {money(priceOf(p, priceBasis))}</span>
                <span className={styles.tiny} style={{ color: p.stockStatus === 'OUT_OF_STOCK' ? '#dc2626' : p.stockStatus === 'LOW_STOCK' ? '#d97706' : '#059669' }}>
                  Stock {stockOf ? stockOf(p) : p.totalStock ?? 0}
                </span>
              </span>
            </button>
          ))}
          {hasCustom && (
            <button type="button" className={cx(styles.suggestItem, active === results.length && styles.suggestActive)}
              onMouseDown={e => { e.preventDefault(); choose(results.length); }} onMouseEnter={() => setActive(results.length)}>
              <span style={{ fontSize: 14 }}><Plus size={12} style={{ display: 'inline', verticalAlign: -2 }} /> Add “{q.trim()}” as a custom item <span className={styles.muted}>(no stock tracking)</span></span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Product selector modal (BillBull-style) ──────────────────────────────────

export type ProductEntry = { quantity: number; unitPrice: number; discountPercent: number };

const RECENT_KEY = 'gymbios.purchase.recentProducts';
const PAGE = 20;

function readRecent(): number[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').filter((n: unknown) => typeof n === 'number'); } catch { return []; }
}
function pushRecent(id: number) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...readRecent().filter(x => x !== id)].slice(0, 8))); } catch { /* storage unavailable */ }
}

/**
 * Search the catalog and add a product to a purchase document.
 * Mouse: click a card to add it (qty 1 at cost) and close.
 * Keyboard: ↑/↓ to move, Enter to open the qty/price/discount panel, Enter through it to add;
 * Tab adds the highlighted (or first) result straight away.
 */
export function ProductSelector({ open, onOpenChange, products, onAdd, target = 'Invoice', initialSearch = '', warehouseId, onRefresh, priceBasis = 'cost' }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  products: Product[];
  onAdd: (p: Product, entry: ProductEntry) => void;
  target?: string;
  initialSearch?: string;
  warehouseId?: number;
  onRefresh?: () => Promise<unknown> | void;
  priceBasis?: PriceBasis;
}) {
  const selling = priceBasis === 'sell';
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [focused, setFocused] = useState(-1);
  const [entry, setEntry] = useState<{ product: Product; qty: string; price: string; disc: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [recentIds, setRecentIds] = useState<number[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const discRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ(initialSearch);
    setPage(0);
    setFocused(initialSearch ? 0 : -1);
    setEntry(null);
    setRecentIds(readRecent());
    setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = useMemo(() => products.filter(p => p.isActive !== false), [products]);
  const matches = useMemo(
    () => active.filter(p => productMatches(p, q)).sort((a, b) => a.name.localeCompare(b.name)),
    [active, q],
  );
  const pages = Math.max(1, Math.ceil(matches.length / PAGE));
  const pageItems = matches.slice(page * PAGE, page * PAGE + PAGE);
  const recent = useMemo(() => recentIds.map(id => active.find(p => p.id === id)).filter(Boolean) as Product[], [recentIds, active]);

  useEffect(() => { setPage(0); setFocused(q ? 0 : -1); }, [q]);

  const stockOf = (p: Product) => {
    if (warehouseId) {
      const row = p.stockByWarehouse?.find(s => s.warehouseId === warehouseId);
      if (row) return row.currentStock;
      if (p.stockByWarehouse?.length) return 0;
    }
    return p.totalStock ?? 0;
  };

  const finish = (p: Product, e: ProductEntry) => {
    onAdd(p, e);
    pushRecent(p.id);
    onOpenChange(false);
  };

  const addNow = (p: Product) => finish(p, { quantity: 1, unitPrice: priceOf(p, priceBasis), discountPercent: 0 });

  const openEntry = (p: Product) => {
    setEntry({ product: p, qty: '1', price: String(priceOf(p, priceBasis)), disc: '0' });
    setTimeout(() => { qtyRef.current?.focus(); qtyRef.current?.select(); }, 30);
  };

  const commitEntry = () => {
    if (!entry) return;
    const quantity = Math.max(1, Math.round(Number(entry.qty) || 0));
    const unitPrice = Math.max(0, Number(entry.price) || 0);
    const discountPercent = Math.min(100, Math.max(0, Number(entry.disc) || 0));
    finish(entry.product, { quantity, unitPrice, discountPercent });
  };

  const moveFocus = (next: number) => {
    setFocused(next);
    (listRef.current?.children[next] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' });
  };

  const onSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(Math.min(focused + 1, pageItems.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveFocus(Math.max(focused - 1, -1)); }
    else if (e.key === 'Enter') { e.preventDefault(); const p = pageItems[focused >= 0 ? focused : 0]; if (p) openEntry(p); }
    else if (e.key === 'Tab' && !e.shiftKey && pageItems.length) { e.preventDefault(); addNow(pageItems[focused >= 0 ? focused : 0]); }
  };

  const refresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  };

  const entryField = (label: string, key: 'qty' | 'price' | 'disc', ref: React.RefObject<HTMLInputElement | null>, next: () => void, step: string) => (
    <label className={styles.cell}>
      <span className={styles.eyebrow}>{label}</span>
      <input
        ref={ref}
        type="number"
        min={0}
        step={step}
        className={styles.field}
        value={entry?.[key] ?? ''}
        onChange={e => setEntry(en => (en ? { ...en, [key]: e.target.value } : en))}
        onKeyDown={e => {
          if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) { e.preventDefault(); next(); }
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setEntry(null); searchRef.current?.focus(); }
        }}
      />
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{ maxWidth: 820, width: 'calc(100% - 32px)', maxHeight: '90vh', padding: 0, gap: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        aria-describedby={undefined}
      >
        {/* Header */}
        <div className={styles.psHead}>
          <DialogTitle className={styles.psTitle}>Select Items from Products</DialogTitle>
          <div className={styles.psHint}>
            Search, use <span className={styles.kbd}>↑</span><span className={styles.kbd}>↓</span> to move,{' '}
            <span className={styles.kbd}>Enter</span> to set qty &amp; price, or <span className={styles.kbd}>Tab</span> to add instantly.
          </div>
          <div className={styles.psSearchRow}>
            <div className={styles.psSearch}>
              <Search size={16} />
              <input
                ref={searchRef}
                className={styles.psSearchInput}
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={onSearchKey}
                placeholder="Search by name, SKU, barcode, category or brand..."
                aria-label="Search products"
              />
            </div>
            <Button variant="outline" onClick={() => window.open('/add-product', '_blank')} title="Opens the product form in a new tab">
              <Plus className="h-4 w-4" /> New Product
            </Button>
            {onRefresh && (
              <Button variant="outline" size="icon" onClick={refresh} disabled={refreshing} title="Reload products (after adding one in another tab)">
                <RefreshCw className={cx('h-4 w-4', refreshing && 'animate-spin')} />
              </Button>
            )}
          </div>

          {entry && (
            <div className={styles.psEntry}>
              <div className={styles.cardLine}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <Thumb product={entry.product} size={32} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 700 }}>{entry.product.name}</span>
                    <span className={cx(styles.tiny, styles.muted)}>{entry.product.sku || 'No code'} · {entry.product.defaultUnit ?? 'pcs'}</span>
                  </span>
                </span>
                <button type="button" className={styles.iconBtn} title="Cancel (Esc)" onClick={() => { setEntry(null); searchRef.current?.focus(); }}><X size={15} /></button>
              </div>
              <div className={styles.psEntryGrid}>
                {entryField('Qty', 'qty', qtyRef, () => { priceRef.current?.focus(); priceRef.current?.select(); }, '1')}
                {entryField(selling ? 'Unit Price' : 'Unit Cost', 'price', priceRef, () => { discRef.current?.focus(); discRef.current?.select(); }, '0.01')}
                {entryField('Disc %', 'disc', discRef, commitEntry, '0.01')}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <Button size="sm" onClick={commitEntry}><Plus className="h-4 w-4" /> Add to {target}</Button>
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className={styles.psBody}>
          {refreshing && <div className={styles.psOverlay}><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}

          {!q && recent.length > 0 && (
            <>
              <div className={styles.psSection}><Clock size={12} /> Recently Selected</div>
              <div className={styles.psChips}>
                {recent.map(p => (
                  <button key={p.id} type="button" className={styles.psChip} onClick={() => addNow(p)} title={`Add ${p.name}`}>
                    <Thumb product={p} size={20} />
                    {p.sku && <span className={styles.mono} style={{ fontWeight: 700 }}>{p.sku}</span>}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className={styles.psSection}>{q ? `Search results for “${q}”` : 'All products (A – Z)'}</div>

          {pageItems.length === 0 ? (
            <div className={styles.empty} style={{ padding: '40px 0' }}>
              <Package size={30} style={{ margin: '0 auto 8px', opacity: 0.35 }} />
              {q ? <>No products match <strong>“{q}”</strong>.</> : 'No active products yet.'}
            </div>
          ) : (
            <div ref={listRef}>
              {pageItems.map((p, idx) => {
                const stock = stockOf(p);
                const out = stock <= 0;
                const low = !out && p.stockStatus === 'LOW_STOCK';
                const cost = p.costPrice ?? 0;
                const sell = p.sellingPrice ?? 0;
                const gp = sell > 0 ? ((sell - cost) / sell) * 100 : null;
                return (
                  <div
                    key={p.id}
                    className={cx(styles.psCard, idx === focused && styles.psCardFocused, out && styles.psCardOut)}
                    onClick={() => addNow(p)}
                    onMouseEnter={() => setFocused(idx)}
                  >
                    <div style={{ display: 'flex', gap: 14, minWidth: 0, flex: 1 }}>
                      <Thumb product={p} size={52} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                          {p.sku && <span className={cx(styles.mono, styles.muted)} style={{ fontSize: 12, fontWeight: 700 }}>{p.sku}</span>}
                          {p.categoryName && <span className={cx(styles.pill, styles.pillBlue)}>{p.categoryName}</span>}
                          {p.brand && <span className={cx(styles.pill, styles.pillGray)}>{p.brand}</span>}
                          <span className={cx(styles.pill, out ? styles.pillRed : low ? styles.pillAmber : styles.pillGreen)}>
                            {out ? 'Out of stock' : low ? 'Low stock' : 'In stock'}
                          </span>
                        </div>
                        <div className={styles.psName}>{p.name}</div>
                        {p.description && <div className={cx(styles.tiny, styles.muted)} style={{ marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 440 }}>{p.description}</div>}
                        <div className={styles.psMeta}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Package size={12} /> Stock: <strong style={{ color: out ? '#dc2626' : 'var(--foreground)' }}>{stock}</strong> {p.defaultUnit ?? ''}
                          </span>
                          {p.barcode && <span>Barcode: {p.barcode}</span>}
                        </div>
                      </div>
                    </div>
                    <div className={styles.psPrice}>
                      <span style={{ fontSize: 16, fontWeight: 700 }}><CurrencyGlyph /> {money(selling ? sell : cost)}</span>
                      <span className={cx(styles.tiny, styles.muted)}>
                        {selling ? 'Cost' : 'Sell'} <CurrencyGlyph /> {money(selling ? cost : sell)}{gp != null && ` · GP ${gp.toFixed(1)}%`}
                      </span>
                      <Button size="sm" onClick={e => { e.stopPropagation(); addNow(p); }}>
                        <Plus className="h-4 w-4" /> Add
                      </Button>
                      <button type="button" className={cx(styles.copyBtn, styles.tiny)} style={{ color: 'var(--primary)' }}
                        onClick={e => { e.stopPropagation(); openEntry(p); }}>
                        Set qty &amp; price
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.psFoot}>
          <span>{matches.length} product{matches.length === 1 ? '' : 's'} found</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button type="button" className={styles.iconBtn} disabled={page === 0} onClick={() => setPage(p => p - 1)} title="Previous page"><ChevronLeft size={16} /></button>
            <span style={{ minWidth: 60, textAlign: 'center' }}>{page + 1} / {pages}</span>
            <button type="button" className={styles.iconBtn} disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)} title="Next page"><ChevronRight size={16} /></button>
          </span>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
