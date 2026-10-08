import { describe, expect, it, vi } from "vitest";

// The print dispatcher pulls in browser-only print and API modules; only the pure picker is tested here.
vi.mock("../api", () => ({ posApi: {} }));
vi.mock("../print/printAgent", () => ({ agentPrintEscPos: vi.fn(), agentPrintText: vi.fn(), listAgentPrinters: vi.fn(), resolveAgent: vi.fn() }));
vi.mock("../../components/print-templates/purchasePrint", () => ({ loadDefaultSettings: vi.fn(), printDocumentHtml: vi.fn(), printHtml: vi.fn() }));
vi.mock("../print/thermalHtml", () => ({ printViaBrowser: vi.fn(async () => undefined), receiptHtmlBody: () => "", reportHtmlBody: () => "", thermalDocument: () => "<html></html>" }));

import { pickThermalPrinter, printReport, ReceiptPrinterUnavailableError, resolvePrinter } from "../print/printService";
import { printViaBrowser } from "../print/thermalHtml";
import type { PosPrinter } from "../types";

const printer = (id: number, extra: Partial<PosPrinter> = {}): PosPrinter => ({
  id, name: `P${id}`, connectionType: "NETWORK", systemPrinterName: null, ipAddress: "192.168.1.5", portNumber: 9100,
  paperSize: "80mm", terminalName: null, isDefault: false, openDrawer: false, autoCut: true, enabled: true,
  lastTestAt: null, lastTestResult: null, ...extra,
});

describe("resolvePrinter", () => {
  const list = [
    printer(1, { isDefault: true }),
    printer(2, { terminalName: "Front Desk" }),
    printer(3, { terminalName: "Front Desk", isDefault: true }),
    printer(4, { terminalName: "Cafe" }),
    printer(5, { enabled: false }),
  ];

  it("uses the hardware profile's receipt printer first", () => {
    expect(resolvePrinter(list, "Front Desk", 4)?.id).toBe(4);
  });

  it("ignores a preferred printer that is disabled or unknown", () => {
    expect(resolvePrinter(list, "Front Desk", 5)?.id).toBe(3);
    expect(resolvePrinter(list, "Front Desk", 99)?.id).toBe(3);
  });

  it("falls back to the terminal's own printer, then the branch default", () => {
    expect(resolvePrinter(list, "front desk")?.id).toBe(3);
    expect(resolvePrinter(list, "Back Office")?.id).toBe(1);
    expect(resolvePrinter(list, null)?.id).toBe(1);
  });
});

describe("pickThermalPrinter", () => {
  const wp = (name: string, driverName = "", isDefault = false) => ({ name, driverName, portName: "USB001", status: "Normal", isDefault });

  it("ignores PDF / OneNote / XPS queues", () => {
    expect(pickThermalPrinter([wp("Microsoft Print to PDF", "Microsoft Print To PDF", true), wp("OneNote (Desktop)", "Send to Microsoft OneNote 16 Driver")])).toBeNull();
  });

  it("finds common receipt printers by name or driver", () => {
    expect(pickThermalPrinter([wp("Microsoft Print to PDF", "", true), wp("EPSON TM-T82 Receipt")])?.name).toBe("EPSON TM-T82 Receipt");
    expect(pickThermalPrinter([wp("Counter printer", "XP-80C")])?.name).toBe("Counter printer");
    expect(pickThermalPrinter([wp("POS-80")])?.name).toBe("POS-80");
    expect(pickThermalPrinter([wp("RONGTA RP850")])?.name).toBe("RONGTA RP850");
  });

  it("prefers the Windows default when several thermal printers exist", () => {
    expect(pickThermalPrinter([wp("POS-58"), wp("POS-80", "", true)])?.name).toBe("POS-80");
  });
});

describe("thermal printing never falls back silently (BillBull)", () => {
  const doc = { title: "X-Report", number: "SES-1", lines: [] } as unknown as Parameters<typeof printReport>[0];

  it("refuses when no receipt printer can be found, offering the browser as an explicit choice", async () => {
    const err = await printReport(doc, { printers: [], terminalName: "Front Desk", format: "80mm" }).catch((e) => e);
    expect(err).toBeInstanceOf(ReceiptPrinterUnavailableError);
    expect(printViaBrowser).not.toHaveBeenCalled();
    await (err as ReceiptPrinterUnavailableError).browserFallback();
    expect(printViaBrowser).toHaveBeenCalledTimes(1);
  });

  it("uses the browser only for a printer set up as Browser", async () => {
    vi.mocked(printViaBrowser).mockClear();
    const out = await printReport(doc, { printers: [printer(7, { connectionType: "BROWSER" })], terminalName: null, format: "80mm" });
    expect(out.mode).toBe("browser");
    expect(printViaBrowser).toHaveBeenCalledTimes(1);
  });
});
