import type { Receipt } from "./supabase/receipts-service";

/**
 * Subject + message for Billing › Email receipt / Email invoice, worded for what the receipt was
 * for: a new membership, a renewal, an upgrade or downgrade, an add-on, a day pass, a payment
 * towards an earlier bill, or a request still waiting for approval. Plain text — staff can edit
 * it before sending; the server wraps it in a simple branded email.
 */

export type ReceiptEmailDocument = "RECEIPT" | "INVOICE";

export type ReceiptEmailKind =
  | "new" | "renewal" | "upgrade" | "downgrade" | "addon" | "daily" | "payment" | "request" | "other";

export interface ReceiptEmailInput {
  receipt: Receipt;
  document: ReceiptEmailDocument;
  /** "Tax Invoice" or "Invoice" (invoiceTitle) — the receipt is always "Receipt". */
  invoiceLabel: string;
  gymName: string;
  /** Plain-text currency prefix, e.g. "AED " — never the on-screen Dirham glyph. */
  currencyPrefix: string;
}

export function receiptEmailKind(r: Pick<Receipt, "transaction_type" | "renewal_kind" | "approval_status">): ReceiptEmailKind {
  if (r.approval_status === "PENDING") return "request";
  const type = (r.transaction_type || "").trim().toLowerCase();
  if (type === "payment") return "payment";
  if (type === "renewal") {
    const kind = (r.renewal_kind || "").trim().toLowerCase();
    if (kind === "upgrade") return "upgrade";
    if (kind === "downgrade") return "downgrade";
    return "renewal";
  }
  if (type === "new") return "new";
  if (type === "add-on" || type === "addon") return "addon";
  if (type === "daily entry") return "daily";
  return "other";
}

const titleCase = (s: string) =>
  s.trim().replace(/\s+/g, " ").toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());

const day = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export function composeReceiptEmail(input: ReceiptEmailInput): { subject: string; message: string; kind: ReceiptEmailKind } {
  const { receipt: r, document, invoiceLabel, currencyPrefix } = input;
  const gym = (input.gymName || "").trim() || "our gym";
  const kind = receiptEmailKind(r);
  const money = (n: number) => `${currencyPrefix}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const isInvoice = document === "INVOICE";
  const docLabel = isInvoice ? invoiceLabel || "Invoice" : "Receipt";
  const docNo = isInvoice ? r.invoice_no || r.receipt_no : r.receipt_no;
  const plan = (r.plan_name || "").trim();
  const name = titleCase(r.member_name || "") || "Member";
  const amount = Number(r.amount || 0);
  const paid = Number(r.paid_amount ?? amount);
  const due = Math.max(0, Number(r.due_amount ?? 0));
  const from = day(r.valid_from);
  const till = day(r.valid_till);

  const subjects: Record<ReceiptEmailKind, string> = {
    new: `Welcome to ${gym} — your ${docLabel.toLowerCase()} ${docNo}`,
    renewal: `Your membership has been renewed — ${docLabel} ${docNo}`,
    upgrade: `Your membership has been upgraded${plan ? ` to ${plan}` : ""} — ${docLabel} ${docNo}`,
    downgrade: `Your membership plan has been changed${plan ? ` to ${plan}` : ""} — ${docLabel} ${docNo}`,
    addon: `Thank you for your ${plan || "add-on"} purchase — ${docLabel} ${docNo}`,
    daily: `Thank you for visiting ${gym} — ${docLabel} ${docNo}`,
    payment: `Payment received — ${docLabel} ${docNo}`,
    request: `We've received your request — ${docLabel} ${docNo}`,
    other: `${docLabel} ${docNo} from ${gym}`,
  };

  const intros: Record<ReceiptEmailKind, string> = {
    new: `Welcome to ${gym}! Thank you for joining us — we're excited to have you as a member.`
      + (plan ? ` Your ${plan} membership${from ? ` starts on ${from}` : " is now active"}.` : ""),
    renewal: `Thank you for renewing your membership with ${gym}. We're glad to have you with us for another term.`,
    upgrade: `Great news — your membership has been upgraded${plan ? ` to ${plan}` : ""}. Enjoy the extra benefits!`,
    downgrade: `As requested, your membership plan has been changed${plan ? ` to ${plan}` : ""}.`,
    addon: `Thank you for adding ${plan || "this service"} to your membership.`,
    daily: `Thank you for visiting ${gym} today — we hope you enjoyed your session!`,
    payment: `Thank you — we've received your payment of ${money(paid)}.`,
    request: `We've received your request${plan ? ` for ${plan}` : ""}. Our team will confirm it shortly; `
      + `the details below apply once it's approved.`,
    other: `Thank you for your payment to ${gym}.`,
  };

  const details: string[] = [];
  details.push(`${docLabel} no.: ${docNo}`);
  if (plan && kind !== "payment") details.push(`${kind === "addon" ? "Item" : kind === "daily" ? "Pass" : "Plan"}: ${plan}`);
  if (from && kind !== "payment" && kind !== "daily") details.push(`Valid: ${from}${till ? ` to ${till}` : ""}`);
  if (kind === "payment") {
    details.push(`Amount paid: ${money(paid)}`);
  } else {
    details.push(`Amount: ${money(amount)}`);
    if (due > 0 || paid < amount) details.push(`Paid: ${money(Math.min(paid, amount))}`);
  }
  if (due > 0) details.push(`Balance due: ${money(due)}${r.due_date ? ` (by ${day(r.due_date)})` : ""}`);
  if (r.payment_method && kind !== "request") details.push(`Payment method: ${r.payment_method}`);

  const lines = [
    `Dear ${name},`,
    "",
    intros[kind],
    "",
    details.map((d) => `• ${d}`).join("\n"),
    "",
    `Your ${docLabel.toLowerCase()} is attached as a PDF for your records.`,
  ];
  if (due > 0 && kind !== "request") {
    lines.push("", `Please settle the remaining balance of ${money(due)} at reception${r.due_date ? ` by ${day(r.due_date)}` : ""}.`);
  }
  lines.push(
    "",
    kind === "new"
      ? "If you have any questions or need help getting started, just reply to this email."
      : "If you have any questions, just reply to this email.",
    "",
    "Kind regards,",
    gym,
  );

  return { subject: subjects[kind], message: lines.join("\n"), kind };
}
