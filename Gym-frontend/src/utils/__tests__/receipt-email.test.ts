import { describe, expect, it } from "vitest";
import { composeReceiptEmail, receiptEmailKind } from "../receipt-email";
import type { Receipt } from "../supabase/receipts-service";

const base: Receipt = {
  id: "1", receipt_no: "RCP-0001", invoice_no: "INV-0001", transaction_date: "2026-11-12T10:00:00",
  member_db_id: "5", member_id: "GYM001", member_name: "sham kumar", member_phone: "",
  transaction_type: "New", amount: 1050, payment_method: "Card", status: "Paid", plan_name: "Gold Monthly",
  valid_from: "2026-11-12T00:00:00", valid_till: "2026-12-11T00:00:00", paid_amount: 1050, due_amount: 0,
  created_at: "", updated_at: "",
};
const compose = (r: Partial<Receipt>, document: "RECEIPT" | "INVOICE" = "RECEIPT") =>
  composeReceiptEmail({ receipt: { ...base, ...r }, document, invoiceLabel: "Tax Invoice", gymName: "Helenz Fitness", currencyPrefix: "AED " });

describe("receiptEmailKind", () => {
  it("tells renewals, upgrades and downgrades apart", () => {
    expect(receiptEmailKind({ transaction_type: "Renewal", renewal_kind: "Renewal" })).toBe("renewal");
    expect(receiptEmailKind({ transaction_type: "Renewal", renewal_kind: "Upgrade" })).toBe("upgrade");
    expect(receiptEmailKind({ transaction_type: "Renewal", renewal_kind: "Downgrade" })).toBe("downgrade");
    expect(receiptEmailKind({ transaction_type: "Renewal", renewal_kind: null })).toBe("renewal");
  });
  it("maps the other receipt types", () => {
    expect(receiptEmailKind({ transaction_type: "New" })).toBe("new");
    expect(receiptEmailKind({ transaction_type: "Add-on" })).toBe("addon");
    expect(receiptEmailKind({ transaction_type: "Daily Entry" })).toBe("daily");
    expect(receiptEmailKind({ transaction_type: "Payment" })).toBe("payment");
    expect(receiptEmailKind({ transaction_type: "New", approval_status: "PENDING" })).toBe("request");
  });
});

describe("composeReceiptEmail", () => {
  it("welcomes a new member with the plan, dates and amount", () => {
    const { subject, message } = compose({});
    expect(subject).toBe("Welcome to Helenz Fitness — your receipt RCP-0001");
    expect(message).toContain("Dear Sham Kumar,");
    expect(message).toContain("Plan: Gold Monthly");
    expect(message).toContain("Valid: 12 Nov 2026 to 11 Dec 2026");
    expect(message).toContain("Amount: AED 1,050.00");
    expect(message).not.toContain("Balance due");
  });

  it("uses the invoice number and label for an invoice", () => {
    const { subject, message } = compose({ transaction_type: "Renewal", renewal_kind: "Renewal" }, "INVOICE");
    expect(subject).toBe("Your membership has been renewed — Tax Invoice INV-0001");
    expect(message).toContain("Tax Invoice no.: INV-0001");
    expect(message).toContain("Your tax invoice is attached");
  });

  it("words upgrades and downgrades with the new plan", () => {
    expect(compose({ transaction_type: "Renewal", renewal_kind: "Upgrade", plan_name: "Platinum" }).subject)
      .toBe("Your membership has been upgraded to Platinum — Receipt RCP-0001");
    expect(compose({ transaction_type: "Renewal", renewal_kind: "Downgrade", plan_name: "Basic" }).message)
      .toContain("your membership plan has been changed to Basic");
  });

  it("shows the balance due on a part-paid bill", () => {
    const { message } = compose({ paid_amount: 500, due_amount: 550, due_date: "2026-11-30T00:00:00" });
    expect(message).toContain("Paid: AED 500.00");
    expect(message).toContain("Balance due: AED 550.00 (by 30 Nov 2026)");
    expect(message).toContain("Please settle the remaining balance of AED 550.00 at reception by 30 Nov 2026.");
  });

  it("thanks for a payment towards an earlier bill without plan or validity lines", () => {
    const { subject, message } = compose({ transaction_type: "Payment", invoice_no: undefined, amount: 300, paid_amount: 300 });
    expect(subject).toBe("Payment received — Receipt RCP-0001");
    expect(message).toContain("we've received your payment of AED 300.00");
    expect(message).not.toContain("Plan:");
    expect(message).not.toContain("Valid:");
  });

  it("never calls a pending request paid", () => {
    const { subject, message } = compose({ approval_status: "PENDING" });
    expect(subject).toBe("We've received your request — Receipt RCP-0001");
    expect(message).not.toContain("Payment method");
  });
});
