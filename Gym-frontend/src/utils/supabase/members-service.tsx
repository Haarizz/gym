import { authService } from './auth-service';
import { demoService } from './demo-service';
import { projectId } from './info';

const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-0a04502f`;
const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  membership_type: string;
  membership_status: 'active' | 'inactive' | 'suspended' | 'expired';
  join_date: string;
  expiry_date?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  payment_status: 'paid' | 'overdue' | 'pending';
  monthly_fee: number;
  created_at: string;
  updated_at: string;
  // Additional properties for backward compatibility
  member_id?: string;
  membership_plan?: string;
  membership_start_date?: string;
  membership_end_date?: string;
  membership_fee?: number;
  total_visits?: number;
  // Health & Safety Information
  date_of_birth?: string;
  blood_type?: string;
  medical_conditions?: string;
  allergies?: string;
  current_medications?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  health_notes?: string;
}

export interface MemberFilters {
  search?: string;
  status?: string;
  membership_type?: string;
  payment_status?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface MembersResponse {
  members: Member[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class MembersService {
  // Get all members with filtering and pagination
  async getMembers(filters: MemberFilters = {}, pagination: PaginationParams = {}): Promise<MembersResponse> {
    try {
      console.log('Getting members with filters:', filters, 'pagination:', pagination);
      const currentUser = authService.getCurrentUser();
      const accessToken = authService.getAccessToken();
      const isBackendAuth = authService.isBackendAuth();
      
      console.log('Auth service state:', {
        isAuthenticated: authService.isAuthenticated(),
        currentUser,
        hasAccessToken: !!accessToken,
        tokenType: accessToken?.startsWith('demo_') ? 'demo' : isBackendAuth ? 'backend' : 'supabase'
      });

      // If using demo authentication and backend fails, use local demo data
      const isDemoAuth = authService.isDemoMode();
      
      if (isDemoAuth) {
        console.log('Demo authentication detected, trying backend first, will fallback to local data');
      }

      const queryParams = new URLSearchParams();
      
      if (pagination.page) queryParams.append('page', pagination.page.toString());
      if (pagination.limit) queryParams.append('limit', pagination.limit.toString());
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.membership_type) queryParams.append('membership_type', filters.membership_type);
      if (filters.payment_status) queryParams.append('payment_status', filters.payment_status);

      // If using backend auth, prefer backend members API and fall back to demo data
      if (isBackendAuth) {
        const backendUrl = `${backendBaseUrl}/members?${queryParams.toString()}`;
        console.log('Making backend request to:', backendUrl);
        try {
          const response = await authService.makeAuthenticatedRequest(backendUrl);
          console.log('Backend response status:', response.status, 'ok:', response.ok);

          if (response.ok) {
            const result = await response.json();
            if (result?.members && result?.pagination) {
              return result as MembersResponse;
            }
            if (Array.isArray(result)) {
              return {
                members: result,
                pagination: {
                  page: pagination.page || 1,
                  limit: pagination.limit || 20,
                  total: result.length,
                  totalPages: Math.max(1, Math.ceil(result.length / (pagination.limit || 20)))
                }
              };
            }
            if (result?.data?.members && result?.data?.pagination) {
              return result.data as MembersResponse;
            }
          }
        } catch (backendError) {
          console.error('Backend members request failed:', backendError);
        }

        console.log('Backend members unavailable, using local demo data');
        return this.getDemoMembersData(filters, pagination);
      }

      const url = `${baseUrl}/members?${queryParams.toString()}`;
      console.log('Making request to:', url);

      try {
        const response = await authService.makeAuthenticatedRequest(url);
        console.log('Response status:', response.status, 'ok:', response.ok);

        if (response.ok) {
          const result = await response.json();
          console.log('Response result:', result);
          
          if (result.success) {
            return result.data;
          }
        }
        
        // If we get here and it's demo auth, fall back to local data
        if (isDemoAuth) {
          console.log('Backend failed for demo auth, using local demo data');
          return this.getDemoMembersData(filters, pagination);
        }
        
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}, body:`, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
        
      } catch (networkError) {
        console.error('Network error:', networkError);
        
        // If demo auth and network fails, use local demo data
        if (isDemoAuth) {
          console.log('Network failed for demo auth, using local demo data');
          return this.getDemoMembersData(filters, pagination);
        }
        
        throw networkError;
      }
    } catch (error) {
      console.error('Get members error:', error);
      throw error;
    }
  }

  // Local demo data fallback
  getDemoMembersData(filters: MemberFilters = {}, pagination: PaginationParams = {}): MembersResponse {
    const demoMembers = demoService.getDemoMembers();

    // Apply filters
    let filteredMembers = demoMembers;
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredMembers = filteredMembers.filter(member => 
        member.name.toLowerCase().includes(searchLower) ||
        member.email.toLowerCase().includes(searchLower) ||
        member.phone.includes(filters.search!) ||
        member.id.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.status) {
      filteredMembers = filteredMembers.filter(member => 
        member.membership_status === filters.status
      );
    }

    // Apply pagination
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMembers = filteredMembers.slice(startIndex, endIndex);

    return {
      members: paginatedMembers,
      pagination: {
        page,
        limit,
        total: filteredMembers.length,
        totalPages: Math.ceil(filteredMembers.length / limit)
      }
    };
  }

  // Get member by ID
  async getMemberById(id: string): Promise<Member> {
    try {
      const response = await authService.makeAuthenticatedRequest(`${baseUrl}/members/${id}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch member');
      }

      return result.data;
    } catch (error) {
      console.error('Get member by ID error:', error);
      throw error;
    }
  }

  // Create new member
  async createMember(memberData: Omit<Member, 'id' | 'created_at' | 'updated_at'>): Promise<Member> {
    try {
      const response = await authService.makeAuthenticatedRequest(`${baseUrl}/members`, {
        method: 'POST',
        body: JSON.stringify(memberData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create member');
      }

      return result.data;
    } catch (error) {
      console.error('Create member error:', error);
      throw error;
    }
  }

  // Update member
  async updateMember(id: string, updateData: Partial<Member>): Promise<Member> {
    try {
      const response = await authService.makeAuthenticatedRequest(`${baseUrl}/members/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update member');
      }

      return result.data;
    } catch (error) {
      console.error('Update member error:', error);
      throw error;
    }
  }

  // Delete/deactivate member
  async deleteMember(id: string): Promise<void> {
    try {
      const response = await authService.makeAuthenticatedRequest(`${baseUrl}/members/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete member');
      }
    } catch (error) {
      console.error('Delete member error:', error);
      throw error;
    }
  }

  // Search members (for quick search functionality)
  async searchMembers(query: string): Promise<Member[]> {
    try {
      if (!query.trim()) {
        return [];
      }

      const response = await this.getMembers({ search: query }, { limit: 10 });
      return response.members;
    } catch (error) {
      console.error('Search members error:', error);
      return [];
    }
  }

  // Get membership statistics
  async getMembershipStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    overdue: number;
    byType: Record<string, number>;
  }> {
    try {
      const response = await this.getMembers({}, { limit: 1000 }); // Get all for stats
      const members = response.members;

      const stats = {
        total: members.length,
        active: members.filter(m => m.membership_status === 'active').length,
        inactive: members.filter(m => m.membership_status === 'inactive').length,
        overdue: members.filter(m => m.payment_status === 'overdue').length,
        byType: {} as Record<string, number>
      };

      // Count by membership type
      members.forEach(member => {
        stats.byType[member.membership_type] = (stats.byType[member.membership_type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Get membership stats error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const membersService = new MembersService();
