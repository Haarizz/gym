import { projectId, publicAnonKey } from './info';
import { authService } from './auth-service';
import { demoService } from './demo-service';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-0a04502f`;
const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

// Helper function to make API calls with backend only
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const isBackendAuth = authService.isBackendAuth();
  const backendUrl = `${backendBaseUrl}${endpoint}`;
  
  if (isBackendAuth) {
    try {
      const response = await authService.makeAuthenticatedRequest(backendUrl, options);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      throw new Error(`Backend responded ${response.status} for ${endpoint}`);
    } catch (backendError) {
      console.error('Backend failed for dashboard endpoint', backendError);
      throw backendError;
    }
  }

  // Fallback to fetch directly (for testing without auth if needed)
  try {
    const response = await fetch(backendUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

// Dashboard API functions
export const dashboardService = {
  // Get KPI data for specific period
  async getKPIs(period: string = 'today') {
    return apiCall(`/dashboard/kpis?period=${period}`);
  },

  // Get revenue data for specific period
  async getRevenueData(period: string = 'today') {
    return apiCall(`/dashboard/revenue?period=${period}`);
  },

  // Get membership distribution data
  async getMembershipDistribution() {
    return apiCall('/dashboard/membership-distribution');
  },

  // Get class attendance data
  async getClassAttendance() {
    return apiCall('/dashboard/class-attendance');
  },

  // Get recent members
  async getRecentMembers() {
    return apiCall('/dashboard/recent-members');
  },

  // Get notifications
  async getNotifications() {
    return apiCall('/dashboard/notifications');
  },

  // Get staff members
  async getStaffMembers() {
    return apiCall('/dashboard/staff-status');
  },

  // Search members
  async searchMembers(query: string) {
    return apiCall(`/dashboard/search-members?q=${encodeURIComponent(query)}`);
  },

  // Get sales pipeline
  async getSalesPipeline() {
    return apiCall('/dashboard/sales-pipeline');
  },

  // Get pending tasks
  async getPendingTasks() {
    return apiCall('/dashboard/pending-tasks');
  },

  // Update KPI data
  async updateKPI(period: string, kpiData: any) {
    return apiCall('/dashboard/update-kpi', {
      method: 'POST',
      body: JSON.stringify({ period, kpiData }),
    });
  },

  // Health check
  async healthCheck() {
    try {
      await apiCall('/dashboard/kpis');
      return { success: true, status: 'ok' };
    } catch (e) {
      return { success: false, status: 'error' };
    }
  }
};

// Types for better type safety
export interface KPIData {
  revenue: number;
  revenueChange: number;
  activeMembers: number;
  membersChange: number;
  todayAttendance: number;
  attendanceChange: number;
  availableStaff: number;
}

export interface RevenueDataPoint {
  time?: string;
  day?: string;
  week?: string;
  revenue: number;
  target: number;
}

export interface MembershipDistribution {
  name: string;
  value: number;
  color: string;
  amount: number;
}

export interface ClassAttendance {
  class: string;
  capacity: number;
  attended: number;
  percentage: number;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  membershipType: string;
  joinDate: string;
  status: string;
  avatar?: string;
}

export interface Notification {
  id: string;
  type: 'alert' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  status: 'available' | 'busy' | 'offline';
  clockedIn: boolean;
  avatar?: string;
}

export interface SalesPipelineData {
  status: string;
  count: number;
  color: string;
}

export interface PendingTaskData {
  id: string;
  leadName: string;
  type: string;
  dueDate: string;
  priority: string;
  subject: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
