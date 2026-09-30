import {
  currencyHtml,
  formatAmount,
  formatCurrency,
  type CurrencyCode,
} from '@/core/providers';
import { Platform } from 'react-native';
import * as MailComposer from 'expo-mail-composer';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as SMS from 'expo-sms';
import { Directory, File, Paths } from 'expo-file-system';
// @ts-ignore - qr.js ships no type declarations
import QRCodeGenerator from 'qr.js/lib/QRCode';
// @ts-ignore - qr.js ships no type declarations
import ErrorCorrectLevel from 'qr.js/lib/ErrorCorrectLevel';

import { apiClient } from '@/core/network/apiClient';

import type { Receipt } from '../../domain';

/**
 * Receipt tax-invoice PDF — the same document the web app prints/downloads
 * from Billing → Receipts. Template, company branding, VAT split and the
 * verification QR are ported from:
 *   Gym-frontend/src/utils/receipt-invoice.tsx   (buildFullReceiptHtml / buildReceiptInvoiceHtml)
 *   Gym-frontend/src/utils/company-details.tsx   (header, footer, QR)
 *   Gym-frontend/src/utils/tax.ts                (VAT rate + inclusive split)
 * Keep them in sync so a receipt looks identical whichever app produced it.
 */

// ── Company details + VAT (financial settings) ────────────────────────────

interface CompanyDetails {
  name: string;
  address: string;
  email: string;
  phone: string;
  logo: string; // data URL, or "" if none uploaded
  /** UAE FTA Tax Registration Number — required on any document titled "Tax Invoice". */
  trn: string;
}

interface FinancialSettingResponse {
  setting_key: string;
  setting_value?: string | null;
}

const DEFAULT_COMPANY: CompanyDetails = {
  name: 'GymBios',
  address: 'Dubai, United Arab Emirates',
  email: '',
  phone: '',
  logo: '',
  trn: '',
};

const DEFAULT_VAT_RATE = 5;

let cachedCompany: CompanyDetails | null = null;
let cachedVatRate: number | null = null;

async function getSettings(category: string): Promise<FinancialSettingResponse[]> {
  const response = await apiClient.get<FinancialSettingResponse[]>('/financial-settings', {
    params: { category },
    skipGlobalErrorToast: true,
  });
  return response.data ?? [];
}

async function getCompanyDetails(): Promise<CompanyDetails> {
  if (cachedCompany) return cachedCompany;
  try {
    const details = { ...DEFAULT_COMPANY };
    (await getSettings('COMPANY')).forEach(s => {
      if (!s.setting_value) return;
      if (s.setting_key === 'company_name') details.name = s.setting_value;
      if (s.setting_key === 'company_address') details.address = s.setting_value;
      if (s.setting_key === 'company_email') details.email = s.setting_value;
      if (s.setting_key === 'company_phone') details.phone = s.setting_value;
      if (s.setting_key === 'company_logo') details.logo = s.setting_value;
      if (s.setting_key === 'company_trn') details.trn = s.setting_value;
    });
    cachedCompany = details;
    return details;
  } catch (err) {
    console.error('Failed to load company details, using defaults', err);
    return DEFAULT_COMPANY;
  }
}

async function getVatRate(): Promise<number> {
  if (cachedVatRate !== null) return cachedVatRate;
  try {
    const raw = (await getSettings('TAX')).find(s => s.setting_key === 'standard_vat_rate')?.setting_value;
    const parsed = raw ? Number(raw) : NaN;
    cachedVatRate = Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_VAT_RATE;
  } catch {
    cachedVatRate = DEFAULT_VAT_RATE;
  }
  return cachedVatRate;
}

// Prices are quoted VAT-inclusive; this splits the gross into net + VAT for
// display only, matching FinancialEventService.splitVatInclusive on the backend.
function splitVatInclusive(grossAmount: number, ratePercent: number): { net: number; vat: number } {
  if (!Number.isFinite(grossAmount) || ratePercent <= 0) {
    return { net: grossAmount, vat: 0 };
  }
  const net = Math.round((grossAmount / (1 + ratePercent / 100)) * 100) / 100;
  const vat = Math.round((grossAmount - net) * 100) / 100;
  return { net, vat };
}

// ── Header / footer / QR ──────────────────────────────────────────────────

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildQrCodeSvg(value: string): string {
  const qr = new QRCodeGenerator(-1, ErrorCorrectLevel.M);
  qr.addData(value);
  qr.make();
  const cells: boolean[][] = qr.modules;
  const cellCount = cells.length;
  const path = cells
    .map((row: boolean[], r: number) =>
      row.map((isDark, c) => (isDark ? `M${c} ${r}l1 0 0 1 -1 0Z` : '')).join(' ')
    )
    .join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cellCount} ${cellCount}" shape-rendering="crispEdges"><rect width="${cellCount}" height="${cellCount}" fill="#ffffff"/><path d="${path}" fill="#000000"/></svg>`;
}

interface ReceiptQrDetails {
  date?: string;
  billTo?: string;
  amount?: string;
  status?: string;
}

// Plain-text payload (GCC e-invoicing style) so scanning shows the bill with no server round-trip.
function buildReceiptQrPayload(company: CompanyDetails, receiptNo: string, details?: ReceiptQrDetails): string {
  const lines = [`${company.name} - Tax Invoice`, `Receipt No: ${receiptNo}`];
  if (details?.date) lines.push(`Date: ${details.date}`);
  if (details?.billTo) lines.push(`Bill To: ${details.billTo}`);
  if (details?.amount) lines.push(`Amount: ${details.amount}`);
  if (details?.status) lines.push(`Status: ${details.status}`);
  if (company.trn) lines.push(`TRN: ${company.trn}`);
  return lines.join('\n');
}

const COMPANY_HEADER_CSS = `
  .header{border-bottom:3px solid #327F74;padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:flex-start}
  .header-left{flex:1}
  .header-left .company-logo{max-height:48px;max-width:220px;object-fit:contain;margin-bottom:8px;display:block}
  .company-name{color:#327F74;font-size:32px;font-weight:bold;margin-bottom:5px}
  .company-details{color:#888;font-size:12px;line-height:1.6}
  .qr-top-right{width:120px;height:120px;background:white;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .qr-inner{text-align:center;color:#327F74}
  .qr-inner svg{display:block;margin:0 auto;width:84px;height:84px}
  .qr-inner .qr-label{font-size:9px;font-weight:600;margin-top:5px;line-height:1.2}
  .qr-inner .qr-rcpt{font-size:9px;margin-top:3px;word-break:break-all}
`;

function buildCompanyHeaderHtml(company: CompanyDetails, receiptNo: string, qrDetails?: ReceiptQrDetails): string {
  const logoImg = company.logo
    ? `<img src="${company.logo}" alt="${escapeHtml(company.name)} logo" class="company-logo"/>`
    : '';
  const contactParts = [company.phone && `Phone: ${escapeHtml(company.phone)}`, company.email && `Email: ${escapeHtml(company.email)}`]
    .filter(Boolean)
    .join(' | ');
  const trnPart = company.trn ? `TRN: ${escapeHtml(company.trn)}` : '';
  const detailLines = [company.address && escapeHtml(company.address), contactParts, trnPart].filter(Boolean).join('<br/>');
  const qrSvg = buildQrCodeSvg(buildReceiptQrPayload(company, receiptNo, qrDetails));

  return `
  <div class="header-left">
    ${logoImg}
    <div class="company-name">${escapeHtml(company.name)}</div>
    <div class="company-details">${detailLines}</div>
  </div>
  <div class="qr-top-right">
    <div class="qr-inner">
      ${qrSvg}
      <div class="qr-label">RECEIPT VERIFICATION</div>
      <div class="qr-rcpt">${escapeHtml(receiptNo)}</div>
    </div>
  </div>`;
}

function buildCompanyFooterHtml(company: CompanyDetails): string {
  const contactParts = [company.phone && `Phone: ${escapeHtml(company.phone)}`, company.email && `Email: ${escapeHtml(company.email)}`]
    .filter(Boolean)
    .join(' | ');
  const trnPart = company.trn && `TRN: ${escapeHtml(company.trn)}`;
  return `
    <strong>${escapeHtml(company.name)}</strong><br/>
    ${[company.address && escapeHtml(company.address), contactParts].filter(Boolean).join(' | ')}
    ${trnPart ? `<br/>${trnPart}` : ''}
  `;
}

// ── Receipt template ──────────────────────────────────────────────────────

interface ReceiptPrintData {
  receiptNo: string;
  invoiceNo?: string;
  dateStr: string;
  status: string;
  billTo: { name: string; memberId?: string; phone?: string };
  items: { description: string; subtitle?: string; type: string; amount: number }[];
  currencyCode: CurrencyCode;
  subtotalExclVat: number;
  vatRatePercent: number;
  vatAmount: number;
  invoiceAmount: number;
  totalPaid: number;
  balanceDue?: number;
  paymentMethod: string;
  transactionDate: string;
  processedBy?: string;
  validity?: { from: string; to: string };
}

// Transcribed from the web's buildFullReceiptHtml. `autoPrint` adds the
// window.print() hook the web relies on — only wanted when the HTML is
// opened in a browser window, never when rendered straight to a PDF file.
function buildFullReceiptHtml(data: ReceiptPrintData, company: CompanyDetails, autoPrint: boolean): string {
  const { currencyCode } = data;
  // Real currency mark (inline SVG for the Dirham) + amount, for the printed/PDF invoice.
  const money = (n: number) => currencyHtml(currencyCode, formatAmount(n, { code: currencyCode, decimals: 2 }));

  const rows = data.items.map(item => `
        <tr>
          <td><strong>${escapeHtml(item.description)}</strong>${item.subtitle ? `<br><span style="color:#888;font-size:12px;">${escapeHtml(item.subtitle)}</span>` : ''}</td>
          <td>${escapeHtml(item.type)}</td>
          <td class="amount-cell" style="text-align: right;">${money(item.amount)}</td>
        </tr>`).join('');

  const statusClass = data.status.toLowerCase() === 'paid' ? '' : ' style="background:#fef3c7;color:#92400e;"';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt - ${escapeHtml(data.receiptNo)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&family=Noto+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Noto Sans', 'Noto Sans Arabic', sans-serif; padding: 20px; background: #f5f5f5; }
        .invoice {
          font-variant-numeric: tabular-nums lining-nums;
          font-feature-settings: "tnum" 1, "lnum" 1;
        }
        .receipt-container {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: white;
            padding: 20mm;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            position: relative;
            box-sizing: border-box;
        }
        ${COMPANY_HEADER_CSS}
        .receipt-title { text-align: center; font-size: 28px; color: #333; margin: 30px 0; font-weight: 600; letter-spacing: 1px; }
        .receipt-info { display: flex; justify-content: space-between; margin-bottom: 30px; padding: 20px; background: #f9fafb; border-radius: 6px; }
        .info-block { flex: 1; }
        .info-label { color: #888; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; font-weight: 600; }
        .info-value { color: #333; font-size: 14px; font-weight: 600; }
        .receipt-number { color: #327F74; font-size: 18px; font-weight: bold; }
        .invoice-number { color: #888; font-size: 11px; margin-top: 3px; }
        .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #dcfce7; color: #166534; }
        .customer-section { margin-bottom: 30px; padding: 20px; background: #f9fafb; border-left: 4px solid #327F74; border-radius: 6px; }
        .section-title { color: #327F74; font-size: 14px; font-weight: 700; text-transform: uppercase; margin-bottom: 15px; letter-spacing: 0.5px; }
        .customer-name { font-size: 18px; font-weight: 600; color: #333; margin-bottom: 5px; }
        .customer-detail { color: #666; font-size: 14px; margin-bottom: 3px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
        .items-table thead { background: #327F74; color: white; }
        .items-table th { padding: 15px; text-align: left; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
        .items-table td { padding: 15px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #333; }
        .items-table tbody tr:hover { background: #f9fafb; }
        .amount-cell { font-weight: 600; color: #327F74; }
        .totals-section { margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 6px; }
        .total-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; }
        .total-row.normal { color: #666; }
        .total-row.discount { color: #E63946; font-weight: 600; }
        .total-row.gross { color: #333; font-weight: 600; padding-top: 10px; border-top: 1px solid #e5e7eb; }
        .total-row.vat { color: #666; }
        .total-row.grand-total { font-size: 20px; font-weight: bold; color: #327F74; padding-top: 15px; margin-top: 10px; border-top: 2px solid #327F74; }
        .payment-info { margin: 30px 0; padding: 20px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; }
        .payment-method { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #333; }
        .payment-label { font-weight: 600; color: #78350f; }
        .footer { margin-top: 40px; padding-top: 30px; border-top: 2px solid #e5e7eb; text-align: center; }
        .thank-you { font-size: 18px; color: #327F74; font-weight: 600; margin-bottom: 15px; }
        .footer-note { color: #888; font-size: 12px; line-height: 1.6; margin-bottom: 10px; }
        .contact-info { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #666; font-size: 12px; }
        .print-info { margin-top: 30px; padding: 15px; background: #f3f4f6; border-radius: 6px; font-size: 11px; color: #666; text-align: center; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print {
            body { padding: 0; background: white; }
            .receipt-container {
                box-shadow: none;
                width: auto;
                min-height: auto;
                margin: 0;
                border-radius: 0;
                padding: 0;
            }
            .header { margin-bottom: 8px; padding-bottom: 6px; }
            .header-left .company-logo { max-height: 42px; margin-bottom: 3px; }
            .company-name { font-size: 20px; margin-bottom: 2px; }
            .company-details { font-size: 9px; line-height: 1.3; }
            .qr-top-right { width: 92px; height: 92px; }
            .qr-inner svg { width: 66px; height: 66px; }
            .qr-inner .qr-label { font-size: 8px; margin-top: 3px; }
            .qr-inner .qr-rcpt { font-size: 8px; margin-top: 1px; }
            .receipt-title { margin: 6px 0; font-size: 15px; }
            .receipt-info { margin-bottom: 8px; padding: 8px; }
            .customer-section { margin-bottom: 8px; padding: 8px; }
            .section-title { margin-bottom: 4px; }
            .customer-name { margin-bottom: 2px; }
            .customer-detail { margin-bottom: 0; }
            .items-table { margin: 8px 0; }
            .items-table th, .items-table td { padding: 5px; }
            .totals-section { margin-top: 8px; padding: 8px; }
            .total-row { padding: 2px 0; }
            .total-row.grand-total { padding-top: 6px; margin-top: 4px; }
            .payment-info { margin: 8px 0; padding: 8px; }
            .payment-method + .payment-method { margin-top: 4px !important; }
            .footer { margin-top: 16px; padding-top: 12px; }
            .thank-you { margin-bottom: 10px; font-size: 16px; }
            .footer-note { margin-bottom: 8px; line-height: 1.5; }
            .contact-info { margin-top: 12px; padding-top: 12px; line-height: 1.5; }
            .print-info { display: none; }
            @page {
                size: A4;
                margin: 8mm 10mm;
            }
        }
    </style>
</head>
<body>
    <div class="receipt-container invoice">
        <div class="header">${buildCompanyHeaderHtml(company, data.receiptNo, {
          date: data.dateStr,
          billTo: data.billTo.name,
          // QR payload is plain text, so this uses the text form ("AED 1,250.00").
          amount: formatCurrency(data.invoiceAmount, { code: currencyCode, decimals: 2 }),
          status: data.status,
        })}</div>
        <div class="receipt-title">Tax Invoice &#1601;&#1575;&#1578;&#1608;&#1585;&#1577; &#1590;&#1585;&#1610;&#1576;&#1610;&#1577;</div>
        <div class="receipt-info">
            <div class="info-block">
              <div class="info-label">Receipt Number</div>
              <div class="receipt-number">${escapeHtml(data.receiptNo)}</div>
              ${data.invoiceNo ? `<div class="invoice-number">Invoice: ${escapeHtml(data.invoiceNo)}</div>` : ''}
            </div>
            <div class="info-block"><div class="info-label">Date Issued</div><div class="info-value">${escapeHtml(data.dateStr)}</div></div>
            <div class="info-block"><div class="info-label">Status</div><div><span class="status-badge"${statusClass}>${escapeHtml(data.status)}</span></div></div>
        </div>
        <div class="customer-section">
            <div class="section-title">Bill To</div>
            <div class="customer-name">${escapeHtml(data.billTo.name)}</div>
            ${data.billTo.memberId ? `<div class="customer-detail"><strong>Member ID:</strong> ${escapeHtml(data.billTo.memberId)}</div>` : ''}
            ${data.billTo.phone ? `<div class="customer-detail"><strong>Phone:</strong> ${escapeHtml(data.billTo.phone)}</div>` : ''}
        </div>
        <table class="items-table">
            <thead><tr><th>Description</th><th>Type</th><th style="text-align: right;">Amount (Incl. VAT)</th></tr></thead>
            <tbody>${rows}
            </tbody>
        </table>
        <div class="totals-section">
            <div class="total-row normal"><span>Subtotal (Excl. VAT):</span><span>${money(data.subtotalExclVat)}</span></div>
            <div class="total-row vat"><span>VAT (${data.vatRatePercent}%):</span><span>${money(data.vatAmount)}</span></div>
            <div class="total-row grand-total"><span>Invoice Amount:</span><span>${money(data.invoiceAmount)}</span></div>
            <div class="total-row normal" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;"><span>TOTAL PAID:</span><span>${money(data.totalPaid)}</span></div>
            ${data.balanceDue ? `<div class="total-row discount"><span>BALANCE DUE:</span><span>${money(data.balanceDue)}</span></div>` : ''}
            ${data.validity ? `<br><span style="color: #327F74; font-size: 12px; font-weight: 600;">Subscription validity: from ${escapeHtml(data.validity.from)} To: ${escapeHtml(data.validity.to)}</span>` : ''}
        </div>
        <div class="payment-info">
            <div class="payment-method"><span class="payment-label">Payment Method:</span><span>${escapeHtml(data.paymentMethod)}</span></div>
            <div class="payment-method" style="margin-top: 8px;"><span class="payment-label">Transaction Date:</span><span>${escapeHtml(data.transactionDate)}</span></div>
            ${data.processedBy ? `<div class="payment-method" style="margin-top: 8px;"><span class="payment-label">Processed By:</span><span>${escapeHtml(data.processedBy)}</span></div>` : ''}
        </div>
        <div class="footer">
            <div class="thank-you">Thank you for your business!</div>
            <div class="footer-note">This is an official receipt issued by ${escapeHtml(company.name)}. Please retain this receipt for your records.<br>For any queries regarding this transaction, please contact our billing department.</div>
            <div class="contact-info">${buildCompanyFooterHtml(company)}</div>
        </div>
        <div class="print-info">Receipt generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}<br>This is a computer-generated receipt and is valid without signature.</div>
    </div>
    ${autoPrint ? '<script>window.onload = function(){ window.print(); }</script>' : ''}
</body>
</html>`;
}

function formatLongDate(dateStr?: string): string {
  return dateStr
    ? new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : '-';
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Mirrors the web's buildReceiptInvoiceHtml field mapping.
async function buildReceiptInvoiceHtml(receipt: Receipt, currencyCode: CurrencyCode, autoPrint: boolean): Promise<string> {
  const [company, vatRatePercent] = await Promise.all([getCompanyDetails(), getVatRate()]);

  const totalAmt = Number(receipt.amount ?? 0);
  const paidAmt = Number(receipt.paidAmount ?? totalAmt);
  const balanceDue = Number(receipt.dueAmount ?? 0);
  const { net: subtotalExclVat, vat: vatAmount } = splitVatInclusive(totalAmt, vatRatePercent);
  const dateStr = formatLongDate(receipt.transactionDate);

  // A mobile Cash/Credit/Mixed purchase still awaiting reception approval must
  // never print as "Paid" — it isn't proof of payment until staff confirm it.
  const displayStatus = receipt.approvalStatus === 'PENDING' ? 'Request'
    : receipt.approvalStatus === 'REJECTED' ? 'Rejected'
    : receipt.status ?? '-';

  const transactionType = receipt.transactionType ?? '-';

  return buildFullReceiptHtml(
    {
      receiptNo: receipt.receiptNo ?? `#${receipt.id}`,
      invoiceNo: receipt.invoiceNo,
      dateStr,
      status: displayStatus,
      billTo: {
        name: receipt.memberName ?? '-',
        memberId: receipt.memberId,
        phone: receipt.memberPhone,
      },
      items: [{
        description: receipt.planName ?? transactionType,
        subtitle: `Transaction Type: ${transactionType}`,
        type: transactionType,
        amount: totalAmt,
      }],
      currencyCode,
      subtotalExclVat,
      vatRatePercent,
      vatAmount,
      invoiceAmount: totalAmt,
      totalPaid: paidAmt,
      balanceDue: balanceDue > 0 ? balanceDue : undefined,
      paymentMethod: receipt.paymentMethod ?? '-',
      transactionDate: dateStr,
      processedBy: receipt.processedBy,
      validity: receipt.validFrom ? {
        from: formatShortDate(receipt.validFrom),
        to: receipt.validTill ? formatShortDate(receipt.validTill) : '-',
      } : undefined,
    },
    company,
    autoPrint,
  );
}

// ── Download / share ──────────────────────────────────────────────────────

function receiptFilename(receipt: Receipt): string {
  return `Receipt_${(receipt.receiptNo ?? receipt.id).replace(/[^\w-]/g, '_')}.pdf`;
}

/** Renders the receipt to a PDF in the cache dir, named after the receipt number. */
async function renderReceiptPdf(receipt: Receipt, currencyCode: CurrencyCode): Promise<File> {
  if (Platform.OS === 'web') {
    // expo-print can't write a file in the browser (printToFileAsync resolves to nothing there).
    throw new Error('Receipt PDF files can only be generated on iOS/Android.');
  }
  const html = await buildReceiptInvoiceHtml(receipt, currencyCode, false);
  const { uri } = await Print.printToFileAsync({ html });
  // printToFileAsync writes a random name; move it so the saved/shared file is named sensibly.
  const target = new File(Paths.cache, receiptFilename(receipt));
  if (target.exists) target.delete();
  await new File(uri).move(target);
  return target;
}

async function openPrintWindowOnWeb(receipt: Receipt, currencyCode: CurrencyCode) {
  const win = window.open('', '_blank', 'width=820,height=900');
  const html = await buildReceiptInvoiceHtml(receipt, currencyCode, true);
  if (win) { win.document.write(html); win.document.close(); }
}

export type ReceiptDownloadResult =
  /** Written to a folder the user picked (Android). */
  | { status: 'saved'; filename: string; folder: string }
  /** Handed to the OS save/share sheet (iOS) or print dialog (web) — the user finishes the save there. */
  | { status: 'handedOff'; filename: string }
  | { status: 'cancelled' };

/**
 * Downloads the receipt PDF.
 *  - Android: the user picks a folder (the system picker opens on Downloads by
 *    default and remembers the last choice) and the PDF is written there.
 *  - iOS: there's no public Downloads folder, so the share sheet opens and the
 *    user saves via "Save to Files".
 *  - Web: opens the print dialog, same as the web app.
 */
export async function downloadReceiptPdf(receipt: Receipt, currencyCode: CurrencyCode): Promise<ReceiptDownloadResult> {
  const filename = receiptFilename(receipt);

  if (Platform.OS === 'web') {
    await openPrintWindowOnWeb(receipt, currencyCode);
    return { status: 'handedOff', filename };
  }

  const pdf = await renderReceiptPdf(receipt, currencyCode);

  if (Platform.OS === 'android') {
    let directory: Directory;
    try {
      directory = await Directory.pickDirectoryAsync();
    } catch {
      return { status: 'cancelled' };
    }
    const saved = directory.createFile(filename, 'application/pdf');
    saved.write(pdf.bytesSync());
    return { status: 'saved', filename, folder: directory.name };
  }

  await sharePdf(pdf, filename);
  return { status: 'handedOff', filename };
}

/**
 * Opens the mail composer with the receipt PDF attached and subject/body
 * pre-filled. Falls back to the share sheet when no mail account is set up
 * (MailComposer is unavailable), so the PDF can still be sent.
 */
export async function emailReceiptPdf(receipt: Receipt, currencyCode: CurrencyCode): Promise<void> {
  const pdf = await renderReceiptPdf(receipt, currencyCode);
  if (!(await MailComposer.isAvailableAsync())) {
    await sharePdf(pdf, receiptFilename(receipt));
    return;
  }
  const receiptNo = receipt.receiptNo ?? `#${receipt.id}`;
  await MailComposer.composeAsync({
    subject: `Receipt ${receiptNo}`,
    body: `Dear ${receipt.memberName ?? 'Member'},\n\nPlease find attached your receipt ${receiptNo}.\n\nThank you.`,
    attachments: [pdf.uri],
  });
}

/**
 * Opens the messaging app addressed to the member's phone with the receipt PDF
 * attached (MMS). Android needs a content:// URI so the SMS app can read the
 * file. Falls back to the share sheet on devices without SMS.
 */
export async function smsReceiptPdf(receipt: Receipt, currencyCode: CurrencyCode): Promise<void> {
  const pdf = await renderReceiptPdf(receipt, currencyCode);
  const filename = receiptFilename(receipt);
  if (!(await SMS.isAvailableAsync())) {
    await sharePdf(pdf, filename);
    return;
  }
  const receiptNo = receipt.receiptNo ?? `#${receipt.id}`;
  await SMS.sendSMSAsync(
    receipt.memberPhone ? [receipt.memberPhone] : [],
    `Your receipt ${receiptNo} is attached.`,
    {
      attachments: {
        uri: Platform.OS === 'android' ? pdf.contentUri : pdf.uri,
        mimeType: 'application/pdf',
        filename,
      },
    },
  );
}

/** Opens the system print dialog (AirPrint / Android print service) with the receipt. */
export async function printReceipt(receipt: Receipt, currencyCode: CurrencyCode): Promise<void> {
  if (Platform.OS === 'web') {
    await openPrintWindowOnWeb(receipt, currencyCode);
    return;
  }
  await Print.printAsync({ html: await buildReceiptInvoiceHtml(receipt, currencyCode, false) });
}

async function sharePdf(pdf: File, filename: string) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(pdf.uri, { mimeType: 'application/pdf', dialogTitle: filename, UTI: 'com.adobe.pdf' });
}
