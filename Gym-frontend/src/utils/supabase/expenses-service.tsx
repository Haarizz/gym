import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface Expense {
  id: string;
  date: string;
  vendorName: string;
  category: string;
  costCenter: string;
  location: string;
  amount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  notes: string;
  status: string;
  receiptUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpenseCreateRequest {
  date: string;
  vendorName: string;
  category: string;
  costCenter: string;
  location: string;
  amount: number;
  taxRate: number;
  notes?: string;
  status?: string;
  receiptUrl?: string;
}

export interface ExpenseStats {
  totalAmount: number;
  totalTax: number;
  totalCount: number;
  pendingCount: number;
  approvedCount: number;
  byCategory: Record<string, number>;
}

function mapExpense(r: any): Expense {
  return {
    id: String(r.id),
    date: r.date ?? "",
    vendorName: r.vendor_name ?? r.vendorName ?? "",
    category: r.category ?? "",
    costCenter: r.cost_center ?? r.costCenter ?? "",
    location: r.location ?? "",
    amount: Number(r.amount ?? 0),
    taxRate: Number(r.tax_rate ?? r.taxRate ?? 0),
    taxAmount: Number(r.tax_amount ?? r.taxAmount ?? 0),
    totalAmount: Number(r.total_amount ?? r.totalAmount ?? 0),
    notes: r.notes ?? "",
    status: r.status ?? "pending",
    receiptUrl: r.receipt_url ?? r.receiptUrl,
    createdAt: r.created_at ?? r.createdAt,
    updatedAt: r.updated_at ?? r.updatedAt,
  };
}

function mapStats(r: any): ExpenseStats {
  return {
    totalAmount: Number(r.total_amount ?? r.totalAmount ?? 0),
    totalTax: Number(r.total_tax ?? r.totalTax ?? 0),
    totalCount: Number(r.total_count ?? r.totalCount ?? 0),
    pendingCount: Number(r.pending_count ?? r.pendingCount ?? 0),
    approvedCount: Number(r.approved_count ?? r.approvedCount ?? 0),
    byCategory: r.by_category ?? r.byCategory ?? {},
  };
}

function toExpenseBody(req: ExpenseCreateRequest) {
  return {
    date: req.date,
    vendor_name: req.vendorName,
    category: req.category,
    cost_center: req.costCenter,
    location: req.location,
    amount: req.amount,
    tax_rate: req.taxRate,
    notes: req.notes,
    status: req.status,
    receipt_url: req.receiptUrl,
  };
}

class ExpensesService {
  async getExpenses(filters: {
    search?: string;
    status?: string;
    category?: string;
    location?: string;
    from?: string;
    to?: string;
  } = {}): Promise<Expense[]> {
    const params = new URLSearchParams();
    if (filters.search) params.append("search", filters.search);
    if (filters.status) params.append("status", filters.status);
    if (filters.category) params.append("category", filters.category);
    if (filters.location) params.append("location", filters.location);
    if (filters.from) params.append("from", filters.from);
    if (filters.to) params.append("to", filters.to);

    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/expenses?${params.toString()}`
    );
    if (!res.ok) throw new Error("Failed to load expenses");
    const data = await res.json();
    return (data ?? []).map(mapExpense);
  }

  async getStats(): Promise<ExpenseStats> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/expenses/stats`);
    if (!res.ok) throw new Error("Failed to load expense stats");
    return mapStats(await res.json());
  }

  async createExpense(req: ExpenseCreateRequest): Promise<Expense> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/expenses`, {
      method: "POST",
      body: JSON.stringify(toExpenseBody(req)),
    });
    if (!res.ok) throw new Error("Failed to create expense");
    return mapExpense(await res.json());
  }

  async updateExpense(id: string, req: ExpenseCreateRequest): Promise<Expense> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/expenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(toExpenseBody(req)),
    });
    if (!res.ok) throw new Error("Failed to update expense");
    return mapExpense(await res.json());
  }

  async updateStatus(id: string, status: string): Promise<Expense> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/expenses/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to update expense status");
    return mapExpense(await res.json());
  }

  async deleteExpense(id: string): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/expenses/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete expense");
  }
}

export const expensesService = new ExpensesService();
