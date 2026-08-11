import type { Receipt } from './supabase/receipts-service';
import { getCompanyDetails, buildCompanyHeaderHtml, buildCompanyFooterHtml, COMPANY_HEADER_CSS, type CompanyDetails } from './company-details';
import { getVatRate, splitVatInclusive, DEFAULT_VAT_RATE } from './tax';

export interface ReceiptPrintItem {
  description: string;
  subtitle?: string;
  type: string;
  amount: number;
}

// Everything the shared template (buildFullReceiptHtml) needs to render a
// receipt — any caller that can fill this shape (a saved Receipt, or a
// receipt still being generated in create-receipt.tsx) gets the identical
// printed document, so the two flows can't visually drift apart again.
export interface ReceiptPrintData {
  receiptNo: string;
  // Only present when this receipt is itself a bill (New/Renewal/Add-on/Daily
  // Entry/minor charge) — absent for a settlement/"Payment" receipt, which
  // isn't itself an invoice.
  invoiceNo?: string;
  dateStr: string;
  status: string;
  billTo: {
    name: string;
    memberId?: string;
    email?: string;
    phone?: string;
  };
  items: ReceiptPrintItem[];
  currencyCode: string;
  subtotalExclVat: number;
  discount?: number;
  vatRatePercent: number;
  vatAmount: number;
  invoiceAmount: number;
  totalPaid: number;
  balanceDue?: number;
  paymentMethod: string;
  transactionDate: string;
  processedBy?: string;
  validity?: { from: string; to: string };
  transactionRef?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// The exact receipt UI approved for print — structure, class names and CSS
// values transcribed from the demo mockup so every printed/downloaded
// receipt matches it pixel for pixel, just with real data filled in.
export function buildFullReceiptHtml(data: ReceiptPrintData, company: CompanyDetails): string {
  const { currencyCode } = data;

  const rows = data.items.map(item => `
        <tr>
          <td><strong>${escapeHtml(item.description)}</strong>${item.subtitle ? `<br><span style="color:#888;font-size:12px;">${escapeHtml(item.subtitle)}</span>` : ""}</td>
          <td>${escapeHtml(item.type)}</td>
          <td class="amount-cell" style="text-align: right;">${currencyCode} ${item.amount.toFixed(2)}</td>
        </tr>`).join("");

  const statusClass = data.status.toLowerCase() === "paid" ? "" : " style=\"background:#fef3c7;color:#92400e;\"";

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
        /* Screen sizing above matches the approved mockup exactly. Print keeps
           the same colors/typography/structure but tightens the vertical
           rhythm so one receipt reliably fits a single A4 page instead of
           spilling a mostly-blank second page. The page's own outer margin
           comes from @page below — the container adds no padding of its own
           in print, so there's only one place controlling the page edge. */
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
          amount: `${currencyCode} ${data.invoiceAmount.toFixed(2)}`,
          status: data.status,
        })}</div>
        <div class="receipt-title">Tax Invoice &#1601;&#1575;&#1578;&#1608;&#1585;&#1577; &#1590;&#1585;&#1610;&#1576;&#1610;&#1577;</div>
        <div class="receipt-info">
            <div class="info-block">
              <div class="info-label">Receipt Number</div>
              <div class="receipt-number">${escapeHtml(data.receiptNo)}</div>
              ${data.invoiceNo ? `<div class="invoice-number">Invoice: ${escapeHtml(data.invoiceNo)}</div>` : ""}
            </div>
            <div class="info-block"><div class="info-label">Date Issued</div><div class="info-value">${escapeHtml(data.dateStr)}</div></div>
            <div class="info-block"><div class="info-label">Status</div><div><span class="status-badge"${statusClass}>${escapeHtml(data.status)}</span></div></div>
        </div>
        <div class="customer-section">
            <div class="section-title">Bill To</div>
            <div class="customer-name">${escapeHtml(data.billTo.name)}</div>
            ${data.billTo.memberId ? `<div class="customer-detail"><strong>Member ID:</strong> ${escapeHtml(data.billTo.memberId)}</div>` : ""}
            ${data.billTo.email ? `<div class="customer-detail"><strong>Email:</strong> ${escapeHtml(data.billTo.email)}</div>` : ""}
            ${data.billTo.phone ? `<div class="customer-detail"><strong>Phone:</strong> ${escapeHtml(data.billTo.phone)}</div>` : ""}
        </div>
        <table class="items-table">
            <thead><tr><th>Description</th><th>Type</th><th style="text-align: right;">Amount (Incl. VAT)</th></tr></thead>
            <tbody>${rows}
            </tbody>
        </table>
        <div class="totals-section">
            <div class="total-row normal"><span>Subtotal (Excl. VAT):</span><span>${currencyCode} ${data.subtotalExclVat.toFixed(2)}</span></div>
            ${data.discount ? `<div class="total-row discount"><span>Discount:</span><span>- ${currencyCode} ${data.discount.toFixed(2)}</span></div>` : ""}
            <div class="total-row vat"><span>VAT (${data.vatRatePercent}%):</span><span>${currencyCode} ${data.vatAmount.toFixed(2)}</span></div>
            <div class="total-row grand-total"><span>Invoice Amount:</span><span>${currencyCode} ${data.invoiceAmount.toFixed(2)}</span></div>
            <div class="total-row normal" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;"><span>TOTAL PAID:</span><span>${currencyCode} ${data.totalPaid.toFixed(2)}</span></div>
            ${data.balanceDue ? `<div class="total-row discount"><span>BALANCE DUE:</span><span>${currencyCode} ${data.balanceDue.toFixed(2)}</span></div>` : ""}
            ${data.validity ? `<br><span style="color: #327F74; font-size: 12px; font-weight: 600;">Subscription validity: from ${escapeHtml(data.validity.from)} To: ${escapeHtml(data.validity.to)}</span>` : ""}
        </div>
        <div class="payment-info">
            <div class="payment-method"><span class="payment-label">Payment Method:</span><span>${escapeHtml(data.paymentMethod)}</span></div>
            <div class="payment-method" style="margin-top: 8px;"><span class="payment-label">Transaction Date:</span><span>${escapeHtml(data.transactionDate)}</span></div>
            ${data.processedBy ? `<div class="payment-method" style="margin-top: 8px;"><span class="payment-label">Processed By:</span><span>${escapeHtml(data.processedBy)}</span></div>` : ""}
            ${data.transactionRef ? `<div class="payment-method" style="margin-top: 8px;"><span class="payment-label">Transaction Ref:</span><span>${escapeHtml(data.transactionRef)}</span></div>` : ""}
        </div>
        <div class="footer">
            <div class="thank-you">Thank you for your business!</div>
            <div class="footer-note">This is an official receipt issued by ${escapeHtml(company.name)}. Please retain this receipt for your records.<br>For any queries regarding this transaction, please contact our billing department.</div>
            <div class="contact-info">${buildCompanyFooterHtml(company)}</div>
        </div>
        <div class="print-info">Receipt generated on ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })} at ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}<br>This is a computer-generated receipt and is valid without signature.</div>
    </div>
    <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;
}

// Builds the same branded tax-invoice HTML used by Billing's SOA/receipts list,
// extracted so any page that resolves a real Receipt (via receiptsService) can
// open/print the identical document instead of re-implementing the template.
// vatRatePercent defaults to the standard UAE rate but should be the actual
// configured rate (see getVatRate()) so the printed breakdown always matches
// what FinancialEventService posted to the ledger for this same payment.
export function buildReceiptInvoiceHtml(receipt: Receipt, currencyCode: string, company: CompanyDetails, vatRatePercent: number = DEFAULT_VAT_RATE): string {
  const totalAmt   = Number(receipt.amount);
  const paidAmt    = Number(receipt.paid_amount ?? totalAmt);
  const balanceDue = Number(receipt.due_amount ?? 0);
  const { net: subtotalExclVat, vat: vatAmount } = splitVatInclusive(totalAmt, vatRatePercent);
  const dateStr    = receipt.transaction_date
    ? new Date(receipt.transaction_date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
    : "-";

  const data: ReceiptPrintData = {
    receiptNo: receipt.receipt_no,
    invoiceNo: receipt.invoice_no,
    dateStr,
    status: receipt.status,
    billTo: {
      name: receipt.member_name,
      memberId: receipt.member_id,
      phone: receipt.member_phone,
    },
    items: [{
      description: receipt.plan_name ?? receipt.transaction_type,
      subtitle: `Transaction Type: ${receipt.transaction_type}`,
      type: receipt.transaction_type,
      amount: totalAmt,
    }],
    currencyCode,
    subtotalExclVat,
    vatRatePercent,
    vatAmount,
    invoiceAmount: totalAmt,
    totalPaid: paidAmt,
    balanceDue: balanceDue > 0 ? balanceDue : undefined,
    paymentMethod: receipt.payment_method ?? "-",
    transactionDate: dateStr,
    processedBy: receipt.processed_by,
    validity: receipt.valid_from ? {
      from: new Date(receipt.valid_from).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      to: receipt.valid_till ? new Date(receipt.valid_till).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-",
    } : undefined,
  };

  return buildFullReceiptHtml(data, company);
}

// Guards against a stray double-click (or a duplicate event firing before the
// first popup finishes opening) triggering two print windows/dialogs at once.
let printInFlight = false;

// Opens the print window synchronously (required by popup blockers, which only
// allow window.open within the click handler's own call stack), then fills it
// in once the company branding has loaded.
export async function downloadReceiptInvoice(receipt: Receipt, currencyCode: string) {
  if (printInFlight) return;
  printInFlight = true;
  try {
    const win = window.open("", "_blank", "width=820,height=900");
    const [company, vatRate] = await Promise.all([getCompanyDetails(), getVatRate()]);
    const html = buildReceiptInvoiceHtml(receipt, currencyCode, company, vatRate);
    if (win) { win.document.write(html); win.document.close(); }
  } finally {
    printInFlight = false;
  }
}
