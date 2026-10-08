// Client for the local POS print agent (tools/pos-print-agent — same protocol as
// BillBull's agent, so an agent already installed on a till works unchanged). The
// agent drives USB / Bluetooth / Windows-queue printers from the workstation:
//   GET /health · GET /printers · POST /print/escpos {printerName, dataBase64}
//   POST /print/receipt {printerName, text} (text/GDI fallback for drivers that refuse RAW)

const BASES = ["http://127.0.0.1:19777", "http://localhost:19777"];
const PROBE_TIMEOUT_MS = 400;
const RETRY_COOLDOWN_MS = 15_000;

let resolved: string | null = null;
let lastFailure = 0;
let inflight: Promise<string | null> | null = null;

async function probe(base: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
    const res = await fetch(`${base}/health`, { signal: ctrl.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/** Base URL of a running agent, or null. Concurrent callers share one probe; failures back off for 15s. */
export async function resolveAgent(force = false): Promise<string | null> {
  if (resolved && !force) return resolved;
  if (!force && lastFailure && Date.now() - lastFailure < RETRY_COOLDOWN_MS) return null;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const results = await Promise.all(BASES.map(probe));
      const winner = BASES.find((_, i) => results[i]) ?? null;
      resolved = winner;
      if (!winner) lastFailure = Date.now();
      return winner;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export interface AgentInfo { ok: boolean; service?: string; version?: string }

export async function agentHealth(): Promise<AgentInfo | null> {
  const base = await resolveAgent(true);
  if (!base) return null;
  try {
    return await (await fetch(`${base}/health`)).json();
  } catch {
    return null;
  }
}

async function agentFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = await resolveAgent();
  if (!base) throw new Error("The POS print agent is not running on this computer.");
  const res = await fetch(`${base}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text;
    try { message = JSON.parse(text).message || text; } catch { /* plain text */ }
    throw new Error(message || `Print agent error (${res.status})`);
  }
  return res.status === 204 ? (null as T) : res.json();
}

export interface AgentPrinter { name: string; driverName: string; portName: string; status: string; isDefault: boolean }

export async function listAgentPrinters(): Promise<AgentPrinter[]> {
  const data = await agentFetch<{ printers?: Record<string, unknown>[] }>("/printers");
  return (data?.printers ?? []).map((p) => ({
    name: String(p.name ?? p.Name ?? ""),
    driverName: String(p.driverName ?? p.DriverName ?? ""),
    portName: String(p.portName ?? p.PortName ?? ""),
    status: String(p.status ?? p.StatusLabel ?? ""),
    isDefault: Boolean(p.isDefault ?? p.IsDefault),
  }));
}

export function agentPrintEscPos(printerName: string, dataBase64: string, title: string) {
  return agentFetch<{ ok?: boolean; message?: string }>("/print/escpos", {
    method: "POST",
    body: JSON.stringify({ printerName, dataBase64, title, connectionType: "WINDOWS_QUEUE" }),
  });
}

export function agentPrintText(printerName: string, text: string, title: string, paperWidthMm: number) {
  return agentFetch<{ ok?: boolean; message?: string }>("/print/receipt", {
    method: "POST",
    body: JSON.stringify({ printerName, text, title, paperWidthMm, connectionType: "WINDOWS_QUEUE" }),
  });
}

/** Warm the probe before the first print of the session. */
export const warmAgent = () => { resolveAgent().catch(() => undefined); };
