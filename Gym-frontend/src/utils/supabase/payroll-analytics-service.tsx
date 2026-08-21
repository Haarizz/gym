import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface PayrollDashboardData {
  kpiData: {
    totalStaffTrainers: number;
    activeTrainingsClasses: number;
    upcomingBookings: number;
    monthlyPayroll: number;
    pendingSalaryPayments: number;
    salaryAdvancesOutstanding: number;
  };
  classBookingTrends: Array<{
    month: string;
    classes: number;
    bookings: number;
    payroll: number;
  }>;
  payrollDistribution: Array<{
    category: string;
    amount: number;
    color: string;
  }>;
  staffByDepartment: Array<{
    department: string;
    count: number;
    color: string;
  }>;
  recentHires: Array<{
    id: number;
    name: string;
    position: string;
    department: string;
    hireDate: string;
    salary: number;
    status: string;
  }>;
  upcomingPayments: Array<{
    id: number;
    employee: string;
    position: string;
    amount: number;
    dueDate: string;
    type: string;
    status: string;
  }>;
  salaryAdvances: Array<{
    id: number;
    employee: string;
    position: string;
    advanceAmount: number;
    issueDate: string;
    remainingBalance: number;
    monthlyDeduction: number;
    status: string;
  }>;
  topPerformingClasses: Array<{
    id: number;
    className: string;
    instructor: string;
    bookings: number;
    capacity: number;
    revenue: number;
    rating: number;
  }>;
}

export const payrollAnalyticsService = {
  async getDashboardData(): Promise<PayrollDashboardData> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/payroll-analytics/dashboard`);
    if (!res.ok) {
      throw new Error("Failed to fetch payroll analytics dashboard data");
    }
    const json = await res.json();
    console.log("DASHBOARD DATA JSON:", json);
    
    // Handle cases where the backend might not wrap the response in "data",
    // or if properties are named differently (like kpidata instead of kpiData)
    const data = json.data || json;
    
    // Fallback if data is entirely missing or invalid
    if (!data || typeof data !== 'object') {
      throw new Error("Invalid response format");
    }
    
    // Fix potential serialization casing issues from backend
    if (!data.kpiData && data.kpidata) {
      data.kpiData = data.kpidata;
    }
    
    // Default structure in case of completely empty response to prevent React crashes
    if (!data.kpiData) {
      data.kpiData = {
        totalStaffTrainers: 0,
        activeTrainingsClasses: 0,
        upcomingBookings: 0,
        monthlyPayroll: 0,
        pendingSalaryPayments: 0,
        salaryAdvancesOutstanding: 0,
      };
    }
    if (!data.classBookingTrends) data.classBookingTrends = [];
    if (!data.payrollDistribution) data.payrollDistribution = [];
    if (!data.staffByDepartment) data.staffByDepartment = [];
    if (!data.recentHires) data.recentHires = [];
    if (!data.upcomingPayments) data.upcomingPayments = [];
    if (!data.salaryAdvances) data.salaryAdvances = [];
    if (!data.topPerformingClasses) data.topPerformingClasses = [];
    
    return data;
  }
};
