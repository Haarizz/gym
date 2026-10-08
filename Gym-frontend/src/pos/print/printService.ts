// Print dispatcher: picks the right printer for this terminal and sends a document
// the best way that printer supports, falling back rather than failing a sale.
//   BROWSER  → 58/80mm HTML through the browser print dialog
//   AGENT    → raw ESC/POS through the local print agent; text mode if the driver
//              refuses RAW; browser print if the agent isn't running
//   NETWORK  → raw ESC/POS relayed by the backend to the printer's LAN IP
//   A4       → the Sales Invoice print template (Sales & Purchases › Print Templates)

import type { CompanyDetails } from "../../utils/company-details";
import type { CurrencyCode } from "../../utils/currency";
import { loadDefaultSettings, printDocumentHtml, printHtml } from "../../components/print-templates/purchasePrint";
import type { PrintDocument } from "../../components/print-templates/documentTemplate";
import { posApi } from "../api";
import { productsService } from "../../utils/supabase/products-service";
import { resolveBackendImageUrl } from "../../utils/resolve-image-url";
import type { PaperSize, PosPrinter, Sale } from "../types";
import { drawerKickEscPos, receiptEscPos, receiptText, reportEscPos, reportText, testPageEscPos, toBase64 } from "./escpos";
import { agentPrintEscPos, agentPrintText, listAgentPrinters, resolveAgent, type AgentPrinter } from "./printAgent";
import type { ReceiptModel, ReportDoc } from "./receiptModel";
import { printViaBrowser, receiptHtmlBody, reportHtmlBody, thermalDocument, type ThermalWidth } from "./thermalHtml";

export type PrintMode = "browser" | "agent" | "agent-text" | "network" | "a4";

export interface PrintOutcome {
  mode: PrintMode;
  printerName: string | null;
  /** Set when the job went out in a degraded mode the cashier should know about. */
  warning?: string;
}

export interface PrintContext {
  printers: PosPrinter[];
  terminalName: string | null;
  /** The terminal's hardware-profile receipt printer, when it has one. */
  preferredPrinterId?: number | null;
  format: PaperSize;
  copies?: number;
}

/**
 * This terminal's printer: its hardware profile's receipt printer, else an enabled one assigned to
 * the terminal (default first), else the branch default, else any.
 */
export function resolvePrinter(printers: PosPrinter[], terminalName: string | null, preferredPrinterId: number | null = null): PosPrinter | null {
  const enabled = printers.filter((p) => p.enabled && p.paperSize !== "A4");
  const preferred = preferredPrinterId != null ? enabled.find((p) => p.id === preferredPrinterId) : undefined;
  if (preferred) return preferred;
  const term = (terminalName || "").trim().toUpperCase();
  const forTerminal = enabled.filter((p) => p.terminalName && p.terminalName.trim().toUpperCase() === term);
  const branchWide = enabled.filter((p) => !p.terminalName);
  const pick = (list: PosPrinter[]) => list.find((p) => p.isDefault) ?? list[0] ?? null;
  return (term && pick(forTerminal)) || pick(branchWide) || null;
}

const widthOf = (paper: string): ThermalWidth => (paper.includes("58") ? 58 : 80);

/** Windows printers that are clearly not receipt printers. */
const NOT_THERMAL = /pdf|onenote|xps|fax|document writer|snagit|send to/i;
/** Names / drivers of common 58/80mm ESC/POS receipt printers. */
const THERMAL = /\bpos\b|pos-?\d|thermal|receipt|\btm-?[a-z]?\d|epson tm|xp-?\d|xprinter|rongta|rp-?\d{2,}|bixolon|srp-|star\s?(tsp|mc|sp)|tsp\d|citizen|ct-s|sewoo|gprinter|gp-|zjiang|hoin|munbyn|rugtek|sunmi|80\s?mm|58\s?mm|printer 80|printer 58/i;

/** The receipt printer among the agent's Windows printers: a thermal-looking one, default first. */
export function pickThermalPrinter(printers: AgentPrinter[]): AgentPrinter | null {
  const candidates = printers.filter((p) => p.name && !NOT_THERMAL.test(`${p.name} ${p.driverName}`) && THERMAL.test(`${p.name} ${p.driverName}`));
  return candidates.find((p) => p.isDefault) ?? candidates[0] ?? null;
}

const AUTO_TTL_MS = 60_000;
let autoCache: { at: number; printer: PosPrinter | null } | null = null;

/**
 * No POS printer configured: use the receipt printer the local print agent can see, so 80mm receipts
 * print straight to the till printer (BillBull behaviour) instead of the browser's A4 dialog.
 */
export async function autoAgentPrinter(paper: string): Promise<PosPrinter | null> {
  if (autoCache && Date.now() - autoCache.at < AUTO_TTL_MS) return autoCache.printer;
  let printer: PosPrinter | null = null;
  try {
    if (await resolveAgent()) {
      const found = pickThermalPrinter(await listAgentPrinters());
      if (found) {
        printer = {
          id: -1, name: found.name, connectionType: "AGENT", systemPrinterName: found.name, ipAddress: null, portNumber: null,
          paperSize: paper.includes("58") || /58/.test(found.name) ? "58mm" : "80mm", terminalName: null, isDefault: true,
          openDrawer: true, autoCut: true, enabled: true, lastTestAt: null, lastTestResult: null,
        };
      }
    }
  } catch {
    printer = null;
  }
  autoCache = { at: Date.now(), printer };
  return printer;
}

/**
 * A thermal print that could not reach a receipt printer. Like BillBull, 58/80 mm receipts never
 * drop silently into the browser's (A4) print dialog — the cashier is told why, and may choose
 * to print through the browser instead (`browserFallback`).
 */
export class ReceiptPrinterUnavailableError extends Error {
  browserFallback: () => Promise<void>;
  constructor(message: string, browserFallback: () => Promise<void>) {
    super(message);
    this.name = "ReceiptPrinterUnavailableError";
    this.browserFallback = browserFallback;
  }
}

export const NO_RECEIPT_PRINTER = "No receipt printer is set up for this terminal. Connect the thermal printer (with the BillBull print agent running) "
  + "or add it in POS Console › Printers.";
export const AGENT_NOT_RUNNING = "The BillBull print agent isn't running on this computer — start \"BillBull Print Agent\" from the Start menu and print again.";

async function sendRaw(printer: PosPrinter, build: () => Promise<Uint8Array>, text: () => string, title: string,
                       browserHtml: () => string, copies: number, terminalName: string | null = null): Promise<PrintOutcome> {
  if (printer.connectionType === "NETWORK") {
    const b64 = toBase64(await build());
    for (let i = 0; i < copies; i++) await posApi.printEscPos(printer.id, b64, title, { terminalName });
    return { mode: "network", printerName: printer.name };
  }
  if (printer.connectionType === "AGENT" && printer.systemPrinterName) {
    // The agent prints locally; the result is reported so the print log and device health cover it.
    const report = (success: boolean, message?: string, bytes?: number) =>
      posApi.reportPrintJob({ printerId: printer.id > 0 ? printer.id : null, title: printer.id > 0 ? title : `${title} (auto: ${printer.name})`, success, message, bytes, terminalName });
    try {
      const data = await build();
      const b64 = toBase64(data);
      for (let i = 0; i < copies; i++) await agentPrintEscPos(printer.systemPrinterName, b64, title);
      report(true, undefined, data.length);
      return { mode: "agent", printerName: printer.name };
    } catch (rawErr) {
      const msg = rawErr instanceof Error ? rawErr.message : String(rawErr);
      if (/not running/i.test(msg)) {
        report(false, "Print agent not running");
        throw new ReceiptPrinterUnavailableError(AGENT_NOT_RUNNING, () => printViaBrowser(browserHtml(), copies));
      }
      try {
        for (let i = 0; i < copies; i++) await agentPrintText(printer.systemPrinterName, text(), title, widthOf(printer.paperSize));
        report(true, `Text mode: ${msg}`);
        return { mode: "agent-text", printerName: printer.name, warning: `Printed in compatibility (text) mode — the driver refused raw ESC/POS: ${msg}` };
      } catch {
        report(false, msg);
        throw rawErr;
      }
    }
  }
  await printViaBrowser(browserHtml(), copies);
  return { mode: "browser", printerName: printer.name };
}

export async function printReceipt(rc: ReceiptModel, ctx: PrintContext, opts: { openDrawer?: boolean } = {}): Promise<PrintOutcome> {
  const requested = ctx.format === "A4" ? "80mm" : ctx.format;
  const printer = resolvePrinter(ctx.printers, ctx.terminalName, ctx.preferredPrinterId ?? null) ?? await autoAgentPrinter(requested);
  const paper = printer?.paperSize ?? requested;
  const copies = Math.max(1, ctx.copies ?? 1);
  const html = () => thermalDocument(receiptHtmlBody(rc, widthOf(paper)), widthOf(paper), `${rc.title} ${rc.number}`, rc.template.fontScale);
  if (!printer) throw new ReceiptPrinterUnavailableError(NO_RECEIPT_PRINTER, () => printViaBrowser(html(), copies));
  if (printer.connectionType === "BROWSER") {
    // Only when a printer has been set up as "Browser" on purpose.
    await printViaBrowser(html(), copies);
    return { mode: "browser", printerName: printer.name };
  }
  return sendRaw(printer,
    () => receiptEscPos(rc, paper, { cut: printer.autoCut, openDrawer: Boolean(opts.openDrawer && printer.openDrawer) }),
    () => receiptText(rc, paper), `${rc.title} ${rc.number}`, html, copies, ctx.terminalName);
}

export async function printReport(doc: ReportDoc, ctx: PrintContext): Promise<PrintOutcome> {
  const printer = resolvePrinter(ctx.printers, ctx.terminalName, ctx.preferredPrinterId ?? null) ?? await autoAgentPrinter("80mm");
  const paper = printer?.paperSize ?? "80mm";
  const html = () => thermalDocument(reportHtmlBody(doc, widthOf(paper)), widthOf(paper), `${doc.title} ${doc.number}`);
  if (!printer) throw new ReceiptPrinterUnavailableError(NO_RECEIPT_PRINTER, () => printViaBrowser(html()));
  if (printer.connectionType === "BROWSER") {
    await printViaBrowser(html());
    return { mode: "browser", printerName: printer.name };
  }
  return sendRaw(printer, () => reportEscPos(doc, paper, { cut: printer.autoCut }), () => reportText(doc, paper),
    `${doc.title} ${doc.number}`, html, 1, ctx.terminalName);
}

/** Pulse the cash drawer wired to this terminal's printer. Returns false when no printer can do it. */
export async function kickDrawer(ctx: PrintContext): Promise<boolean> {
  const printer = resolvePrinter(ctx.printers, ctx.terminalName, ctx.preferredPrinterId ?? null) ?? await autoAgentPrinter("80mm");
  if (!printer || !printer.openDrawer || printer.connectionType === "BROWSER") return false;
  const b64 = toBase64(drawerKickEscPos());
  if (printer.connectionType === "NETWORK") await posApi.printEscPos(printer.id, b64, "Drawer", { jobType: "DRAWER_KICK", terminalName: ctx.terminalName });
  else if (printer.systemPrinterName) await agentPrintEscPos(printer.systemPrinterName, b64, "Drawer");
  else return false;
  return true;
}

export async function testPrinter(printer: PosPrinter): Promise<PrintOutcome> {
  const fakeHtml = () => thermalDocument(`<div class="r"><div class="c name">GymBios</div><div class="c title">POS PRINTER TEST</div><hr/><div class="row"><span>Printer</span><span>${printer.name}</span></div><div class="row"><span>Paper</span><span>${printer.paperSize}</span></div><div class="row"><span>Time</span><span>${new Date().toLocaleString("en-GB")}</span></div></div>`, widthOf(printer.paperSize), "Printer test");
  const outcome = printer.connectionType === "BROWSER"
    ? (await printViaBrowser(fakeHtml()), { mode: "browser" as const, printerName: printer.name })
    : await sendRaw(printer, async () => testPageEscPos(printer.name, printer.paperSize, printer.openDrawer),
        () => `GymBios POS PRINTER TEST\nPrinter: ${printer.name}\nPaper: ${printer.paperSize}\n${new Date().toLocaleString("en-GB")}`,
        "Printer test", fakeHtml, 1);
  return outcome;
}

// ── A4 tax invoice ──────────────────────────────────────────────────────────

export function saleA4Document(sale: Sale, company: CompanyDetails, currencyCode: CurrencyCode, isReprint = false,
  images: Map<number, string> = new Map()): PrintDocument {
  const date = new Date(sale.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return {
    docType: "sales-invoice",
    title: `${sale.taxAmount > 0 ? "Tax Invoice" : "Sales Invoice"}${isReprint ? " (Copy)" : ""}`,
    number: sale.transactionNumber,
    date,
    company,
    currencyCode,
    supplier: {
      name: sale.memberName || "Walk-in Customer",
      contact: sale.memberCode ? `Member ID: ${sale.memberCode}` : undefined,
      phone: sale.memberPhone ?? undefined,
    },
    meta: [
      { setting: "showDocNumber", label: "Invoice No.", value: sale.transactionNumber },
      { setting: "showDocDate", label: "Invoice Date", value: date },
      { setting: "showPaymentTerms", label: "Payment", value: sale.paymentSummary },
      { setting: "showSalesperson", label: "Cashier", value: sale.cashierName ?? undefined },
      { setting: "showPreparedBy", label: "Terminal", value: sale.terminalName ?? undefined },
    ],
    lines: sale.items.map((i) => ({
      name: i.productName,
      code: i.productSku ?? undefined,
      sku: i.productSku ?? undefined,
      barcode: i.barcode ?? undefined,
      image: images.get(i.productId),
      qty: i.quantity,
      price: i.unitPrice,
      discountPercent: i.discountPercent,
      discountAmount: i.discountAmount + i.billDiscountShare,
      taxable: i.taxableAmount,
      taxPercent: i.taxRate ?? 0,
      taxAmount: i.taxAmount,
      total: i.lineTotal,
    })),
    totals: {
      subtotal: sale.subtotal,
      discount: sale.discountAmount,
      taxable: sale.taxableAmount,
      tax: sale.taxAmount,
      shipping: 0,
      grandTotal: sale.totalAmount,
      paid: Math.max(0, sale.totalAmount - sale.creditOutstanding - sale.refundedAmount),
      balance: sale.creditOutstanding,
    },
    notes: sale.notes ?? undefined,
  };
}

/** First photo of each product on the sale (a sale line stores no image), for the A4 photo column. */
async function productImages(sale: Sale): Promise<Map<number, string>> {
  const ids = [...new Set(sale.items.map((i) => i.productId).filter((id): id is number => id != null))];
  const found = await Promise.all(ids.map((id) => productsService.getProductById(id)
    .then((p) => [id, resolveBackendImageUrl(p.imageUrls?.[0])] as const)
    .catch(() => [id, undefined] as const)));
  return new Map(found.filter((e): e is readonly [number, string] => Boolean(e[1])));
}

export async function printSaleA4(sale: Sale, company: CompanyDetails, currencyCode: CurrencyCode, isReprint = false): Promise<PrintOutcome> {
  const settings = await loadDefaultSettings("sales-invoice");
  const images = settings.colProductImage ? await productImages(sale) : new Map<number, string>();
  await printHtml(printDocumentHtml(settings, saleA4Document(sale, company, currencyCode, isReprint, images)), settings.paperSize);
  return { mode: "a4", printerName: null };
}
