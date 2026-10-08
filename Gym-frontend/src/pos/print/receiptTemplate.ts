// Receipt designer settings (POS Console › Receipt). Stored as JSON in the branch's
// POS settings (receipt_template); unknown/missing keys fall back to these defaults so
// templates saved before a field existed keep working. Applies to 58mm/80mm receipts,
// both the browser-printed HTML and the raw ESC/POS stream.

export interface ReceiptTemplate {
  /** Extra line(s) under the company name, e.g. a slogan or a bilingual (Arabic) name. */
  headerText: string;
  footerText: string;
  showLogo: boolean;
  showCompanyDetails: boolean;
  showTrn: boolean;
  /** Title printed at the top; "auto" = "TAX INVOICE" when the sale carries VAT, else "RECEIPT". */
  title: "auto" | "TAX INVOICE" | "SIMPLIFIED TAX INVOICE" | "RECEIPT" | "SALES RECEIPT";
  showCashier: boolean;
  showTerminal: boolean;
  showCustomer: boolean;
  showItemSku: boolean;
  showItemVat: boolean;
  showVatSummary: boolean;
  showPaymentDetails: boolean;
  showSavings: boolean;
  showQrCode: boolean;
  showBarcode: boolean;
  showCreditBalance: boolean;
  showReturnPolicy: boolean;
  returnPolicyText: string;
  fontScale: number;
}

export const DEFAULT_RECEIPT_TEMPLATE: ReceiptTemplate = {
  headerText: "",
  footerText: "Thank you for training with us!\nPlease keep this receipt for returns.",
  showLogo: true,
  showCompanyDetails: true,
  showTrn: true,
  title: "auto",
  showCashier: true,
  showTerminal: true,
  showCustomer: true,
  showItemSku: false,
  showItemVat: false,
  showVatSummary: true,
  showPaymentDetails: true,
  showSavings: true,
  showQrCode: true,
  showBarcode: true,
  showCreditBalance: true,
  showReturnPolicy: false,
  returnPolicyText: "Unopened items can be returned within 7 days with this receipt.",
  fontScale: 1,
};

export function parseReceiptTemplate(json: string | null | undefined): ReceiptTemplate {
  if (!json) return { ...DEFAULT_RECEIPT_TEMPLATE };
  try {
    const parsed = JSON.parse(json);
    return { ...DEFAULT_RECEIPT_TEMPLATE, ...(parsed && typeof parsed === "object" ? parsed : {}) };
  } catch {
    return { ...DEFAULT_RECEIPT_TEMPLATE };
  }
}

export const serializeReceiptTemplate = (t: ReceiptTemplate) => JSON.stringify(t);
