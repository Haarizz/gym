import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, PackageOpen, Plus, Search, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import type { Product } from '../../utils/supabase/products-service';
import type { SupplierBill } from '../../utils/supabase/supplier-bill-service';
import { displayDate, fetchAllBills } from '../purchase/purchaseInvoiceUtils';
import { queueItemFor, type QueueItem } from './barcodeLabels';
import pi from '../purchase/PurchaseInvoice.module.css';
import styles from './BarcodePrint.module.css';

export interface BillLoadResult {
  items: QueueItem[];
  labels: number;
  /** Lines that aren't catalog products, or have neither barcode nor SKU. */
  skipped: string[];
}

/** One label per unit received on each line of `bill`. */
export function queueItemsFromBill(bill: SupplierBill, productById: Map<number, Product>): BillLoadResult {
  const items: QueueItem[] = [];
  const skipped: string[] = [];
  bill.items.forEach((line, i) => {
    const product = line.productId != null ? productById.get(line.productId) : undefined;
    const item = product
      ? queueItemFor(product, Math.ceil(Number(line.quantity) || 1), { unit: line.unitOfMeasure, origin: bill.billNumber, key: `bill${bill.id}:${line.id ?? i}` })
      : null;
    if (item) items.push(item);
    else skipped.push(line.productName || `Line ${i + 1}`);
  });
  return { items, labels: items.reduce((n, x) => n + x.qty, 0), skipped };
}

type StatusFilter = 'CONFIRMED' | 'DRAFT' | 'ALL';

export function LoadPurchaseDialog({ open, onOpenChange, products, onLoad }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onLoad: (bill: SupplierBill, result: BillLoadResult) => void;
}) {
  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [supplier, setSupplier] = useState('');
  const [status, setStatus] = useState<StatusFilter>('CONFIRMED');
  const [expanded, setExpanded] = useState<number | null>(null);
  const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchAllBills()
      .then(list => setBills(list.filter(b => b.status !== 'CANCELLED').sort((a, b) => (b.billDate || '').localeCompare(a.billDate || '') || b.id - a.id)))
      .catch((err: any) => toast.error(err?.message || 'Failed to load purchase invoices'))
      .finally(() => setLoading(false));
  }, [open]);

  const suppliers = useMemo(() => [...new Set(bills.map(b => b.supplierName).filter(Boolean))].sort(), [bills]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bills.filter(b =>
      (status === 'ALL' || b.status === status) &&
      (!supplier || b.supplierName === supplier) &&
      (!q || [b.billNumber, b.invoiceNumber, b.supplierName, ...b.items.map(i => i.productName)].some(v => v?.toLowerCase().includes(q))),
    );
  }, [bills, search, supplier, status]);

  const load = (bill: SupplierBill) => {
    const result = queueItemsFromBill(bill, productById);
    if (result.items.length === 0) {
      toast.error(`Nothing to print on ${bill.billNumber}`, { description: 'None of its lines are catalog products with a barcode or SKU.' });
      return;
    }
    onLoad(bill, result);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 'min(820px, calc(100% - 2rem))' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-primary" /> Load from purchase invoice</DialogTitle>
          <DialogDescription>Add one label for every unit received on a supplier bill — ready to stick on the new stock.</DialogDescription>
        </DialogHeader>

        <div className={styles.dialogFilters}>
          <div className={pi.searchBox} style={{ width: '100%' }}>
            <Search size={14} />
            <input className={pi.searchInput} placeholder="Bill no, supplier invoice, item…" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
          </div>
          <div className={pi.selectWrap}>
            <select className={pi.nativeSelect} style={{ width: '100%' }} value={supplier} onChange={e => setSupplier(e.target.value)} aria-label="Supplier">
              <option value="">All suppliers</option>
              {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={12} />
          </div>
          <div className={pi.selectWrap}>
            <select className={pi.nativeSelect} style={{ width: '100%' }} value={status} onChange={e => setStatus(e.target.value as StatusFilter)} aria-label="Status">
              <option value="CONFIRMED">Confirmed (stock received)</option>
              <option value="DRAFT">Drafts</option>
              <option value="ALL">All invoices</option>
            </select>
            <ChevronDown size={12} />
          </div>
        </div>

        <div className={styles.billList}>
          {loading && [0, 1, 2].map(i => <div key={i} className={pi.skeleton} style={{ height: 64, borderRadius: 10 }} />)}
          {!loading && filtered.length === 0 && (
            <div className={styles.queueEmpty} style={{ padding: '36px 16px' }}>
              <span className={styles.queueEmptyIcon}><PackageOpen size={26} /></span>
              <strong>{bills.length === 0 ? 'No purchase invoices yet' : 'No invoices match these filters'}</strong>
              <span>{bills.length === 0 ? 'Record a purchase invoice to print labels for the stock it brings in.' : 'Try another search, supplier or status.'}</span>
            </div>
          )}
          {!loading && filtered.map(b => {
            const r = queueItemsFromBill(b, productById);
            const open = expanded === b.id;
            return (
              <div key={b.id} className={styles.billCard}>
                <div className={styles.billHead}>
                  <button type="button" onClick={() => setExpanded(open ? null : b.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, border: 0, background: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', minWidth: 0, flex: 1 }}>
                    {open ? <ChevronDown size={16} className="text-primary" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <strong style={{ color: 'var(--foreground)' }}>{b.billNumber}</strong>
                        <span className={`${pi.pill} ${b.status === 'CONFIRMED' ? pi.pillGreen : pi.pillGray}`}>{b.status === 'CONFIRMED' ? 'Confirmed' : 'Draft'}</span>
                        {b.invoiceNumber && <span className={`${pi.tiny} ${pi.muted}`}>Supp. inv {b.invoiceNumber}</span>}
                      </span>
                      <span className={`${pi.tiny} ${pi.muted}`} style={{ display: 'block', marginTop: 2 }}>
                        {b.supplierName} · {displayDate(b.billDate)} · {b.items.length} line{b.items.length === 1 ? '' : 's'}
                      </span>
                    </span>
                  </button>
                  <Button size="sm" variant={r.items.length ? 'default' : 'outline'} disabled={r.items.length === 0} onClick={() => load(b)}>
                    <Plus className="h-4 w-4" /> {r.items.length ? `Add ${r.labels} label${r.labels === 1 ? '' : 's'}` : 'Nothing to print'}
                  </Button>
                </div>
                {open && (
                  <div className={styles.billItems}>
                    {b.items.map((line, i) => {
                      const product = line.productId != null ? productById.get(line.productId) : undefined;
                      const q = product ? queueItemFor(product, Math.ceil(Number(line.quantity) || 1), { unit: line.unitOfMeasure }) : null;
                      const opt = q?.options.find(o => o.id === q.optionId);
                      return (
                        <div key={line.id ?? i} className={styles.billItem}>
                          <span style={{ minWidth: 0 }}>
                            <span className={styles.itemName} style={{ display: 'block', fontWeight: 500 }}>{line.productName}</span>
                            <span className={`${pi.tiny} ${pi.muted}`}>{line.quantity} {line.unitOfMeasure || ''}</span>
                          </span>
                          <span>{opt ? <span className={styles.code}>{opt.value}</span> : <span className={`${pi.tiny} ${pi.muted}`}>{product ? 'No barcode or SKU' : 'Not a catalog product'}</span>}</span>
                          <span className={pi.right} style={{ fontWeight: 600 }}>{q ? `${q.qty} ×` : '—'}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {loading && <div className={`${pi.tiny} ${pi.muted}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 className="h-3 w-3 animate-spin" /> Loading purchase invoices…</div>}
      </DialogContent>
    </Dialog>
  );
}
