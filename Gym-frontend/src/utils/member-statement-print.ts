import type { MemberStatement } from "./supabase/billing-service";
import { getCompanyDetails } from "./company-details";
import { buildXlsx, downloadBlob, type XlsxCell } from "./xlsx-export";

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

const money = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (v?: string) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const docNo = (l: MemberStatement["lines"][number]) => (l.type === "Invoice" ? l.invoice_no || l.receipt_no : l.receipt_no);

const periodLabel = (from?: string, to?: string) =>
  from && to ? `${fmtDate(from)} to ${fmtDate(to)}` : from ? `From ${fmtDate(from)}` : to ? `Up to ${fmtDate(to)}` : "All transactions";

/**
 * Prints the Statement of Account through a hidden iframe, so the user only sees
 * the browser's print dialog (no extra window).
 */
export async function printMemberStatement(s: MemberStatement, currencyCode: string, from?: string, to?: string) {
  const company = await getCompanyDetails();

  const rows = s.lines.map((l, i) => `
    <tr class="${i % 2 ? "alt" : ""}">
      <td>${esc(fmtDate(l.date))}</td>
      <td class="mono">${esc(docNo(l))}</td>
      <td>${esc(l.type)}</td>
      <td>${esc(l.description)}${l.minor_charges?.length
        ? `<div class="sub">Incl. ${l.minor_charges.map((m) => `${esc(m.name)}: ${money(Number(m.amount))}`).join(", ")}</div>` : ""}</td>
      <td class="num">${l.debit > 0 ? money(l.debit) : ""}</td>
      <td class="num credit">${l.credit > 0 ? money(l.credit) : ""}</td>
      <td class="num bold ${l.balance > 0 ? "due" : ""}">${money(l.balance)}</td>
    </tr>`).join("");

  const contact = [company.phone && `Phone: ${esc(company.phone)}`, company.email && `Email: ${esc(company.email)}`].filter(Boolean).join(" &nbsp;|&nbsp; ");
  const printedOn = fmtDate(new Date().toISOString());

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Statement of Account - ${esc(s.member_name)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #1f2937; font-size: 12px; margin: 0; }
  .wrap { max-width: 780px; margin: 0 auto; padding: 8px; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #327F74; padding-bottom: 14px; }
  .logo { max-height: 46px; max-width: 200px; object-fit: contain; display: block; margin-bottom: 6px; }
  .company { color: #327F74; font-size: 22px; font-weight: 700; }
  .cdetails { color: #6b7280; font-size: 11px; line-height: 1.6; margin-top: 2px; }
  .title { text-align: right; }
  .title h1 { margin: 0; font-size: 20px; letter-spacing: .5px; color: #111827; }
  .title .meta { color: #6b7280; font-size: 11px; margin-top: 6px; line-height: 1.6; }
  .info { display: flex; justify-content: space-between; gap: 16px; margin: 16px 0; }
  .box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; flex: 1; }
  .box .label { font-size: 10px; text-transform: uppercase; letter-spacing: .6px; color: #6b7280; margin-bottom: 4px; }
  .box .value { font-size: 13px; font-weight: 600; }
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
  .sum { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 10px; }
  .sum .label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; }
  .sum .value { font-size: 14px; font-weight: 700; margin-top: 2px; }
  .sum.closing { background: #fef2f2; border-color: #fecaca; }
  .sum.closing.clear { background: #f0fdf4; border-color: #bbf7d0; }
  table { width: 100%; border-collapse: collapse; }
  thead th { background: #327F74; color: #fff; font-weight: 600; font-size: 11px; text-align: left; padding: 7px 8px; }
  thead th.num { text-align: right; }
  td { padding: 6px 8px; border-bottom: 1px solid #eef0f3; vertical-align: top; }
  tr.alt td { background: #fafafa; }
  .num { text-align: right; white-space: nowrap; }
  .mono { font-family: Consolas, monospace; font-size: 11px; }
  .credit { color: #047857; }
  .due { color: #b91c1c; }
  .bold { font-weight: 700; }
  .sub { color: #92400e; font-size: 10px; margin-top: 2px; }
  .opening td, tfoot td { font-weight: 700; background: #f1f5f9; }
  .empty { text-align: center; color: #6b7280; padding: 24px; }
  .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 10px; text-align: center; line-height: 1.6; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  @media print { .wrap { padding: 0; } }
</style></head>
<body><div class="wrap">
  <div class="top">
    <div>
      ${company.logo ? `<img class="logo" src="${company.logo}" alt="">` : ""}
      <div class="company">${esc(company.name)}</div>
      <div class="cdetails">${[company.address && esc(company.address), contact, company.trn && `TRN: ${esc(company.trn)}`].filter(Boolean).join("<br>")}</div>
    </div>
    <div class="title">
      <h1>STATEMENT OF ACCOUNT</h1>
      <div class="meta">Period: <b>${esc(periodLabel(from, to))}</b><br>Printed on: ${esc(printedOn)}<br>Currency: ${esc(currencyCode)}</div>
    </div>
  </div>

  <div class="info">
    <div class="box"><div class="label">Member</div><div class="value">${esc(s.member_name)}</div></div>
    <div class="box"><div class="label">Member ID</div><div class="value">${esc(s.member_id)}</div></div>
    <div class="box"><div class="label">Phone</div><div class="value">${esc(s.member_phone || "—")}</div></div>
  </div>

  <div class="summary">
    <div class="sum"><div class="label">Opening Balance</div><div class="value">${money(s.opening_balance)}</div></div>
    <div class="sum"><div class="label">Total Billed</div><div class="value">${money(s.total_billed)}</div></div>
    <div class="sum"><div class="label">Total Paid</div><div class="value credit">${money(s.total_paid)}</div></div>
    <div class="sum closing ${s.closing_balance > 0 ? "" : "clear"}"><div class="label">Closing Balance</div><div class="value ${s.closing_balance > 0 ? "due" : "credit"}">${money(s.closing_balance)}</div></div>
  </div>

  <table>
    <thead><tr><th>Date</th><th>Doc No.</th><th>Type</th><th>Description</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th></tr></thead>
    <tbody>
      <tr class="opening"><td colspan="6">Opening balance</td><td class="num">${money(s.opening_balance)}</td></tr>
      ${rows || `<tr><td colspan="7" class="empty">No transactions in this period.</td></tr>`}
    </tbody>
    <tfoot><tr><td colspan="4">Totals</td><td class="num">${money(s.total_billed)}</td><td class="num credit">${money(s.total_paid)}</td><td class="num ${s.closing_balance > 0 ? "due" : ""}">${money(s.closing_balance)}</td></tr></tfoot>
  </table>

  <div class="footer">
    This is a computer-generated statement and does not require a signature.<br>
    <b>${esc(company.name)}</b>${company.address ? ` &nbsp;|&nbsp; ${esc(company.address)}` : ""}${contact ? ` &nbsp;|&nbsp; ${contact}` : ""}
  </div>
</div>
</body></html>`;
  printHtmlInIframe(html);
}

let activePrintFrame: HTMLIFrameElement | null = null;

function printHtmlInIframe(html: string) {
  activePrintFrame?.remove();
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);
  activePrintFrame = frame;

  const doc = frame.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();

  let printed = false;
  const doPrint = () => {
    if (printed) return;
    printed = true;
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    // Remove the frame once printing is done, with a fallback in case afterprint never fires
    const cleanup = () => {
      if (activePrintFrame === frame) activePrintFrame = null;
      frame.remove();
    };
    frame.contentWindow?.addEventListener("afterprint", cleanup, { once: true });
    setTimeout(cleanup, 60_000);
  };

  // Wait for the logo so it appears in the printout, but not forever
  const pending = Array.from(doc.images).filter((img) => !img.complete);
  if (pending.length === 0) {
    setTimeout(doPrint, 50);
  } else {
    let left = pending.length;
    const done = () => { if (--left === 0) doPrint(); };
    pending.forEach((img) => { img.onload = done; img.onerror = done; });
    setTimeout(doPrint, 3000);
  }
}

/** Downloads the statement as a real .xlsx file */
export function exportMemberStatementXlsx(s: MemberStatement, currencyCode: string, from?: string, to?: string) {
  const rows: XlsxCell[][] = [
    ["Statement of Account"],
    ["Member", s.member_name],
    ["Member ID", s.member_id],
    ["Phone", s.member_phone || ""],
    ["Period", periodLabel(from, to)],
    ["Currency", currencyCode],
    [],
    ["Opening Balance", s.opening_balance],
    ["Total Billed", s.total_billed],
    ["Total Paid", s.total_paid],
    ["Closing Balance", s.closing_balance],
    [],
    ["Date", "Doc No.", "Type", "Description", "Debit", "Credit", "Balance", "Payment Method", "Status"],
  ];
  const headerRow = rows.length - 1;
  for (const l of s.lines) {
    const extra = l.minor_charges?.length
      ? ` (Incl. ${l.minor_charges.map((m) => `${m.name}: ${Number(m.amount)}`).join(", ")})` : "";
    rows.push([fmtDate(l.date), docNo(l), l.type, l.description + extra,
      l.debit || null, l.credit || null, l.balance, l.payment_method || "", l.status]);
  }
  rows.push(["Totals", "", "", "", s.total_billed, s.total_paid, s.closing_balance]);
  const totalsRow = rows.length - 1;

  const blob = buildXlsx("Statement", rows, {
    boldRows: [0, 10, headerRow, totalsRow],
    moneyColumns: [1, 4, 5, 6],
    columnWidths: [16, 22, 16, 48, 14, 14, 14, 16, 12],
  });
  downloadBlob(blob, `SOA-${s.member_id}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
