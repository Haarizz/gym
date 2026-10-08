// A4 rendering + Excel export of POS report documents (X/Z reports, analytics),
// from the same ReportDoc the thermal renderers use.

import { buildXlsx, downloadBlob, type XlsxCell } from "../../utils/xlsx-export";
import type { ReportDoc } from "./receiptModel";

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export function reportA4Html(doc: ReportDoc, extraTables: { heading: string; columns: string[]; rows: string[][]; numeric?: number[] }[] = []): string {
  const c = doc.company;
  const sections = doc.sections.filter((s) => s.rows.length > 0).map((s) => `
    <div class="sec"><h3>${esc(s.heading)}</h3><table class="kv">${s.rows.map((r) =>
      `<tr class="${r.bold ? "b" : ""}"><td class="${r.indent ? "ind" : ""}">${esc(r.label)}</td><td class="n">${esc(r.value)}</td></tr>`).join("")}</table></div>`).join("");
  const tables = extraTables.filter((t) => t.rows.length > 0).map((t) => `
    <div class="full"><h3>${esc(t.heading)}</h3><table class="grid"><thead><tr>${t.columns.map((h, i) => `<th class="${t.numeric?.includes(i) ? "n" : ""}">${esc(h)}</th>`).join("")}</tr></thead>
    <tbody>${t.rows.map((r) => `<tr>${r.map((v, i) => `<td class="${t.numeric?.includes(i) ? "n" : ""}">${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(doc.title)} ${esc(doc.number)}</title><style>
  @page{size:A4;margin:12mm}
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:Inter,'Segoe UI',Arial,sans-serif;color:#1E293B;font-size:11px;margin:0}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2B7A78;padding-bottom:10px;margin-bottom:14px}
  .logo{max-height:46px;max-width:200px;object-fit:contain;display:block;margin-bottom:6px}
  .co{font-size:20px;font-weight:800;color:#2B7A78}
  .muted{color:#64748B}
  .title{text-align:right}
  .title h1{margin:0;font-size:18px;letter-spacing:.5px}
  .meta{display:grid;grid-template-columns:repeat(4,1fr);gap:6px 14px;margin-bottom:14px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px}
  .meta div span{display:block;color:#64748B;font-size:10px}
  .meta div b{font-size:11.5px}
  .cols{column-count:2;column-gap:16px}
  .sec{break-inside:avoid;border:1px solid #E2E8F0;border-radius:8px;padding:8px 10px;margin-bottom:12px}
  h3{margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#2B7A78}
  table{width:100%;border-collapse:collapse}
  .kv td{padding:4px 0;border-bottom:1px dashed #E2E8F0}
  .kv tr.b td{font-weight:800;border-bottom:1px solid #CBD5E1}
  .ind{padding-left:12px!important;color:#475569}
  .n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
  .full{margin-top:8px;break-inside:auto}
  .grid th{background:#F1F5F9;text-align:left;padding:5px 6px;font-size:10.5px;border-bottom:1px solid #CBD5E1}
  .grid td{padding:4px 6px;border-bottom:1px solid #F1F5F9}
  .foot{margin-top:18px;display:flex;justify-content:space-between;color:#64748B;font-size:10px}
  .sign{margin-top:36px;display:flex;gap:40px}
  .sign div{flex:1;border-top:1px solid #94A3B8;padding-top:4px;text-align:center;color:#475569}
  </style></head><body>
  <div class="head">
    <div>${c.logo ? `<img class="logo" src="${esc(c.logo)}"/>` : ""}<div class="co">${esc(c.name)}</div>
      <div class="muted">${esc(c.address)}${c.phone ? ` · ${esc(c.phone)}` : ""}${c.trn ? `<br/>TRN: ${esc(c.trn)}` : ""}</div></div>
    <div class="title"><h1>${esc(doc.title)}</h1><div class="muted">${esc(doc.number)}</div></div>
  </div>
  <div class="meta">${doc.meta.map((m) => `<div><span>${esc(m.label)}</span><b>${esc(m.value)}</b></div>`).join("")}</div>
  <div class="cols">${sections}</div>
  ${tables}
  <div class="sign"><div>Cashier</div><div>Supervisor</div></div>
  <div class="foot"><span>${esc(doc.footer ?? "")}</span><span>Printed ${esc(new Date().toLocaleString("en-GB"))}</span></div>
  </body></html>`;
}

export async function printA4(html: string): Promise<void> {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, { position: "fixed", left: "-10000px", top: "0", width: "210mm", height: "297mm", border: "0", opacity: "0" });
  document.body.appendChild(frame);
  const win = frame.contentWindow!;
  win.document.open();
  win.document.write(html);
  win.document.close();
  await Promise.all(Array.from(win.document.images).map((img) => (img.complete ? Promise.resolve() : new Promise<void>((r) => { img.onload = img.onerror = () => r(); }))));
  win.addEventListener("afterprint", () => setTimeout(() => frame.remove(), 500), { once: true });
  win.focus();
  win.print();
  setTimeout(() => { if (frame.isConnected) frame.remove(); }, 60_000);
}

export function exportReportXlsx(doc: ReportDoc, filename: string, extraTables: { heading: string; columns: string[]; rows: (string | number)[][] }[] = []) {
  const rows: XlsxCell[][] = [];
  const bold: number[] = [];
  const push = (r: XlsxCell[], isBold = false) => { if (isBold) bold.push(rows.length); rows.push(r); };
  push([doc.company.name], true);
  push([doc.title, doc.number], true);
  doc.meta.forEach((m) => push([m.label, m.value]));
  push([]);
  for (const s of doc.sections) {
    if (!s.rows.length) continue;
    push([s.heading.toUpperCase()], true);
    s.rows.forEach((r) => push([`${r.indent ? "   " : ""}${r.label}`, r.value], Boolean(r.bold)));
    push([]);
  }
  for (const t of extraTables) {
    if (!t.rows.length) continue;
    push([t.heading.toUpperCase()], true);
    push(t.columns, true);
    t.rows.forEach((r) => push(r));
    push([]);
  }
  downloadBlob(buildXlsx(doc.title.slice(0, 28), rows, { boldRows: bold, columnWidths: [42, 22, 22, 22, 22, 22, 22] }), filename);
}
