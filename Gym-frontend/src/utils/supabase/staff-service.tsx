import { authService } from './auth-service';
import { demoService } from './demo-service';
import { projectId } from './info';

const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-0a04502f`;

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: 'active' | 'inactive' | 'on_leave';
  hire_date: string;
  salary: number;
  certifications: string[];
  schedule: 'full_time' | 'part_time' | 'contract';
  created_at: string;
  updated_at: string;
}

export interface StaffFilters {
  search?: string;
  role?: string;
  department?: string;
  status?: string;
}

class StaffService {
  // Get all staff members
  async getStaff(filters: StaffFilters = {}): Promise<Staff[]> {
    try {
      // If demo mode, return demo data directly
      if (authService.isDemoMode()) {
        console.log('Demo mode detected, returning demo staff');
        const demoStaff = demoService.getDemoStaff();
        
        // Apply filters to demo data
        let filteredStaff = demoStaff;
        
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredStaff = filteredStaff.filter(staff => 
            staff.name.toLowerCase().includes(searchLower) ||
            staff.email.toLowerCase().includes(searchLower) ||
            staff.role.toLowerCase().includes(searchLower)
          );
        }
        
        if (filters.role) {
          filteredStaff = filteredStaff.filter(staff => 
            staff.role === filters.role
          );
        }
        
        if (filters.department) {
          filteredStaff = filteredStaff.filter(staff => 
            staff.department === filters.department
          );
        }
        
        if (filters.status) {
          filteredStaff = filteredStaff.filter(staff => 
            staff.status === filters.status
          );
        }
        
        return filteredStaff;
      }

      const queryParams = new URLSearchParams();
      
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.role) queryParams.append('role', filters.role);
      if (filters.department) queryParams.append('department', filters.department);
      if (filters.status) queryParams.append('status', filters.status);

      const response = await authService.makeAuthenticatedRequest(
        `${baseUrl}/staff?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch staff');
      }

      return result.data;
    } catch (error) {
      console.error('Get staff error:', error);
      
      // Fallback to demo data if authenticated and demo mode
      if (authService.isDemoMode()) {
        console.log('Backend failed, falling back to demo staff');
        return demoService.getDemoStaff();
      }
      
      throw error;
    }
  }

  // Get staff member by ID
  async getStaffById(id: string): Promise<Staff> {
    try {
      const response = await authService.makeAuthenticatedRequest(`${baseUrl}/staff/${id}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch staff member');
      }

      return result.data;
    } catch (error) {
      console.error('Get staff by ID error:', error);
      throw error;
    }
  }

  // Create new staff member
  async createStaff(staffData: Omit<Staff, 'id' | 'created_at' | 'updated_at'>): Promise<Staff> {
    try {
      const response = await authService.makeAuthenticatedRequest(`${baseUrl}/staff`, {
        method: 'POST',
        body: JSON.stringify(staffData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create staff member');
      }

      return result.data;
    } catch (error) {
      console.error('Create staff error:', error);
      throw error;
    }
  }

  // Update staff member
  async updateStaff(id: string, updateData: Partial<Staff>): Promise<Staff> {
    try {
      const response = await authService.makeAuthenticatedRequest(`${baseUrl}/staff/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update staff member');
      }

      return result.data;
    } catch (error) {
      console.error('Update staff error:', error);
      throw error;
    }
  }

  // Delete staff member
  async deleteStaff(id: string): Promise<void> {
    try {
      const response = await authService.makeAuthenticatedRequest(`${baseUrl}/staff/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete staff member');
      }
    } catch (error) {
      console.error('Delete staff error:', error);
      throw error;
    }
  }

  // Get departments
  async getDepartments(): Promise<string[]> {
    try {
      const staff = await this.getStaff();
      const departments = [...new Set(staff.map(s => s.department))];
      return departments.sort();
    } catch (error) {
      console.error('Get departments error:', error);
      return [];
    }
  }

  // Get roles
  async getRoles(): Promise<string[]> {
    try {
      const staff = await this.getStaff();
      const roles = [...new Set(staff.map(s => s.role))];
      return roles.sort();
    } catch (error) {
      console.error('Get roles error:', error);
      return [];
    }
  }

  // Get staff statistics
  async getStaffStats(): Promise<{
    total: number;
    active: number;
    onLeave: number;
    byDepartment: Record<string, number>;
    byRole: Record<string, number>;
  }> {
    try {
      const staff = await this.getStaff();
      
      const stats = {
        total: staff.length,
        active: staff.filter(s => s.status === 'active').length,
        onLeave: staff.filter(s => s.status === 'on_leave').length,
        byDepartment: {} as Record<string, number>,
        byRole: {} as Record<string, number>
      };

      // Count by department
      staff.forEach(member => {
        stats.byDepartment[member.department] = (stats.byDepartment[member.department] || 0) + 1;
        stats.byRole[member.role] = (stats.byRole[member.role] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Get staff stats error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const staffService = new StaffService();
