import { authService } from './auth-service';
import { parseApiError } from './api-error';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export type PrintTemplateCategory = 'SALES_INVOICE' | 'PURCHASE_ORDER' | 'PURCHASE_INVOICE' | 'BARCODE_LABEL';

export interface PrintTemplate {
  id: number;
  category: PrintTemplateCategory;
  name: string;
  isDefault: boolean;
  paperSize: string;
  /** Designer settings — parsed from the backend's JSON text column. */
  settings: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface PrintTemplateRequest {
  category: PrintTemplateCategory;
  name: string;
  isDefault?: boolean;
  paperSize: string;
  settings: Record<string, unknown>;
}

function parseSettings(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  try {
    return JSON.parse(String(raw));
  } catch {
    return {};
  }
}

function mapTemplate(r: any): PrintTemplate {
  return {
    id: r.id,
    category: r.category,
    name: r.name ?? '',
    isDefault: !!(r.isDefault ?? r.is_default),
    paperSize: r.paperSize ?? r.paper_size ?? 'A4',
    settings: parseSettings(r.settings),
    createdAt: r.createdAt ?? r.created_at,
    updatedAt: r.updatedAt ?? r.updated_at,
    updatedBy: r.updatedBy ?? r.updated_by,
  };
}

const toBody = (req: Partial<PrintTemplateRequest>) =>
  JSON.stringify({ ...req, settings: req.settings ? JSON.stringify(req.settings) : undefined });

class PrintTemplateService {
  async getTemplates(category?: PrintTemplateCategory): Promise<PrintTemplate[]> {
    const query = category ? `?category=${category}` : '';
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/print-templates${query}`, { method: 'GET' });
    if (!res.ok) throw new Error(await parseApiError(res, 'Failed to load print templates'));
    return (await res.json()).map(mapTemplate);
  }

  async createTemplate(req: PrintTemplateRequest): Promise<PrintTemplate> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/print-templates`, { method: 'POST', body: toBody(req) });
    if (!res.ok) throw new Error(await parseApiError(res, 'Failed to create template'));
    return mapTemplate(await res.json());
  }

  async updateTemplate(id: number, req: Partial<PrintTemplateRequest>): Promise<PrintTemplate> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/print-templates/${id}`, { method: 'PUT', body: toBody(req) });
    if (!res.ok) throw new Error(await parseApiError(res, 'Failed to update template'));
    return mapTemplate(await res.json());
  }

  async setDefault(id: number): Promise<PrintTemplate> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/print-templates/${id}/default`, { method: 'POST' });
    if (!res.ok) throw new Error(await parseApiError(res, 'Failed to set default template'));
    return mapTemplate(await res.json());
  }

  async deleteTemplate(id: number): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/print-templates/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await parseApiError(res, 'Failed to delete template'));
  }
}

export const printTemplateService = new PrintTemplateService();
