import type { Receipt } from './supabase/receipts-service';
import { getCompanyDetails, buildCompanyHeaderHtml, buildCompanyFooterHtml, COMPANY_HEADER_CSS, type CompanyDetails } from './company-details';
import { getVatRate, splitVatInclusive, DEFAULT_VAT_RATE } from './tax';

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

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Tax Invoice - ${receipt.receipt_no}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  @page{size:A4;margin:12mm}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;background:#fff;padding:28px}
  ${COMPANY_HEADER_CSS}
  hr.thick{border:none;border-top:2px solid #2B7A78;margin:10px 0}
  hr.thin{border:none;border-top:1px solid #e5e7eb;margin:12px 0}
  .title{text-align:center;font-size:17px;font-weight:700;margin:10px 0}
  .meta-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:12px 0}
  .meta-item .label{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#888}
  .meta-item .value{font-size:14px;font-weight:700;color:#2B7A78;margin-top:2px}
  .meta-item .value.black{color:#1a1a1a}
  .meta-item .status{color:#16a34a;font-weight:600}
  .bill-to{border-left:3px solid #2B7A78;padding-left:12px;margin:12px 0}
  .bill-to .section-label{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#2B7A78;margin-bottom:4px}
  .bill-to .name{font-size:15px;font-weight:700;margin-bottom:3px}
  .bill-to .detail{font-size:12px;color:#444;margin:1px 0}
  table{width:100%;border-collapse:collapse;margin:10px 0}
  thead tr{border-bottom:1px solid #e5e7eb}
  thead th{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#888;padding:5px 4px;text-align:left}
  thead th:last-child{text-align:right}
  tbody td{padding:7px 4px;font-size:12px;border-bottom:1px solid #f3f4f6;vertical-align:top}
  tbody td:last-child{text-align:right}
  tbody td small{color:#888;font-size:10px}
  .totals .row{display:flex;justify-content:space-between;padding:3px 0;font-size:13px}
  .totals .row.bold{font-weight:700}
  .totals .row.total-final{font-size:16px;font-weight:800;color:#2B7A78;padding-top:8px;border-top:2px solid #2B7A78;margin-top:4px}
  .totals .row.total-paid{padding-top:4px;font-size:12px;color:#444}
  .payment-box{border-left:3px solid #f4a30a;padding-left:12px;margin:10px 0}
  .payment-box .row{font-size:12px;margin:2px 0}
  .payment-box .row span{font-weight:700;color:#2B7A78;margin-left:4px}
  .thank-you{text-align:center;margin:14px 0 8px}
  .thank-you h3{font-size:14px;font-weight:700;color:#2B7A78}
  .thank-you p{font-size:11px;color:#666;margin-top:3px;line-height:1.4}
  .footer{border-top:1px solid #e5e7eb;padding-top:10px;text-align:center;font-size:11px;color:#888;line-height:1.5}
  .footer strong{color:#1a1a1a}
  @media print{body{padding:0}}
</style>
</head>
<body>
  <div class="header">${buildCompanyHeaderHtml(company, receipt.receipt_no)}</div>
  <hr class="thick"/>
  <div class="title">Tax Invoice &nbsp; &#1601;&#1575;&#1578;&#1608;&#1585;&#1577; &#1590;&#1585;&#1610;&#1576;&#1610;&#1577;</div>
  <div class="meta-grid">
    <div class="meta-item"><div class="label">Receipt Number</div><div class="value">${receipt.receipt_no}</div></div>
    <div class="meta-item"><div class="label">Date Issued</div><div class="value black">${dateStr}</div></div>
    <div class="meta-item"><div class="label">Status</div><div class="value"><span class="status">${receipt.status}</span></div></div>
  </div>
  <hr class="thin"/>
  <div class="bill-to">
    <div class="section-label">Bill To</div>
    <div class="name">${receipt.member_name}</div>
    <div class="detail"><strong>Member ID:</strong> ${receipt.member_id}</div>
    <div class="detail"><strong>Phone:</strong> ${receipt.member_phone ?? '-'}</div>
  </div>
  <hr class="thin"/>
  <table>
    <thead><tr><th>Description</th><th>Type</th><th style="text-align:right">Amount (Incl. VAT)</th></tr></thead>
    <tbody>
      <tr>
        <td><strong>${receipt.plan_name ?? receipt.transaction_type}</strong><br/><small>Transaction Type: ${receipt.transaction_type}</small></td>
        <td>${receipt.transaction_type}</td>
        <td style="text-align:right"><strong>${currencyCode} ${totalAmt.toFixed(2)}</strong></td>
      </tr>
    </tbody>
  </table>
  <hr class="thin"/>
  <div class="totals">
    <div class="row"><span>Subtotal (Excl. VAT):</span><span>${currencyCode} ${subtotalExclVat.toFixed(2)}</span></div>
    <div class="row bold" style="color:#c00"><span>Discount:</span><span>- ${currencyCode} 0.00</span></div>
    <div class="row"><span>VAT (${vatRatePercent}%):</span><span>${currencyCode} ${vatAmount.toFixed(2)}</span></div>
    <div class="row total-final"><span>Invoice Amount (Incl. VAT):</span><span>${currencyCode} ${totalAmt.toFixed(2)}</span></div>
    <div class="row total-paid"><span>PAID THIS TRANSACTION:</span><span>${currencyCode} ${paidAmt.toFixed(2)}</span></div>
    ${balanceDue > 0 ? `<div class="row total-paid" style="color:#c00"><span>BALANCE DUE:</span><span>${currencyCode} ${balanceDue.toFixed(2)}</span></div>` : ''}
  </div>
  <hr class="thin"/>
  <div class="payment-box">
    <div class="row">Payment Method: <span>${receipt.payment_method ?? '-'}</span></div>
    <div class="row">Transaction Date: <span>${dateStr}</span></div>
    ${receipt.processed_by ? `<div class="row">Processed By: <span>${receipt.processed_by}</span></div>` : ''}
    ${receipt.valid_from ? `<div class="row">Subscription validity: <span>from ${new Date(receipt.valid_from).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'})} To ${receipt.valid_till ? new Date(receipt.valid_till).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}) : '-'}</span></div>` : ''}
  </div>
  <div class="thank-you">
    <h3>Thank you for your business!</h3>
    <p>This is an official receipt issued by ${company.name}. Please retain this receipt for your records.<br/>For any queries regarding this transaction, please contact our billing department.</p>
  </div>
  <hr class="thin"/>
  <div class="footer">${buildCompanyFooterHtml(company)}</div>
  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;
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
