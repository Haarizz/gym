import { resolveReportContext } from '../report-export/service';
import type { ContextInput } from '../report-export/service';
import type { ReportDocument } from '../report-export/types';

/**
 * A sample invoice PDF for Settings › Email's test — built with the same report engine as every
 * other GymBios PDF, so it carries the gym's real logo, name, address and TRN header. Clearly
 * marked as a test; nothing is saved.
 */
export async function buildTestInvoicePdf(input: ContextInput): Promise<{ base64: string; fileName: string }> {
  const today = new Date();
  const lines = [
    { item: 'Monthly membership (sample)', qty: 1, rate: 1250 },
    { item: 'Personal training — 4 sessions (sample)', qty: 4, rate: 100 },
    { item: 'Locker rental (sample)', qty: 1, rate: 50 },
  ];
  const subtotal = lines.reduce((s, l) => s + l.qty * l.rate, 0);
  const vat = Math.round(subtotal * 0.05 * 100) / 100;

  const report: ReportDocument = {
    title: 'TEST INVOICE',
    subtitle: 'Sample generated to test your email settings — not a real invoice',
    fileName: 'Test-Invoice',
    orientation: 'portrait',
    sections: [
      {
        kind: 'keyValue',
        title: 'Invoice details',
        columns: 2,
        items: [
          { label: 'Invoice no.', value: 'TEST-0001' },
          { label: 'Date', value: today, format: 'date' },
          { label: 'Bill to', value: 'Sample Member' },
          { label: 'Member ID', value: 'TEST-MEMBER' },
          { label: 'Payment', value: 'Cash (sample)' },
          { label: 'Status', value: 'Paid (sample)' },
        ],
      },
      {
        kind: 'table',
        title: 'Items',
        columns: [
          { key: 'item', header: 'Description', format: 'text', width: 40 },
          { key: 'qty', header: 'Qty', format: 'integer', align: 'right' },
          { key: 'rate', header: 'Rate', format: 'money' },
          { key: 'amount', header: 'Amount', format: 'money', total: 'sum' },
        ],
        rows: [
          ...lines.map((l) => ({ item: l.item, qty: l.qty, rate: l.rate, amount: l.qty * l.rate })),
          { item: 'Subtotal', amount: subtotal, _kind: 'subtotal' as const },
          { item: 'VAT 5% (sample)', amount: vat, _kind: 'muted' as const },
          { item: 'Total', amount: subtotal + vat, _kind: 'total' as const },
        ],
      },
      {
        kind: 'text',
        title: 'Note',
        text: 'This is a TEST document sent from GymOS › Settings › Email to check that emails with PDF attachments '
          + 'arrive and open correctly. It is not a tax invoice and no payment is due.',
      },
    ],
  };

  const ctx = await resolveReportContext(report, input);
  const { buildReportPdf } = await import('../report-export/pdf');
  const blob = await buildReportPdf(report, ctx);
  if (!blob || !blob.size) throw new Error('The test invoice PDF came out empty');
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return { base64, fileName: `Test-Invoice-${today.toISOString().slice(0, 10)}.pdf` };
}
