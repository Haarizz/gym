import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface CompanyTaxDetails {
  legalName?: string;
  gstNumber?: string;
  vatNumber?: string;
  trn?: string;
  address?: string;
}

function mapDetails(r: any): CompanyTaxDetails {
  return {
    legalName: r.legal_name ?? r.legalName,
    gstNumber: r.gst_number ?? r.gstNumber,
    vatNumber: r.vat_number ?? r.vatNumber,
    trn: r.trn,
    address: r.address,
  };
}

function toBody(d: CompanyTaxDetails) {
  return {
    legal_name: d.legalName,
    gst_number: d.gstNumber,
    vat_number: d.vatNumber,
    trn: d.trn,
    address: d.address,
  };
}

class CompanyTaxDetailsService {
  async get(): Promise<CompanyTaxDetails> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/company-tax-details`);
    if (!res.ok) throw new Error("Failed to load company tax details");
    return mapDetails(await res.json());
  }

  async update(d: CompanyTaxDetails): Promise<CompanyTaxDetails> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/company-tax-details`, {
      method: "PUT",
      body: JSON.stringify(toBody(d)),
    });
    if (!res.ok) throw new Error((await res.text()) || "Failed to update company tax details");
    return mapDetails(await res.json());
  }
}

export const companyTaxDetailsService = new CompanyTaxDetailsService();
