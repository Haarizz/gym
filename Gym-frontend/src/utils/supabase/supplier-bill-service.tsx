import { authService } from './auth-service';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// ── Frontend interfaces (camelCase) ──────────────────────────────────────────

export interface SupplierBillItem {
  id: number;
  billId: number;
  productId?: number;
  productName: string;
  productSku?: string;
  unitOfMeasure?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  totalAmount: number;
  notes?: string;
}

export interface SupplierBill {
  id: number;
  billNumber: string;
  supplierId: number;
  supplierName: string;
  invoiceNumber?: string;
  billDate: string;       // LocalDate → "YYYY-MM-DD"
  dueDate?: string;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  amountPaid: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingCost: number;
  totalAmount: number;
  warehouseId?: number;
  priority: string;
  notes?: string;
  receivedBy?: string;
  createdBy?: string;
  paymentMethod?: string;
  paymentBreakdown?: Record<string, any>[];
  createdAt: string;
  updatedAt?: string;
  items: SupplierBillItem[];
}

export interface SupplierBillItemRequest {
  productId?: number;
  productName: string;
  productSku?: string;
  unitOfMeasure?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxPercent?: number;
  notes?: string;
}

export interface SupplierBillRequest {
  supplierId: number;
  invoiceNumber?: string;
  billDate: string;
  dueDate?: string;
  priority?: string;
  shippingCost?: number;
  warehouseId?: number;
  notes?: string;
  receivedBy?: string;
  items: SupplierBillItemRequest[];
}

export interface SupplierBillsPage {
  bills: SupplierBill[];
  pagination: { page: number; size: number; total: number; totalPages: number };
}

// ── Mappers: snake_case API → camelCase frontend ──────────────────────────────

function mapBillItem(r: any): SupplierBillItem {
  return {
    id: r.id,
    billId: r.bill_id ?? r.billId,
    productId: r.product_id ?? r.productId,
    productName: r.product_name ?? r.productName ?? '',
    productSku: r.product_sku ?? r.productSku,
    unitOfMeasure: r.unit_of_measure ?? r.unitOfMeasure,
    quantity: Number(r.quantity ?? 0),
    unitPrice: Number(r.unit_price ?? r.unitPrice ?? 0),
    discountPercent: Number(r.discount_percent ?? r.discountPercent ?? 0),
    taxPercent: Number(r.tax_percent ?? r.taxPercent ?? 0),
    totalAmount: Number(r.total_amount ?? r.totalAmount ?? 0),
    notes: r.notes,
  };
}

function mapBill(r: any): SupplierBill {
  return {
    id: r.id,
    billNumber: r.bill_number ?? r.billNumber ?? '',
    supplierId: r.supplier_id ?? r.supplierId ?? 0,
    supplierName: r.supplier_name ?? r.supplierName ?? '',
    invoiceNumber: r.invoice_number ?? r.invoiceNumber,
    billDate: r.bill_date ?? r.billDate ?? '',
    dueDate: r.due_date ?? r.dueDate,
    status: r.status ?? 'DRAFT',
    paymentStatus: r.payment_status ?? r.paymentStatus ?? 'UNPAID',
    amountPaid: Number(r.amount_paid ?? r.amountPaid ?? 0),
    subtotal: Number(r.subtotal ?? 0),
    discountAmount: Number(r.discount_amount ?? r.discountAmount ?? 0),
    taxAmount: Number(r.tax_amount ?? r.taxAmount ?? 0),
    shippingCost: Number(r.shipping_cost ?? r.shippingCost ?? 0),
    totalAmount: Number(r.total_amount ?? r.totalAmount ?? 0),
    warehouseId: r.warehouse_id ?? r.warehouseId,
    priority: r.priority ?? 'MEDIUM',
    notes: r.notes,
    receivedBy: r.received_by ?? r.receivedBy,
    createdBy: r.created_by ?? r.createdBy,
    paymentMethod: r.payment_method ?? r.paymentMethod,
    paymentBreakdown: r.payment_breakdown ?? r.paymentBreakdown,
    createdAt: r.created_at ?? r.createdAt ?? '',
    updatedAt: r.updated_at ?? r.updatedAt,
    items: (r.items ?? []).map(mapBillItem),
  };
}

// ── Request body builders: camelCase → snake_case ────────────────────────────

function toBillItemBody(item: SupplierBillItemRequest): Record<string, any> {
  return {
    product_id: item.productId,
    product_name: item.productName,
    product_sku: item.productSku,
    unit_of_measure: item.unitOfMeasure,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    discount_percent: item.discountPercent ?? 0,
    tax_percent: item.taxPercent ?? 0,
    notes: item.notes,
  };
}

function toBillBody(req: SupplierBillRequest): Record<string, any> {
  return {
    supplier_id: req.supplierId,
    invoice_number: req.invoiceNumber,
    bill_date: req.billDate,
    due_date: req.dueDate,
    priority: req.priority ?? 'MEDIUM',
    shipping_cost: req.shippingCost ?? 0,
    warehouse_id: req.warehouseId,
    notes: req.notes,
    received_by: req.receivedBy,
    items: req.items.map(toBillItemBody),
  };
}

// ── Service class ─────────────────────────────────────────────────────────────

class SupplierBillService {

  async getBills(filters?: {
    page?: number;
    size?: number;
    status?: string;
    search?: string;
  }): Promise<SupplierBillsPage> {
    const params = new URLSearchParams();
    if (filters?.page)   params.append('page',   String(filters.page));
    if (filters?.size)   params.append('size',   String(filters.size));
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/supplier-bills?${params.toString()}`
    );
    if (!res.ok) throw new Error(`Failed to fetch supplier bills: ${res.status}`);
    const raw = await res.json();
    return {
      bills: (raw.bills ?? raw.content ?? (Array.isArray(raw) ? raw : [])).map(mapBill),
      pagination: {
        page: raw.pagination?.page ?? 1,
        size: raw.pagination?.size ?? 20,
        total: raw.pagination?.total ?? raw.totalElements ?? 0,
        totalPages: raw.pagination?.totalPages ?? raw.pagination?.total_pages ?? raw.totalPages ?? 0,
      },
    };
  }

  async getBillById(id: number): Promise<SupplierBill> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/supplier-bills/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch supplier bill: ${res.status}`);
    return mapBill(await res.json());
  }

  async createBill(req: SupplierBillRequest): Promise<SupplierBill> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/supplier-bills`, {
      method: 'POST',
      body: JSON.stringify(toBillBody(req)),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message || `Failed to create supplier bill: ${res.status}`);
    }
    return mapBill(await res.json());
  }

  async updateBill(id: number, req: SupplierBillRequest): Promise<SupplierBill> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/supplier-bills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toBillBody(req)),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message || `Failed to update supplier bill: ${res.status}`);
    }
    return mapBill(await res.json());
  }

  async deleteBill(id: number): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/supplier-bills/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete supplier bill: ${res.status}`);
  }

  async confirmBill(id: number): Promise<SupplierBill> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/supplier-bills/${id}/confirm`,
      { method: 'POST' }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message || `Failed to confirm supplier bill: ${res.status}`);
    }
    return mapBill(await res.json());
  }

  async cancelBill(id: number): Promise<SupplierBill> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/supplier-bills/${id}/cancel`,
      { method: 'POST' }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message || `Failed to cancel supplier bill: ${res.status}`);
    }
    return mapBill(await res.json());
  }

  async recordPayment(
    id: number,
    amount: number,
    paymentMethod: string,
    notes?: string,
    paymentBreakdown?: Record<string, any>[]
  ): Promise<SupplierBill> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/supplier-bills/${id}/record-payment`,
      {
        method: 'POST',
        body: JSON.stringify({ amount, payment_method: paymentMethod, notes, payment_breakdown: paymentBreakdown }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message || `Failed to record payment: ${res.status}`);
    }
    return mapBill(await res.json());
  }
}

export const supplierBillService = new SupplierBillService();
