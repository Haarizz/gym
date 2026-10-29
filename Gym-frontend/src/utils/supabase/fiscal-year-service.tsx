import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface FiscalYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  openPeriods: number;
  closedPeriods: number;
  lockedPeriods: number;
}

export interface FiscalYearCreateRequest {
  name: string;
  startDate: string;
  endDate: string;
}

export interface FiscalPeriod {
  id: string;
  fiscalYearId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  /** Journal entries dated inside the period (all branches); null when unknown */
  voucherCount: number | null;
}

/** The backend answers errors as JSON {message}; never show that raw in a toast. */
async function errorMessage(res: Response, fallback: string): Promise<string> {
  const text = await res.text().catch(() => "");
  if (!text) return fallback;
  try {
    const body = JSON.parse(text);
    return body?.message || body?.error || fallback;
  } catch {
    return text.length < 200 ? text : fallback;
  }
}

function mapFiscalYear(r: any): FiscalYear {
  return {
    id: String(r.id),
    name: r.name ?? "",
    startDate: r.start_date ?? r.startDate ?? "",
    endDate: r.end_date ?? r.endDate ?? "",
    status: r.status ?? "OPEN",
    openPeriods: Number(r.open_periods ?? 0),
    closedPeriods: Number(r.closed_periods ?? 0),
    lockedPeriods: Number(r.locked_periods ?? 0),
  };
}

function mapFiscalPeriod(r: any): FiscalPeriod {
  return {
    id: String(r.id),
    fiscalYearId: String(r.fiscal_year_id ?? r.fiscalYearId ?? ""),
    name: r.name ?? "",
    startDate: r.start_date ?? r.startDate ?? "",
    endDate: r.end_date ?? r.endDate ?? "",
    status: r.status ?? "OPEN",
    voucherCount: r.voucher_count == null ? null : Number(r.voucher_count),
  };
}

class FiscalYearService {
  async getYears(): Promise<FiscalYear[]> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/fiscal-years`);
    if (!res.ok) throw new Error(await errorMessage(res, "Failed to load fiscal years"));
    const data = await res.json();
    return (data ?? []).map(mapFiscalYear);
  }

  async createYear(req: FiscalYearCreateRequest): Promise<FiscalYear> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/fiscal-years`, {
      method: "POST",
      body: JSON.stringify({ name: req.name, start_date: req.startDate, end_date: req.endDate }),
    });
    if (!res.ok) throw new Error(await errorMessage(res, "Failed to create fiscal year"));
    return mapFiscalYear(await res.json());
  }

  async closeYear(id: string): Promise<FiscalYear> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/fiscal-years/${id}/close`, { method: "PATCH" });
    if (!res.ok) throw new Error(await errorMessage(res, "Failed to close fiscal year"));
    return mapFiscalYear(await res.json());
  }

  async reopenYear(id: string): Promise<FiscalYear> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/fiscal-years/${id}/reopen`, { method: "PATCH" });
    if (!res.ok) throw new Error(await errorMessage(res, "Failed to reopen fiscal year"));
    return mapFiscalYear(await res.json());
  }

  async deleteYear(id: string): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/fiscal-years/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await errorMessage(res, "Failed to delete fiscal year"));
  }

  async getPeriods(fiscalYearId?: string): Promise<FiscalPeriod[]> {
    const q = fiscalYearId ? `?fiscal_year_id=${fiscalYearId}` : "";
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/fiscal-periods${q}`);
    if (!res.ok) throw new Error(await errorMessage(res, "Failed to load fiscal periods"));
    const data = await res.json();
    return (data ?? []).map(mapFiscalPeriod);
  }

  async closePeriod(id: string): Promise<FiscalPeriod> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/fiscal-periods/${id}/close`, { method: "PATCH" });
    if (!res.ok) throw new Error(await errorMessage(res, "Failed to close period"));
    return mapFiscalPeriod(await res.json());
  }

  async lockPeriod(id: string): Promise<FiscalPeriod> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/fiscal-periods/${id}/lock`, { method: "PATCH" });
    if (!res.ok) throw new Error(await errorMessage(res, "Failed to lock period"));
    return mapFiscalPeriod(await res.json());
  }

  async reopenPeriod(id: string): Promise<FiscalPeriod> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/fiscal-periods/${id}/reopen`, { method: "PATCH" });
    if (!res.ok) throw new Error(await errorMessage(res, "Failed to reopen period"));
    return mapFiscalPeriod(await res.json());
  }
}

export const fiscalYearService = new FiscalYearService();
