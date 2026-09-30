import { authService } from './auth-service';
import { parseApiError } from './api-error';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// Back-office Sales Invoice (Sales & Purchases › Sales Invoice) — direct sales to a
// member or a walk-in customer. The backend recomputes every amount on save.

// ── Frontend interfaces (camelCase) ──────────────────────────────────────────

export type SalesCustomerType = 'WALK_IN' | 'MEMBER';

export interface SalesInvoiceItem {
  id: number;
  productId: number;
  productName: string;
  productSku?: string;
  unitOfMeasure?: string;
  warehouseId?: number;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  footerDiscountShare: number;
  taxPercent: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
}

export interface SalesInvoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;      // LocalDate → "YYYY-MM-DD"
  dueDate?: string;
  paymentTerms?: string;
  reference?: string;
  salesperson?: string;
  customerType: SalesCustomerType;
  memberId?: number;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerTrn?: string;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  pricesIncludeTax: boolean;
  subtotal: number;
  discountAmount: number;
  footerDiscount: number;
  taxableAmount: number;
  taxAmount: number;
  deliveryCharge: number;
  roundOff: number;
  totalAmount: number;
  amountPaid: number;
  stockDeducted: boolean;
  paymentMethod?: string;
  paymentBreakdown?: Record<string, any>[];
  notes?: string;
  internalNotes?: string;
  branchId?: number;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  items: SalesInvoiceItem[];
}

export interface SalesInvoiceItemRequest {
  productId: number;
  productName?: string;
  productSku?: string;
  unitOfMeasure?: string;
  warehouseId?: number;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  notes?: string;
}

export interface SalesInvoiceRequest {
  invoiceDate: string;
  dueDate?: string;
  paymentTerms?: string;
  reference?: string;
  salesperson?: string;
  customerType: SalesCustomerType;
  memberId?: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerTrn?: string;
  pricesIncludeTax: boolean;
  footerDiscount: number;
  deliveryCharge: number;
  roundOff: number;
  notes?: string;
  internalNotes?: string;
  items: SalesInvoiceItemRequest[];
}

/** Money received — on confirm (optional; full amount for walk-ins) or later. */
export interface SalesInvoicePayment {
  amount: number;
  paymentMethod: string;
  paymentBreakdown?: { method: string; amount: number; reference?: string }[];
  paymentDate?: string;
  notes?: string;
}

export interface SalesInvoicesPage {
  invoices: SalesInvoice[];
  pagination: { page: number; size: number; total: number; totalPages: number };
}

// ── Mappers: snake_case API → camelCase frontend ──────────────────────────────

const num = (v: any) => Number(v ?? 0) || 0;

function mapItem(r: any): SalesInvoiceItem {
  return {
    id: r.id,
    productId: r.product_id ?? r.productId,
    productName: r.product_name ?? r.productName ?? '',
    productSku: r.product_sku ?? r.productSku ?? undefined,
    unitOfMeasure: r.unit_of_measure ?? r.unitOfMeasure ?? undefined,
    warehouseId: r.warehouse_id ?? r.warehouseId ?? undefined,
    quantity: num(r.quantity),
    unitPrice: num(r.unit_price ?? r.unitPrice),
    discountPercent: num(r.discount_percent ?? r.discountPercent),
    discountAmount: num(r.discount_amount ?? r.discountAmount),
    footerDiscountShare: num(r.footer_discount_share ?? r.footerDiscountShare),
    taxPercent: num(r.tax_percent ?? r.taxPercent),
    taxableAmount: num(r.taxable_amount ?? r.taxableAmount),
    taxAmount: num(r.tax_amount ?? r.taxAmount),
    totalAmount: num(r.total_amount ?? r.totalAmount),
    notes: r.notes ?? undefined,
  };
}

function mapInvoice(r: any): SalesInvoice {
  return {
    id: r.id,
    invoiceNumber: r.invoice_number ?? r.invoiceNumber ?? '',
    invoiceDate: r.invoice_date ?? r.invoiceDate ?? '',
    dueDate: r.due_date ?? r.dueDate ?? undefined,
    paymentTerms: r.payment_terms ?? r.paymentTerms ?? undefined,
    reference: r.reference ?? undefined,
    salesperson: r.salesperson ?? undefined,
    customerType: (r.customer_type ?? r.customerType) === 'MEMBER' ? 'MEMBER' : 'WALK_IN',
    memberId: r.member_id ?? r.memberId ?? undefined,
    customerName: r.customer_name ?? r.customerName ?? '',
    customerPhone: r.customer_phone ?? r.customerPhone ?? undefined,
    customerEmail: r.customer_email ?? r.customerEmail ?? undefined,
    customerAddress: r.customer_address ?? r.customerAddress ?? undefined,
    customerTrn: r.customer_trn ?? r.customerTrn ?? undefined,
    status: r.status ?? 'DRAFT',
    paymentStatus: r.payment_status ?? r.paymentStatus ?? 'UNPAID',
    pricesIncludeTax: !!(r.prices_include_tax ?? r.pricesIncludeTax),
    subtotal: num(r.subtotal),
    discountAmount: num(r.discount_amount ?? r.discountAmount),
    footerDiscount: num(r.footer_discount ?? r.footerDiscount),
    taxableAmount: num(r.taxable_amount ?? r.taxableAmount),
    taxAmount: num(r.tax_amount ?? r.taxAmount),
    deliveryCharge: num(r.delivery_charge ?? r.deliveryCharge),
    roundOff: num(r.round_off ?? r.roundOff),
    totalAmount: num(r.total_amount ?? r.totalAmount),
    amountPaid: num(r.amount_paid ?? r.amountPaid),
    stockDeducted: !!(r.stock_deducted ?? r.stockDeducted),
    paymentMethod: r.payment_method ?? r.paymentMethod ?? undefined,
    paymentBreakdown: r.payment_breakdown ?? r.paymentBreakdown ?? undefined,
    notes: r.notes ?? undefined,
    internalNotes: r.internal_notes ?? r.internalNotes ?? undefined,
    branchId: r.branch_id ?? r.branchId ?? undefined,
    createdBy: r.created_by ?? r.createdBy ?? undefined,
    createdAt: r.created_at ?? r.createdAt ?? '',
    updatedAt: r.updated_at ?? r.updatedAt ?? undefined,
    items: (r.items ?? []).map(mapItem),
  };
}

// ── Request body builders: camelCase → snake_case ────────────────────────────

function toBody(req: SalesInvoiceRequest): Record<string, any> {
  return {
    invoice_date: req.invoiceDate,
    due_date: req.dueDate,
    payment_terms: req.paymentTerms,
    reference: req.reference,
    salesperson: req.salesperson,
    customer_type: req.customerType,
    member_id: req.memberId,
    customer_name: req.customerName,
    customer_phone: req.customerPhone,
    customer_email: req.customerEmail,
    customer_address: req.customerAddress,
    customer_trn: req.customerTrn,
    prices_include_tax: req.pricesIncludeTax,
    footer_discount: req.footerDiscount,
    delivery_charge: req.deliveryCharge,
    round_off: req.roundOff,
    notes: req.notes,
    internal_notes: req.internalNotes,
    items: req.items.map(i => ({
      product_id: i.productId,
      product_name: i.productName,
      product_sku: i.productSku,
      unit_of_measure: i.unitOfMeasure,
      warehouse_id: i.warehouseId,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      discount_percent: i.discountPercent ?? 0,
      notes: i.notes,
    })),
  };
}

function toPaymentBody(p: SalesInvoicePayment): Record<string, any> {
  return {
    amount: p.amount,
    payment_method: p.paymentMethod,
    payment_breakdown: p.paymentBreakdown,
    payment_date: p.paymentDate,
    notes: p.notes,
  };
}

// ── Service class ─────────────────────────────────────────────────────────────

class SalesInvoiceService {

  private async send(path: string, method: string, body: unknown, fallback: string): Promise<SalesInvoice> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/sales-invoices${path}`, {
      method,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!res.ok) throw new Error(await parseApiError(res, `${fallback}: ${res.status}`));
    return mapInvoice(await res.json());
  }

  async getInvoices(filters?: { page?: number; size?: number; status?: string; search?: string }): Promise<SalesInvoicesPage> {
    const params = new URLSearchParams();
    if (filters?.page)   params.append('page',   String(filters.page));
    if (filters?.size)   params.append('size',   String(filters.size));
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/sales-invoices?${params.toString()}`);
    if (!res.ok) throw new Error(await parseApiError(res, `Failed to fetch sales invoices: ${res.status}`));
    const raw = await res.json();
    return {
      invoices: (raw.invoices ?? []).map(mapInvoice),
      pagination: {
        page: raw.pagination?.page ?? 1,
        size: raw.pagination?.size ?? 20,
        total: raw.pagination?.total ?? 0,
        totalPages: raw.pagination?.totalPages ?? raw.pagination?.total_pages ?? 0,
      },
    };
  }

  async getInvoiceById(id: number): Promise<SalesInvoice> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/sales-invoices/${id}`);
    if (!res.ok) throw new Error(await parseApiError(res, `Failed to fetch sales invoice: ${res.status}`));
    return mapInvoice(await res.json());
  }

  createInvoice(req: SalesInvoiceRequest) {
    return this.send('', 'POST', toBody(req), 'Failed to save sales invoice');
  }

  updateInvoice(id: number, req: SalesInvoiceRequest) {
    return this.send(`/${id}`, 'PUT', toBody(req), 'Failed to update sales invoice');
  }

  async deleteInvoice(id: number): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/sales-invoices/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await parseApiError(res, `Failed to delete sales invoice: ${res.status}`));
  }

  /** Posts the invoice (stock out + receivable); `payment` is what the customer pays right now. */
  confirmInvoice(id: number, payment?: SalesInvoicePayment) {
    return this.send(`/${id}/confirm`, 'POST', payment ? toPaymentBody(payment) : {}, 'Failed to confirm sales invoice');
  }

  cancelInvoice(id: number) {
    return this.send(`/${id}/cancel`, 'POST', undefined, 'Failed to cancel sales invoice');
  }

  recordPayment(id: number, payment: SalesInvoicePayment) {
    return this.send(`/${id}/record-payment`, 'POST', toPaymentBody(payment), 'Failed to record payment');
  }
}

export const salesInvoiceService = new SalesInvoiceService();
