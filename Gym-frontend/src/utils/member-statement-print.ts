// Member Statement of Account (SOA) for the shared report-export engine.
import type { MemberStatement } from "./supabase/billing-service";
import type { ReportDocument, ReportRow } from "../components/report-export/types";

const money = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const docNo = (l: MemberStatement["lines"][number]) => (l.type === "Invoice" ? l.invoice_no || l.receipt_no : l.receipt_no);

/**
 * The Statement of Account as a report-export document (PDF / Excel / print through the shared
 * engine): member details, the four balances, then the running-balance ledger with its opening
 * and totals rows. Used by Billing › Statement and the member's history page.
 */
export function buildMemberStatementReport(s: MemberStatement, from?: string, to?: string): ReportDocument {
  const rows: ReportRow[] = [
    { _kind: "subtotal", date: null, doc: "", type: "", description: "Opening balance", debit: null, credit: null, balance: s.opening_balance },
    ...s.lines.map((l): ReportRow => ({
      date: l.date,
      doc: docNo(l),
      type: l.type,
      description: l.description + (l.minor_charges?.length ? ` (Incl. ${l.minor_charges.map((m) => `${m.name}: ${money(Number(m.amount))}`).join(", ")})` : ""),
      method: l.payment_method || "",
      status: l.status || "",
      // Refunds carry negative amounts (they take a cancelled bill off both columns).
      debit: l.debit !== 0 ? l.debit : null,
      credit: l.credit !== 0 ? l.credit : null,
      balance: l.balance,
    })),
    { _kind: "total", date: null, doc: "", type: "", description: "Totals", debit: s.total_billed, credit: s.total_paid, balance: s.closing_balance },
  ];
  return {
    title: "Statement of Account",
    fileName: `Statement of Account ${s.member_id || s.member_name}`,
    orientation: "landscape",
    period: from || to ? { from, to } : { label: "All transactions" },
    sections: [
      {
        kind: "keyValue", title: "Member", columns: 4, items: [
          { label: "Member", value: s.member_name },
          { label: "Member ID", value: s.member_id },
          { label: "Phone", value: s.member_phone || "—" },
          { label: "Billing", value: s.billed_to_head && s.family_head_name ? `Billed to ${s.family_head_name}` : s.is_minor ? "Minor" : "Self" },
        ],
      },
      {
        kind: "kpis", items: [
          { label: "Opening balance", value: s.opening_balance, format: "money" },
          { label: "Total billed", value: s.total_billed, format: "money" },
          { label: "Total paid", value: s.total_paid, format: "money", tone: "good" },
          { label: "Closing balance", value: s.closing_balance, format: "money", tone: s.closing_balance > 0 ? "bad" : "good", hint: s.closing_balance > 0 ? "Amount due" : "Settled" },
        ],
      },
      {
        kind: "table", title: "Transactions", sheetName: "Statement",
        columns: [
          { key: "date", header: "Date", format: "date" },
          { key: "doc", header: "Doc No." },
          { key: "type", header: "Type" },
          { key: "description", header: "Description", wrap: true },
          { key: "method", header: "Payment method" },
          { key: "status", header: "Status" },
          { key: "debit", header: "Debit", format: "money" },
          { key: "credit", header: "Credit", format: "money" },
          { key: "balance", header: "Balance", format: "money" },
        ],
        rows,
        emptyText: "No transactions in this period.",
      },
      { kind: "text", text: "This is a computer-generated statement and does not require a signature." },
    ],
  };
}
