import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface TaxCode {
  id: string;
  code: string;
  name: string;
  rate: number;
  salesTaxAccountCode?: string;
  purchaseTaxAccountCode?: string;
  active: boolean;
  description?: string;
  taxType: string;
  secondaryTaxCode?: string;
}

export interface TaxCodeRequest {
  code: string;
  name: string;
  rate: number;
  salesTaxAccountCode?: string;
  purchaseTaxAccountCode?: string;
  active?: boolean;
  description?: string;
  taxType?: string;
  secondaryTaxCode?: string;
}

/** The server message when there is one (the body is JSON {message}). */
async function fail(res: Response, fallback: string): Promise<never> {
  const text = await res.text().catch(() => "");
  let message = fallback;
  try { const b = JSON.parse(text); if (b && typeof b.message === "string" && b.message) message = b.message; }
  catch { if (text && text.length < 200) message = text; }
  throw new Error(message);
}

function mapTaxCode(r: any): TaxCode {
  return {
    id: String(r.id),
    code: r.code ?? "",
    name: r.name ?? "",
    rate: Number(r.rate ?? 0),
    salesTaxAccountCode: r.sales_tax_account_code ?? r.salesTaxAccountCode,
    purchaseTaxAccountCode: r.purchase_tax_account_code ?? r.purchaseTaxAccountCode,
    active: r.active ?? true,
    description: r.description,
    taxType: r.tax_type ?? r.taxType ?? "STANDARD",
    secondaryTaxCode: r.secondary_tax_code ?? r.secondaryTaxCode,
  };
}

function toBody(req: TaxCodeRequest) {
  return {
    code: req.code,
    name: req.name,
    rate: req.rate,
    sales_tax_account_code: req.salesTaxAccountCode,
    purchase_tax_account_code: req.purchaseTaxAccountCode,
    active: req.active,
    description: req.description,
    tax_type: req.taxType ?? "STANDARD",
    secondary_tax_code: req.secondaryTaxCode,
  };
}

class TaxCodeService {
  async getAll(): Promise<TaxCode[]> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/tax-codes`);
    if (!res.ok) await fail(res, "Couldn't load tax codes");
    const data = await res.json();
    return (data ?? []).map(mapTaxCode);
  }

  async create(req: TaxCodeRequest): Promise<TaxCode> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/tax-codes`, {
      method: "POST",
      body: JSON.stringify(toBody(req)),
    });
    if (!res.ok) await fail(res, "Couldn't create the tax code");
    return mapTaxCode(await res.json());
  }

  async update(id: string, req: TaxCodeRequest): Promise<TaxCode> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/tax-codes/${id}`, {
      method: "PUT",
      body: JSON.stringify(toBody(req)),
    });
    if (!res.ok) await fail(res, "Couldn't update the tax code");
    return mapTaxCode(await res.json());
  }

  async delete(id: string): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/tax-codes/${id}`, { method: "DELETE" });
    if (!res.ok) await fail(res, "Couldn't delete the tax code");
  }
}

export const taxCodeService = new TaxCodeService();
