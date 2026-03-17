import { authService } from './auth-service';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface Receipt {
  id: string;
  receipt_no: string;
  transaction_date: string;
  member_db_id: string;
  member_id: string;
  member_name: string;
  member_phone: string;
  transaction_type: string;
  amount: number;
  payment_method: string;
  status: string;
  plan_name?: string;
  valid_from?: string;
  valid_till?: string;
  processed_by?: string;
  remarks?: string;
  paid_amount?: number;
  due_amount?: number;
  due_date?: string;
  membership_type?: string;
  created_at: string;
  updated_at: string;
}

export interface ReceiptsResponse {
  receipts: Receipt[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class ReceiptsService {
  async getReceipts(
    filters: { search?: string; transactionType?: string; status?: string } = {},
    pagination: { page?: number; limit?: number } = {}
  ): Promise<ReceiptsResponse> {
    const params = new URLSearchParams();
    if (pagination.page)              params.append('page',             String(pagination.page));
    if (pagination.limit)             params.append('limit',            String(pagination.limit));
    if (filters.search)               params.append('search',           filters.search);
    if (filters.transactionType)      params.append('transaction_type', filters.transactionType);
    if (filters.status)               params.append('status',           filters.status);

    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/receipts?${params.toString()}`
    );
    if (!response.ok) throw new Error(`Failed to fetch receipts: ${response.status}`);
    return response.json();
  }

  async getReceiptById(id: string): Promise<Receipt> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/receipts/${id}`
    );
    if (!response.ok) throw new Error(`Failed to fetch receipt: ${response.status}`);
    return response.json();
  }
}

export const receiptsService = new ReceiptsService();
