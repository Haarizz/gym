import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Building2, CheckCircle, CheckCircle2, Clock, Copy, Edit, FileText, Link2, ListFilter,
  MessageSquare, Printer, Receipt, ScanBarcode, Search, Trash2, Truck, User, Wallet, X, XCircle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { CurrencyValue } from '../../utils/currency';
import type { SupplierBill } from '../../utils/supabase/supplier-bill-service';
import type { Supplier, PurchaseOrder } from '../../utils/supabase/purchase-service';
import styles from './PurchaseInvoice.module.css';
import { InfoRow, RailCard, copy, cx } from './purchaseUi';
import { Thumb } from './lineEntry';
import type { Product } from '../../utils/supabase/products-service';
import {
  balanceOf, billActions, buildTimeline, displayDate, displayDateTime, displayStatus, paymentLines,
  paymentSummaryLabel, priorityMeta, statusMeta,
} from './purchaseInvoiceUtils';


function StatusPill({ bill }: { bill: SupplierBill }) {
  const m = statusMeta(displayStatus(bill));
  return <span className={cx(styles.pill, m.cls)}>{m.label}</span>;
}

// ── Left column: compact invoice switcher ────────────────────────────────────

function BillCard({ bill, selected, onSelect }: { bill: SupplierBill; selected: boolean; onSelect: () => void }) {
  const balance = balanceOf(bill);
  const pr = priorityMeta(bill.priority);
  return (
    <button type="button" onClick={onSelect} aria-current={selected || undefined} className={cx(styles.card, selected && styles.cardSelected)}>
      <div className={styles.cardLine} style={{ marginBottom: 4 }}>
        <span className={styles.cardName}>{bill.supplierName || '—'}</span>
        <CurrencyValue amount={bill.totalAmount} options={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} className="font-bold text-sm" />
      </div>
      <div className={styles.cardLine} style={{ marginBottom: 8 }}>
        <span className={cx(styles.tiny, styles.muted)}>
          {displayDate(bill.billDate)} <span className={styles.dot}>•</span> <span className={styles.mono}>{bill.billNumber}</span>
        </span>
        {bill.status === 'DRAFT' || bill.status === 'CANCELLED' ? null : balance <= 0 ? (
          <span className={cx(styles.tiny, styles.success)} style={{ fontWeight: 600 }}>Paid in Full</span>
        ) : (
          <span className={cx(styles.tiny, styles.danger)} style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
            Due: <CurrencyValue amount={balance} options={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        <StatusPill bill={bill} />
        <span className={cx(styles.pill, pr.cls)}>{pr.label}</span>
        {bill.purchaseOrderId ? <span className={cx(styles.pill, styles.pillPurple)}>PO</span> : null}
      </div>
    </button>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

type Props = {
  bills: SupplierBill[];
  products?: Product[];   // for item photos
  loading: boolean;
  selectedId: number | null;
  onSelect: (bill: SupplierBill) => void;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  warehouseName: (id?: number) => string;
  busyId: number | null;
  onBack: () => void;
  onEdit: (bill: SupplierBill) => void;
  onConfirm: (bill: SupplierBill) => void;
  onRecordPayment: (bill: SupplierBill) => void;
  onCancel: (bill: SupplierBill) => void;
  onDelete: (bill: SupplierBill) => void;
  onPrint: (bill: SupplierBill) => void;
  /** Opens Barcode Print with one label per unit on the bill. */
  onPrintBarcodes?: (bill: SupplierBill) => void;
};

export function PurchaseInvoicePreview(props: Props) {
  const { bills, loading, selectedId, onSelect, searchTerm, onSearchChange } = props;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState<string>('payments');
  const bill = bills.find(b => b.id === selectedId) ?? null;

  useEffect(() => { setTab('payments'); }, [selectedId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Let open dialogs (payment, confirm, …) handle their own Escape.
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      if (drawerOpen) setDrawerOpen(false);
      else props.onBack();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen, props.onBack]);

  const list = (
    <div className={cx(styles.panel, styles.splitList, drawerOpen && styles.splitListOpen)}>
      <div className={styles.splitListHead}>
        <div className={styles.cardLine} style={{ marginBottom: 8 }}>
          <span className={styles.eyebrow}>All Purchase Invoices</span>
          {drawerOpen && (
            <button type="button" className={styles.iconBtn} onClick={() => setDrawerOpen(false)} aria-label="Close list"><X size={15} /></button>
          )}
        </div>
        <div className={styles.searchBox} style={{ width: '100%' }}>
          <Search size={14} />
          <input
            className={styles.searchInput}
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search invoices..."
            aria-label="Search invoices"
          />
        </div>
      </div>
      <div className={styles.splitListBody}>
        {loading && bills.length === 0 && [0, 1, 2, 3].map(i => (
          <div key={i} className={styles.card}><div className={styles.skeleton} style={{ width: '70%', marginBottom: 10 }} /><div className={styles.skeleton} style={{ width: '45%' }} /></div>
        ))}
        {!loading && bills.length === 0 && (
          <div className={styles.empty}><FileText size={22} style={{ margin: '0 auto 6px', opacity: 0.4 }} />No invoices found.</div>
        )}
        {bills.map(b => (
          <BillCard key={b.id} bill={b} selected={b.id === selectedId} onSelect={() => { onSelect(b); setDrawerOpen(false); }} />
        ))}
      </div>
    </div>
  );

  return (
    <div className={styles.fadeIn}>
      <button type="button" className={cx(styles.tab, styles.browseBtn)} style={{ marginBottom: 12 }} onClick={() => setDrawerOpen(true)}>
        <ListFilter size={14} className="text-primary" /> Browse invoices
        {bill && <span className={styles.muted} style={{ fontWeight: 400 }}>· {bill.billNumber}</span>}
      </button>

      <div className={styles.split}>
        {list}
        {drawerOpen && (
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(15,23,42,0.4)' }} />
        )}
        <div style={{ minWidth: 0 }}>
          {bill ? <BillPreview bill={bill} tab={tab} setTab={setTab} {...props} /> : (
            <div className={cx(styles.panel, styles.empty)} style={{ padding: 64 }}>
              <FileText size={28} style={{ margin: '0 auto 8px', opacity: 0.35 }} />
              {loading ? 'Loading invoice…' : 'This invoice is no longer in the list. Pick another one on the left.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Right column: read-only record preview ───────────────────────────────────

function BillPreview({
  bill, tab, setTab, suppliers, purchaseOrders, warehouseName, busyId, products = [],
  onBack, onEdit, onConfirm, onRecordPayment, onCancel, onDelete, onPrint, onPrintBarcodes,
}: Props & { bill: SupplierBill; tab: string; setTab: (t: string) => void }) {
  const supplier = suppliers.find(s => s.id === bill.supplierId);
  const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const po = bill.purchaseOrderId ? purchaseOrders.find(p => p.id === bill.purchaseOrderId) : undefined;
  const actions = billActions(bill);
  const balance = balanceOf(bill);
  const settled = balance <= 0 && bill.status === 'CONFIRMED';
  const pr = priorityMeta(bill.priority);
  const payments = paymentLines(bill);
  const timeline = useMemo(() => buildTimeline(bill), [bill]);
  const totalQty = bill.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  const busy = busyId === bill.id;
  const fmt = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

  const tiles: { label: string; value: React.ReactNode; tone?: string; icon?: React.ElementType; iconColor?: string }[] = [
    { label: 'Net Total', value: <CurrencyValue amount={bill.totalAmount} options={fmt} /> },
    { label: 'Paid', value: <CurrencyValue amount={bill.amountPaid} options={fmt} className={styles.success} /> },
    {
      label: 'Balance Due',
      value: <CurrencyValue amount={balance} options={fmt} className={balance > 0 ? styles.danger : styles.success} />,
      tone: bill.status === 'CANCELLED' ? undefined : balance > 0 ? styles.tileRed : styles.tileGreen,
      icon: balance > 0 ? AlertCircle : CheckCircle2,
      iconColor: balance > 0 ? '#f87171' : '#34d399',
    },
    { label: 'Items', value: bill.items.length },
    { label: 'Total Qty', value: totalQty },
    { label: 'Discount', value: <CurrencyValue amount={bill.discountAmount} options={fmt} className={styles.danger} /> },
    { label: 'Tax', value: <CurrencyValue amount={bill.taxAmount} options={fmt} /> },
  ];

  const tabs = [
    { key: 'payments', label: 'Payments', icon: Receipt, count: payments.length },
    { key: 'timeline', label: 'Timeline', icon: Clock, count: timeline.length },
    bill.notes ? { key: 'notes', label: 'Notes', icon: MessageSquare } : null,
  ].filter(Boolean) as { key: string; label: string; icon: React.ElementType; count?: number }[];
  const activeTab = tabs.some(t => t.key === tab) ? tab : tabs[0].key;

  return (
    <div className={styles.previewStack}>
      {/* Header band — identity + the single action toolbar */}
      <div className={cx(styles.panel, styles.previewHead)}>
        <div style={{ minWidth: 0 }}>
          <div className={styles.previewTitle}>
            <h2>
              <button type="button" className={styles.copyBtn} onClick={() => copy(bill.billNumber, 'Bill number')} title="Copy bill number">
                {bill.billNumber} <Copy size={13} />
              </button>
            </h2>
            <StatusPill bill={bill} />
            <span className={cx(styles.pill, pr.cls)}>{pr.label} priority</span>
            <span className={cx(styles.pill, po ? styles.pillPurple : styles.pillPrimary)}>
              {po ? `Against PO ${po.poNumber}` : bill.purchaseOrderId ? 'Against PO' : 'Direct Purchase'}
            </span>
          </div>
          <div className={styles.metaLine}>
            <span style={{ color: 'var(--foreground)', fontWeight: 500 }}><User size={12} /> {bill.supplierName}</span>
            <span className={styles.dot}>•</span>
            <span><Clock size={11} /> {displayDate(bill.billDate)}</span>
            {bill.dueDate && <><span className={styles.dot}>•</span><span>Due {displayDate(bill.dueDate)}</span></>}
            {bill.warehouseId && <><span className={styles.dot}>•</span><span><Truck size={11} /> {warehouseName(bill.warehouseId)}</span></>}
            {bill.invoiceNumber && <><span className={styles.dot}>•</span><span>Supplier Inv # {bill.invoiceNumber}</span></>}
          </div>
        </div>

        <div className={styles.headerActions}>
          {actions.print && (
            <Button size="sm" onClick={() => onPrint(bill)}><Printer className="h-4 w-4" /> Print</Button>
          )}
          {onPrintBarcodes && bill.items.some(i => i.productId != null) && (
            <Button size="sm" variant="outline" onClick={() => onPrintBarcodes(bill)}><ScanBarcode className="h-4 w-4" /> Barcodes</Button>
          )}
          {actions.edit && (
            <Button size="sm" variant="outline" onClick={() => onEdit(bill)}><Edit className="h-4 w-4" /> Edit</Button>
          )}
          {actions.confirm && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onConfirm(bill)}>
              <CheckCircle className="h-4 w-4" /> Confirm
            </Button>
          )}
          {actions.recordPayment && (
            <Button size="sm" variant="outline" className="text-green-700 border-green-300 bg-green-50" onClick={() => onRecordPayment(bill)}>
              <Wallet className="h-4 w-4" /> Record Payment
            </Button>
          )}
          {actions.cancel && (
            <button type="button" className={cx(styles.iconBtn, styles.iconBtnAmber)} title="Cancel invoice" disabled={busy} onClick={() => onCancel(bill)}>
              <XCircle size={16} />
            </button>
          )}
          {actions.delete && (
            <button type="button" className={cx(styles.iconBtn, styles.iconBtnRed)} title="Delete draft" disabled={busy} onClick={() => onDelete(bill)}>
              <Trash2 size={16} />
            </button>
          )}
          <button type="button" className={styles.iconBtn} title="Close preview (Esc)" onClick={onBack}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Executive summary strip */}
      <div className={styles.summaryStrip}>
        {tiles.map(t => (
          <div key={t.label} className={cx(styles.tile, t.tone)}>
            <div className={styles.tileLabel}>{t.icon && <t.icon size={10} color={t.iconColor} />} {t.label}</div>
            <div className={styles.tileValue}>{t.value}</div>
          </div>
        ))}
      </div>

      <div className={styles.workspace}>
        <div className={styles.previewStack}>
          {/* Items */}
          <section className={styles.panel} style={{ overflow: 'hidden' }}>
            <div className={styles.railHead}>
              <h3 className={styles.panelTitle}><FileText size={14} /> Invoice Items</h3>
              <span className={cx(styles.tiny, styles.muted)}>{bill.items.length} line{bill.items.length === 1 ? '' : 's'}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.itemsTable} style={{ minWidth: 640 }}>
                <thead>
                  <tr>
                    <th className={styles.center} style={{ width: 36 }}>#</th>
                    <th>Item</th>
                    <th className={styles.center}>Qty</th>
                    <th className={styles.right}>Unit Price</th>
                    <th className={styles.right}>Disc</th>
                    <th className={styles.right}>Tax</th>
                    <th className={styles.right}>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items.map((i, idx) => (
                    <tr key={i.id}>
                      <td className={cx(styles.center, styles.muted)}>{idx + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Thumb product={i.productId ? productById.get(i.productId) : undefined} size={40} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600 }}>{i.productName}</div>
                            {(i.productSku || i.notes) && (
                              <div className={cx(styles.tiny, styles.muted)}>{[i.productSku, i.notes].filter(Boolean).join(' · ')}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={styles.center}>{i.quantity} <span className={styles.muted}>{i.unitOfMeasure ?? ''}</span></td>
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
                    <td className={styles.center}>{totalQty}</td>
                    <td colSpan={3} className={cx(styles.right, styles.muted)} style={{ fontWeight: 500 }}>
                      Subtotal {bill.subtotal.toFixed(2)}{bill.shippingCost > 0 ? ` · Shipping ${bill.shippingCost.toFixed(2)}` : ''}
                    </td>
                    <td className={cx(styles.right, styles.num)}><CurrencyValue amount={bill.totalAmount} options={fmt} /></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* Tabs */}
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
              {activeTab === 'payments' && (
                payments.length === 0 ? (
                  <div className={styles.empty}>
                    <Wallet size={20} style={{ margin: '0 auto 6px', opacity: 0.4 }} />
                    {bill.status === 'DRAFT' ? 'Confirm this invoice to start recording payments.' : 'No payments recorded yet.'}
                    {actions.recordPayment && (
                      <div style={{ marginTop: 10 }}>
                        <Button size="sm" variant="outline" onClick={() => onRecordPayment(bill)}><Wallet className="h-4 w-4" /> Record Payment</Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <table className={styles.itemsTable}>
                    <thead><tr><th>Method</th><th>Reference / Details</th><th>Payment Date</th><th className={styles.right}>Amount</th></tr></thead>
                    <tbody>
                      {payments.map((p, i) => (
                        <tr key={i}>
                          <td><span className={cx(styles.pill, styles.pillGreen)}>{p.method}</span></td>
                          <td className={styles.muted}>{[p.reference, p.detail].filter(Boolean).join(' · ') || '—'}</td>
                          <td className={styles.muted}>{p.date ? displayDate(p.date) : '—'}</td>
                          <td className={cx(styles.right, styles.num)} style={{ fontWeight: 600 }}><CurrencyValue amount={p.amount} options={fmt} /></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3}>Total paid</td>
                        <td className={cx(styles.right, styles.num)}><CurrencyValue amount={bill.amountPaid} options={fmt} /></td>
                      </tr>
                    </tfoot>
                  </table>
                )
              )}
              {activeTab === 'timeline' && (
                <ol className={styles.timeline}>
                  {timeline.map(ev => (
                    <li key={ev.key}>
                      <span className={styles.timelineDot} />
                      <div>
                        <div style={{ fontWeight: 500 }}>
                          {ev.label}
                          {ev.amount != null && <> — <CurrencyValue amount={ev.amount} options={fmt} /></>}
                        </div>
                        <div className={styles.muted}>{displayDateTime(ev.date)}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              {activeTab === 'notes' && <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{bill.notes}</div>}
            </div>
          </section>
        </div>

        {/* Right rail */}
        <div className={cx(styles.rail, styles.railSticky)}>
          <RailCard title="Supplier Information" icon={User}>
            <InfoRow label="Name" value={bill.supplierName} />
            <InfoRow label="Contact" value={supplier?.contactPerson} />
            <InfoRow label="Phone" value={supplier?.phone} />
            <InfoRow label="Email" value={supplier?.email} />
            <InfoRow label="TRN / Tax ID" value={supplier?.taxId} copyable />
            <InfoRow label="Address" value={[supplier?.address, supplier?.city, supplier?.country].filter(Boolean).join(', ')} />
          </RailCard>
          <RailCard title="Receiving & Terms" icon={Building2}>
            <InfoRow label="Warehouse" value={warehouseName(bill.warehouseId)} />
            <InfoRow label="Received by" value={bill.receivedBy} />
            <InfoRow label="Payment terms" value={supplier?.paymentTerms} />
            <InfoRow label="Paid via" value={paymentSummaryLabel(bill)} />
            <InfoRow label="Created by" value={bill.createdBy} />
          </RailCard>
          {(bill.invoiceNumber || bill.purchaseOrderId) && (
            <RailCard title="Related Documents" icon={Link2}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {bill.invoiceNumber && <span className={cx(styles.pill, styles.pillGray)}>Supplier Invoice: {bill.invoiceNumber}</span>}
                {bill.purchaseOrderId && <span className={cx(styles.pill, styles.pillPurple)}>Purchase Order: {po?.poNumber ?? `#${bill.purchaseOrderId}`}</span>}
              </div>
            </RailCard>
          )}
          {settled && (
            <div className={cx(styles.notice, styles.noticeInfo)} style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' }}>
              <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 2 }} /> This invoice is fully settled.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
