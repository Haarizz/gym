import { authService } from './auth-service';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// ── Frontend interfaces (camelCase) ──────────────────────────────────────────

export interface PosSession {
  id: number;
  sessionNumber: string;
  openingCash: number;
  closingCash?: number;
  openingDenominations?: string; // JSON string
  closingDenominations?: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt?: string;
  staffName?: string;
  notes?: string;
  totalSales: number;
  transactionCount: number;
}

export interface SaleItem {
  productId: number;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

export interface PaymentSplitLeg {
  method: string;
  amount: number;
  reference?: string;
}

export interface SaleTransactionRequest {
  posSessionId?: number;
  memberId?: number;
  memberName: string;
  paymentMethod: 'CASH' | 'CARD' | 'ONLINE' | 'WALLET' | 'CHEQUE' | 'MIXED';
  paymentBreakdown?: PaymentSplitLeg[];
  items: SaleItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  receivedAmount?: number;
  notes?: string;
}

export interface SaleTransactionItem {
  id: number;
  transactionId: number;
  productId: number;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
}

export interface SaleTransaction {
  id: number;
  transactionNumber: string;
  posSessionId?: number;
  memberId?: number;
  memberName: string;
  paymentMethod: string;
  paymentBreakdown?: PaymentSplitLeg[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  receivedAmount?: number;
  changeAmount?: number;
  status: 'COMPLETED' | 'REFUNDED' | 'VOIDED';
  notes?: string;
  items: SaleTransactionItem[];
  createdAt: string;
}

export interface TransactionsPage {
  transactions: SaleTransaction[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface SessionsPage {
  sessions: PosSession[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// ── Mappers: snake_case API → camelCase frontend ─────────────────────────────

function mapSession(r: any): PosSession {
  return {
    id: r.id,
    sessionNumber: r.session_number ?? r.sessionNumber ?? '',
    openingCash: Number(r.opening_cash ?? r.openingCash ?? 0),
    closingCash: r.closing_cash !== undefined ? Number(r.closing_cash) : (r.closingCash !== undefined ? Number(r.closingCash) : undefined),
    openingDenominations: r.opening_denominations ?? r.openingDenominations,
    closingDenominations: r.closing_denominations ?? r.closingDenominations,
    status: r.status ?? 'OPEN',
    openedAt: r.opened_at ?? r.openedAt ?? '',
    closedAt: r.closed_at ?? r.closedAt,
    staffName: r.staff_name ?? r.staffName,
    notes: r.notes,
    totalSales: Number(r.total_sales ?? r.totalSales ?? 0),
    transactionCount: Number(r.transaction_count ?? r.transactionCount ?? 0),
  };
}

function mapItem(r: any): SaleTransactionItem {
  return {
    id: r.id,
    transactionId: r.transaction_id ?? r.transactionId,
    productId: r.product_id ?? r.productId,
    productName: r.product_name ?? r.productName ?? '',
    productSku: r.product_sku ?? r.productSku ?? '',
    quantity: Number(r.quantity ?? 0),
    unitPrice: Number(r.unit_price ?? r.unitPrice ?? 0),
    discountPercent: Number(r.discount_percent ?? r.discountPercent ?? 0),
    discountAmount: Number(r.discount_amount ?? r.discountAmount ?? 0),
    taxAmount: Number(r.tax_amount ?? r.taxAmount ?? 0),
    totalAmount: Number(r.total_amount ?? r.totalAmount ?? 0),
  };
}

function mapTransaction(r: any): SaleTransaction {
  const items: SaleTransactionItem[] = (r.items ?? []).map(mapItem);
  return {
    id: r.id,
    transactionNumber: r.transaction_number ?? r.transactionNumber ?? '',
    posSessionId: r.pos_session_id ?? r.posSessionId,
    memberId: r.member_id ?? r.memberId,
    memberName: r.member_name ?? r.memberName ?? '',
    paymentMethod: r.payment_method ?? r.paymentMethod ?? '',
    paymentBreakdown: r.payment_breakdown ?? r.paymentBreakdown,
    subtotal: Number(r.subtotal ?? 0),
    discountAmount: Number(r.discount_amount ?? r.discountAmount ?? 0),
    taxAmount: Number(r.tax_amount ?? r.taxAmount ?? 0),
    totalAmount: Number(r.total_amount ?? r.totalAmount ?? 0),
    receivedAmount: r.received_amount !== undefined ? Number(r.received_amount) : (r.receivedAmount !== undefined ? Number(r.receivedAmount) : undefined),
    changeAmount: r.change_amount !== undefined ? Number(r.change_amount) : (r.changeAmount !== undefined ? Number(r.changeAmount) : undefined),
    status: r.status ?? 'COMPLETED',
    notes: r.notes,
    items,
    createdAt: r.created_at ?? r.createdAt ?? '',
  };
}

// ── Request body builders: camelCase → snake_case ────────────────────────────

function toSessionBody(data: { openingCash: number; openingDenominations?: string; staffName?: string }): Record<string, any> {
  return {
    opening_cash: data.openingCash,
    opening_denominations: data.openingDenominations,
    staff_name: data.staffName,
  };
}

function toCloseSessionBody(data: { closingCash: number; closingDenominations?: string; notes?: string }): Record<string, any> {
  return {
    closing_cash: data.closingCash,
    closing_denominations: data.closingDenominations,
    notes: data.notes,
  };
}

function toTransactionBody(req: SaleTransactionRequest): Record<string, any> {
  return {
    pos_session_id: req.posSessionId,
    member_id: req.memberId,
    member_name: req.memberName,
    payment_method: req.paymentMethod,
    payment_breakdown: req.paymentBreakdown,
    items: req.items.map(item => ({
      product_id: item.productId,
      product_name: item.productName,
      product_sku: item.productSku,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      discount_percent: item.discountPercent,
    })),
    subtotal: req.subtotal,
    discount_amount: req.discountAmount,
    tax_amount: req.taxAmount,
    total_amount: req.totalAmount,
    received_amount: req.receivedAmount,
    notes: req.notes,
  };
}

// ── Service class ─────────────────────────────────────────────────────────────

class PosService {

  // ── Sessions ─────────────────────────────────────────────────────────────

  async getActiveSesion(): Promise<PosSession | null> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/pos/sessions/active`);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return mapSession(await res.json());
  }

  async getSessions(page = 1, size = 20): Promise<SessionsPage> {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/pos/sessions?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch sessions: ${res.status}`);
    const raw = await res.json();
    return {
      sessions: (raw.sessions ?? raw.content ?? []).map(mapSession),
      pagination: {
        page: raw.pagination?.page ?? raw.page ?? page,
        limit: raw.pagination?.limit ?? raw.size ?? size,
        total: raw.pagination?.total ?? raw.totalElements ?? 0,
        totalPages: raw.pagination?.total_pages ?? raw.pagination?.totalPages ?? raw.totalPages ?? 0,
      },
    };
  }

  async openSession(data: { openingCash: number; openingDenominations?: string; staffName?: string }): Promise<PosSession> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/pos/sessions`, {
      method: 'POST',
      body: JSON.stringify(toSessionBody(data)),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to open session: ${res.status}`);
    }
    return mapSession(await res.json());
  }

  async closeSession(id: number, data: { closingCash: number; closingDenominations?: string; notes?: string }): Promise<PosSession> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/pos/sessions/${id}/close`, {
      method: 'POST',
      body: JSON.stringify(toCloseSessionBody(data)),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to close session: ${res.status}`);
    }
    return mapSession(await res.json());
  }

  async getSessionTransactions(sessionId: number, page = 1, size = 50): Promise<TransactionsPage> {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/pos/sessions/${sessionId}/transactions?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch session transactions: ${res.status}`);
    const raw = await res.json();
    return {
      transactions: (raw.transactions ?? raw.content ?? []).map(mapTransaction),
      pagination: {
        page: raw.pagination?.page ?? page,
        limit: raw.pagination?.limit ?? size,
        total: raw.pagination?.total ?? raw.totalElements ?? 0,
        totalPages: raw.pagination?.total_pages ?? raw.pagination?.totalPages ?? raw.totalPages ?? 0,
      },
    };
  }

  // ── Transactions ──────────────────────────────────────────────────────────

  async createTransaction(req: SaleTransactionRequest): Promise<SaleTransaction> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/pos/transactions`, {
      method: 'POST',
      body: JSON.stringify(toTransactionBody(req)),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to create transaction: ${res.status}`);
    }
    return mapTransaction(await res.json());
  }

  async getTransactions(filters?: {
    search?: string;
    paymentMethod?: string;
    status?: string;
    sessionId?: number;
    page?: number;
    size?: number;
  }): Promise<TransactionsPage> {
    const params = new URLSearchParams();
    if (filters?.search)        params.append('search',         filters.search);
    if (filters?.paymentMethod) params.append('paymentMethod',  filters.paymentMethod);
    if (filters?.status)        params.append('status',         filters.status);
    if (filters?.sessionId)     params.append('sessionId',      String(filters.sessionId));
    if (filters?.page)          params.append('page',           String(filters.page));
    if (filters?.size)          params.append('size',           String(filters.size));

    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/pos/transactions?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch transactions: ${res.status}`);
    const raw = await res.json();
    return {
      transactions: (raw.transactions ?? raw.content ?? []).map(mapTransaction),
      pagination: {
        page: raw.pagination?.page ?? 1,
        limit: raw.pagination?.limit ?? 20,
        total: raw.pagination?.total ?? raw.totalElements ?? 0,
        totalPages: raw.pagination?.total_pages ?? raw.pagination?.totalPages ?? raw.totalPages ?? 0,
      },
    };
  }

  async getTransactionById(id: number): Promise<SaleTransaction> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/pos/transactions/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch transaction: ${res.status}`);
    return mapTransaction(await res.json());
  }

  async refundTransaction(id: number): Promise<SaleTransaction> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/pos/transactions/${id}/refund`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to refund transaction: ${res.status}`);
    }
    return mapTransaction(await res.json());
  }
}

export const posService = new PosService();
