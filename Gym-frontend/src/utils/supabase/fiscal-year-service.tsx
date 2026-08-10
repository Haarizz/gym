import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface FiscalYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
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
}

function mapFiscalYear(r: any): FiscalYear {
  return {
    id: String(r.id),
    name: r.name ?? "",
    startDate: r.start_date ?? r.startDate ?? "",
    endDate: r.end_date ?? r.endDate ?? "",
    status: r.status ?? "OPEN",
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
  };
}

class FiscalYearService {
  async getYears(): Promise<FiscalYear[]> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/fiscal-years`);
    if (!res.ok) throw new Error("Failed to load fiscal years");
    const data = await res.json();
    return (data ?? []).map(mapFiscalYear);
  }

  async createYear(req: FiscalYearCreateRequest): Promise<FiscalYear> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/fiscal-years`, {
      method: "POST",
      body: JSON.stringify({ name: req.name, start_date: req.startDate, end_date: req.endDate }),
    });
    if (!res.ok) throw new Error((await res.text()) || "Failed to create fiscal year");
    return mapFiscalYear(await res.json());
  }

  async closeYear(id: string): Promise<FiscalYear> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/fiscal-years/${id}/close`, { method: "PATCH" });
    if (!res.ok) throw new Error((await res.text()) || "Failed to close fiscal year");
    return mapFiscalYear(await res.json());
  }

  async reopenYear(id: string): Promise<FiscalYear> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/fiscal-years/${id}/reopen`, { method: "PATCH" });
    if (!res.ok) throw new Error((await res.text()) || "Failed to reopen fiscal year");
    return mapFiscalYear(await res.json());
  }

  async getPeriods(fiscalYearId?: string): Promise<FiscalPeriod[]> {
    const q = fiscalYearId ? `?fiscal_year_id=${fiscalYearId}` : "";
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/fiscal-periods${q}`);
    if (!res.ok) throw new Error("Failed to load fiscal periods");
    const data = await res.json();
    return (data ?? []).map(mapFiscalPeriod);
  }

  async closePeriod(id: string): Promise<FiscalPeriod> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/fiscal-periods/${id}/close`, { method: "PATCH" });
    if (!res.ok) throw new Error((await res.text()) || "Failed to close period");
    return mapFiscalPeriod(await res.json());
  }

  async lockPeriod(id: string): Promise<FiscalPeriod> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/fiscal-periods/${id}/lock`, { method: "PATCH" });
    if (!res.ok) throw new Error((await res.text()) || "Failed to lock period");
    return mapFiscalPeriod(await res.json());
  }

  async reopenPeriod(id: string): Promise<FiscalPeriod> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/fiscal-periods/${id}/reopen`, { method: "PATCH" });
    if (!res.ok) throw new Error((await res.text()) || "Failed to reopen period");
    return mapFiscalPeriod(await res.json());
  }
}

export const fiscalYearService = new FiscalYearService();
