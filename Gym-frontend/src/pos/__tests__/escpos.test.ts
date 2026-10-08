// ESC/POS byte-stream generation for thermal receipts and reports.
import { describe, expect, it } from "vitest";
import { receiptEscPos, reportEscPos, drawerKickEscPos } from "../print/escpos";
import { DEFAULT_RECEIPT_TEMPLATE } from "../print/receiptTemplate";
import type { ReceiptModel } from "../print/receiptModel";

const company = { name: "GymBios Fitness", address: "Dubai Marina, Dubai", email: "", phone: "+971 4 000 0000", logo: "", stamp: "", trn: "100123456700003" };
const rc: ReceiptModel = {
  kind: "SALE", title: "TAX INVOICE", number: "TXN-0000000001", reference: null, dateTime: "06 Oct 2026, 10:00", isReprint: true,
  company, currency: "AED", template: { ...DEFAULT_RECEIPT_TEMPLATE }, cashier: "Front Desk", terminal: "Counter 1",
  customer: { name: "Aïsha Khan", code: "GYM-0001", phone: null },
  lines: [{ name: "Whey Protein Isolate 2kg Chocolate Flavour Extra Long Name", sku: "WHEY", qty: 2, unitPrice: 120, gross: 240, discount: 12, discountPercent: 5, amount: 228, vatRate: 5, returnedQty: 0 }],
  subtotal: 240, discount: 12, promo: null, taxable: 228, vat: 11.4, taxInclusive: false, total: 239.4, hasTax: true,
  payments: [{ label: "Cash", amount: 239.4 }], tendered: 300, change: 60.6, creditAmount: 0, creditOutstanding: 0, refunded: 0,
  notes: null, qrPayload: "GymBios - Tax Invoice\nNo: TXN-0000000001", barcode: "TXN-0000000001",
};


describe("ESC/POS", () => {
  it("builds a well-formed receipt stream", async () => {
    const bytes = await receiptEscPos(rc, "80mm", { openDrawer: true });
    expect([...bytes.slice(0, 2)]).toEqual([0x1b, 0x40]);                 // ESC @
    const tail = [...bytes.slice(-4)];
    expect(tail).toEqual([0x1d, 0x56, 66, 120]);                            // feed-then-cut
    const textual = Buffer.from(bytes).toString("latin1");
    expect(textual).toContain("TAX INVOICE");
    expect(textual).toContain("*** COPY / REPRINT ***");
    expect(textual).toContain("AED 239.40");
    expect(textual).toContain("Aisha Khan");                                 // accent folded for the code page
    expect(textual.split("\n").every((l) => l.replace(/[\x00-\x1f]/g, "").length <= 48 + 8)).toBe(true);
    expect(textual).toContain("\x1b\x70\x00");                              // drawer kick
    expect(textual).toContain("\x1d\x6b\x49");                              // Code128 barcode
    expect(textual).toContain("\x1d\x28\x6b");                              // native QR
    const report = await reportEscPos({ title: "X-REPORT", number: "SES-1", meta: [{ label: "Session", value: "SES-1" }], sections: [{ heading: "Tenders", rows: [{ label: "Cash", value: "AED 1.00" }] }], footer: null, company, template: rc.template, barcode: null }, "58mm");
    expect(Buffer.from(report).toString("latin1")).toContain("TENDERS");
    expect([...drawerKickEscPos()]).toEqual([0x1b, 0x40, 0x1b, 0x70, 0, 25, 250]);
  });

});
