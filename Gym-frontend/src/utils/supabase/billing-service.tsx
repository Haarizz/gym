import { authService } from './auth-service';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface BillingRecord {
  id: string;
  member_id: string;
  member_name: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  status: 'paid' | 'overdue' | 'pending' | 'cancelled';
  payment_date?: string | null;
  payment_method?: string | null;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface BillingFilters {
  search?: string;
  status?: string;
  member_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface BillingResponse {
  billingRecords: BillingRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class BillingService {

  async getBilling(filters: BillingFilters = {}, pagination: PaginationParams = {}): Promise<BillingResponse> {
    const params = new URLSearchParams();
    if (pagination.page)    params.append('page',      String(pagination.page));
    if (pagination.limit)   params.append('limit',     String(pagination.limit));
    if (filters.search)     params.append('search',    filters.search);
    if (filters.status)     params.append('status',    filters.status);
    if (filters.member_id)  params.append('member_id', filters.member_id);
    if (filters.date_from)  params.append('date_from', filters.date_from);
    if (filters.date_to)    params.append('date_to',   filters.date_to);

    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/billing?${params.toString()}`
    );
    if (!response.ok) throw new Error(`Failed to fetch billing: ${response.status}`);
    return response.json();
  }

  async getBillingById(id: string): Promise<BillingRecord> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/billing/${id}`
    );
    if (!response.ok) throw new Error(`Failed to fetch billing record: ${response.status}`);
    return response.json();
  }

  async createBilling(data: Omit<BillingRecord, 'id' | 'created_at' | 'updated_at'>): Promise<BillingRecord> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/billing`,
      { method: 'POST', body: JSON.stringify(data) }
    );
    if (!response.ok) throw new Error(`Failed to create billing record: ${response.status}`);
    return response.json();
  }

  async updateBilling(id: string, data: Partial<BillingRecord>): Promise<BillingRecord> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/billing/${id}`,
      { method: 'PUT', body: JSON.stringify(data) }
    );
    if (!response.ok) throw new Error(`Failed to update billing record: ${response.status}`);
    return response.json();
  }

  async markAsPaid(id: string, paymentMethod: string): Promise<BillingRecord> {
    return this.updateBilling(id, {
      status: 'paid',
      payment_date: new Date().toISOString(),
      payment_method: paymentMethod,
    });
  }

  async getOverdueBilling(): Promise<BillingRecord[]> {
    const result = await this.getBilling({ status: 'overdue' });
    return result.billingRecords;
  }

  async generateInvoice(memberId: string, memberName: string, amount: number, description: string): Promise<BillingRecord> {
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 1);

    return this.createBilling({
      member_id:      memberId,
      member_name:    memberName,
      invoice_number: invoiceNumber,
      amount,
      due_date:       dueDate.toISOString(),
      status:         'pending',
      description,
    });
  }

  async getBillingStats() {
    const result = await this.getBilling({}, { limit: 1000 });
    const records = result.billingRecords;
    const now = new Date();

    return {
      totalRevenue:   records.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0),
      pendingAmount:  records.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0),
      overdueAmount:  records.filter(r => r.status === 'overdue').reduce((s, r) => s + r.amount, 0),
      paidThisMonth:  records.filter(r => {
        const d = new Date(r.created_at);
        return r.status === 'paid' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).reduce((s, r) => s + r.amount, 0),
      overdueCount:   records.filter(r => r.status === 'overdue').length,
      byStatus:       records.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as Record<string, number>),
    };
  }
}

export const billingService = new BillingService();
