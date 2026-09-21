import { MobileReceiptDetail } from '@/domains/memberPortal/membership/domain/models';

function escapeHtml(value: string): string {
  if (!value) return '';
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildReceiptInvoiceHtml(receipt: MobileReceiptDetail, accentColor: string): string {
  const currencyCode = 'AED';
  const totalAmt = Number(receipt.amount) || 0;
  const paidAmt = Number(receipt.paidAmount ?? totalAmt);
  const balanceDue = Number(receipt.dueAmount ?? 0);
  
  const dateStr = receipt.transactionDate
    ? new Date(receipt.transactionDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
    : "-";

  const isPaid = receipt.status.toLowerCase() === 'paid';
  const displayStatus = isPaid ? "Paid" : receipt.status;
  const statusClass = isPaid ? "" : ' style="background:#fef3c7;color:#92400e;"';

  const items = [{
    description: receipt.planName || receipt.transactionType || 'Gym Services',
    subtitle: `Transaction Type: ${receipt.transactionType || '-'}`,
    type: receipt.transactionType || '-',
    amount: totalAmt,
  }];

  const rows = items.map(item => `
        <tr>
          <td><strong>${escapeHtml(item.description)}</strong>${item.subtitle ? `<br><span style="color:#888;font-size:12px;">${escapeHtml(item.subtitle)}</span>` : ""}</td>
          <td>${escapeHtml(item.type)}</td>
          <td class="amount-cell" style="text-align: right;">${currencyCode} ${item.amount.toFixed(2)}</td>
        </tr>`).join("");

  const COMPANY_HEADER_CSS = `
    .header{border-bottom:3px solid #327F74;padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:flex-start}
    .header-left{flex:1}
    .company-name{color:#327F74;font-size:32px;font-weight:bold;margin-bottom:5px}
    .company-details{color:#888;font-size:12px;line-height:1.6}
  `;

  const headerHtml = `
  <div class="header-left">
    <div class="company-name">GymBios</div>
    <div class="company-details">Dubai, United Arab Emirates</div>
  </div>`;

  const footerHtml = `
    <strong>GymBios</strong><br/>
    Dubai, United Arab Emirates
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt - ${escapeHtml(receipt.receiptNo)}</title>
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
            .company-name { font-size: 20px; margin-bottom: 2px; }
            .company-details { font-size: 9px; line-height: 1.3; }
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
        <div class="header">${headerHtml}</div>
        <div class="receipt-title">Tax Invoice &#1601;&#1575;&#1578;&#1608;&#1585;&#1577; &#1590;&#1585;&#1610;&#1576;&#1610;&#1577;</div>
        <div class="receipt-info">
            <div class="info-block">
              <div class="info-label">Receipt Number</div>
              <div class="receipt-number">${escapeHtml(receipt.receiptNo)}</div>
            </div>
            <div class="info-block"><div class="info-label">Date Issued</div><div class="info-value">${escapeHtml(dateStr)}</div></div>
            <div class="info-block"><div class="info-label">Status</div><div><span class="status-badge"${statusClass}>${escapeHtml(displayStatus)}</span></div></div>
        </div>
        <div class="customer-section">
            <div class="section-title">Bill To</div>
            <div class="customer-name">${escapeHtml(receipt.memberName || '-')}</div>
            ${receipt.memberId ? `<div class="customer-detail"><strong>Member ID:</strong> ${escapeHtml(receipt.memberId)}</div>` : ""}
            ${receipt.memberPhone ? `<div class="customer-detail"><strong>Phone:</strong> ${escapeHtml(receipt.memberPhone)}</div>` : ""}
        </div>
        <table class="items-table">
            <thead><tr><th>Description</th><th>Type</th><th style="text-align: right;">Amount (Incl. VAT)</th></tr></thead>
            <tbody>${rows}
            </tbody>
        </table>
        <div class="totals-section">
            <div class="total-row grand-total"><span>Invoice Amount:</span><span>${currencyCode} ${totalAmt.toFixed(2)}</span></div>
            <div class="total-row normal" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;"><span>TOTAL PAID:</span><span>${currencyCode} ${paidAmt.toFixed(2)}</span></div>
            ${balanceDue > 0 ? `<div class="total-row discount"><span>BALANCE DUE:</span><span>${currencyCode} ${balanceDue.toFixed(2)}</span></div>` : ""}
        </div>
        <div class="payment-info">
            <div class="payment-method"><span class="payment-label">Payment Method:</span><span>${escapeHtml(receipt.paymentMethod || '-')}</span></div>
            <div class="payment-method" style="margin-top: 8px;"><span class="payment-label">Transaction Date:</span><span>${escapeHtml(dateStr)}</span></div>
            ${receipt.processedBy ? `<div class="payment-method" style="margin-top: 8px;"><span class="payment-label">Processed By:</span><span>${escapeHtml(receipt.processedBy)}</span></div>` : ""}
        </div>
        <div class="footer">
            <div class="thank-you">Thank you for your business!</div>
            <div class="footer-note">This is an official receipt issued by GymBios. Please retain this receipt for your records.<br>For any queries regarding this transaction, please contact our billing department.</div>
            <div class="contact-info">${footerHtml}</div>
        </div>
    </div>
    <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;
}
