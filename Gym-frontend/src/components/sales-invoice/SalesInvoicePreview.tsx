import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Building2, CheckCircle, CheckCircle2, Clock, Copy, Edit, FileText, ListFilter, Lock,
  MessageSquare, Printer, Receipt, Search, Trash2, Truck, User, Wallet, X, XCircle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { CurrencyValue } from '../../utils/currency';
import type { SalesInvoice } from '../../utils/supabase/sales-invoice-service';
import type { Product } from '../../utils/supabase/products-service';
import styles from '../purchase/PurchaseInvoice.module.css';
import { InfoRow, RailCard, copy, cx } from '../purchase/purchaseUi';
import { Thumb } from '../purchase/lineEntry';
import { PAYMENT_TERMS, displayDate, displayDateTime } from '../purchase/purchaseInvoiceUtils';
import {
  balanceOf, buildTimeline, customerTypeMeta, displayStatus, invoiceActions, paymentLines, paymentSummaryLabel, statusMeta,
} from './salesInvoiceUtils';

const fmt = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

function StatusPill({ inv }: { inv: SalesInvoice }) {
  const m = statusMeta(displayStatus(inv));
  return <span className={cx(styles.pill, m.cls)}>{m.label}</span>;
}

function InvoiceCard({ inv, selected, onSelect }: { inv: SalesInvoice; selected: boolean; onSelect: () => void }) {
  const balance = balanceOf(inv);
  const ct = customerTypeMeta(inv);
  return (
    <button type="button" onClick={onSelect} aria-current={selected || undefined} className={cx(styles.card, selected && styles.cardSelected)}>
      <div className={styles.cardLine} style={{ marginBottom: 4 }}>
        <span className={styles.cardName}>{inv.customerName || '—'}</span>
        <CurrencyValue amount={inv.totalAmount} options={fmt} className="font-bold text-sm" />
      </div>
      <div className={styles.cardLine} style={{ marginBottom: 8 }}>
        <span className={cx(styles.tiny, styles.muted)}>
          {displayDate(inv.invoiceDate)} <span className={styles.dot}>•</span> <span className={styles.mono}>{inv.invoiceNumber}</span>
        </span>
        {inv.status === 'DRAFT' || inv.status === 'CANCELLED' ? null : balance <= 0 ? (
          <span className={cx(styles.tiny, styles.success)} style={{ fontWeight: 600 }}>Paid in Full</span>
        ) : (
          <span className={cx(styles.tiny, styles.danger)} style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
            Due: <CurrencyValue amount={balance} options={fmt} />
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        <StatusPill inv={inv} />
        <span className={cx(styles.pill, ct.cls)}>{ct.label}</span>
      </div>
    </button>
  );
}

type Props = {
  invoices: SalesInvoice[];
  products?: Product[];
  loading: boolean;
  selectedId: number | null;
  onSelect: (inv: SalesInvoice) => void;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  warehouseName: (id?: number) => string;
  busyId: number | null;
  onBack: () => void;
  onEdit: (inv: SalesInvoice) => void;
  onConfirm: (inv: SalesInvoice) => void;
  onRecordPayment: (inv: SalesInvoice) => void;
  onCancel: (inv: SalesInvoice) => void;
  onDelete: (inv: SalesInvoice) => void;
  onPrint: (inv: SalesInvoice) => void;
};

export function SalesInvoicePreview(props: Props) {
  const { invoices, loading, selectedId, onSelect, searchTerm, onSearchChange } = props;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState<string>('payments');
  const inv = invoices.find(i => i.id === selectedId) ?? null;

  useEffect(() => { setTab('payments'); }, [selectedId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      if (drawerOpen) setDrawerOpen(false);
      else props.onBack();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen, props.onBack]);

  return (
    <div className={styles.fadeIn}>
      <button type="button" className={cx(styles.tab, styles.browseBtn)} style={{ marginBottom: 12 }} onClick={() => setDrawerOpen(true)}>
        <ListFilter size={14} className="text-primary" /> Browse invoices
        {inv && <span className={styles.muted} style={{ fontWeight: 400 }}>· {inv.invoiceNumber}</span>}
      </button>

      <div className={styles.split}>
        <div className={cx(styles.panel, styles.splitList, drawerOpen && styles.splitListOpen)}>
          <div className={styles.splitListHead}>
            <div className={styles.cardLine} style={{ marginBottom: 8 }}>
              <span className={styles.eyebrow}>All Sales Invoices</span>
              {drawerOpen && (
                <button type="button" className={styles.iconBtn} onClick={() => setDrawerOpen(false)} aria-label="Close list"><X size={15} /></button>
              )}
            </div>
            <div className={styles.searchBox} style={{ width: '100%' }}>
              <Search size={14} />
              <input className={styles.searchInput} value={searchTerm} onChange={e => onSearchChange(e.target.value)}
                placeholder="Search invoices..." aria-label="Search invoices" />
            </div>
          </div>
          <div className={styles.splitListBody}>
            {loading && invoices.length === 0 && [0, 1, 2, 3].map(i => (
              <div key={i} className={styles.card}><div className={styles.skeleton} style={{ width: '70%', marginBottom: 10 }} /><div className={styles.skeleton} style={{ width: '45%' }} /></div>
            ))}
            {!loading && invoices.length === 0 && (
              <div className={styles.empty}><FileText size={22} style={{ margin: '0 auto 6px', opacity: 0.4 }} />No invoices found.</div>
            )}
            {invoices.map(i => (
              <InvoiceCard key={i.id} inv={i} selected={i.id === selectedId} onSelect={() => { onSelect(i); setDrawerOpen(false); }} />
            ))}
          </div>
        </div>
        {drawerOpen && (
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(15,23,42,0.4)' }} />
        )}
        <div style={{ minWidth: 0 }}>
          {inv ? <InvoiceRecord inv={inv} tab={tab} setTab={setTab} {...props} /> : (
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

function InvoiceRecord({
  inv, tab, setTab, warehouseName, busyId, products = [],
  onBack, onEdit, onConfirm, onRecordPayment, onCancel, onDelete, onPrint,
}: Props & { inv: SalesInvoice; tab: string; setTab: (t: string) => void }) {
  const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const actions = invoiceActions(inv);
  const balance = balanceOf(inv);
  const settled = balance <= 0 && inv.status === 'CONFIRMED';
  const ct = customerTypeMeta(inv);
  const payments = paymentLines(inv);
  const timeline = useMemo(() => buildTimeline(inv), [inv]);
  const totalQty = inv.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  const busy = busyId === inv.id;
  const terms = inv.paymentTerms ? PAYMENT_TERMS.find(t => t.value === inv.paymentTerms)?.label ?? inv.paymentTerms : undefined;

  const tiles: { label: string; value: React.ReactNode; tone?: string; icon?: React.ElementType; iconColor?: string }[] = [
    { label: 'Net Total', value: <CurrencyValue amount={inv.totalAmount} options={fmt} /> },
    { label: 'Received', value: <CurrencyValue amount={inv.amountPaid} options={fmt} className={styles.success} /> },
    {
      label: 'Balance Due',
      value: <CurrencyValue amount={balance} options={fmt} className={balance > 0 ? styles.danger : styles.success} />,
      tone: inv.status === 'CANCELLED' ? undefined : balance > 0 ? styles.tileRed : styles.tileGreen,
      icon: balance > 0 ? AlertCircle : CheckCircle2,
      iconColor: balance > 0 ? '#f87171' : '#34d399',
    },
    { label: 'Items', value: inv.items.length },
    { label: 'Total Qty', value: totalQty },
    { label: 'Discount', value: <CurrencyValue amount={inv.discountAmount + inv.footerDiscount} options={fmt} className={styles.danger} /> },
    { label: 'VAT', value: <CurrencyValue amount={inv.taxAmount} options={fmt} /> },
  ];

  const tabs = [
    { key: 'payments', label: 'Payments', icon: Receipt, count: payments.length },
    { key: 'timeline', label: 'Timeline', icon: Clock, count: timeline.length },
    inv.notes ? { key: 'notes', label: 'Customer Notes', icon: MessageSquare } : null,
    inv.internalNotes ? { key: 'internal', label: 'Internal Notes', icon: Lock } : null,
  ].filter(Boolean) as { key: string; label: string; icon: React.ElementType; count?: number }[];
  const activeTab = tabs.some(t => t.key === tab) ? tab : tabs[0].key;

  return (
    <div className={styles.previewStack}>
      <div className={cx(styles.panel, styles.previewHead)}>
        <div style={{ minWidth: 0 }}>
          <div className={styles.previewTitle}>
            <h2>
              <button type="button" className={styles.copyBtn} onClick={() => copy(inv.invoiceNumber, 'Invoice number')} title="Copy invoice number">
                {inv.invoiceNumber} <Copy size={13} />
              </button>
            </h2>
            <StatusPill inv={inv} />
            <span className={cx(styles.pill, ct.cls)}>{ct.label}</span>
            {inv.source === 'POS'
              ? <span className={cx(styles.pill, styles.pillBlue)} title="Recorded from the Point of Sale — collect credit and make returns on the POS">POS Sale</span>
              : <span className={cx(styles.pill, styles.pillGray)}>Direct Sale</span>}
            {inv.source === 'POS' && inv.returnedAmount > 0 && (
              <span className={cx(styles.pill, styles.pillAmber)}>Returned <CurrencyValue amount={inv.returnedAmount} options={fmt} /></span>
            )}
            {inv.pricesIncludeTax && <span className={cx(styles.pill, styles.pillGray)}>VAT Incl.</span>}
          </div>
          <div className={styles.metaLine}>
            <span style={{ color: 'var(--foreground)', fontWeight: 500 }}><User size={12} /> {inv.customerName}</span>
            <span className={styles.dot}>•</span>
            <span><Clock size={11} /> {displayDate(inv.invoiceDate)}</span>
            {inv.dueDate && <><span className={styles.dot}>•</span><span>Due {displayDate(inv.dueDate)}</span></>}
            {inv.reference && <><span className={styles.dot}>•</span><span>Ref {inv.reference}</span></>}
          </div>
        </div>

        <div className={styles.headerActions}>
          {actions.print && <Button size="sm" onClick={() => onPrint(inv)}><Printer className="h-4 w-4" /> Print</Button>}
          {actions.edit && <Button size="sm" variant="outline" onClick={() => onEdit(inv)}><Edit className="h-4 w-4" /> Edit</Button>}
          {actions.confirm && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onConfirm(inv)}><CheckCircle className="h-4 w-4" /> Confirm</Button>
          )}
          {actions.recordPayment && (
            <Button size="sm" variant="outline" className="text-green-700 border-green-300 bg-green-50" onClick={() => onRecordPayment(inv)}>
              <Wallet className="h-4 w-4" /> Receive Payment
            </Button>
          )}
          {actions.cancel && (
            <button type="button" className={cx(styles.iconBtn, styles.iconBtnAmber)} title="Cancel invoice" disabled={busy} onClick={() => onCancel(inv)}><XCircle size={16} /></button>
          )}
          {actions.delete && (
            <button type="button" className={cx(styles.iconBtn, styles.iconBtnRed)} title="Delete draft" disabled={busy} onClick={() => onDelete(inv)}><Trash2 size={16} /></button>
          )}
          <button type="button" className={styles.iconBtn} title="Close preview (Esc)" onClick={onBack}><X size={16} /></button>
        </div>
      </div>

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
          <section className={styles.panel} style={{ overflow: 'hidden' }}>
            <div className={styles.railHead}>
              <h3 className={styles.panelTitle}><FileText size={14} /> Invoice Items</h3>
              <span className={cx(styles.tiny, styles.muted)}>{inv.items.length} line{inv.items.length === 1 ? '' : 's'}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.itemsTable} style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th className={styles.center} style={{ width: 36 }}>#</th>
                    <th>Item</th>
                    <th>Warehouse</th>
                    <th className={styles.center}>Qty</th>
                    <th className={styles.right}>Unit Price</th>
                    <th className={styles.right}>Disc</th>
                    <th className={styles.right}>VAT</th>
                    <th className={styles.right}>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.items.map((i, idx) => (
                    <tr key={i.id}>
                      <td className={cx(styles.center, styles.muted)}>{idx + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Thumb product={productById.get(i.productId)} size={40} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600 }}>{i.productName}</div>
                            {(i.productSku || i.notes) && <div className={cx(styles.tiny, styles.muted)}>{[i.productSku, i.notes].filter(Boolean).join(' · ')}</div>}
                          </div>
                        </div>
                      </td>
                      <td className={styles.muted}>{warehouseName(i.warehouseId)}</td>
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
                    <td colSpan={3}>Totals</td>
                    <td className={styles.center}>{totalQty}</td>
                    <td colSpan={3} className={cx(styles.right, styles.muted)} style={{ fontWeight: 500 }}>
                      Subtotal {inv.subtotal.toFixed(2)}
                      {inv.footerDiscount > 0 ? ` · Footer disc. −${inv.footerDiscount.toFixed(2)}` : ''}
                      {inv.deliveryCharge > 0 ? ` · Delivery ${inv.deliveryCharge.toFixed(2)}` : ''}
                      {inv.roundOff ? ` · Round off ${inv.roundOff.toFixed(2)}` : ''}
                    </td>
                    <td className={cx(styles.right, styles.num)}><CurrencyValue amount={inv.totalAmount} options={fmt} /></td>
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
              {activeTab === 'payments' && (
                payments.length === 0 ? (
                  <div className={styles.empty}>
                    <Wallet size={20} style={{ margin: '0 auto 6px', opacity: 0.4 }} />
                    {inv.status === 'DRAFT' ? 'Confirm this invoice to start receiving payments.' : 'No payments received yet.'}
                    {actions.recordPayment && (
                      <div style={{ marginTop: 10 }}>
                        <Button size="sm" variant="outline" onClick={() => onRecordPayment(inv)}><Wallet className="h-4 w-4" /> Receive Payment</Button>
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
                      <tr><td colSpan={3}>Total received</td><td className={cx(styles.right, styles.num)}><CurrencyValue amount={inv.amountPaid} options={fmt} /></td></tr>
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
                        <div style={{ fontWeight: 500 }}>{ev.label}{ev.amount != null && <> — <CurrencyValue amount={ev.amount} options={fmt} /></>}</div>
                        <div className={styles.muted}>{displayDateTime(ev.date)}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              {activeTab === 'notes' && <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{inv.notes}</div>}
              {activeTab === 'internal' && <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{inv.internalNotes}</div>}
            </div>
          </section>
        </div>

        <div className={cx(styles.rail, styles.railSticky)}>
          <RailCard title="Customer Information" icon={User}>
            <InfoRow label="Name" value={inv.customerName} />
            <InfoRow label="Type" value={ct.label} />
            <InfoRow label="Phone" value={inv.customerPhone} />
            <InfoRow label="Email" value={inv.customerEmail} />
            <InfoRow label="TRN / VAT No." value={inv.customerTrn} copyable />
            <InfoRow label="Address" value={inv.customerAddress} />
          </RailCard>
          <RailCard title="Sale & Terms" icon={Building2}>
            <InfoRow label="Payment terms" value={terms} />
            <InfoRow label="Salesperson" value={inv.salesperson} />
            <InfoRow label="Paid via" value={paymentSummaryLabel(inv)} />
            <InfoRow label="Created by" value={inv.createdBy} />
          </RailCard>
          <RailCard title="Stock" icon={Truck}>
            <div className={cx(styles.tiny, styles.muted)} style={{ lineHeight: 1.6 }}>
              {inv.status === 'DRAFT' ? 'Stock is issued from each line’s warehouse when the invoice is confirmed.'
                : inv.stockDeducted ? (inv.status === 'CANCELLED' ? 'Stock was issued on confirm and returned on cancel.' : 'Stock was issued from each line’s warehouse on confirm.')
                : 'Confirmed with Stock Check off — stock was not changed.'}
            </div>
          </RailCard>
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
