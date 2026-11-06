import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Loader2, Printer, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { useCurrency } from '../../utils/currency';
import type { Supplier } from '../../utils/supabase/purchase-service';
import { supplierBillService, type SupplierStatement as Statement } from '../../utils/supabase/supplier-bill-service';
import { SearchableSelect } from '../shared/SearchableSelect';
import styles from './PurchaseInvoice.module.css';
import { cx } from './purchaseUi';
import { displayDate, money, todayIso } from './purchaseInvoiceUtils';
import { ReportActions, type ReportDocument, type ReportRow } from "../report-export";

type Preset = 'THIS_MONTH' | 'LAST_3_MONTHS' | 'THIS_YEAR' | 'ALL';

function presetRange(p: Preset): [string, string] {
  const now = new Date();
  const iso = (d: Date) => format(d, 'yyyy-MM-dd');
  switch (p) {
    case 'THIS_MONTH': return [iso(new Date(now.getFullYear(), now.getMonth(), 1)), iso(now)];
    case 'LAST_3_MONTHS': return [iso(new Date(now.getFullYear(), now.getMonth() - 2, 1)), iso(now)];
    case 'THIS_YEAR': return [iso(new Date(now.getFullYear(), 0, 1)), iso(now)];
    default: return ['2000-01-01', iso(now)];
  }
}

/** Positive = we owe the supplier (Cr, payable); negative = supplier owes us (Dr, advance). */
const balanceText = (v: number) => `${money(Math.abs(v))} ${v >= 0 ? 'Cr' : 'Dr'}`;
const balanceHint = (v: number) => (Math.abs(v) < 0.005 ? 'Settled' : v > 0 ? 'Payable (we owe)' : 'Advance (supplier owes us)');

const html = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function SupplierStatement({ suppliers, initialSupplierId }: { suppliers: Supplier[]; initialSupplierId?: number }) {
  const { currencyCode, currencySymbol } = useCurrency();
  const [supplierId, setSupplierId] = useState(initialSupplierId ? String(initialSupplierId) : '');
  const [[from, to], setRange] = useState<[string, string]>(() => presetRange('THIS_YEAR'));
  const [statement, setStatement] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (initialSupplierId) setSupplierId(String(initialSupplierId)); }, [initialSupplierId]);

  const supplier = suppliers.find(s => String(s.id) === supplierId);

  const generate = async () => {
    if (!supplierId) { toast.error('Select a supplier first'); return; }
    if (from > to) { toast.error('From date must be on or before To date'); return; }
    setLoading(true);
    try {
      setStatement(await supplierBillService.getStatement(Number(supplierId), from, to));
    } catch (e: any) {
      toast.error(e.message || 'Failed to load statement');
      setStatement(null);
    } finally {
      setLoading(false);
    }
  };

  // Regenerate automatically whenever the supplier or period changes.
  useEffect(() => {
    if (!supplierId || from > to) { setStatement(null); return; }
    generate();
  }, [supplierId, from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  const fileBase = useMemo(
    () => `SOA_${(supplier?.name ?? 'Supplier').replace(/[^\w]+/g, '_')}_${from}_to_${to}`,
    [supplier?.name, from, to],
  );

  // Supplier statement of account for export / print (Cr = we owe the supplier, Dr = they owe us)
  const buildStatementReport = (): ReportDocument => {
    if (!statement) throw new Error('Generate the statement first');
    const side = (v: number) => (Math.abs(v) < 0.005 ? '' : v >= 0 ? 'Cr' : 'Dr');
    const s = supplier;
    const rows: ReportRow[] = [
      { _kind: 'subtotal', date: from, type: 'Opening', doc: '', description: 'Opening balance', reference: '', debit: null, credit: null, balance: Math.abs(statement.openingBalance), side: side(statement.openingBalance) },
      ...statement.entries.map((e): ReportRow => ({
        date: e.date, type: e.type === 'INVOICE' ? 'Invoice' : 'Payment', doc: e.documentNo, description: e.description, reference: e.reference || '',
        debit: e.debit || null, credit: e.credit || null, balance: Math.abs(e.runningBalance), side: side(e.runningBalance),
      })),
      { _kind: 'total', date: null, type: '', doc: '', description: 'Closing totals', reference: '', debit: statement.totalDebit, credit: statement.totalCredit, balance: Math.abs(statement.closingBalance), side: side(statement.closingBalance) },
    ];
    return {
      title: 'Supplier Statement of Account',
      fileName: `Supplier Statement ${statement.supplierName}`,
      orientation: 'landscape',
      period: { from, to },
      sections: [
        { kind: 'keyValue', title: 'Supplier', columns: 3, items: [
          { label: 'Supplier', value: statement.supplierName },
          { label: 'Address', value: [s?.address, s?.city, s?.country].filter(Boolean).join(', ') || '—' },
          { label: 'TRN', value: (s as any)?.taxId || '—' },
        ] },
        { kind: 'kpis', items: [
          { label: 'Opening balance', value: Math.abs(statement.openingBalance), format: 'money', hint: balanceHint(statement.openingBalance) },
          { label: 'Payments (debit)', value: statement.totalDebit, format: 'money' },
          { label: 'Invoices (credit)', value: statement.totalCredit, format: 'money' },
          { label: 'Closing balance', value: Math.abs(statement.closingBalance), format: 'money', hint: balanceHint(statement.closingBalance), tone: statement.closingBalance > 0.005 ? 'bad' : 'good' },
        ] },
        {
          kind: 'table', title: 'Transactions', sheetName: 'Statement',
          columns: [
            { key: 'date', header: 'Date', format: 'date' }, { key: 'type', header: 'Type' }, { key: 'doc', header: 'Document No' },
            { key: 'description', header: 'Description', wrap: true }, { key: 'reference', header: 'Reference' },
            { key: 'debit', header: 'Debit (payment)', format: 'money' }, { key: 'credit', header: 'Credit (invoice)', format: 'money' },
            { key: 'balance', header: 'Balance', format: 'money' }, { key: 'side', header: 'Cr/Dr' },
          ],
          rows,
        },
      ],
    };
  };

  const presets: { key: Preset; label: string }[] = [
    { key: 'THIS_MONTH', label: 'This Month' },
    { key: 'LAST_3_MONTHS', label: 'Last 3 Months' },
    { key: 'THIS_YEAR', label: 'This Year' },
    { key: 'ALL', label: 'All Time' },
  ];

  return (
    <div className={styles.fadeIn} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Controls */}
      <div className={cx(styles.panel, styles.panelPad)}>
        <h3 className={styles.panelTitle} style={{ marginBottom: 16 }}><FileText size={16} /> Generate Statement of Account</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 2fr) minmax(150px, 1fr) minmax(150px, 1fr)', gap: 16 }}>
          <div className={styles.cell}>
            <label className={styles.eyebrow}>Supplier *</label>
            <SearchableSelect
              value={supplierId}
              onChange={setSupplierId}
              options={suppliers.map(s => ({ value: String(s.id), label: s.name, hint: s.contactPerson || s.phone || undefined }))}
              placeholder="Select supplier"
              searchPlaceholder="Search by name, contact or phone..."
              emptyText="No supplier found."
            />
          </div>
          <div className={styles.cell}>
            <label className={styles.eyebrow} htmlFor="soa-from">From date</label>
            <input id="soa-from" type="date" className={styles.field} value={from} max={to} onChange={e => setRange([e.target.value, to])} />
          </div>
          <div className={styles.cell}>
            <label className={styles.eyebrow} htmlFor="soa-to">To date</label>
            <input id="soa-to" type="date" className={styles.field} value={to} min={from} max={todayIso()} onChange={e => setRange([from, e.target.value])} />
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {presets.map(p => {
              const [pf, pt] = presetRange(p.key);
              return (
                <button key={p.key} type="button" className={cx(styles.tab, pf === from && pt === to && styles.tabActive)} onClick={() => setRange([pf, pt])}>
                  {p.label}
                </button>
              );
            })}
          </div>
          <div className={styles.headerActions}>
            <Button onClick={generate} disabled={loading || !supplierId}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Generate Statement
            </Button>
            <ReportActions report={buildStatementReport} size="default" disabled={!statement || loading} menuLabel="Supplier statement" />
          </div>
        </div>
      </div>

      {!supplierId && (
        <div className={cx(styles.panel, styles.empty)} style={{ padding: 56 }}>
          <FileText size={30} style={{ margin: '0 auto 8px', opacity: 0.35 }} />
          Select a supplier to see every invoice and payment with a running balance.
        </div>
      )}

      {supplierId && loading && !statement && (
        <div className={cx(styles.panel, styles.empty)} style={{ padding: 56 }}><Loader2 className="h-6 w-6 animate-spin" style={{ margin: '0 auto' }} /></div>
      )}

      {statement && supplier && (
        <div className={cx(styles.panel)} style={{ padding: 28, position: 'relative' }}>
          {loading && <div className={styles.psOverlay}><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '0.03em' }}>STATEMENT OF ACCOUNT</h2>
              <div style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 16 }}>{statement.supplierName}</div>
              <div className={cx(styles.tiny, styles.muted)} style={{ marginTop: 6, lineHeight: 1.6 }}>
                {supplier.contactPerson && <div>Contact: {supplier.contactPerson}</div>}
                <div>Phone: {supplier.phone || '—'} · Email: {supplier.email || '—'}</div>
                {supplier.taxId && <div>TRN: {supplier.taxId}</div>}
              </div>
            </div>
            <div className={cx(styles.tiny, styles.muted)} style={{ textAlign: 'right', lineHeight: 1.6 }}>
              <div>Statement period</div>
              <div style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: 14 }}>{displayDate(from)} – {displayDate(to)}</div>
              <div style={{ marginTop: 4 }}>Generated on</div>
              <div style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: 14 }}>{displayDate(todayIso())}</div>
            </div>
          </div>

          <div className={styles.kpiGrid} style={{ marginBottom: 24 }}>
            {[
              { label: 'Opening Balance', value: balanceText(statement.openingBalance), sub: balanceHint(statement.openingBalance), bg: '#eff6ff', fg: '#1d4ed8' },
              { label: 'Total Purchases', value: money(statement.totalCredit), sub: 'Invoices in period', bg: '#fff7ed', fg: '#c2410c' },
              { label: 'Total Payments', value: money(statement.totalDebit), sub: 'Paid in period', bg: '#ecfdf5', fg: '#047857' },
              { label: 'Closing Balance', value: balanceText(statement.closingBalance), sub: balanceHint(statement.closingBalance), bg: '#faf5ff', fg: '#7e22ce' },
            ].map(t => (
              <div key={t.label} style={{ background: t.bg, borderRadius: 10, padding: '14px 16px', boxShadow: '0 1px 3px rgb(0 0 0 / 0.08)' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: t.fg }}>{t.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: t.fg, fontVariantNumeric: 'tabular-nums' }}>{t.value} <span style={{ fontSize: 12, fontWeight: 500 }}>{currencySymbol}</span></div>
                <div className={cx(styles.tiny, styles.muted)}>{t.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className={styles.itemsTable} style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  <th>Date</th><th>Type</th><th>Document No.</th><th>Description</th><th>Reference</th>
                  <th className={styles.right}>Debit (Payment)</th><th className={styles.right}>Credit (Invoice)</th><th className={styles.right}>Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{displayDate(from)}</td>
                  <td><span className={cx(styles.pill, styles.pillGray)}>Opening</span></td>
                  <td className={styles.muted}>—</td>
                  <td>Opening balance</td>
                  <td className={styles.muted}>—</td>
                  <td className={styles.right}>—</td>
                  <td className={styles.right}>—</td>
                  <td className={cx(styles.right, styles.num)} style={{ fontWeight: 700 }}>{balanceText(statement.openingBalance)}</td>
                </tr>
                {statement.entries.map((e, i) => (
                  <tr key={i}>
                    <td>{displayDate(e.date)}</td>
                    <td><span className={cx(styles.pill, e.type === 'INVOICE' ? styles.pillAmber : styles.pillGreen)}>{e.type === 'INVOICE' ? 'Invoice' : 'Payment'}</span></td>
                    <td style={{ fontWeight: 600 }}>{e.documentNo || '—'}</td>
                    <td>{e.description}</td>
                    <td className={styles.muted}>{e.reference || '—'}</td>
                    <td className={cx(styles.right, styles.num, styles.success)} style={{ fontWeight: 600 }}>{e.debit ? money(e.debit) : '—'}</td>
                    <td className={cx(styles.right, styles.num)} style={{ fontWeight: 600, color: '#c2410c' }}>{e.credit ? money(e.credit) : '—'}</td>
                    <td className={cx(styles.right, styles.num)} style={{ fontWeight: 700 }}>{balanceText(e.runningBalance)}</td>
                  </tr>
                ))}
                {statement.entries.length === 0 && (
                  <tr><td colSpan={8} className={styles.empty}>No invoices or payments with this supplier in this period.</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className={styles.right}>Closing totals</td>
                  <td className={cx(styles.right, styles.num, styles.success)}>{money(statement.totalDebit)}</td>
                  <td className={cx(styles.right, styles.num)} style={{ color: '#c2410c' }}>{money(statement.totalCredit)}</td>
                  <td className={cx(styles.right, styles.num)} style={{ color: '#7e22ce' }}>{balanceText(statement.closingBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className={cx(styles.tiny, styles.muted)} style={{ marginTop: 18, textAlign: 'center' }}>
            Cr = amount payable to the supplier · Dr = advance paid to the supplier. This is a computer-generated statement and does not require a signature.
          </p>
        </div>
      )}
    </div>
  );
}
