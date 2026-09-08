/**
 * Shared client-side CSV/Excel export helpers — extracted from financial-reports.tsx's
 * proven implementation so every financial page exports data the same real way instead
 * of each page reinventing (or faking) its own. No backend export endpoint exists;
 * these build the file entirely in the browser from data already on the page.
 */

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCsvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replaceAll('"', '""')}"`;
}

export function exportAsCsv(filename: string, header: string[], rows: Array<Array<unknown>>) {
  const csv = [
    header.map(toCsvCell).join(","),
    ...rows.map((r) => r.map(toCsvCell).join(",")),
  ].join("\n");
  downloadBlob(filename, new Blob([csv], { type: "text/csv;charset=utf-8" }));
}

export function exportAsExcel(filename: string, header: string[], rows: Array<Array<unknown>>) {
  const html = `
    <html><head><meta charset="utf-8" /></head><body>
    <table border="1" cellspacing="0" cellpadding="4">
      <thead><tr>${header.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? ""}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
    </body></html>
  `.trim();
  downloadBlob(filename, new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }));
}
