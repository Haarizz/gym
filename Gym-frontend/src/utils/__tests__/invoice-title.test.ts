import { describe, expect, it } from "vitest";
import { invoiceTitle, invoiceTitleArabic, isTaxInvoice, buildReceiptQrPayload, type CompanyDetails } from "../company-details";
import { buildFullReceiptHtml, type ReceiptPrintData } from "../receipt-invoice";
import { saleReceipt } from "../../pos/print/receiptModel";
import { DEFAULT_RECEIPT_TEMPLATE } from "../../pos/print/receiptTemplate";
import { buildSalesInvoiceDocument } from "../../components/print-templates/salesInvoicePrint";

const company = (trn: string): CompanyDetails => ({
  name: "Helenz", nameLocal: "", address: "Dubai", email: "", phone: "", logo: "", stamp: "", trn,
});
const withTrn = company("100123456700003");
const noTrn = company("");

const printData: ReceiptPrintData = {
  receiptNo: "R-1", dateStr: "09 Nov 2026", status: "Paid", billTo: { name: "Sara" },
  items: [{ description: "Monthly", type: "New", amount: 100 }] as ReceiptPrintData["items"],
  currencyCode: "AED", subtotalExclVat: 100, vatRatePercent: 0, vatAmount: 0, invoiceAmount: 100,
  totalPaid: 100, paymentMethod: "Cash", transactionDate: "09 Nov 2026",
};

describe("invoice title follows the TRN", () => {
  it("is a Tax Invoice only with a TRN", () => {
    expect(isTaxInvoice(withTrn)).toBe(true);
    expect(isTaxInvoice(noTrn)).toBe(false);
    expect(isTaxInvoice(company("   "))).toBe(false);
    expect(isTaxInvoice(null)).toBe(false);
    expect(invoiceTitle(withTrn)).toBe("Tax Invoice");
    expect(invoiceTitle(noTrn)).toBe("Invoice");
    expect(invoiceTitleArabic(withTrn)).toBe("فاتورة ضريبية");
    expect(invoiceTitleArabic(noTrn)).toBe("فاتورة");
  });

  it("prints the member invoice heading, page title and QR accordingly", () => {
    const taxed = buildFullReceiptHtml(printData, withTrn);
    expect(taxed).toContain('<div class="receipt-title">Tax Invoice فاتورة ضريبية</div>');
    const plain = buildFullReceiptHtml(printData, noTrn);
    expect(plain).toContain('<div class="receipt-title">Invoice فاتورة</div>');
    expect(plain).toContain("<title>Invoice - R-1</title>");
    expect(plain).not.toMatch(/Tax Invoice/i);
    expect(buildReceiptQrPayload(noTrn, "R-1")).toContain("Helenz - Invoice");
  });

  it("titles POS thermal receipts by TRN as well as VAT", () => {
    const sale = { taxAmount: 5, totalAmount: 105, transactionNumber: "S-1", createdAt: "2026-11-09T10:00:00Z", items: [], paymentMethod: "Cash" } as never;
    expect(saleReceipt(sale, withTrn, { ...DEFAULT_RECEIPT_TEMPLATE, title: "auto" }, "AED").title).toBe("TAX INVOICE");
    expect(saleReceipt(sale, noTrn, { ...DEFAULT_RECEIPT_TEMPLATE, title: "auto" }, "AED").title).toBe("RECEIPT");
    expect(saleReceipt(sale, noTrn, { ...DEFAULT_RECEIPT_TEMPLATE, title: "TAX INVOICE" }, "AED").title).toBe("INVOICE");
    expect(saleReceipt(sale, noTrn, { ...DEFAULT_RECEIPT_TEMPLATE, title: "SIMPLIFIED TAX INVOICE" }, "AED").title).toBe("INVOICE");
    expect(saleReceipt(sale, noTrn, { ...DEFAULT_RECEIPT_TEMPLATE, title: "SALES RECEIPT" }, "AED").title).toBe("SALES RECEIPT");
  });

  it("titles a taxed sales invoice Tax Invoice only with a TRN", () => {
    const inv = { taxAmount: 5, discountAmount: 0, footerDiscount: 0, invoiceNumber: "SI-1", invoiceDate: "2026-11-09", items: [] } as never;
    expect(buildSalesInvoiceDocument(inv, withTrn, "AED").title).toBe("Tax Invoice");
    expect(buildSalesInvoiceDocument(inv, noTrn, "AED").title).toBe("Sales Invoice");
  });
});
