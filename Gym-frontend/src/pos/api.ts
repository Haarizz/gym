import { authService } from "../utils/supabase/auth-service";
import type {
  Analytics, AuditLog, CashMovement, CheckoutRequest, CreditPayment, CustomerCredit, DayClose, HeldSale,
  PageMeta, PosPrinter, PosSession, PosSettings, ReturnRequest, Sale, SaleReturn, SalesPage, SessionsPage,
  SettingsUpdate, XReport, ZReport, DiscountRule, WalletBalance, DayStatus,
  CashCategory, Correction, CorrectionDashboard, CorrectionRequest,
  PosTerminal, PosCounter, TerminalRegistration, SessionTerminalHistory,
  PosDevice, DeviceEvent, HardwareProfile, PrintJob, DeviceDashboard,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

// The POS API speaks snake_case JSON (global backend naming strategy); the UI is camelCase.
// Keys are converted recursively; string values (cart JSON, allocations) pass through untouched.
const toCamel = (k: string) => k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

function convertKeys(value: unknown, fn: (k: string) => string): unknown {
  if (Array.isArray(value)) return value.map((v) => convertKeys(v, fn));
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[fn(k)] = convertKeys(v, fn);
    return out;
  }
  return value;
}

/** Numeric strings from BigDecimal never arrive (Jackson writes numbers), so values are used as-is. */
export const camelize = <T,>(v: unknown): T => convertKeys(v, toCamel) as T;
const snakify = (v: unknown) => convertKeys(v, toSnake);

/** Error thrown for any non-2xx POS response; `code` is the backend error code (e.g. SUPERVISOR_APPROVAL_REQUIRED). */
export class PosApiError extends Error {
  status: number;
  code: string | null;
  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const isApprovalRequired = (e: unknown) => e instanceof PosApiError && e.code === "SUPERVISOR_APPROVAL_REQUIRED";

export const SCHEMA_OUTDATED = "SCHEMA_OUTDATED";
export const isSchemaOutdated = (e: unknown) => e instanceof PosApiError && e.code === SCHEMA_OUTDATED;

/** Raw database errors (a gym database that hasn't received the POS migration yet) never reach the cashier verbatim. */
const SCHEMA_ERROR = /JDBC exception|SQL \[|relation "[^"]+" does not exist|column "?[\w.]+"? does not exist/i;

/** The terminal's timezone, so server-side reports bucket hours in local time (timestamps are stored in UTC). */
const CLIENT_TZ = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; }
})();

async function request<T>(method: string, path: string, body?: unknown, opts: { allow404?: boolean } = {}): Promise<T> {
  const res = await authService.makeAuthenticatedRequest(`${BASE_URL}${path}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(snakify(body)),
    headers: CLIENT_TZ ? { "X-Client-Timezone": CLIENT_TZ } : undefined,
  });
  if (opts.allow404 && res.status === 404) return null as T;
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code: string | null = null;
    try {
      const err = await res.json();
      if (err?.message) message = err.message;
      code = err?.error ?? null;
    } catch {
      /* non-JSON error body */
    }
    if (res.status === 403 && !code) message = "You don't have permission to do that.";
    if (res.status >= 500 && SCHEMA_ERROR.test(message)) {
      console.error("POS API schema error:", message);
      message = "This gym's database hasn't been updated for the Point of Sale yet. Ask your administrator to run the POS database update.";
      code = SCHEMA_OUTDATED;
    }
    throw new PosApiError(message, res.status, code);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? camelize<T>(JSON.parse(text)) : (undefined as T));
}

const qs = (params: Record<string, string | number | boolean | null | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p.append(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : "";
};

export interface SalesFilter {
  search?: string;
  paymentMethod?: string;
  status?: string;
  sessionId?: number;
  from?: string;
  to?: string;
  cashier?: string;
  memberId?: number;
  returnStatus?: string;
  page?: number;
  size?: number;
}

export const posApi = {
  // Settings
  getSettings: () => request<PosSettings>("GET", "/pos/settings"),
  updateSettings: (patch: SettingsUpdate) => request<PosSettings>("PUT", "/pos/settings", patch),
  setSupervisorPin: (pin: string, currentPin?: string) => request<PosSettings>("POST", "/pos/settings/supervisor-pin", { pin, currentPin }),
  verifyPin: (pin: string) => request<{ valid: boolean }>("POST", "/pos/settings/verify-pin", { pin }),

  // Sessions
  activeSession: () => request<PosSession | null>("GET", "/pos/sessions/active", undefined, { allow404: true }),
  liveSessions: () => request<PosSession[]>("GET", "/pos/sessions/live"),
  sessionHistory: (f: { from?: string; to?: string; status?: string; cashier?: string; page?: number; size?: number }) =>
    request<SessionsPage>("GET", `/pos/sessions${qs(f)}`),
  openSession: (body: { openingCash: number; openingDenominations?: string; terminalName?: string | null; terminalCode?: string | null; notes?: string }) =>
    request<PosSession>("POST", "/pos/sessions", body),
  closeSession: (id: number, body: {
    closingCash: number; closingDenominations?: string; notes?: string; varianceRemarks?: string;
    cardSettlementAmount?: number | null; cardBatchNo?: string; cardSettlementVerified?: boolean;
    force?: boolean; forceCloseReason?: string; supervisorPin?: string | null;
  }) => request<PosSession>("POST", `/pos/sessions/${id}/close`, body),
  xReport: (id: number) => request<XReport>("GET", `/pos/sessions/${id}/x-report`),
  dayStatus: () => request<DayStatus>("GET", "/pos/day-status"),
  suspendSession: (id: number) => request<PosSession>("POST", `/pos/sessions/${id}/suspend`),
  resumeSession: (id: number) => request<PosSession>("POST", `/pos/sessions/${id}/resume`),
  takeoverSession: (id: number, body: { supervisorPin?: string | null; reason?: string }) =>
    request<PosSession>("POST", `/pos/sessions/${id}/takeover`, body),
  beginClosure: (id: number) => request<PosSession>("POST", `/pos/sessions/${id}/begin-closure`),
  cancelClosure: (id: number, body: { supervisorPin?: string | null; reason?: string }) =>
    request<PosSession>("POST", `/pos/sessions/${id}/cancel-closure`, body),
  touchSession: (id: number) => request<void>("POST", `/pos/sessions/${id}/touch`),
  markXReportPrinted: (id: number) => request<PosSession>("POST", `/pos/sessions/${id}/x-report/printed`),
  cashMovements: (id: number) => request<CashMovement[]>("GET", `/pos/sessions/${id}/cash-movements`),
  addCashMovement: (id: number, body: { type: "DROP_IN" | "CASH_OUT"; amount: number; reason?: string; category?: string | null; categoryId?: number | null; reference?: string; supervisorPin?: string | null }) =>
    request<CashMovement>("POST", `/pos/sessions/${id}/cash-movements`, body),

  // Terminals & counters
  registerTerminal: (body: { terminalCode?: string | null; deviceFingerprint: string; deviceInfo?: string; operatingSystem?: string; browser?: string; name?: string | null }) =>
    request<TerminalRegistration>("POST", "/pos/terminals/register", body),
  terminalHeartbeat: (code: string) => request<PosTerminal>("POST", `/pos/terminals/${encodeURIComponent(code)}/heartbeat`),
  terminals: (includeRetired = false) => request<PosTerminal[]>("GET", `/pos/terminals${qs({ includeRetired: includeRetired || undefined })}`),
  updateTerminal: (id: number, body: { name?: string; counterId?: number | null; clearCounter?: boolean }) =>
    request<PosTerminal>("PUT", `/pos/terminals/${id}`, body),
  setTerminalStatus: (id: number, status: "ACTIVE" | "MAINTENANCE" | "BLOCKED", reason?: string) =>
    request<PosTerminal>("PUT", `/pos/terminals/${id}/status`, { status, reason }),
  setMainTerminal: (id: number) => request<PosTerminal>("PUT", `/pos/terminals/${id}/set-main`),
  approveTerminal: (id: number) => request<PosTerminal>("POST", `/pos/terminals/${id}/approve`),
  rejectTerminal: (id: number, reason?: string) => request<PosTerminal>("POST", `/pos/terminals/${id}/reject`, { reason }),
  archiveTerminal: (id: number, reason?: string) => request<PosTerminal>("POST", `/pos/terminals/${id}/archive`, { reason }),
  restoreTerminal: (id: number) => request<PosTerminal>("POST", `/pos/terminals/${id}/restore`),
  decommissionTerminal: (id: number, reason: string) => request<PosTerminal>("POST", `/pos/terminals/${id}/decommission`, { reason }),
  counters: () => request<PosCounter[]>("GET", "/pos/counters"),
  createCounter: (body: Partial<PosCounter>) => request<PosCounter>("POST", "/pos/counters", body),
  updateCounter: (id: number, body: Partial<PosCounter>) => request<PosCounter>("PUT", `/pos/counters/${id}`, body),
  transferSession: (id: number, body: { destinationTerminalId?: number; destinationTerminalCode?: string; reason: string; supervisorPin?: string | null }) =>
    request<PosSession>("POST", `/pos/sessions/${id}/transfer`, { ...body, confirm: true }),
  sessionTerminalHistory: (id: number) => request<SessionTerminalHistory[]>("GET", `/pos/sessions/${id}/terminal-history`),

  // Device manager
  deviceDashboard: () => request<DeviceDashboard>("GET", "/pos/devices/dashboard"),
  devices: (type?: string, includeRetired = false) => request<PosDevice[]>("GET", `/pos/devices${qs({ type, includeRetired: includeRetired || undefined })}`),
  deviceEvents: (id: number) => request<DeviceEvent[]>("GET", `/pos/devices/${id}/events`),
  createDevice: (body: Partial<PosDevice>) => request<PosDevice>("POST", "/pos/devices", body),
  updateDevice: (id: number, body: Partial<PosDevice>) => request<PosDevice>("PUT", `/pos/devices/${id}`, body),
  setDeviceStatus: (id: number, status: string, reason?: string) => request<PosDevice>("PUT", `/pos/devices/${id}/status`, { status, reason }),
  reportDeviceHealth: (id: number, health: "HEALTHY" | "DEGRADED" | "OFFLINE", message?: string, terminalName?: string | null) =>
    request<PosDevice>("POST", `/pos/devices/${id}/health`, { health, message, terminalName }),
  kickDrawerDevice: (id: number, terminalName?: string | null) => request<PosDevice>("POST", `/pos/devices/${id}/kick`, { terminalName }),
  scanTest: (id: number, value: string, terminalName?: string | null) => request<PosDevice>("POST", `/pos/devices/${id}/scan-test`, { value, terminalName }),
  hardwareProfiles: () => request<HardwareProfile[]>("GET", "/pos/hardware-profiles"),
  createHardwareProfile: (body: { name: string; description?: string; devices: { role: string; deviceId: number }[] }) =>
    request<HardwareProfile>("POST", "/pos/hardware-profiles", body),
  updateHardwareProfile: (id: number, body: { name?: string; description?: string; status?: string; devices?: { role: string; deviceId: number }[] }) =>
    request<HardwareProfile>("PUT", `/pos/hardware-profiles/${id}`, body),
  assignHardwareProfile: (terminalId: number, hardwareProfileId: number | null) =>
    request<PosTerminal>("PUT", `/pos/terminals/${terminalId}/hardware-profile`, { hardwareProfileId }),
  printJobs: (f: { status?: string; printerId?: number; jobType?: string; page?: number; size?: number }) =>
    request<{ jobs: PrintJob[]; pagination: PageMeta }>("GET", `/pos/print-jobs${qs(f)}`),
  /** Best-effort log of a print the till sent itself (agent / browser); never throws. */
  reportPrintJob: (body: { printerId: number | null; jobType?: string; title?: string; success: boolean; message?: string; bytes?: number; terminalName?: string | null }) => {
    request("POST", "/pos/print-jobs/report", body).catch(() => undefined);
  },
  retryPrintJob: (id: number) => request<PrintJob>("POST", `/pos/print-jobs/${id}/retry`),
  cancelPrintJob: (id: number) => request<PrintJob>("POST", `/pos/print-jobs/${id}/cancel`),

  // Cash categories
  cashCategories: (includeInactive = false) => request<CashCategory[]>("GET", `/pos/cash-categories${qs({ includeInactive: includeInactive || undefined })}`),
  createCashCategory: (body: Partial<CashCategory>) => request<CashCategory>("POST", "/pos/cash-categories", body),
  updateCashCategory: (id: number, body: Partial<CashCategory>) => request<CashCategory>("PUT", `/pos/cash-categories/${id}`, body),
  setCashCategoryActive: (id: number, active: boolean) =>
    request<CashCategory>("POST", `/pos/cash-categories/${id}/${active ? "activate" : "deactivate"}`),

  // Corrections (maker-checker)
  corrections: (f: { status?: string; targetType?: string; search?: string; page?: number; size?: number }) =>
    request<{ corrections: Correction[]; pagination: PageMeta }>("GET", `/pos/corrections${qs(f)}`),
  correctionDashboard: () => request<CorrectionDashboard>("GET", "/pos/corrections/dashboard"),
  correctionsFor: (targetType: string, targetId: number) =>
    request<Correction[]>("GET", `/pos/corrections/target${qs({ targetType, targetId })}`),
  requestCorrection: (body: CorrectionRequest) => request<Correction>("POST", "/pos/corrections", body),
  submitCorrection: (id: number) => request<Correction>("POST", `/pos/corrections/${id}/submit`),
  cancelCorrection: (id: number) => request<Correction>("POST", `/pos/corrections/${id}/cancel`),
  approveCorrection: (id: number, notes?: string) => request<Correction>("POST", `/pos/corrections/${id}/approve`, { notes }),
  rejectCorrection: (id: number, notes: string) => request<Correction>("POST", `/pos/corrections/${id}/reject`, { notes }),
  applyCorrection: (id: number) => request<Correction>("POST", `/pos/corrections/${id}/apply`),

  // Sales
  checkout: (body: CheckoutRequest) => request<Sale>("POST", "/pos/transactions", body),
  sales: (f: SalesFilter) => request<SalesPage>("GET", `/pos/transactions${qs(f as Record<string, string | number>)}`),
  sale: (id: number) => request<Sale>("GET", `/pos/transactions/${id}`),
  lookupSale: (number: string) => request<Sale>("GET", `/pos/transactions/lookup${qs({ number })}`),
  reprint: (id: number, supervisorPin?: string | null) => request<Sale>("POST", `/pos/transactions/${id}/reprint`, { supervisorPin }),
  createReturn: (saleId: number, body: ReturnRequest) => request<SaleReturn>("POST", `/pos/transactions/${saleId}/returns`, body),
  returnsForSale: (saleId: number) => request<SaleReturn[]>("GET", `/pos/transactions/${saleId}/returns`),
  getReturn: (id: number) => request<SaleReturn>("GET", `/pos/returns/${id}`),

  // Held sales
  heldSales: () => request<HeldSale[]>("GET", "/pos/held-sales"),
  holdSale: (body: { posSessionId: number | null; label?: string; memberId?: number | null; memberName?: string | null; cartJson: string; itemCount: number; total: number; terminalName?: string | null }) =>
    request<HeldSale>("POST", "/pos/held-sales", body),
  recallSale: (id: number) => request<HeldSale>("POST", `/pos/held-sales/${id}/recall`),
  discardHeldSale: (id: number) => request<void>("DELETE", `/pos/held-sales/${id}`),

  // Credit
  /** POS credit still owed, per member id (members owing nothing are absent). */
  creditOutstanding: (memberIds: number[]) =>
    request<Record<string, number>>("GET", `/pos/credit/outstanding${qs({ memberIds: memberIds.join(",") })}`),
  memberCredit: (memberId: number) => request<CustomerCredit>("GET", `/pos/credit/members/${memberId}`),
  receiveCredit: (body: { memberId: number; amount: number; paymentMethod: "CASH" | "CARD" | "ONLINE"; bankAccountId?: number | null; reference?: string; notes?: string; posSessionId?: number | null }) =>
    request<CreditPayment>("POST", "/pos/credit/payments", body),

  // Promotions, coupons, wallet
  promotions: () => request<DiscountRule[]>("GET", "/pos/promotions"),
  lookupCode: (code: string, gross?: number) => request<DiscountRule>("GET", `/pos/discount-codes/lookup${qs({ code, gross })}`),
  wallet: (memberId: number) => request<WalletBalance>("GET", `/pos/members/${memberId}/wallet`),

  // Reports
  zReport: (date?: string) => request<ZReport>("GET", `/pos/reports/z${qs({ date })}`),
  analytics: (from?: string, to?: string) => request<Analytics>("GET", `/pos/reports/analytics${qs({ from, to })}`),
  closeDay: (body: { businessDate: string; countedCash?: number | null; remarks?: string; supervisorPin?: string | null }) =>
    request<DayClose>("POST", "/pos/day-close", body),
  reopenDay: (date: string, body: { reason: string; supervisorPin?: string | null }) =>
    request<DayClose>("POST", `/pos/day-close/${date}/reopen`, body),
  dayCloseHistory: (from?: string, to?: string) => request<DayClose[]>("GET", `/pos/day-close/history${qs({ from, to })}`),
  dayCloseSnapshot: (date: string) => request<ZReport>("GET", `/pos/day-close/${date}/snapshot`),

  // Printers
  printers: () => request<PosPrinter[]>("GET", "/pos/printers"),
  createPrinter: (p: Partial<PosPrinter>) => request<PosPrinter>("POST", "/pos/printers", p),
  updatePrinter: (id: number, p: Partial<PosPrinter>) => request<PosPrinter>("PUT", `/pos/printers/${id}`, p),
  deletePrinter: (id: number) => request<void>("DELETE", `/pos/printers/${id}`),
  printEscPos: (id: number, dataBase64: string, title?: string, extra: { jobType?: string; terminalName?: string | null; sourceRef?: string } = {}) =>
    request<{ ok: boolean; bytes: number; message: string }>("POST", `/pos/printers/${id}/print-escpos`, { dataBase64, title, ...extra }),
  recordPrinterTest: (id: number, success: boolean, message?: string) =>
    request<PosPrinter>("POST", `/pos/printers/${id}/test-result`, { success, message }),

  // Audit
  auditLogs: (f: { from?: string; to?: string; action?: string; user?: string; sessionId?: number; page?: number; size?: number }) =>
    request<{ logs: AuditLog[]; pagination: PageMeta }>("GET", `/pos/audit-logs${qs(f)}`),
  /** Best-effort terminal event; never blocks or throws into the UI. */
  logEvent: (action: string, details?: string, extra: { referenceType?: string; referenceId?: number; referenceNumber?: string; posSessionId?: number | null; amount?: number; terminalName?: string | null } = {}) => {
    request("POST", "/pos/audit-logs", { action, details, ...extra }).catch(() => undefined);
  },
};
