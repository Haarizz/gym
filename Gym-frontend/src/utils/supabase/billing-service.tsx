import { authService } from './auth-service';
import { projectId } from './info';

const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-0a04502f`;

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
  // Get billing records with filtering and pagination
  async getBilling(filters: BillingFilters = {}, pagination: PaginationParams = {}): Promise<BillingResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (pagination.page) queryParams.append('page', pagination.page.toString());
      if (pagination.limit) queryParams.append('limit', pagination.limit.toString());
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.member_id) queryParams.append('member_id', filters.member_id);
      if (filters.date_from) queryParams.append('date_from', filters.date_from);
      if (filters.date_to) queryParams.append('date_to', filters.date_to);

      const response = await authService.makeAuthenticatedRequest(
        `${baseUrl}/billing?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch billing records');
      }

      return result.data;
    } catch (error) {
      console.error('Get billing error:', error);
      throw error;
    }
  }

  // Get billing record by ID
  async getBillingById(id: string): Promise<BillingRecord> {
    try {
      const response = await authService.makeAuthenticatedRequest(`${baseUrl}/billing/${id}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch billing record');
      }

      return result.data;
    } catch (error) {
      console.error('Get billing by ID error:', error);
      throw error;
    }
  }

  // Create new billing record
  async createBilling(billingData: Omit<BillingRecord, 'id' | 'created_at' | 'updated_at'>): Promise<BillingRecord> {
    try {
      const response = await authService.makeAuthenticatedRequest(`${baseUrl}/billing`, {
        method: 'POST',
        body: JSON.stringify(billingData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create billing record');
      }

      return result.data;
    } catch (error) {
      console.error('Create billing error:', error);
      throw error;
    }
  }

  // Update billing record
  async updateBilling(id: string, updateData: Partial<BillingRecord>): Promise<BillingRecord> {
    try {
      const response = await authService.makeAuthenticatedRequest(`${baseUrl}/billing/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update billing record');
      }

      return result.data;
    } catch (error) {
      console.error('Update billing error:', error);
      throw error;
    }
  }

  // Mark billing record as paid
  async markAsPaid(id: string, paymentMethod: string): Promise<BillingRecord> {
    try {
      const updateData = {
        status: 'paid' as const,
        payment_date: new Date().toISOString(),
        payment_method: paymentMethod
      };

      return await this.updateBilling(id, updateData);
    } catch (error) {
      console.error('Mark as paid error:', error);
      throw error;
    }
  }

  // Get overdue billing records
  async getOverdueBilling(): Promise<BillingRecord[]> {
    try {
      const response = await this.getBilling({ status: 'overdue' });
      return response.billingRecords;
    } catch (error) {
      console.error('Get overdue billing error:', error);
      return [];
    }
  }

  // Get billing statistics
  async getBillingStats(): Promise<{
    totalRevenue: number;
    pendingAmount: number;
    overdueAmount: number;
    paidThisMonth: number;
    overdueCount: number;
    byStatus: Record<string, number>;
  }> {
    try {
      const response = await this.getBilling({}, { limit: 1000 }); // Get all for stats
      const records = response.billingRecords;

      const now = new Date();
      const thisMonth = records.filter(record => {
        const recordDate = new Date(record.created_at);
        return recordDate.getMonth() === now.getMonth() && 
               recordDate.getFullYear() === now.getFullYear();
      });

      const stats = {
        totalRevenue: records
          .filter(r => r.status === 'paid')
          .reduce((sum, r) => sum + r.amount, 0),
        pendingAmount: records
          .filter(r => r.status === 'pending')
          .reduce((sum, r) => sum + r.amount, 0),
        overdueAmount: records
          .filter(r => r.status === 'overdue')
          .reduce((sum, r) => sum + r.amount, 0),
        paidThisMonth: thisMonth
          .filter(r => r.status === 'paid')
          .reduce((sum, r) => sum + r.amount, 0),
        overdueCount: records.filter(r => r.status === 'overdue').length,
        byStatus: {} as Record<string, number>
      };

      // Count by status
      records.forEach(record => {
        stats.byStatus[record.status] = (stats.byStatus[record.status] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Get billing stats error:', error);
      throw error;
    }
  }

  // Generate invoice for member
  async generateInvoice(memberId: string, memberName: string, amount: number, description: string): Promise<BillingRecord> {
    try {
      const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + 1); // Due in 1 month

      const billingData = {
        member_id: memberId,
        member_name: memberName,
        invoice_number: invoiceNumber,
        amount,
        due_date: dueDate.toISOString(),
        status: 'pending' as const,
        description
      };

      return await this.createBilling(billingData);
    } catch (error) {
      console.error('Generate invoice error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const billingService = new BillingService();
