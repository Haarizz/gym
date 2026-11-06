import type { Statement, StatementLine } from '../../domain/Statement';
import { StatementLineType } from '../../domain/Statement';
import { saveCsvFile } from './exportCollectionReport';

/**
 * Member Statement of Account CSV export.
 *
 * Same layout as the web app's Billing → Member SOA "Export" (an .xlsx built by
 * exportMemberStatementXlsx): a summary block, then the ledger with a totals row.
 * Keep in sync with Gym-frontend/src/utils/member-statement-print.ts.
 */

type Cell = string | number | null | undefined;

const fmtDate = (v?: string) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const periodLabel = (from?: string, to?: string) =>
  from && to
    ? `${fmtDate(from)} to ${fmtDate(to)}`
    : from
      ? `From ${fmtDate(from)}`
      : to
        ? `Up to ${fmtDate(to)}`
        : 'All transactions';

const docNo = (l: StatementLine) =>
  (l.type === StatementLineType.Invoice ? l.invoiceNo || l.receiptNo : l.receiptNo) ?? '';

const money = (n?: number) => Number(n ?? 0).toFixed(2);

/** Blank instead of 0.00, matching the web sheet's empty Debit/Credit cells. */
const moneyOrBlank = (n?: number) => (n ? money(n) : '');

const csvCell = (v: Cell) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function buildMemberStatementCsv(
  s: Statement,
  currencyCode: string,
  from?: string,
  to?: string,
): string {
  const rows: Cell[][] = [
    ['Statement of Account'],
    ['Member', s.memberName],
    ['Member ID', s.memberId],
    ['Phone', s.memberPhone ?? ''],
    ['Period', periodLabel(from, to)],
    ['Currency', currencyCode],
    [],
    ['Opening Balance', money(s.openingBalance)],
    ['Total Billed', money(s.totalBilled)],
    ['Total Paid', money(s.totalPaid)],
    ['Closing Balance', money(s.closingBalance)],
    [],
    ['Date', 'Doc No.', 'Type', 'Description', 'Debit', 'Credit', 'Balance', 'Payment Method', 'Status'],
  ];

  for (const l of s.lines) {
    const extra = l.minorCharges?.length
      ? ` (Incl. ${l.minorCharges.map(m => `${m.name ?? ''}: ${Number(m.amount ?? 0)}`).join(', ')})`
      : '';
    rows.push([
      fmtDate(l.date),
      docNo(l),
      l.type ?? '',
      (l.description ?? '') + extra,
      moneyOrBlank(l.debit),
      moneyOrBlank(l.credit),
      money(l.balance),
      l.paymentMethod ?? '',
      l.status ?? '',
    ]);
  }
  rows.push(['Totals', '', '', '', money(s.totalBilled), money(s.totalPaid), money(s.closingBalance)]);

  // BOM so Excel reads non-Latin member names/descriptions as UTF-8.
  return '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
}

/** Writes the statement CSV and opens the save/share sheet. Returns the filename. */
export async function exportMemberStatementCsv(
  s: Statement,
  currencyCode: string,
  from?: string,
  to?: string,
): Promise<string> {
  const filename = `SOA-${s.memberId ?? s.memberDbId ?? 'member'}-${new Date().toISOString().slice(0, 10)}.csv`;
  await saveCsvFile(filename, buildMemberStatementCsv(s, currencyCode, from, to));
  return filename;
}
