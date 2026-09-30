import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

import type { Receipt } from '../../domain';

/**
 * Collection report CSV export.
 *
 * Same format as the web app's Billing "Export Data" / "Export CSV"
 * (`receipts-YYYY-MM-DD.csv`). Keep in sync with Gym-frontend/src/pages/billing.tsx.
 */

const CSV_HEADER =
  'Receipt No,Member,Member ID,Subscription,Type,Amount Paid,Remaining Due,Date & Time,Payment Method,Created By,Status\n';

// Mirrors the web's getDisplayStatus: a mobile Cash/Credit/Mixed purchase awaiting
// reception approval must not show as Paid in the export.
function getDisplayStatus(receipt: Receipt): string {
  if (receipt.approvalStatus === 'PENDING') return 'Request';
  if (receipt.approvalStatus === 'REJECTED') return 'Rejected';
  return receipt.status ?? '';
}

function toRow(r: Receipt): string[] {
  const paid = Number(r.paidAmount ?? 0);
  const remainingDue = Number(r.balanceAfter ?? 0);
  return [
    r.receiptNo ?? '',
    r.memberName ?? '',
    r.memberId ?? '',
    r.planName ?? '',
    r.transactionType ?? '',
    paid.toFixed(2),
    remainingDue.toFixed(2),
    r.transactionDate ? new Date(r.transactionDate).toLocaleString() : '',
    r.paymentMethod ?? '',
    r.processedBy ?? '',
    getDisplayStatus(r),
  ];
}

const today = () => new Date().toISOString().slice(0, 10);

export function buildCollectionCsv(receipts: Receipt[]): string {
  return CSV_HEADER + receipts.map(r => toRow(r).map(c => `"${c}"`).join(',')).join('\n');
}

function downloadOnWeb(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function shareFile(uri: string, mimeType: string, filename: string, UTI: string) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: filename, UTI });
}

/** Writes the collection CSV and opens the native save/share sheet. Returns the filename. */
export async function exportCollectionCsv(receipts: Receipt[]): Promise<string> {
  const filename = `receipts-${today()}.csv`;
  const csv = buildCollectionCsv(receipts);

  if (Platform.OS === 'web') {
    downloadOnWeb(filename, new Blob([csv], { type: 'text/csv' }));
    return filename;
  }

  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);
  await shareFile(file.uri, 'text/csv', filename, 'public.comma-separated-values-text');
  return filename;
}

