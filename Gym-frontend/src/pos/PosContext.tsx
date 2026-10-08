import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getCompanyDetails, type CompanyDetails } from "../utils/company-details";
import { useCurrency, type CurrencyCode } from "../utils/currency";
import { posApi } from "./api";
import type { DayStatus, PosPrinter, PosSession, PosSettings, PosTerminal, Sale, SaleReturn } from "./types";
import { deviceProfile, readTerminalCode, writeTerminalCode } from "./terminalIdentity";
import { getTaxDefaults } from "../utils/supabase/tax-defaults-service";
import { PosApiError } from "./api";
import { parseReceiptTemplate, type ReceiptTemplate } from "./print/receiptTemplate";
import { returnReceipt, saleReceipt, type ReportDoc } from "./print/receiptModel";
import { kickDrawer, printReceipt, printReport, printSaleA4, ReceiptPrinterUnavailableError, type PrintContext, type PrintOutcome } from "./print/printService";
import { warmAgent } from "./print/printAgent";

export type PosView = "dashboard" | "terminal" | "x-report" | "z-report" | "customers" | "console" | "analytics";

const TERMINAL_KEY = "gymbios.pos.terminalName";

function readTerminal(): string {
  try {
    return localStorage.getItem(TERMINAL_KEY) || "";
  } catch {
    return "";
  }
}

const DEFAULT_SETTINGS: PosSettings = {
  id: null, branchId: null, hasSupervisorPin: false,
  requireSupervisorForVoid: false, requireSupervisorForReturn: true, requireSupervisorForPriceOverride: true,
  requireSupervisorForCashOut: false, requireSupervisorForReprint: false, requireSupervisorForForceClose: true,
  allowPriceOverride: true, maxCashierDiscountPercent: 10, taxInclusive: false, requireCustomer: false,
  allowCreditSales: true, requireCashMovementCategory: false, cashInCategories: [], cashOutCategories: [],
  cashVarianceThreshold: 0, denominations: [1000, 500, 200, 100, 50, 20, 10, 5, 1, 0.5, 0.25],
  autoPrintReceipt: true, receiptCopies: 1, defaultPrintFormat: "80mm", openDrawerOnCash: true, idleLockMinutes: 0,
  layout: "classic", hideCategoryPanel: false, showProductImages: true, showStockOnCards: true,
  receiptShareEnabled: true, zReportAccess: "SUPERVISOR", receiptTemplate: null,
  businessDayEnabled: false, businessDayStart: null, businessDayEnd: null, businessDayExtensionMinutes: 0,
  timeZone: null, requireSupervisorForVariance: true,
  requireTerminalApproval: false, maxTerminals: 10, offlineThresholdMinutes: 15,
  currentUserIsSupervisor: false, currentUsername: "", currentUserDisplayName: "",
};

interface PosContextValue {
  view: PosView;
  go: (v: PosView) => void;
  /** Session shown by the X-report screen; null = the caller's own session. */
  xSessionId: number | null;
  showXReport: (sessionId?: number | null) => void;
  /** Business date the Z-report screen opens on; null = today. */
  zReportDate: string | null;
  showZReport: (date?: string | null) => void;
  loading: boolean;
  /** Set when POS settings could not be loaded — the POS can't run until it's resolved. */
  setupError: string | null;
  retrySetup: () => void;
  settings: PosSettings;
  setSettings: (s: PosSettings) => void;
  template: ReceiptTemplate;
  session: PosSession | null;
  refreshSession: () => Promise<PosSession | null>;
  /** Business-day phase, pending Day Close and sessions needing closure (refreshed every minute). */
  dayStatus: DayStatus | null;
  refreshDayStatus: () => Promise<void>;
  setSession: (s: PosSession | null) => void;
  printers: PosPrinter[];
  refreshPrinters: () => Promise<void>;
  terminalName: string;
  setTerminalName: (n: string) => void;
  /** This browser's registered terminal (null until registered, or when registration failed). */
  terminal: PosTerminal | null;
  terminalError: string | null;
  refreshTerminal: () => Promise<PosTerminal | null>;
  company: CompanyDetails | null;
  currencyCode: CurrencyCode;
  printCtx: PrintContext;
  /** Prints a sale receipt in the given (or default) format; reports outcome via toast. */
  printSale: (sale: Sale, opts?: { reprint?: boolean; format?: "80mm" | "58mm" | "A4"; openDrawer?: boolean; copies?: number }) => Promise<PrintOutcome | null>;
  printReturn: (ret: SaleReturn) => Promise<PrintOutcome | null>;
  printDoc: (doc: ReportDoc) => Promise<PrintOutcome | null>;
  openDrawer: (reason: string) => Promise<boolean>;
}

const Ctx = createContext<PosContextValue | null>(null);

export function usePos() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePos must be used inside <PosProvider>");
  return c;
}

/** A failed print: a receipt printer that can't be reached offers the browser as an explicit choice. */
function reportPrintError(e: unknown) {
  if (e instanceof ReceiptPrinterUnavailableError) {
    const fallback = e.browserFallback;
    toast.error(e.message, {
      duration: 12000,
      action: { label: "Print in browser", onClick: () => { fallback().catch(() => undefined); } },
    });
    return;
  }
  toast.error(`Print failed: ${(e as Error).message}`);
}

function reportOutcome(o: PrintOutcome | null) {
  if (o?.warning) toast.warning(o.warning);
}

export function PosProvider({ children }: { children: React.ReactNode }) {
  const { currencyCode } = useCurrency();
  const [view, setView] = useState<PosView>("dashboard");
  const [xSessionId, setXSessionId] = useState<number | null>(null);
  const showXReport = useCallback((id?: number | null) => { setXSessionId(id ?? null); setView("x-report"); }, []);
  const [zReportDate, setZReportDate] = useState<string | null>(null);
  const showZReport = useCallback((date?: string | null) => { setZReportDate(date ?? null); setView("z-report"); }, []);
  const [loading, setLoading] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupAttempt, setSetupAttempt] = useState(0);
  const retrySetup = useCallback(() => setSetupAttempt((n) => n + 1), []);
  const [settings, setSettings] = useState<PosSettings>(DEFAULT_SETTINGS);
  const [session, setSession] = useState<PosSession | null>(null);
  const [printers, setPrinters] = useState<PosPrinter[]>([]);
  const [companyRaw, setCompany] = useState<CompanyDetails | null>(null);
  // Not VAT registered (Settings › Tax Configuration): receipts carry no TRN (and no VAT is charged).
  const [vatRegistered, setVatRegistered] = useState(true);
  const company = useMemo(() => (companyRaw && !vatRegistered ? { ...companyRaw, trn: "" } : companyRaw), [companyRaw, vatRegistered]);
  const [terminalName, setTerminalNameState] = useState<string>(readTerminal);
  const [dayStatus, setDayStatus] = useState<DayStatus | null>(null);
  const [terminal, setTerminal] = useState<PosTerminal | null>(null);
  const [terminalError, setTerminalError] = useState<string | null>(null);

  /** Registers this browser (or recognises it again) as a terminal of the active branch. */
  const refreshTerminal = useCallback(async () => {
    if (settings.branchId == null && settings.id == null && !settings.currentUsername) return null;
    const branch = settings.branchId ?? 0;
    try {
      const device = deviceProfile();
      const reg = await posApi.registerTerminal({
        terminalCode: readTerminalCode(branch), deviceFingerprint: device.fingerprint, deviceInfo: device.userAgent,
        operatingSystem: device.os, browser: device.browser, name: readTerminal() || null,
      });
      writeTerminalCode(branch, reg.terminal.terminalCode);
      setTerminal(reg.terminal);
      setTerminalError(null);
      return reg.terminal;
    } catch (e) {
      setTerminal(null);
      setTerminalError((e as Error).message);
      return null;
    }
  }, [settings.branchId, settings.id, settings.currentUsername]);

  useEffect(() => {
    if (loading) return;
    refreshTerminal();
  }, [loading, refreshTerminal]);

  // Heartbeat: keeps the terminal "online" in the console; re-registers if it was removed.
  useEffect(() => {
    if (!terminal) return;
    const code = terminal.terminalCode;
    const t = setInterval(() => {
      posApi.terminalHeartbeat(code).then(setTerminal).catch((e) => {
        if (e instanceof PosApiError && e.status === 404) refreshTerminal();
      });
    }, 60_000);
    return () => clearInterval(t);
  }, [terminal?.terminalCode, refreshTerminal]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshDayStatus = useCallback(async () => {
    try {
      setDayStatus(await posApi.dayStatus());
    } catch {
      /* keep the last known status */
    }
  }, []);

  useEffect(() => {
    refreshDayStatus();
    const t = setInterval(refreshDayStatus, 60_000);
    return () => clearInterval(t);
  }, [refreshDayStatus, session?.id, session?.status, session?.closingStartedAt]);

  const refreshSession = useCallback(async () => {
    try {
      const s = await posApi.activeSession();
      setSession(s);
      return s;
    } catch {
      setSession(null);
      return null;
    }
  }, []);

  const refreshPrinters = useCallback(async () => {
    try {
      setPrinters(await posApi.printers());
    } catch {
      setPrinters([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [st] = await Promise.all([
        posApi.getSettings().catch((e) => {
          if (!cancelled) setSetupError(e?.message || "Could not load POS settings.");
          return null;
        }),
        refreshSession(),
        refreshPrinters(),
        getCompanyDetails().then((c) => { if (!cancelled) setCompany(c); }).catch(() => undefined),
      ]);
      if (!cancelled && st) { setSettings(st); setSetupError(null); }
      if (!cancelled) setLoading(false);
    })();
    warmAgent();
    return () => { cancelled = true; };
  }, [refreshSession, refreshPrinters, setupAttempt]);

  const setTerminalName = useCallback((n: string) => {
    setTerminalNameState(n);
    try { localStorage.setItem(TERMINAL_KEY, n); } catch { /* storage blocked */ }
  }, []);
  // A registered terminal's name comes from the server (renamed in POS Console › Terminals).
  const effectiveTerminalName = terminal?.name || terminalName;

  const template = useMemo(() => parseReceiptTemplate(settings.receiptTemplate), [settings.receiptTemplate]);
  const printCtx: PrintContext = useMemo(() => ({
    printers,
    terminalName: effectiveTerminalName || null,
    preferredPrinterId: terminal?.receiptPrinterId ?? null,
    format: settings.defaultPrintFormat,
    copies: settings.receiptCopies,
  }), [printers, effectiveTerminalName, terminal?.receiptPrinterId, settings.defaultPrintFormat, settings.receiptCopies]);

  useEffect(() => {
    if (loading) return;
    getTaxDefaults().then((d) => setVatRegistered(d.vatRegistered)).catch(() => undefined);
  }, [loading]);
  const companyOrDefault = useCallback(async () => {
    const c = company ?? (await getCompanyDetails());
    return vatRegistered ? c : { ...c, trn: "" };
  }, [company, vatRegistered]);

  const printSale = useCallback<PosContextValue["printSale"]>(async (sale, opts = {}) => {
    try {
      const c = await companyOrDefault();
      const format = opts.format ?? settings.defaultPrintFormat;
      const outcome = format === "A4"
        ? await printSaleA4(sale, c, currencyCode, opts.reprint)
        : await printReceipt(saleReceipt(sale, c, template, currencyCode, { isReprint: opts.reprint }),
            { ...printCtx, format, copies: opts.copies ?? printCtx.copies }, { openDrawer: opts.openDrawer });
      reportOutcome(outcome);
      posApi.logEvent("RECEIPT_PRINT", `${sale.transactionNumber} · ${outcome.mode}`, { referenceType: "SaleTransaction", referenceId: sale.id, referenceNumber: sale.transactionNumber, terminalName });
      return outcome;
    } catch (e) {
      reportPrintError(e);
      return null;
    }
  }, [companyOrDefault, settings.defaultPrintFormat, currencyCode, template, printCtx, terminalName]);

  const printReturn = useCallback<PosContextValue["printReturn"]>(async (ret) => {
    try {
      const c = await companyOrDefault();
      const outcome = await printReceipt(returnReceipt(ret, c, template, currencyCode), { ...printCtx, copies: 1 });
      reportOutcome(outcome);
      return outcome;
    } catch (e) {
      reportPrintError(e);
      return null;
    }
  }, [companyOrDefault, template, currencyCode, printCtx]);

  const printDoc = useCallback<PosContextValue["printDoc"]>(async (doc) => {
    try {
      const outcome = await printReport(doc, printCtx);
      reportOutcome(outcome);
      return outcome;
    } catch (e) {
      reportPrintError(e);
      return null;
    }
  }, [printCtx]);

  const openDrawer = useCallback(async (reason: string) => {
    try {
      const ok = await kickDrawer(printCtx);
      if (ok) posApi.logEvent("DRAWER_OPEN", reason, { posSessionId: session?.id ?? null, terminalName });
      return ok;
    } catch (e) {
      toast.error(`Could not open the drawer: ${(e as Error).message}`);
      return false;
    }
  }, [printCtx, session?.id, terminalName]);

  const value: PosContextValue = {
    view, go: setView, xSessionId, showXReport, zReportDate, showZReport, loading, setupError, retrySetup, settings, setSettings, template, session, refreshSession, setSession,
    dayStatus, refreshDayStatus,
    printers, refreshPrinters, terminalName: effectiveTerminalName, setTerminalName, company, currencyCode, printCtx,
    printSale, printReturn, printDoc, openDrawer, terminal, terminalError, refreshTerminal,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
