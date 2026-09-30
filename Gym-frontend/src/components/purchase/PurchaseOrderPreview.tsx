import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Building2, CheckCircle, CheckCircle2, Clock, Copy, Edit, FileText, Link2, ListFilter, MessageSquare,
  PackageCheck, Printer, Receipt, RotateCcw, Search, Send, Trash2, Truck, User, X, XCircle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { CurrencyValue } from '../../utils/currency';
import type { PurchaseOrder, Supplier } from '../../utils/supabase/purchase-service';
import type { SupplierBill } from '../../utils/supabase/supplier-bill-service';
import styles from './PurchaseInvoice.module.css';
import { InfoRow, RailCard, copy, cx } from './purchaseUi';
import { Thumb } from './lineEntry';
import type { Product } from '../../utils/supabase/products-service';
import { balanceOf, displayDate, displayDateTime, displayStatus, priorityMeta, statusMeta } from './purchaseInvoiceUtils';
import { buildPOTimeline, isLate, isoDay, poActions, poStatusMeta, receipt } from './purchaseOrderUtils';

const fmt2 = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

function StatusPills({ po }: { po: PurchaseOrder }) {
  const m = poStatusMeta(po.status);
  return (
    <>
      <span className={cx(styles.pill, m.cls)}>{m.label}</span>
      {isLate(po) && <span className={cx(styles.pill, styles.pillRed)}>Late</span>}
    </>
  );
}

function Progress({ pct }: { pct: number }) {
  return (
    <div style={{ height: 6, borderRadius: 999, background: 'var(--muted)', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#059669' : 'var(--primary)', transition: 'width .3s' }} />
    </div>
  );
}

function OrderCard({ po, selected, onSelect }: { po: PurchaseOrder; selected: boolean; onSelect: () => void }) {
  const r = receipt(po);
  const showProgress = ['ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(po.status);
  return (
    <button type="button" onClick={onSelect} aria-current={selected || undefined} className={cx(styles.card, selected && styles.cardSelected)}>
      <div className={styles.cardLine} style={{ marginBottom: 4 }}>
        <span className={styles.cardName}>{po.supplierName || '—'}</span>
        <CurrencyValue amount={po.totalAmount} options={fmt2} className="font-bold text-sm" />
      </div>
      <div className={cx(styles.tiny, styles.muted)} style={{ marginBottom: 8 }}>
        {displayDate(isoDay(po.orderDate))} <span className={styles.dot}>•</span> <span className={styles.mono}>{po.poNumber}</span>
        {po.expectedDeliveryDate && <> <span className={styles.dot}>•</span> ETA {displayDate(isoDay(po.expectedDeliveryDate))}</>}
      </div>
      {showProgress && (
        <div style={{ marginBottom: 8 }}>
          <Progress pct={r.pct} />
          <div className={cx(styles.tiny, styles.muted)} style={{ marginTop: 3 }}>{r.received}/{r.ordered} received</div>
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        <StatusPills po={po} />
        <span className={cx(styles.pill, priorityMeta(po.priority).cls)}>{priorityMeta(po.priority).label}</span>
      </div>
    </button>
  );
}

type Props = {
  orders: PurchaseOrder[];
  products?: Product[];   // for item photos
  loading: boolean;
  selectedId: number | null;
  onSelect: (po: PurchaseOrder) => void;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  suppliers: Supplier[];
  bills: SupplierBill[];
  busyId: number | null;
  onBack: () => void;
  onEdit: (po: PurchaseOrder) => void;
  onStatus: (po: PurchaseOrder, next: PurchaseOrder['status']) => void;
  onReceive: (po: PurchaseOrder) => void;
  onCancel: (po: PurchaseOrder) => void;
  onDelete: (po: PurchaseOrder) => void;
  onPrint: (po: PurchaseOrder) => void;
  onCreateInvoice: (po: PurchaseOrder) => void;
  onOpenInvoice: (bill: SupplierBill) => void;
};

export function PurchaseOrderPreview(props: Props) {
  const { orders, loading, selectedId, onSelect, searchTerm, onSearchChange, onBack } = props;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState('receiving');
  const po = orders.find(o => o.id === selectedId) ?? null;

  useEffect(() => { setTab('receiving'); }, [selectedId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      if (drawerOpen) setDrawerOpen(false); else onBack();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen, onBack]);

  return (
    <div className={styles.fadeIn}>
      <button type="button" className={cx(styles.tab, styles.browseBtn)} style={{ marginBottom: 12 }} onClick={() => setDrawerOpen(true)}>
        <ListFilter size={14} className="text-primary" /> Browse orders
        {po && <span className={styles.muted} style={{ fontWeight: 400 }}>· {po.poNumber}</span>}
      </button>
      <div className={styles.split}>
        <div className={cx(styles.panel, styles.splitList, drawerOpen && styles.splitListOpen)}>
          <div className={styles.splitListHead}>
            <div className={styles.cardLine} style={{ marginBottom: 8 }}>
              <span className={styles.panelTitle} style={{ fontSize: 15 }}>All Purchase Orders</span>
              {drawerOpen && <button type="button" className={styles.iconBtn} onClick={() => setDrawerOpen(false)} aria-label="Close list"><X size={15} /></button>}
            </div>
            <div className={styles.searchBox} style={{ width: '100%' }}>
              <Search size={14} />
              <input className={styles.searchInput} value={searchTerm} onChange={e => onSearchChange(e.target.value)} placeholder="Search orders..." aria-label="Search orders" />
            </div>
          </div>
          <div className={styles.splitListBody}>
            {loading && orders.length === 0 && [0, 1, 2].map(i => (
              <div key={i} className={styles.card}><div className={styles.skeleton} style={{ width: '70%', marginBottom: 10 }} /><div className={styles.skeleton} style={{ width: '45%' }} /></div>
            ))}
            {!loading && orders.length === 0 && <div className={styles.empty}>No orders found.</div>}
            {orders.map(o => (
              <OrderCard key={o.id} po={o} selected={o.id === selectedId} onSelect={() => { onSelect(o); setDrawerOpen(false); }} />
            ))}
          </div>
        </div>
        {drawerOpen && <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(15,23,42,0.4)' }} />}
        <div style={{ minWidth: 0 }}>
          {po ? <OrderPreview po={po} tab={tab} setTab={setTab} {...props} /> : (
            <div className={cx(styles.panel, styles.empty)} style={{ padding: 64 }}>
              <FileText size={28} style={{ margin: '0 auto 8px', opacity: 0.35 }} />
              {loading ? 'Loading order…' : 'This order is no longer in the list. Pick another one on the left.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderPreview({
  po, tab, setTab, suppliers, bills, busyId, products = [], onBack, onEdit, onStatus, onReceive, onCancel, onDelete, onPrint, onCreateInvoice, onOpenInvoice,
}: Props & { po: PurchaseOrder; tab: string; setTab: (t: string) => void }) {
  const supplier = suppliers.find(s => s.id === po.supplierId);
  const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const a = poActions(po);
  const r = receipt(po);
  const busy = busyId === po.id;
  const timeline = useMemo(() => buildPOTimeline(po), [po]);
  const linkedBills = bills.filter(b => b.purchaseOrderId === po.id);
  const activeBill = linkedBills.find(b => b.status !== 'CANCELLED');

  const tiles: { label: string; value: React.ReactNode; tone?: string; icon?: React.ElementType; iconColor?: string }[] = [
    { label: 'Order Total', value: <CurrencyValue amount={po.totalAmount} options={fmt2} /> },
    { label: 'Items', value: po.items.length },
    { label: 'Qty Ordered', value: r.ordered },
    { label: 'Qty Received', value: <span className={r.pct >= 100 ? styles.success : undefined}>{r.received}</span> },
    {
      label: 'Received',
      value: `${r.pct}%`,
      tone: r.pct >= 100 ? styles.tileGreen : isLate(po) ? styles.tileRed : undefined,
      icon: r.pct >= 100 ? CheckCircle2 : isLate(po) ? AlertCircle : undefined,
      iconColor: r.pct >= 100 ? '#34d399' : '#f87171',
    },
    { label: 'Discount', value: <CurrencyValue amount={po.discountAmount} options={fmt2} className={styles.danger} /> },
    { label: 'Tax', value: <CurrencyValue amount={po.taxAmount} options={fmt2} /> },
  ];

  const tabs = [
    { key: 'receiving', label: 'Receiving', icon: PackageCheck, count: r.received > 0 ? r.received : undefined },
    { key: 'timeline', label: 'Timeline', icon: Clock, count: timeline.length },
    { key: 'invoices', label: 'Invoices', icon: Receipt, count: linkedBills.length || undefined },
    po.notes ? { key: 'notes', label: 'Notes', icon: MessageSquare } : null,
  ].filter(Boolean) as { key: string; label: string; icon: React.ElementType; count?: number }[];
  const activeTab = tabs.some(t => t.key === tab) ? tab : tabs[0].key;

  return (
    <div className={styles.previewStack}>
      <div className={cx(styles.panel, styles.previewHead)}>
        <div style={{ minWidth: 0 }}>
          <div className={styles.previewTitle}>
            <h2>
              <button type="button" className={styles.copyBtn} onClick={() => copy(po.poNumber, 'PO number')} title="Copy PO number">
                {po.poNumber} <Copy size={13} />
              </button>
            </h2>
            <StatusPills po={po} />
            <span className={cx(styles.pill, priorityMeta(po.priority).cls)}>{priorityMeta(po.priority).label} priority</span>
          </div>
          <div className={styles.metaLine}>
            <span style={{ color: 'var(--foreground)', fontWeight: 500 }}><User size={12} /> {po.supplierName}</span>
            <span className={styles.dot}>•</span>
            <span><Clock size={11} /> {displayDate(isoDay(po.orderDate))}</span>
            {po.expectedDeliveryDate && <><span className={styles.dot}>•</span><span><Truck size={11} /> Deliver by {displayDate(isoDay(po.expectedDeliveryDate))}</span></>}
            {po.paymentTerms && <><span className={styles.dot}>•</span><span>{po.paymentTerms}</span></>}
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button size="sm" variant="outline" onClick={() => onPrint(po)}><Printer className="h-4 w-4" /> Print</Button>
          {a.edit && <Button size="sm" variant="outline" onClick={() => onEdit(po)}><Edit className="h-4 w-4" /> Edit</Button>}
          {a.submit && <Button size="sm" disabled={busy} onClick={() => onStatus(po, 'PENDING_APPROVAL')}><Send className="h-4 w-4" /> Submit for Approval</Button>}
          {a.sendBack && <Button size="sm" variant="outline" disabled={busy} onClick={() => onStatus(po, 'DRAFT')}><RotateCcw className="h-4 w-4" /> Send Back</Button>}
          {a.approve && <Button size="sm" disabled={busy} onClick={() => onStatus(po, 'APPROVED')}><CheckCircle className="h-4 w-4" /> Approve</Button>}
          {a.markOrdered && <Button size="sm" disabled={busy} onClick={() => onStatus(po, 'ORDERED')}><Send className="h-4 w-4" /> Mark as Ordered</Button>}
          {a.receive && <Button size="sm" disabled={busy} onClick={() => onReceive(po)}><PackageCheck className="h-4 w-4" /> Receive Goods</Button>}
          {a.invoice && (activeBill
            ? <Button size="sm" variant="outline" onClick={() => onOpenInvoice(activeBill)}><Receipt className="h-4 w-4" /> {activeBill.billNumber}</Button>
            : <Button size="sm" variant="outline" className="text-green-700 border-green-300 bg-green-50" onClick={() => onCreateInvoice(po)}><Receipt className="h-4 w-4" /> Create Invoice</Button>)}
          {a.cancel && (
            <button type="button" className={cx(styles.iconBtn, styles.iconBtnAmber)} title="Cancel order" disabled={busy} onClick={() => onCancel(po)}><XCircle size={16} /></button>
          )}
          {a.delete && (
            <button type="button" className={cx(styles.iconBtn, styles.iconBtnRed)} title="Delete order" disabled={busy} onClick={() => onDelete(po)}><Trash2 size={16} /></button>
          )}
          <button type="button" className={styles.iconBtn} title="Close preview (Esc)" onClick={onBack}><X size={16} /></button>
        </div>
      </div>

      <div className={styles.summaryStrip}>
        {tiles.map(t => (
          <div key={t.label} className={cx(styles.tile, t.tone)}>
            <div className={styles.tileLabel}>{t.icon && <t.icon size={11} color={t.iconColor} />} {t.label}</div>
            <div className={styles.tileValue}>{t.value}</div>
          </div>
        ))}
      </div>

      <div className={styles.workspace}>
        <div className={styles.previewStack}>
          <section className={styles.panel} style={{ overflow: 'hidden' }}>
            <div className={styles.railHead}>
              <h3 className={styles.panelTitle}><FileText size={14} /> Order Items</h3>
              <span className={cx(styles.tiny, styles.muted)}>{po.items.length} line{po.items.length === 1 ? '' : 's'}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.itemsTable} style={{ minWidth: 640 }}>
                <thead>
                  <tr>
                    <th className={styles.center} style={{ width: 36 }}>#</th>
                    <th>Item</th>
                    <th className={styles.center}>Ordered</th>
                    <th className={styles.right}>Unit Price</th>
                    <th className={styles.right}>Disc</th>
                    <th className={styles.right}>Tax</th>
                    <th className={styles.right}>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items.map((i, idx) => (
                    <tr key={i.id}>
                      <td className={cx(styles.center, styles.muted)}>{idx + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Thumb product={i.productId ? productById.get(i.productId) : undefined} size={40} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600 }}>{i.productName}</div>
                            {(i.productSku || i.notes) && <div className={cx(styles.tiny, styles.muted)}>{[i.productSku, i.notes].filter(Boolean).join(' · ')}</div>}
                          </div>
                        </div>
                      </td>
                      <td className={styles.center}>{i.quantityOrdered} <span className={styles.muted}>{i.unitOfMeasure ?? ''}</span></td>
                      <td className={cx(styles.right, styles.num)}>{i.unitPrice.toFixed(2)}</td>
                      <td className={cx(styles.right, styles.num)}>{i.discountPercent ? `${i.discountPercent}%` : '—'}</td>
                      <td className={cx(styles.right, styles.num)}>{i.taxPercent ? `${i.taxPercent}%` : '—'}</td>
                      <td className={cx(styles.right, styles.num)} style={{ fontWeight: 700 }}>{i.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>Totals</td>
                    <td className={styles.center}>{r.ordered}</td>
                    <td colSpan={3} className={cx(styles.right, styles.muted)} style={{ fontWeight: 500 }}>
                      Subtotal {po.subtotal.toFixed(2)}{po.shippingCost > 0 ? ` · Shipping ${po.shippingCost.toFixed(2)}` : ''}
                    </td>
                    <td className={cx(styles.right, styles.num)}><CurrencyValue amount={po.totalAmount} options={fmt2} /></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className={styles.panel} style={{ overflow: 'hidden' }}>
            <div className={styles.tabBar} role="tablist">
              {tabs.map(t => (
                <button key={t.key} type="button" role="tab" aria-selected={activeTab === t.key}
                  className={cx(styles.docTab, activeTab === t.key && styles.docTabActive)} onClick={() => setTab(t.key)}>
                  <t.icon size={13} /> {t.label}
                  {t.count ? <span className={styles.count}>{t.count}</span> : null}
                </button>
              ))}
            </div>
            <div className={styles.tabPanel} role="tabpanel">
              {activeTab === 'receiving' && (
                <>
                  <div className={styles.cardLine} style={{ marginBottom: 12 }}>
                    <span style={{ fontWeight: 600 }}>{r.received} of {r.ordered} units received ({r.pct}%)</span>
                    {a.receive && <Button size="sm" onClick={() => onReceive(po)}><PackageCheck className="h-4 w-4" /> Receive Goods</Button>}
                  </div>
                  <Progress pct={r.pct} />
                  <table className={styles.itemsTable} style={{ marginTop: 14 }}>
                    <thead><tr><th>Item</th><th className={styles.center}>Ordered</th><th className={styles.center}>Received</th><th className={styles.center}>Pending</th><th style={{ width: 160 }}>Progress</th></tr></thead>
                    <tbody>
                      {po.items.map(i => {
                        const pct = i.quantityOrdered ? Math.min(100, Math.round((i.quantityReceived / i.quantityOrdered) * 100)) : 0;
                        return (
                          <tr key={i.id}>
                            <td style={{ fontWeight: 500 }}>{i.productName}</td>
                            <td className={styles.center}>{i.quantityOrdered}</td>
                            <td className={cx(styles.center, i.quantityReceived > 0 && styles.success)}>{i.quantityReceived}</td>
                            <td className={styles.center}>{Math.max(0, i.quantityOrdered - i.quantityReceived)}</td>
                            <td><Progress pct={pct} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {po.status === 'APPROVED' && <p className={cx(styles.tiny, styles.muted)} style={{ marginTop: 10 }}>Mark the order as sent to the supplier to start receiving goods.</p>}
                </>
              )}
              {activeTab === 'timeline' && (
                <ol className={styles.timeline}>
                  {timeline.map(ev => (
                    <li key={ev.key}>
                      <span className={styles.timelineDot} />
                      <div>
                        <div style={{ fontWeight: 500 }}>{ev.label}</div>
                        {ev.date && <div className={styles.muted}>{displayDateTime(ev.date)}</div>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              {activeTab === 'invoices' && (
                linkedBills.length === 0 ? (
                  <div className={styles.empty}>
                    <Receipt size={20} style={{ margin: '0 auto 6px', opacity: 0.4 }} />
                    No purchase invoice recorded against this order yet.
                    {a.invoice && <div style={{ marginTop: 10 }}><Button size="sm" variant="outline" onClick={() => onCreateInvoice(po)}><Receipt className="h-4 w-4" /> Create Invoice</Button></div>}
                  </div>
                ) : (
                  <table className={styles.itemsTable}>
                    <thead><tr><th>Bill No</th><th>Date</th><th>Status</th><th className={styles.right}>Amount</th></tr></thead>
                    <tbody>
                      {linkedBills.map(b => {
                        const st = statusMeta(displayStatus(b));
                        return (
                          <tr key={b.id} className={styles.row} onClick={() => onOpenInvoice(b)}>
                            <td style={{ fontWeight: 600 }}>{b.billNumber}</td>
                            <td>{displayDate(b.billDate)}</td>
                            <td><span className={cx(styles.pill, st.cls)}>{st.label}</span></td>
                            <td className={cx(styles.right, styles.num)}><CurrencyValue amount={b.totalAmount} options={fmt2} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              )}
              {activeTab === 'notes' && <div style={{ whiteSpace: 'pre-wrap' }}>{po.notes}</div>}
            </div>
          </section>
        </div>

        <div className={cx(styles.rail, styles.railSticky)}>
          <RailCard title="Supplier Information" icon={User}>
            <InfoRow label="Name" value={po.supplierName} />
            <InfoRow label="Contact" value={supplier?.contactPerson} />
            <InfoRow label="Phone" value={supplier?.phone} />
            <InfoRow label="Email" value={supplier?.email} />
            <InfoRow label="TRN / Tax ID" value={supplier?.taxId} copyable />
          </RailCard>
          <RailCard title="Delivery & Terms" icon={Building2}>
            <InfoRow label="Deliver to" value={po.deliveryAddress} />
            <InfoRow label="Expected" value={po.expectedDeliveryDate ? displayDate(isoDay(po.expectedDeliveryDate)) : undefined} />
            <InfoRow label="Delivered" value={po.actualDeliveryDate ? displayDateTime(po.actualDeliveryDate) : undefined} />
            <InfoRow label="Payment terms" value={po.paymentTerms} />
            <InfoRow label="Supplier outstanding" value={<CurrencyValue amount={bills.filter(b => b.supplierId === po.supplierId && b.status === 'CONFIRMED').reduce((s, b) => s + balanceOf(b), 0)} options={fmt2} />} />
            {Number(supplier?.creditLimit) > 0 && <InfoRow label="Credit limit" value={<CurrencyValue amount={Number(supplier?.creditLimit)} options={fmt2} />} />}
            <InfoRow label="Prepared by" value={po.createdBy} />
            <InfoRow label="Approved by" value={po.approvedBy} />
          </RailCard>
          {linkedBills.length > 0 && (
            <RailCard title="Related Documents" icon={Link2}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {linkedBills.map(b => (
                  <button key={b.id} type="button" className={cx(styles.pill, styles.pillPrimary)} style={{ border: 0, cursor: 'pointer' }} onClick={() => onOpenInvoice(b)}>
                    Invoice: {b.billNumber}
                  </button>
                ))}
              </div>
            </RailCard>
          )}
        </div>
      </div>
    </div>
  );
}
