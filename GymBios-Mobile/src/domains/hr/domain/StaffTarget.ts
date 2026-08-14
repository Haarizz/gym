export interface StaffTarget {
  id: string;
  staffDbId?: string;
  staffId?: string;
  staffName?: string;
  staffRole?: string;
  staffDepartment?: string;
  scope: string;
  timeframe?: string;
  year?: number;
  month?: number;
  startDate?: string;
  endDate?: string;
  revenueTarget: number;
  revenueAchieved: number;
  percentage: number;
  sessionsTarget?: number;
  sessionsAchieved?: number;
  newClientsTarget?: number;
  newClientsAchieved?: number;
  unitTargetsJson?: string;
  commissionEarned?: number;
  trend?: string;
  forecast?: number;
}

export interface StaffTargetFilters {
  year?: number;
  month?: number;
  scope?: string;
  staffDbId?: number;
}
