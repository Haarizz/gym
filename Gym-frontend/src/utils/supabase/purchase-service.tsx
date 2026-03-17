import { authService } from './auth-service';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// ── Frontend interfaces (camelCase) ──────────────────────────────────────────

export interface Supplier {
  id: number;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  taxId?: string;
  paymentTerms?: string;
  creditLimit?: number;
  isActive: boolean;
  rating?: number;
  notes?: string;
}

export interface PurchaseOrderItem {
  id: number;
  purchaseOrderId: number;
  productId?: number;
  productName: string;
  productSku?: string;
  unitOfMeasure?: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  totalAmount: number;
  notes?: string;
}

export interface PurchaseOrder {
  id: number;
  poNumber: string;
  supplierId: number;
  supplierName: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingCost: number;
  totalAmount: number;
  paymentTerms?: string;
  deliveryAddress?: string;
  notes?: string;
  createdBy?: string;
  approvedBy?: string;
  items: PurchaseOrderItem[];
  createdAt: string;
}

export interface POItemRequest {
  productId?: number;
  productName: string;
  productSku?: string;
  unitOfMeasure?: string;
  quantityOrdered: number;
  unitPrice: number;
  discountPercent?: number;
  taxPercent?: number;
  notes?: string;
}

export interface PurchaseOrderRequest {
  supplierId: number;
  orderDate: string;
  expectedDeliveryDate?: string;
  priority: string;
  paymentTerms?: string;
  deliveryAddress?: string;
  notes?: string;
  createdBy?: string;
  shippingCost?: number;
  items: POItemRequest[];
}

export interface ReceiveItemRequest {
  purchaseOrderItemId: number;
  quantityReceived: number;
  warehouseId: number;
}

export interface PurchaseOrdersPage {
  orders: PurchaseOrder[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// ── Mappers: snake_case / camelCase API → camelCase frontend ──────────────────

function mapSupplier(r: any): Supplier {
  return {
    id: r.id,
    name: r.name ?? '',
    contactPerson: r.contact_person ?? r.contactPerson,
    email: r.email,
    phone: r.phone,
    address: r.address,
    city: r.city,
    country: r.country,
    taxId: r.tax_id ?? r.taxId,
    paymentTerms: r.payment_terms ?? r.paymentTerms,
    creditLimit: r.credit_limit !== undefined ? Number(r.credit_limit) : (r.creditLimit !== undefined ? Number(r.creditLimit) : undefined),
    isActive: r.is_active ?? r.isActive ?? true,
    rating: r.rating !== undefined ? Number(r.rating) : undefined,
    notes: r.notes,
  };
}

function mapPOItem(r: any): PurchaseOrderItem {
  return {
    id: r.id,
    purchaseOrderId: r.purchase_order_id ?? r.purchaseOrderId,
    productId: r.product_id ?? r.productId,
    productName: r.product_name ?? r.productName ?? '',
    productSku: r.product_sku ?? r.productSku,
    unitOfMeasure: r.unit_of_measure ?? r.unitOfMeasure,
    quantityOrdered: Number(r.quantity_ordered ?? r.quantityOrdered ?? 0),
    quantityReceived: Number(r.quantity_received ?? r.quantityReceived ?? 0),
    unitPrice: Number(r.unit_price ?? r.unitPrice ?? 0),
    discountPercent: Number(r.discount_percent ?? r.discountPercent ?? 0),
    taxPercent: Number(r.tax_percent ?? r.taxPercent ?? 0),
    totalAmount: Number(r.total_amount ?? r.totalAmount ?? 0),
    notes: r.notes,
  };
}

function mapPO(r: any): PurchaseOrder {
  const items: PurchaseOrderItem[] = (r.items ?? []).map(mapPOItem);
  return {
    id: r.id,
    poNumber: r.po_number ?? r.poNumber ?? '',
    supplierId: r.supplier_id ?? r.supplierId ?? 0,
    supplierName: r.supplier_name ?? r.supplierName ?? '',
    orderDate: r.order_date ?? r.orderDate ?? '',
    expectedDeliveryDate: r.expected_delivery_date ?? r.expectedDeliveryDate,
    actualDeliveryDate: r.actual_delivery_date ?? r.actualDeliveryDate,
    status: r.status ?? 'DRAFT',
    priority: r.priority ?? 'MEDIUM',
    subtotal: Number(r.subtotal ?? 0),
    discountAmount: Number(r.discount_amount ?? r.discountAmount ?? 0),
    taxAmount: Number(r.tax_amount ?? r.taxAmount ?? 0),
    shippingCost: Number(r.shipping_cost ?? r.shippingCost ?? 0),
    totalAmount: Number(r.total_amount ?? r.totalAmount ?? 0),
    paymentTerms: r.payment_terms ?? r.paymentTerms,
    deliveryAddress: r.delivery_address ?? r.deliveryAddress,
    notes: r.notes,
    createdBy: r.created_by ?? r.createdBy,
    approvedBy: r.approved_by ?? r.approvedBy,
    items,
    createdAt: r.created_at ?? r.createdAt ?? '',
  };
}

// ── Request body builders: camelCase → snake_case ────────────────────────────

function toSupplierBody(data: Partial<Supplier>): Record<string, any> {
  return {
    name: data.name,
    contact_person: data.contactPerson,
    email: data.email,
    phone: data.phone,
    address: data.address,
    city: data.city,
    country: data.country,
    tax_id: data.taxId,
    payment_terms: data.paymentTerms,
    credit_limit: data.creditLimit,
    is_active: data.isActive,
    rating: data.rating,
    notes: data.notes,
  };
}

function toPOItemBody(item: POItemRequest): Record<string, any> {
  return {
    product_id: item.productId,
    product_name: item.productName,
    product_sku: item.productSku,
    unit_of_measure: item.unitOfMeasure,
    quantity_ordered: item.quantityOrdered,
    unit_price: item.unitPrice,
    discount_percent: item.discountPercent ?? 0,
    tax_percent: item.taxPercent ?? 0,
    notes: item.notes,
  };
}

function toPOBody(req: PurchaseOrderRequest): Record<string, any> {
  return {
    supplier_id: req.supplierId,
    order_date: req.orderDate,
    expected_delivery_date: req.expectedDeliveryDate,
    priority: req.priority,
    payment_terms: req.paymentTerms,
    delivery_address: req.deliveryAddress,
    notes: req.notes,
    created_by: req.createdBy,
    shipping_cost: req.shippingCost ?? 0,
    items: req.items.map(toPOItemBody),
  };
}

// ── Service class ─────────────────────────────────────────────────────────────

class PurchaseService {

  // ── Suppliers ─────────────────────────────────────────────────────────────

  async getAllSuppliers(): Promise<Supplier[]> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/suppliers`);
    if (!res.ok) throw new Error(`Failed to fetch suppliers: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data.map(mapSupplier) : (data.suppliers ?? []).map(mapSupplier);
  }

  async getActiveSuppliers(): Promise<Supplier[]> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/suppliers/active`);
    if (!res.ok) throw new Error(`Failed to fetch active suppliers: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data.map(mapSupplier) : (data.suppliers ?? []).map(mapSupplier);
  }

  async createSupplier(data: Partial<Supplier>): Promise<Supplier> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/suppliers`, {
      method: 'POST',
      body: JSON.stringify(toSupplierBody(data)),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to create supplier: ${res.status}`);
    }
    return mapSupplier(await res.json());
  }

  async updateSupplier(id: number, data: Partial<Supplier>): Promise<Supplier> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toSupplierBody(data)),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to update supplier: ${res.status}`);
    }
    return mapSupplier(await res.json());
  }

  async deleteSupplier(id: number): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/suppliers/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete supplier: ${res.status}`);
  }

  // ── Purchase Orders ───────────────────────────────────────────────────────

  async getOrders(filters?: {
    search?: string;
    status?: string;
    supplierId?: number;
    page?: number;
    size?: number;
  }): Promise<PurchaseOrdersPage> {
    const params = new URLSearchParams();
    if (filters?.search)     params.append('search',     filters.search);
    if (filters?.status)     params.append('status',     filters.status);
    if (filters?.supplierId) params.append('supplierId', String(filters.supplierId));
    if (filters?.page)       params.append('page',       String(filters.page));
    if (filters?.size)       params.append('size',       String(filters.size));

    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/purchase-orders?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch purchase orders: ${res.status}`);
    const raw = await res.json();
    return {
      orders: (raw.orders ?? raw.content ?? (Array.isArray(raw) ? raw : [])).map(mapPO),
      pagination: {
        page: raw.pagination?.page ?? 1,
        limit: raw.pagination?.limit ?? 20,
        total: raw.pagination?.total ?? raw.totalElements ?? 0,
        totalPages: raw.pagination?.total_pages ?? raw.pagination?.totalPages ?? raw.totalPages ?? 0,
      },
    };
  }

  async getOrderById(id: number): Promise<PurchaseOrder> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/purchase-orders/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch purchase order: ${res.status}`);
    return mapPO(await res.json());
  }

  async createOrder(req: PurchaseOrderRequest): Promise<PurchaseOrder> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/purchase-orders`, {
      method: 'POST',
      body: JSON.stringify(toPOBody(req)),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to create purchase order: ${res.status}`);
    }
    return mapPO(await res.json());
  }

  async updateOrder(id: number, req: PurchaseOrderRequest): Promise<PurchaseOrder> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/purchase-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toPOBody(req)),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to update purchase order: ${res.status}`);
    }
    return mapPO(await res.json());
  }

  async updateStatus(id: number, status: string): Promise<PurchaseOrder> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/purchase-orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to update order status: ${res.status}`);
    }
    return mapPO(await res.json());
  }

  async receiveItems(id: number, items: ReceiveItemRequest[]): Promise<PurchaseOrder> {
    const body = {
      items: items.map(item => ({
        purchase_order_item_id: item.purchaseOrderItemId,
        quantity_received: item.quantityReceived,
        warehouse_id: item.warehouseId,
      })),
    };
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/purchase-orders/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to receive items: ${res.status}`);
    }
    return mapPO(await res.json());
  }

  async deleteOrder(id: number): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/purchase-orders/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete purchase order: ${res.status}`);
  }
}

export const purchaseService = new PurchaseService();
