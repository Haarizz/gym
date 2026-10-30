import type { Receipt } from './supabase/receipts-service';
import { getCompanyDetails, buildCompanyHeaderHtml, buildCompanyFooterHtml, buildQrCodeSvg, buildReceiptQrPayload, COMPANY_HEADER_CSS, type CompanyDetails } from './company-details';
import { getVatRate, splitVatInclusive, DEFAULT_VAT_RATE } from './tax';
import { getReceiptColors, receiptColorsCss, DEFAULT_RECEIPT_COLORS, type ReceiptColors } from './receipt-colors';
import { printHtml } from './print-html';

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

const fmtMoney = (currencyCode: string, n: number) =>
  `${currencyCode} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * The payment Receipt (Web App Design › Receipt Voucher), separate from the Tax Invoice:
 * a brand-coloured header band with the gym's details and the verification QR, a meta
 * strip, a "Received from" panel, the items, and payment details beside the totals.
 * Colours come from the branch's receipt settings.
 */
export function buildPaymentReceiptHtml(data: ReceiptPrintData, company: CompanyDetails, colors: ReceiptColors = DEFAULT_RECEIPT_COLORS): string {
  const { currencyCode } = data;
  const money = (n: number) => fmtMoney(currencyCode, n);
  const paid = data.status.toLowerCase() === "paid";
  const statusTone = paid ? "paid" : data.status.toLowerCase() === "rejected" ? "rejected" : "due";
  const qr = buildQrCodeSvg(buildReceiptQrPayload(company, data.receiptNo, {
    date: data.dateStr, billTo: data.billTo.name, amount: money(data.invoiceAmount), status: data.status,
  }));
  const contact = [company.phone, company.email].filter(Boolean).map(v => escapeHtml(v)).join(" · ");
  const rows = data.items.map(item => `
      <tr>
        <td><div class="item">${escapeHtml(item.description)}</div>${item.subtitle ? `<div class="sub">${escapeHtml(item.subtitle)}</div>` : ""}</td>
        <td><span class="type">${escapeHtml(item.type)}</span></td>
        <td class="num">${money(item.amount)}</td>
      </tr>`).join("");
  const payRow = (label: string, value?: string) => value ? `<div class="pay-row"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Receipt - ${escapeHtml(data.receiptNo)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&family=Noto+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
<style>${modernReceiptCss(colors)}</style>
</head>
<body>
<main class="doc">
  <header>
    <div class="brand">
      ${company.logo ? `<div class="logo"><img src="${company.logo}" alt="${escapeHtml(company.name)} logo"></div>` : ""}
      <div>
        <div class="company">${escapeHtml(company.name)}</div>
        <div class="company-lines">
          ${company.address ? `${escapeHtml(company.address)}<br>` : ""}${contact ? `${contact}<br>` : ""}${company.trn ? `TRN: ${escapeHtml(company.trn)}` : ""}
        </div>
      </div>
    </div>
    <div class="doc-type">
      <div>
        <div class="eyebrow">Payment received</div>
        <div class="doc-title">Receipt</div>
        <div class="doc-ar">&#1573;&#1610;&#1589;&#1575;&#1604; &#1575;&#1587;&#1578;&#1604;&#1575;&#1605;</div>
        ${data.invoiceNo ? `<div class="ref">Invoice · <strong>${escapeHtml(data.invoiceNo)}</strong></div>` : ""}
      </div>
      <div class="qr">${qr}<div>SCAN TO VERIFY</div></div>
    </div>
  </header>

  <section class="meta">
    <div><div class="label">Receipt No.</div><div class="value accent">${escapeHtml(data.receiptNo)}</div></div>
    <div><div class="label">Date Issued</div><div class="value">${escapeHtml(data.dateStr)}</div></div>
    <div><div class="label">Status</div><span class="pill ${statusTone}">${escapeHtml(data.status)}</span></div>
    <div><div class="label">Amount</div><div class="value">${money(data.invoiceAmount)}</div></div>
  </section>

  <section class="content">
    <div class="party">
      <div>
        <div class="label accent">Received From</div>
        <h2>${escapeHtml(data.billTo.name)}</h2>
        ${data.billTo.memberId ? `<p>Member ID: ${escapeHtml(data.billTo.memberId)}</p>` : ""}
        ${[data.billTo.phone, data.billTo.email].filter(Boolean).length ? `<p>${[data.billTo.phone, data.billTo.email].filter(Boolean).map(v => escapeHtml(v as string)).join(" · ")}</p>` : ""}
      </div>
      ${data.validity ? `<div class="validity">Subscription validity<strong>${escapeHtml(data.validity.from)} → ${escapeHtml(data.validity.to)}</strong></div>` : ""}
    </div>

    <table>
      <thead><tr><th>Description</th><th>Type</th><th>Amount (Incl. VAT)</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="bottom">
      <div class="pay">
        <div class="label">Payment Details</div>
        ${payRow("Payment method", data.paymentMethod)}
        ${payRow("Transaction date", data.transactionDate)}
        ${payRow("Processed by", data.processedBy)}
        ${payRow("Transaction ref", data.transactionRef)}
      </div>
      <div class="summary">
        <div class="row"><span>Subtotal (excl. VAT)</span><strong>${money(data.subtotalExclVat)}</strong></div>
        ${data.discount ? `<div class="row discount"><span>Discount</span><span>- ${money(data.discount)}</span></div>` : ""}
        <div class="row"><span>VAT (${data.vatRatePercent}%)</span><strong>${money(data.vatAmount)}</strong></div>
        <div class="row total"><span>Invoice amount</span><span>${money(data.invoiceAmount)}</span></div>
        <div class="row paid"><span>Total paid</span><span>${money(data.totalPaid)}</span></div>
        ${data.balanceDue ? `<div class="row balance"><span>Balance due</span><span>${money(data.balanceDue)}</span></div>` : ""}
      </div>
    </div>

    <div class="thanks">
      <h3>Thank you for your business!</h3>
      <p>This is an official receipt issued by ${escapeHtml(company.name)}. Please keep it for your records.<br>Computer-generated — valid without a signature.</p>
    </div>
  </section>

  <footer>
    ${buildCompanyFooterHtml(company)}<br>
    Generated ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })} at ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
  </footer>
</main>
</body>
</html>`;
}

/** The Receipt's stylesheet, shared by the payment receipt and the customer credit receipt. */
function modernReceiptCss(colors: ReceiptColors): string {
  return `
  ${receiptColorsCss(colors)}
  :root { --rc-dark: color-mix(in srgb, var(--rc-primary) 70%, #000); --ink: #182522; --muted: #6b7d78; --line: #e5ecea; }
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Plus Jakarta Sans Variable', 'Noto Sans', 'Noto Sans Arabic', sans-serif; background: #eef3f2; color: var(--ink); padding: 24px; }
  .doc { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden;
    box-shadow: 0 20px 60px rgba(15, 40, 36, .12); display: flex; flex-direction: column; font-variant-numeric: tabular-nums lining-nums; }
  header { display: flex; justify-content: space-between; gap: 24px; padding: 28px 32px; color: #fff;
    background: linear-gradient(135deg, var(--rc-primary), var(--rc-dark)); }
  .brand { display: flex; gap: 14px; align-items: flex-start; min-width: 0; }
  .logo { flex-shrink: 0; background: #fff; border-radius: 10px; padding: 6px 8px; display: flex; align-items: center; }
  .logo img { max-height: 40px; max-width: 120px; object-fit: contain; display: block; }
  .company { font-size: 24px; font-weight: 800; letter-spacing: -.01em; line-height: 1.15; }
  .company-lines { margin-top: 6px; font-size: 11px; line-height: 1.6; color: rgba(255,255,255,.78); }
  .doc-type { display: flex; gap: 16px; align-items: flex-start; text-align: right; flex-shrink: 0; }
  .eyebrow { font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.72); }
  .doc-title { font-size: 26px; font-weight: 800; margin-top: 2px; }
  .doc-ar { font-size: 13px; color: rgba(255,255,255,.85); margin-top: 1px; }
  .ref { display: inline-block; margin-top: 10px; padding: 6px 10px; border: 1px solid rgba(255,255,255,.35); border-radius: 8px; font-size: 11px; }
  .qr { background: #fff; border-radius: 10px; padding: 6px; width: 92px; text-align: center; color: var(--rc-primary); }
  .qr svg { width: 78px; height: 78px; display: block; margin: 0 auto; }
  .qr div { font-size: 7px; font-weight: 700; letter-spacing: .06em; margin-top: 2px; }
  .meta { display: grid; grid-template-columns: repeat(4, 1fr); border-bottom: 1px solid var(--line); }
  .meta > div { padding: 16px 20px; border-right: 1px solid var(--line); }
  .meta > div:last-child { border-right: 0; }
  .label { font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); margin-bottom: 5px; }
  .value { font-size: 14px; font-weight: 700; }
  .accent { color: var(--rc-primary); }
  .pill { display: inline-block; padding: 3px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; }
  .pill.paid { background: #dcfce7; color: #166534; }
  .pill.due { background: #fef3c7; color: #92400e; }
  .pill.rejected { background: #fee2e2; color: #991b1b; }
  .content { padding: 26px 32px 28px; flex: 1; display: flex; flex-direction: column; }
  .party { display: flex; justify-content: space-between; gap: 20px; padding: 16px 18px; border-radius: 10px;
    background: var(--rc-panel); border-left: 4px solid var(--rc-primary); margin-bottom: 22px; }
  .party h2 { font-size: 17px; font-weight: 700; margin: 2px 0 4px; }
  .party p { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .validity { text-align: right; font-size: 12px; color: var(--muted); }
  .validity strong { display: block; color: var(--rc-primary); font-size: 13px; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 22px; }
  th { background: var(--rc-primary); color: #fff; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; text-align: left; padding: 11px 14px; }
  th:first-child { border-top-left-radius: 8px; } th:last-child { border-top-right-radius: 8px; text-align: right; }
  td { padding: 14px; border-bottom: 1px solid var(--line); font-size: 13px; vertical-align: top; }
  td.num { text-align: right; font-weight: 700; color: var(--rc-primary); white-space: nowrap; }
  .item { font-weight: 700; } .sub { font-size: 11px; color: var(--muted); margin-top: 3px; }
  .type { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 999px; background: var(--rc-panel); color: var(--muted); }
  .bottom { display: grid; grid-template-columns: 1fr 340px; gap: 20px; align-items: start; }
  .pay { padding: 16px 18px; border-radius: 10px; background: var(--rc-highlight); border-left: 4px solid var(--rc-highlight-border); }
  .pay .label { color: #78350f; }
  .pay-row { display: flex; justify-content: space-between; gap: 12px; font-size: 12.5px; padding: 4px 0; color: #4b3a12; }
  .pay-row strong { color: var(--ink); text-align: right; }
  .summary { padding: 16px 18px; border-radius: 10px; background: var(--rc-panel); }
  .row { display: flex; justify-content: space-between; gap: 16px; font-size: 13px; padding: 5px 0; color: var(--muted); }
  .row strong { color: var(--ink); }
  .row.discount span:last-child { color: #dc2626; font-weight: 600; }
  .row.total { margin-top: 8px; padding-top: 10px; border-top: 2px solid var(--rc-primary); font-size: 15px; font-weight: 800; color: var(--ink); }
  .row.paid { font-size: 18px; font-weight: 800; color: var(--rc-primary); padding-top: 8px; }
  .row.balance { font-weight: 700; color: #b91c1c; }
  .thanks { margin-top: auto; padding-top: 24px; text-align: center; }
  .thanks h3 { font-size: 16px; color: var(--rc-primary); font-weight: 800; }
  .thanks p { font-size: 11px; color: var(--muted); margin-top: 6px; line-height: 1.6; }
  footer { padding: 14px 32px; border-top: 1px solid var(--line); background: #f7faf9; font-size: 10px; color: var(--muted); text-align: center; line-height: 1.6; }
  @media print {
    body { padding: 10mm; background: #fff; }
    .doc { width: auto; min-height: auto; border-radius: 0; box-shadow: none; }
    header { padding: 18px 22px; } .company { font-size: 20px; } .doc-title { font-size: 22px; }
    .meta > div { padding: 10px 14px; } .content { padding: 16px 22px 18px; }
    .party { margin-bottom: 14px; padding: 12px 14px; } table { margin-bottom: 14px; } td { padding: 9px 12px; } th { padding: 8px 12px; }
    .thanks { padding-top: 14px; } footer { padding: 10px 22px; }
    /* No page margin, so the browser has no room for its own date/title/URL header and footer. */
    @page { size: A4; margin: 0; }
  }
`;
}

/** What a Customer Credit Receipt shows (Billing › Customer Credits). */
export interface CreditReceiptData {
  creditNo: string;
  date: string | null;
  memberName: string;
  memberId?: string;
  memberPhone?: string | null;
  memberEmail?: string | null;
  creditType: string;
  remarks?: string | null;
  amount: number;
  used: number;
  balance: number;
  status: string;
  processedBy?: string | null;
}

/** A credit held on a member's wallet, in the Modern receipt's look. */
export function buildCreditReceiptHtml(data: CreditReceiptData, currencyCode: string, company: CompanyDetails, colors: ReceiptColors = DEFAULT_RECEIPT_COLORS): string {
  const money = (n: number) => fmtMoney(currencyCode, n);
  const dateStr = data.date ? new Date(data.date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "-";
  const contact = [company.phone, company.email].filter(Boolean).map(v => escapeHtml(v)).join(" · ");
  const qr = buildQrCodeSvg([`${company.name} - Customer Credit`, `Credit No: ${data.creditNo}`, `Member: ${data.memberName}`,
    `Issued: ${money(data.amount)}`, `Balance: ${money(data.balance)}`].join("\n"));
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Customer Credit - ${escapeHtml(data.creditNo)}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&family=Noto+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
<style>${modernReceiptCss(colors)}</style></head>
<body><main class="doc">
  <header>
    <div class="brand">
      ${company.logo ? `<div class="logo"><img src="${company.logo}" alt="${escapeHtml(company.name)} logo"></div>` : ""}
      <div><div class="company">${escapeHtml(company.name)}</div>
        <div class="company-lines">${company.address ? `${escapeHtml(company.address)}<br>` : ""}${contact ? `${contact}<br>` : ""}${company.trn ? `TRN: ${escapeHtml(company.trn)}` : ""}</div></div>
    </div>
    <div class="doc-type">
      <div><div class="eyebrow">Wallet credit</div><div class="doc-title">Credit Receipt</div>
        <div class="ref"><strong>${escapeHtml(data.creditType)}</strong></div></div>
      <div class="qr">${qr}<div>SCAN TO VERIFY</div></div>
    </div>
  </header>
  <section class="meta">
    <div><div class="label">Credit No.</div><div class="value accent">${escapeHtml(data.creditNo)}</div></div>
    <div><div class="label">Date Issued</div><div class="value">${escapeHtml(dateStr)}</div></div>
    <div><div class="label">Status</div><span class="pill ${data.balance > 0 ? "paid" : "due"}">${escapeHtml(data.status)}</span></div>
    <div><div class="label">Available</div><div class="value">${money(data.balance)}</div></div>
  </section>
  <section class="content">
    <div class="party"><div>
      <div class="label accent">Credit Issued To</div>
      <h2>${escapeHtml(data.memberName)}</h2>
      ${data.memberId ? `<p>Member ID: ${escapeHtml(data.memberId)}</p>` : ""}
      ${[data.memberPhone, data.memberEmail].filter(Boolean).length ? `<p>${[data.memberPhone, data.memberEmail].filter(Boolean).map(v => escapeHtml(v as string)).join(" · ")}</p>` : ""}
    </div></div>
    <table><thead><tr><th>Credit</th><th>Type</th><th>Amount</th></tr></thead>
      <tbody><tr><td><div class="item">${escapeHtml(data.creditType)}</div>${data.remarks ? `<div class="sub">${escapeHtml(data.remarks)}</div>` : ""}</td>
        <td><span class="type">Wallet credit</span></td><td class="num">${money(data.amount)}</td></tr></tbody></table>
    <div class="bottom">
      <div class="pay"><div class="label">Details</div>
        <div class="pay-row"><span>Issued on</span><strong>${escapeHtml(dateStr)}</strong></div>
        ${data.processedBy ? `<div class="pay-row"><span>Processed by</span><strong>${escapeHtml(data.processedBy)}</strong></div>` : ""}
        <div class="pay-row"><span>Expiry</span><strong>No expiry</strong></div>
      </div>
      <div class="summary">
        <div class="row"><span>Credit issued</span><strong>${money(data.amount)}</strong></div>
        <div class="row discount"><span>Used so far</span><span>- ${money(data.used)}</span></div>
        <div class="row paid"><span>Available balance</span><span>${money(data.balance)}</span></div>
      </div>
    </div>
    <div class="thanks"><h3>Your credit is ready to use</h3>
      <p>It is held on your member wallet and can be used at checkout. Credits are not transferable.<br>Computer-generated — valid without a signature.</p></div>
  </section>
  <footer>${buildCompanyFooterHtml(company)}<br>Generated ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</footer>
</main></body></html>`;
}

/** Prints a customer credit receipt for the active branch (same mechanism as member receipts). */
export async function printCreditReceipt(data: CreditReceiptData, currencyCode: string) {
  if (printInFlight) return;
  printInFlight = true;
  try {
    const [company, colors] = await Promise.all([getCompanyDetails(), getReceiptColors()]);
    printHtml(buildCreditReceiptHtml(data, currencyCode, company, colors));
  } finally {
    printInFlight = false;
  }
}

// The Tax Invoice — structure, class names and CSS values transcribed from the first
// approved mockup, with real data filled in. The payment Receipt is a separate document
// (buildPaymentReceiptHtml).
export function buildFullReceiptHtml(data: ReceiptPrintData, company: CompanyDetails, colors: ReceiptColors = DEFAULT_RECEIPT_COLORS): string {
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
        ${receiptColorsCss(colors)}
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans Variable', 'Noto Sans', 'Noto Sans Arabic', sans-serif; padding: 20px; background: #f5f5f5; }
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
        .receipt-info { display: flex; justify-content: space-between; margin-bottom: 30px; padding: 20px; background: var(--rc-panel, #f9fafb); border-radius: 6px; }
        .info-block { flex: 1; }
        .info-label { color: #888; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; font-weight: 600; }
        .info-value { color: #333; font-size: 14px; font-weight: 600; }
        .receipt-number { color: var(--rc-primary, #327F74); font-size: 18px; font-weight: bold; }
        .invoice-number { color: #888; font-size: 11px; margin-top: 3px; }
        .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #dcfce7; color: #166534; }
        .customer-section { margin-bottom: 30px; padding: 20px; background: var(--rc-panel, #f9fafb); border-left: 4px solid var(--rc-primary, #327F74); border-radius: 6px; }
        .section-title { color: var(--rc-primary, #327F74); font-size: 14px; font-weight: 700; text-transform: uppercase; margin-bottom: 15px; letter-spacing: 0.5px; }
        .customer-name { font-size: 18px; font-weight: 600; color: #333; margin-bottom: 5px; }
        .customer-detail { color: #666; font-size: 14px; margin-bottom: 3px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
        .items-table thead { background: var(--rc-primary, #327F74); color: white; }
        .items-table th { padding: 15px; text-align: left; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
        .items-table td { padding: 15px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #333; }
        .items-table tbody tr:hover { background: var(--rc-panel, #f9fafb); }
        .amount-cell { font-weight: 600; color: var(--rc-primary, #327F74); }
        .totals-section { margin-top: 30px; padding: 20px; background: var(--rc-panel, #f9fafb); border-radius: 6px; }
        .total-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; }
        .total-row.normal { color: #666; }
        .total-row.discount { color: #E63946; font-weight: 600; }
        .total-row.gross { color: #333; font-weight: 600; padding-top: 10px; border-top: 1px solid #e5e7eb; }
        .total-row.vat { color: #666; }
        .total-row.grand-total { font-size: 20px; font-weight: bold; color: var(--rc-primary, #327F74); padding-top: 15px; margin-top: 10px; border-top: 2px solid var(--rc-primary, #327F74); }
        .payment-info { margin: 30px 0; padding: 20px; background: var(--rc-highlight, #fef3c7); border-left: 4px solid var(--rc-highlight-border, #f59e0b); border-radius: 6px; }
        .payment-method { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #333; }
        .payment-label { font-weight: 600; color: #78350f; }
        .footer { margin-top: 40px; padding-top: 30px; border-top: 2px solid #e5e7eb; text-align: center; }
        .thank-you { font-size: 18px; color: var(--rc-primary, #327F74); font-weight: 600; margin-bottom: 15px; }
        .footer-note { color: #888; font-size: 12px; line-height: 1.6; margin-bottom: 10px; }
        .contact-info { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #666; font-size: 12px; }
        .print-info { margin-top: 30px; padding: 15px; background: #f3f4f6; border-radius: 6px; font-size: 11px; color: #666; text-align: center; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        /* Screen sizing above matches the approved mockup exactly. Print keeps
           the same colors/typography/structure but tightens the vertical
           rhythm so one receipt reliably fits a single A4 page instead of
           spilling a mostly-blank second page. The page edge is the body padding: @page has no margin, so the browser
           has no room to print its own date/title/URL header and footer. */
        @media print {
            body { padding: 12mm 14mm; background: white; }
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
                margin: 0; /* no room for the browser header/footer */
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
            ${data.validity ? `<br><span style="color: var(--rc-primary, #327F74); font-size: 12px; font-weight: 600;">Subscription validity: from ${escapeHtml(data.validity.from)} To: ${escapeHtml(data.validity.to)}</span>` : ""}
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
</body>
</html>`;
}

// Builds the same branded tax-invoice HTML used by Billing's SOA/receipts list,
// extracted so any page that resolves a real Receipt (via receiptsService) can
// open/print the identical document instead of re-implementing the template.
// vatRatePercent defaults to the standard UAE rate but should be the actual
// configured rate (see getVatRate()) so the printed breakdown always matches
// what FinancialEventService posted to the ledger for this same payment.
function toPrintData(receipt: Receipt, currencyCode: string, vatRatePercent: number): ReceiptPrintData {
  const totalAmt   = Number(receipt.amount);
  const paidAmt    = Number(receipt.paid_amount ?? totalAmt);
  const balanceDue = Number(receipt.due_amount ?? 0);
  const { net: subtotalExclVat, vat: vatAmount } = splitVatInclusive(totalAmt, vatRatePercent);
  const dateStr    = receipt.transaction_date
    ? new Date(receipt.transaction_date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
    : "-";

  // A mobile Cash/Credit/Mixed purchase still awaiting reception approval must
  // never print as "Paid" — that's the exact document a member could point to
  // as proof of payment before staff have actually confirmed it was received.
  const displayStatus = receipt.approval_status === "PENDING" ? "Request"
    : receipt.approval_status === "REJECTED" ? "Rejected"
    : receipt.status;

  return {
    receiptNo: receipt.receipt_no,
    invoiceNo: receipt.invoice_no,
    dateStr,
    status: displayStatus,
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
}

/** The Tax Invoice for a saved receipt. */
export function buildReceiptInvoiceHtml(receipt: Receipt, currencyCode: string, company: CompanyDetails, vatRatePercent: number = DEFAULT_VAT_RATE, colors: ReceiptColors = DEFAULT_RECEIPT_COLORS): string {
  return buildFullReceiptHtml(toPrintData(receipt, currencyCode, vatRatePercent), company, colors);
}

/** The payment Receipt for a saved receipt. */
export function buildPaymentReceiptFromReceipt(receipt: Receipt, currencyCode: string, company: CompanyDetails, vatRatePercent: number = DEFAULT_VAT_RATE, colors: ReceiptColors = DEFAULT_RECEIPT_COLORS): string {
  return buildPaymentReceiptHtml(toPrintData(receipt, currencyCode, vatRatePercent), company, colors);
}

// Guards against a stray double-click (or a duplicate event firing before the
// first popup finishes opening) triggering two print windows/dialogs at once.
let printInFlight = false;

// Prints through a hidden iframe once the company branding has loaded, so only
// the browser's print dialog appears — no extra tab/window.
async function printSavedReceipt(receipt: Receipt, currencyCode: string, build: typeof buildReceiptInvoiceHtml) {
  if (printInFlight) return;
  printInFlight = true;
  try {
    const [company, vatRate, colors] = await Promise.all([getCompanyDetails(), getVatRate(), getReceiptColors()]);
    printHtml(build(receipt, currencyCode, company, vatRate, colors));
  } finally {
    printInFlight = false;
  }
}

/** Prints the Tax Invoice (original layout). */
export function downloadReceiptInvoice(receipt: Receipt, currencyCode: string) {
  return printSavedReceipt(receipt, currencyCode, buildReceiptInvoiceHtml);
}

/** Prints the payment Receipt (new layout). */
export function downloadPaymentReceipt(receipt: Receipt, currencyCode: string) {
  return printSavedReceipt(receipt, currencyCode, buildPaymentReceiptFromReceipt);
}

// A Receipt Voucher is a Financials/ledger document (source + category +
// notes, no VAT/member-billing framing), so it doesn't fit ReceiptPrintData —
// but it must still print through the same isolated-document (iframe) mechanism as a
// member receipt, not the old hidden-DOM-node + window.print() approach that
// paginated on the whole page's (invisible) layout height instead of just the
// voucher's own content and produced several mostly-blank pages.
export interface ReceiptVoucherPrintData {
  voucherNo: string;
  dateStr: string;
  status: string;
  branch: string;
  memberName: string;
  memberId?: string;
  paymentMode: string;
  reference?: string;
  currencyCode: string;
  amount: number;
  source: string;
  sourceCategory: string;
  transactionId?: string;
  notes?: string;
  createdAtStr?: string;
}

export function buildReceiptVoucherHtml(data: ReceiptVoucherPrintData, company: CompanyDetails): string {
  const statusClass = data.status.toLowerCase() === "completed" ? "" : " style=\"background:#fef3c7;color:#92400e;\"";

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt Voucher - ${escapeHtml(data.voucherNo)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&family=Noto+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans Variable', 'Noto Sans', 'Noto Sans Arabic', sans-serif; padding: 20px; background: #f5f5f5; }
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
        .totals-section { margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 6px; }
        .total-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; }
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
            body { padding: 12mm 14mm; background: white; }
            .receipt-container { box-shadow: none; width: auto; min-height: auto; margin: 0; border-radius: 0; padding: 0; }
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
            @page { size: A4; margin: 0; } /* no room for the browser header/footer */
        }
    </style>
</head>
<body>
    <div class="receipt-container invoice">
        <div class="header">${buildCompanyHeaderHtml(company, data.voucherNo, {
          date: data.dateStr,
          billTo: data.memberName,
          amount: `${data.currencyCode} ${data.amount.toFixed(2)}`,
          status: data.status,
        })}</div>
        <div class="receipt-title">Receipt Voucher</div>
        <div class="receipt-info">
            <div class="info-block">
              <div class="info-label">Voucher Number</div>
              <div class="receipt-number">${escapeHtml(data.voucherNo)}</div>
            </div>
            <div class="info-block"><div class="info-label">Date</div><div class="info-value">${escapeHtml(data.dateStr)}</div></div>
            <div class="info-block"><div class="info-label">Branch</div><div class="info-value">${escapeHtml(data.branch)}</div></div>
            <div class="info-block"><div class="info-label">Status</div><div><span class="status-badge"${statusClass}>${escapeHtml(data.status)}</span></div></div>
        </div>
        <div class="customer-section">
            <div class="section-title">Member</div>
            <div class="customer-name">${escapeHtml(data.memberName)}</div>
            ${data.memberId ? `<div class="customer-detail"><strong>Member ID:</strong> ${escapeHtml(data.memberId)}</div>` : ""}
        </div>
        <table class="items-table">
            <thead><tr><th>Source</th><th>Category</th><th>Transaction</th></tr></thead>
            <tbody>
              <tr>
                <td>${escapeHtml(data.source)}</td>
                <td>${escapeHtml(data.sourceCategory)}</td>
                <td>${escapeHtml(data.transactionId || "-")}</td>
              </tr>
            </tbody>
        </table>
        <div class="totals-section">
            <div class="total-row grand-total"><span>Amount:</span><span>${data.currencyCode} ${data.amount.toFixed(2)}</span></div>
        </div>
        <div class="payment-info">
            <div class="payment-method"><span class="payment-label">Payment Method:</span><span>${escapeHtml(data.paymentMode)}</span></div>
            ${data.reference ? `<div class="payment-method" style="margin-top: 8px;"><span class="payment-label">Reference:</span><span>${escapeHtml(data.reference)}</span></div>` : ""}
        </div>
        ${data.notes ? `<div class="customer-section" style="border-left-color:#94a3b8;"><div class="section-title" style="color:#64748b;">Notes</div><div class="customer-detail">${escapeHtml(data.notes)}</div></div>` : ""}
        <div class="footer">
            <div class="thank-you">Thank you for your business!</div>
            <div class="footer-note">This is an official receipt voucher issued by ${escapeHtml(company.name)}. Please retain this receipt for your records.</div>
            <div class="contact-info">${buildCompanyFooterHtml(company)}</div>
        </div>
        <div class="print-info">Voucher generated on ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })} at ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}${data.createdAtStr ? `<br>Created at: ${escapeHtml(data.createdAtStr)}` : ""}</div>
    </div>
</body>
</html>`;
}

let voucherPrintInFlight = false;

export async function downloadReceiptVoucher(data: ReceiptVoucherPrintData) {
  if (voucherPrintInFlight) return;
  voucherPrintInFlight = true;
  try {
    const company = await getCompanyDetails();
    printHtml(buildReceiptVoucherHtml(data, company));
  } finally {
    voucherPrintInFlight = false;
  }
}
