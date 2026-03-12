import { projectId, publicAnonKey } from './info';
import { authService } from './auth-service';
import { demoService } from './demo-service';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-0a04502f`;
const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

// Helper function to make API calls with demo fallback
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const isBackendAuth = authService.isBackendAuth();
  
  if (isBackendAuth) {
    const backendUrl = `${backendBaseUrl}${endpoint}`;
    console.log(`Backend auth detected for dashboard endpoint: ${endpoint}`);
    try {
      const response = await authService.makeAuthenticatedRequest(backendUrl, options);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      console.log(`Backend responded ${response.status} for ${endpoint}, using demo fallback`);
    } catch (backendError) {
      console.log('Backend failed for dashboard endpoint, using local fallback', backendError);
    }
    return getDemoDataForEndpoint(endpoint);
  }

  // If in demo mode, try to use fallback data for certain endpoints
  if (authService.isDemoMode()) {
    console.log(`Demo mode detected for dashboard endpoint: ${endpoint}`);
    
    try {
      // Try backend first
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getAccessToken() || publicAnonKey}`,
          ...options.headers,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (backendError) {
      console.log('Backend failed in demo mode, using local fallback');
    }

    // Fallback to demo data for specific endpoints
    return getDemoDataForEndpoint(endpoint);
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authService.getAccessToken() || publicAnonKey}`,
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

// Demo data fallback for dashboard endpoints
function getDemoDataForEndpoint(endpoint: string) {
  console.log('Getting demo data for endpoint:', endpoint);
  
  if (endpoint.includes('/dashboard/kpis')) {
    return {
      success: true,
      data: {
        revenue: 2850,
        revenueChange: 8.5,
        activeMembers: 4,
        membersChange: 3.2,
        todayAttendance: 2,
        attendanceChange: 12.5,
        availableStaff: 2
      }
    };
  }
  
  if (endpoint.includes('/dashboard/revenue')) {
    return {
      success: true,
      data: [
        { time: '9 AM', revenue: 450, target: 400 },
        { time: '12 PM', revenue: 1200, target: 1000 },
        { time: '3 PM', revenue: 1850, target: 1600 },
        { time: '6 PM', revenue: 2400, target: 2200 },
        { time: '9 PM', revenue: 2850, target: 2800 }
      ]
    };
  }
  
  if (endpoint.includes('/dashboard/membership-distribution')) {
    return {
      success: true,
      data: [
        { name: 'Basic', value: 1, color: '#10b981', amount: 300 },
        { name: 'Premium', value: 2, color: '#3b82f6', amount: 1500 },
        { name: 'VIP', value: 1, color: '#8b5cf6', amount: 1200 }
      ]
    };
  }
  
  if (endpoint.includes('/dashboard/class-attendance')) {
    return {
      success: true,
      data: [
        { class: 'Yoga', capacity: 20, attended: 18, percentage: 90 },
        { class: 'HIIT', capacity: 15, attended: 14, percentage: 93 },
        { class: 'Pilates', capacity: 12, attended: 10, percentage: 83 }
      ]
    };
  }
  
  if (endpoint.includes('/dashboard/recent-members')) {
    // Transform demo members to match dashboard interface
    const demoMembers = demoService.getDemoMembers().slice(0, 3).map(member => ({
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone,
      membershipType: member.membership_type, // Transform membership_type to membershipType
      joinDate: member.join_date, // Keep as string - will be safely parsed by formatJoinDate
      status: member.membership_status as 'active' | 'expired' | 'suspended'
    }));
    
    return {
      success: true,
      data: demoMembers
    };
  }
  
  if (endpoint.includes('/dashboard/notifications')) {
    return {
      success: true,
      data: []
    };
  }
  
  if (endpoint.includes('/dashboard/staff')) {
    return {
      success: true,
      data: demoService.getDemoStaff()
    };
  }
  
  if (endpoint.includes('/dashboard/search-members')) {
    // Transform demo members for search results
    const searchMembers = demoService.getDemoMembers().slice(0, 5).map(member => ({
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone,
      membershipType: member.membership_type, // Transform membership_type to membershipType
      joinDate: member.join_date, // Keep as string - will be safely parsed
      status: member.membership_status as 'active' | 'expired' | 'suspended'
    }));
    
    return {
      success: true,
      data: searchMembers
    };
  }
  
  // Default fallback
  return {
    success: true,
    data: []
  };
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
    return apiCall('/dashboard/staff');
  },

  // Search members
  async searchMembers(query: string) {
    return apiCall(`/dashboard/search-members?q=${encodeURIComponent(query)}`);
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
    return apiCall('/health');
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
