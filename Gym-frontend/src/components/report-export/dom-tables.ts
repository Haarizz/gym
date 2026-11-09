import { displayValue } from "./builders";
import type { CellValue, ReportColumn, ReportRow, TableSection, ValueFormat } from "./types";

const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

/**
 * Table sections from the `<table>` elements rendered inside `root` (e.g. an open dialog's active
 * tab), for panels whose rows come from their own fetches. Each cell's display text is parsed back
 * to a typed value (money / percent / number), and a column takes a numeric format only when every
 * filled cell parses to it — so Excel gets real numbers and nothing is guessed.
 */
export function domTableSections(root: Element | null | undefined): TableSection[] {
  if (!root) return [];
  const out: TableSection[] = [];
  root.querySelectorAll("table").forEach((table, ti) => {
    const headCells = Array.from(table.querySelectorAll("thead tr:last-child th, thead tr:last-child td"));
    const bodyRows = Array.from(table.querySelectorAll("tbody tr")).map((tr) => Array.from(tr.querySelectorAll("td, th")).map((td) => clean(td.textContent)));
    const width = Math.max(headCells.length, ...bodyRows.map((r) => r.length), 0);
    if (!width || !bodyRows.length) return;
    // Rows that are a single "empty state" cell spanning the table aren't data.
    const rows = bodyRows.filter((r) => !(r.length === 1 && width > 1));
    if (!rows.length) return;
    const headers = Array.from({ length: width }, (_, i) => clean(headCells[i]?.textContent) || `Column ${i + 1}`);
    const parsed = rows.map((r) => headers.map((_, i) => displayValue(r[i] ?? "")));
    const columns: ReportColumn[] = headers.map((h, i) => {
      const filled = parsed.map((p) => p[i]).filter((v) => v.value !== "" && v.value != null && v.value !== "—");
      const kinds = new Set(filled.map((v) => v.format));
      let format: ValueFormat = "text";
      if (filled.length && kinds.size === 1 && !kinds.has("text")) format = [...kinds][0] as ValueFormat;
      else if (filled.length && [...kinds].every((k) => k === "integer" || k === "number")) format = "number";
      return { key: `c${i}`, header: h, format };
    });
    const reportRows: ReportRow[] = parsed.map((p, ri) => {
      const row: ReportRow = {};
      columns.forEach((c, i) => { row[c.key] = (c.format === "text" ? rows[ri][i] ?? "" : p[i].value) as CellValue; });
      return row;
    });
    const card = table.closest('[data-slot="card"]');
    const title = clean(card?.querySelector('[data-slot="card-title"]')?.textContent) || `Table ${ti + 1}`;
    const description = clean(card?.querySelector('[data-slot="card-description"]')?.textContent) || undefined;
    out.push({ kind: "table", title, description, columns, rows: reportRows });
  });
  return out;
}
