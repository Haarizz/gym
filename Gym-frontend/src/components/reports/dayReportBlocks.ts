import { format, isValid, parseISO } from "date-fns";
import type { XlsxCell } from "../../utils/xlsx-export";

/**
 * Day Report content as plain tables ("blocks"), shared by the Text view, the
 * plain-text copy/download, the Excel export and the detail tables of the Graphical
 * view — so every format shows exactly the same figures.
 */

export type Row = Record<string, any>;
export interface DayReportData {
  date: string;
  from?: string;
  to?: string;
  revenue: any | null;
  collectionByHour?: { hour: number; collection: number }[] | null;
  receipts: Row[] | null;
  posSales: Row[] | null;
  salesInvoices: Row[] | null;
  supplierBills: Row[] | null;
  purchaseOrders: Row[] | null;
  expenses: Row[] | null;
  paymentVouchers: Row[] | null;
  membership: { newMembers: Row[]; expired: Row[]; renewals: number; freezes: Row[] } | null;
  attendance: {
    total: number; uniqueMembers: number; walkIns: number; walkInAmount: number;
    byHour: { hour: number; checkIns: number }[]; byDay?: { date: string; checkIns: number }[];
  } | null;
  leads: { created: Row[]; followUpsDue: number; followUpsCompleted: number } | null;
  errors: Record<string, string>;
}

/** A table cell: text, a count, or an amount of money (formatted with 2 decimals) */
export type Cell = string | number | null | undefined | { money: number };

export interface Block {
  id: string;
  title: string;
  description?: string;
  header: string[];
  rows: Cell[][];
  total?: Cell[];
  /** Shown in the Graphical view's card header */
  count?: number;
  amount?: number;
  error?: string;
  empty?: string;
}

export const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
export const money = (v: unknown) => num(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const sum = (rows: Row[] | null | undefined, key: string) => (rows || []).reduce((s, r) => s + num(r[key]), 0);
export const hourLabel = (h: number) => format(new Date(2000, 0, 1, h), "h a");
const m = (v: unknown): Cell => ({ money: num(v) });
const pct = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "—");

const fmt = (v: string | null | undefined, pattern: string) => {
  if (!v) return "—";
  const d = parseISO(v);
  return isValid(d) ? format(d, pattern) : "—";
};
export const dayOf = (v?: string | null) => fmt(v, "dd MMM yyyy");

export const isMoney = (c: Cell): c is { money: number } => typeof c === "object" && c !== null;
export const isNumeric = (c: Cell) => typeof c === "number" || isMoney(c);
/** Per column: right-align numbers, amounts and percentage shares */
export const rightAligned = (b: Block) => {
  const all = [...b.rows, ...(b.total ? [b.total] : [])];
  return b.header.map((h, i) => h === "Share" || all.some((r) => isNumeric(r[i])));
};
/** Missing values read "—"; an empty string is a deliberately blank cell (summary gaps, total rows) */
export const cellText = (c: Cell) =>
  isMoney(c) ? money(c.money) : typeof c === "number" ? c.toLocaleString() : c === null || c === undefined ? "—" : String(c);

/** Report header line: one day, or a range with its length */
export function periodLabel(data: DayReportData) {
  const from = data.from || data.date;
  const to = data.to || data.date;
  if (from === to) return format(parseISO(from), "EEEE, dd MMMM yyyy");
  const days = Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 86_400_000) + 1;
  return `${format(parseISO(from), "dd MMM yyyy")} – ${format(parseISO(to), "dd MMM yyyy")} (${days} days)`;
}

export function buildBlocks(data: DayReportData): Block[] {
  const range = !!data.from && !!data.to && data.from !== data.to;
  // A time on one day; date + time over a range
  const when = (v?: string | null) => fmt(v, range ? "dd MMM yyyy, hh:mm a" : "hh:mm a");
  const err = (k: string) => data.errors?.[k];
  const rev = data.revenue;
  const nothing = range ? "Nothing recorded in this period." : "Nothing recorded on this day.";

  const receipts = data.receipts || [];
  const pos = data.posSales || [];
  const invoices = data.salesInvoices || [];
  const bills = data.supplierBills || [];
  const pos2 = data.purchaseOrders || [];
  const expenses = data.expenses || [];
  const vouchers = data.paymentVouchers || [];
  const newMembers = data.membership?.newMembers || [];
  const ending = data.membership?.expired || [];
  const freezes = data.membership?.freezes || [];
  const leads = data.leads?.created || [];
  const att = data.attendance;

  const collection = num(rev?.totalCollection?.total);
  const expensesTotal = sum(expenses, "amount");
  const purchasesTotal = sum(bills, "total");
  const paymentsOut = sum(vouchers, "amount");
  const dateCol = (label = "Date") => (range ? [label] : []);
  const dateCell = (v?: string | null): Cell[] => (range ? [dayOf(v)] : []);
  /** Total row: "Total" in the first column, the given amounts at their column indexes */
  const totalRow = (width: number, at: Record<number, Cell>): Cell[] =>
    Array.from({ length: width }, (_, i) => (i === 0 ? "Total" : at[i] ?? ""));

  const blocks: Block[] = [];

  blocks.push({
    id: "summary", title: "Summary", header: ["Metric", "Count", "Amount"],
    rows: [
      ["Total Collection", num(rev?.totalCollection?.count), m(collection)],
      ["Expenses", expenses.length, m(expensesTotal)],
      ["Net (Collection − Expenses)", "", m(collection - expensesTotal)],
      ["Member Receipts", receipts.length, m(sum(receipts, "paid"))],
      ["POS Sales", pos.length, m(sum(pos, "total"))],
      ["Sales Invoices", invoices.length, m(sum(invoices, "total"))],
      ["Purchases (Supplier Bills)", bills.length, m(purchasesTotal)],
      ["Purchase Orders", pos2.length, m(sum(pos2, "total"))],
      ["Payments Out (Vouchers)", vouchers.length, m(paymentsOut)],
      ["Check-ins", num(att?.total), ""],
      ["Unique Members Checked In", num(att?.uniqueMembers), ""],
      ["Walk-ins", num(att?.walkIns), m(att?.walkInAmount)],
      ["New Members", newMembers.length, ""],
      ["Renewals", num(data.membership?.renewals), ""],
      ["Memberships Ending", ending.length, ""],
      ["Freezes / Unfreezes", freezes.length, ""],
      ["Leads Created", leads.length, ""],
      ["Follow-ups Due", num(data.leads?.followUpsDue), ""],
      ["Follow-ups Completed", num(data.leads?.followUpsCompleted), ""],
    ],
  });

  const streamDefs: [string, string][] = [
    ["membership", "Membership"], ["services", "PT & Services"], ["merchandise", "Merchandise"],
    ["cafe", "Cafe & F&B"], ["equipment", "Equipment"],
  ];
  blocks.push({
    id: "streams", title: "Collection by Stream", error: err("revenue"),
    header: ["Stream", "Transactions", "Cash", "Card", "Other", "Amount", "Share"],
    rows: rev?.streams
      ? streamDefs.map(([k, label]) => {
          const s = rev.streams[k] || {};
          return [label, num(s.count), m(s.cash), m(s.card), m(s.other), m(s.total), pct(num(s.total), collection)];
        })
      : [],
    total: rev?.streams ? totalRow(7, {
      1: num(rev.totalCollection?.count), 2: m(rev.totalCollection?.cash), 3: m(rev.totalCollection?.card),
      4: m(rev.totalCollection?.other), 5: m(collection), 6: collection > 0 ? "100.0%" : "—",
    }) : undefined,
  });

  const methods: Row[] = rev?.paymentMethods || [];
  const methodTotal = sum(methods, "amount");
  blocks.push({
    id: "methods", title: "Collection by Payment Method", error: err("revenue"),
    header: ["Method", "Transactions", "Amount", "Share"],
    rows: methods.map((r) => [r.name, num(r.count), m(r.amount), pct(num(r.amount), methodTotal)]),
    total: methods.length ? totalRow(4, { 2: m(methodTotal), 3: "100.0%" }) : undefined,
    empty: range ? "No payments received in this period." : "No payments received on this day.",
  });

  if (range) {
    const checkInsByDay = new Map((att?.byDay || []).map((d) => [d.date, num(d.checkIns)]));
    const trend: Row[] = rev?.trend || [];
    blocks.push({
      id: "daily", title: "Day-by-Day", error: err("revenue") || err("attendance"),
      header: ["Date", "Collection", "Expenses", "Net", "Check-ins"],
      rows: trend.map((t) => {
        const d = String(t.start || "").slice(0, 10);
        return [fmt(d, "EEE, dd MMM yyyy"), m(t.revenue), m(t.expenses), m(num(t.revenue) - num(t.expenses)), checkInsByDay.get(d) ?? 0];
      }),
      total: trend.length ? totalRow(5, {
        1: m(sum(trend, "revenue")), 2: m(sum(trend, "expenses")),
        3: m(sum(trend, "revenue") - sum(trend, "expenses")), 4: num(att?.total),
      }) : undefined,
    });
  }

  const hourCollection = data.collectionByHour || (range ? [] : (rev?.trend || []).map((t: Row, h: number) => ({ hour: h, collection: t.revenue })));
  const hours = Array.from({ length: 24 }, (_, h) => ({
    h, collection: num(hourCollection[h]?.collection), checkIns: num(att?.byHour?.[h]?.checkIns),
  })).filter((x) => x.collection > 0 || x.checkIns > 0);
  blocks.push({
    id: "hourly", title: "Hour-by-Hour", error: err("revenue") || err("attendance"),
    description: range ? "Each hour of the day, added up across the whole period" : undefined,
    header: ["Hour", "Collection", "Check-ins"],
    rows: hours.map((x) => [`${hourLabel(x.h)} – ${hourLabel((x.h + 1) % 24)}`, m(x.collection), x.checkIns]),
    total: hours.length ? totalRow(3, { 1: m(sum(hours, "collection")), 2: sum(hours, "checkIns") }) : undefined,
    empty: "No collections or check-ins.",
  });

  const byCategory = new Map<string, { count: number; amount: number }>();
  expenses.forEach((x) => {
    const k = x.category || "Uncategorised";
    const c = byCategory.get(k) || { count: 0, amount: 0 };
    byCategory.set(k, { count: c.count + 1, amount: c.amount + num(x.amount) });
  });
  const categories = [...byCategory.entries()].sort((a, b) => b[1].amount - a[1].amount);
  blocks.push({
    id: "expenseCategories", title: "Expenses by Category", error: err("expenses"),
    header: ["Category", "Expenses", "Amount", "Share"],
    rows: categories.map(([k, c]) => [k, c.count, m(c.amount), pct(c.amount, expensesTotal)]),
    total: categories.length ? totalRow(4, { 1: expenses.length, 2: m(expensesTotal), 3: "100.0%" }) : undefined,
    empty: range ? "No expenses in this period." : "No expenses on this day.",
  });

  // ── Detail lists ──
  blocks.push({
    id: "receipts", title: "Member Receipts", description: "Memberships, renewals, add-ons, day passes and balance payments",
    error: err("receipts"), count: receipts.length, amount: sum(receipts, "paid"),
    header: ["Time", "Receipt No", "Member", "Member ID", "Type", "Plan", "Amount", "Paid", "Method", "Status", "Processed By"],
    rows: receipts.map((r) => [when(r.time), r.receiptNo, r.memberName, r.memberId, r.type, r.plan, m(r.amount), m(r.paid), r.method, r.status, r.processedBy]),
    total: receipts.length ? totalRow(11, { 6: m(sum(receipts, "amount")), 7: m(sum(receipts, "paid")) }) : undefined,
  });
  blocks.push({
    id: "posSales", title: "POS Sales", error: err("posSales"), count: pos.length, amount: sum(pos, "total"),
    header: ["Time", "Number", "Customer", "Subtotal", "Discount", "Tax", "Total", "Method", "Status"],
    rows: pos.map((r) => [when(r.time), r.number, r.customer || "Walk-in", m(r.subtotal), m(r.discount), m(r.tax), m(r.total), r.method, r.status]),
    total: pos.length ? totalRow(9, { 3: m(sum(pos, "subtotal")), 4: m(sum(pos, "discount")), 5: m(sum(pos, "tax")), 6: m(sum(pos, "total")) }) : undefined,
  });
  const iw = range ? 1 : 0;
  blocks.push({
    id: "salesInvoices", title: "Sales Invoices", error: err("salesInvoices"), count: invoices.length, amount: sum(invoices, "total"),
    header: [...dateCol(), "Number", "Customer", "Total", "Paid", "Method", "Status"],
    rows: invoices.map((r) => [...dateCell(r.date), r.number, r.customer, m(r.total), m(r.paid), r.method, r.status]),
    total: invoices.length ? totalRow(6 + iw, { [2 + iw]: m(sum(invoices, "total")), [3 + iw]: m(sum(invoices, "paid")) }) : undefined,
  });
  blocks.push({
    id: "supplierBills", title: "Purchases — Supplier Bills", error: err("supplierBills"), count: bills.length, amount: purchasesTotal,
    header: [...dateCol(), "Bill No", "Supplier Invoice", "Supplier", "Total", "Paid", "Status"],
    rows: bills.map((r) => [...dateCell(r.date), r.number, r.supplierInvoice, r.supplier, m(r.total), m(r.paid), r.status]),
    total: bills.length ? totalRow(6 + iw, { [3 + iw]: m(purchasesTotal), [4 + iw]: m(sum(bills, "paid")) }) : undefined,
  });
  blocks.push({
    id: "purchaseOrders", title: "Purchase Orders", error: err("purchaseOrders"), count: pos2.length, amount: sum(pos2, "total"),
    header: [...dateCol(), "PO No", "Supplier", "Total", "Status"],
    rows: pos2.map((r) => [...dateCell(r.time), r.number, r.supplier, m(r.total), r.status]),
    total: pos2.length ? totalRow(4 + iw, { [2 + iw]: m(sum(pos2, "total")) }) : undefined,
  });
  blocks.push({
    id: "expenses", title: "Expenses", error: err("expenses"), count: expenses.length, amount: expensesTotal,
    header: [...dateCol(), "Vendor", "Category", "Amount", "Status", "Payment", "Notes"],
    rows: expenses.map((r) => [...dateCell(r.date), r.vendor, r.category, m(r.amount), r.status, r.paymentStatus, r.notes]),
    total: expenses.length ? totalRow(6 + iw, { [2 + iw]: m(expensesTotal) }) : undefined,
  });
  blocks.push({
    id: "paymentVouchers", title: "Payment Vouchers (Money Out)", error: err("paymentVouchers"), count: vouchers.length, amount: paymentsOut,
    header: [...dateCol(), "Voucher No", "Payee", "Bill No", "Amount", "Method", "Status"],
    rows: vouchers.map((r) => [...dateCell(r.date), r.number, r.payee, r.billNo, m(r.amount), r.method, r.status]),
    total: vouchers.length ? totalRow(6 + iw, { [3 + iw]: m(paymentsOut) }) : undefined,
  });
  blocks.push({
    id: "newMembers", title: "New Members", error: err("membership"), count: newMembers.length,
    header: [...dateCol("Joined"), "Member ID", "Name", "Phone", "Plan", "Status"],
    rows: newMembers.map((r) => [...dateCell(r.joinDate), r.memberId, r.name, r.phone, r.plan, r.status]),
    empty: range ? "No new members in this period." : "No new members on this day.",
  });
  blocks.push({
    id: "ending", title: "Memberships Ending", error: err("membership"), count: ending.length,
    description: range ? "Memberships whose expiry date falls in this period" : "Memberships whose expiry date is this day",
    header: [...dateCol("Ends"), "Member ID", "Name", "Phone", "Plan", "Status"],
    rows: ending.map((r) => [...dateCell(r.expiryDate), r.memberId, r.name, r.phone, r.plan, r.status]),
    empty: range ? "No memberships end in this period." : "No memberships end on this day.",
  });
  blocks.push({
    id: "freezes", title: "Freezes / Unfreezes", error: err("membership"), count: freezes.length,
    header: [...dateCol(), "Member ID", "Name", "Action", "Until", "Days", "Reason"],
    rows: freezes.map((r) => [...dateCell(r.date), r.memberId, r.memberName, r.action, dayOf(r.plannedEnd), r.days ?? "—", r.reason]),
    empty: range ? "No freezes in this period." : "No freezes on this day.",
  });
  blocks.push({
    id: "leads", title: "Leads Created", error: err("leads"), count: leads.length,
    header: [...dateCol("Created"), "Name", "Source", "Status"],
    rows: leads.map((r) => [...dateCell(r.time), r.name, r.source, r.status]),
    empty: range ? "No new leads in this period." : "No new leads on this day.",
  });

  return blocks.map((b) => ({ ...b, empty: b.empty ?? nothing }));
}

/** Monospace plain-text rendering, for copying into a message or saving as .txt */
export function blocksToText(title: string, subtitle: string, blocks: Block[]): string {
  const MAX = 36;
  const clip = (s: string) => (s.length > MAX ? `${s.slice(0, MAX - 1)}…` : s);
  const out: string[] = [title.toUpperCase(), subtitle, ""];
  for (const b of blocks) {
    out.push(b.title.toUpperCase(), "=".repeat(b.title.length));
    if (b.description) out.push(b.description);
    if (b.error) { out.push(`(${b.error})`, ""); continue; }
    if (b.rows.length === 0) { out.push(b.empty || "Nothing recorded.", ""); continue; }
    const all = [...b.rows, ...(b.total ? [b.total] : [])];
    const right = rightAligned(b);
    const text = (r: Cell[]) => b.header.map((_, i) => clip(cellText(r[i]).replace(/\s+/g, " ")));
    const body = all.map(text);
    const widths = b.header.map((h, i) => Math.max(h.length, ...body.map((r) => r[i].length)));
    const line = (cells: string[]) =>
      cells.map((c, i) => (right[i] ? c.padStart(widths[i]) : c.padEnd(widths[i]))).join("  ").trimEnd();
    const rule = widths.map((w) => "-".repeat(w)).join("  ");
    out.push(line(b.header), rule);
    body.slice(0, b.rows.length).forEach((r) => out.push(line(r)));
    if (b.total) out.push(rule, line(body[body.length - 1]));
    out.push("");
  }
  return out.join("\n");
}

/** Excel rows: a bold title, bold header and bold total per block; money stays numeric */
export function blocksToXlsx(title: string, subtitle: string, currencyCode: string, blocks: Block[]) {
  const rows: XlsxCell[][] = [[title, subtitle], ["Currency", currencyCode], []];
  const bold: number[] = [0];
  const raw = (c: Cell): XlsxCell => (isMoney(c) ? c.money : c);
  for (const b of blocks) {
    rows.push([b.title]); bold.push(rows.length - 1);
    rows.push(b.header); bold.push(rows.length - 1);
    if (b.error) rows.push([b.error]);
    else if (b.rows.length === 0) rows.push([b.empty || "Nothing recorded"]);
    else rows.push(...b.rows.map((r) => r.map(raw)));
    if (b.total && !b.error) { rows.push(b.total.map(raw)); bold.push(rows.length - 1); }
    rows.push([]);
  }
  return { rows, bold };
}
