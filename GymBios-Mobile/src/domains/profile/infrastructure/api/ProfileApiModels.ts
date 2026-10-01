export interface ProfileApiModel {
  fullName: string;
  /** Account email (read-only; not accepted on update). */
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  bloodType?: string;
  medicalConditions?: string;
  photoUrl?: string;
  allergies?: string;
  currentMedications?: string;
  chronicIllnesses?: string;
  height?: string;
  weight?: string;
}

export interface UpdateProfileRequestApiModel {
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  bloodType?: string;
  medicalConditions?: string;
  photoUrl?: string;
  allergies?: string;
  currentMedications?: string;
  chronicIllnesses?: string;
  height?: string;
  weight?: string;
}

/** GET /api/mobile/performance/me — snake_case per the backend's Jackson naming strategy. */
export interface MyPerformanceApiModel {
  role: 'staff' | 'trainer';
  period_label: string;
  performance_score: number | null;
  classes_completed: number | null;
  sessions_target: number | null;
  session_target_percentage: number | null;
  session_growth: number | null;
  leads_converted: number | null;
  conversion_target: number | null;
  conversion_rate: number | null;
  conversion_growth: number | null;
  follow_up_completion: number | null;
  hours_worked: number;
  days_present: number;
  days_scheduled: number;
  attendance_rate: number | null;
  revenue_achieved: number;
  revenue_target: number;
  revenue_growth: number | null;
  message: string;
}

/** The slice of GET /api/mobile/member/dashboard the profile hub's summary stats need. */
export interface MemberDashboardSummaryApiModel {
  membership?: {
    active?: boolean;
    days_remaining?: number | null;
  } | null;
  activity_stats?: {
    total_visits?: number | null;
    current_streak_days?: number | null;
  } | null;
}

/** GET/PUT /api/mobile/profile/staff/me — StaffResponseDTO, snake_case on the wire. */
export interface StaffProfileApiModel {
  staff_id?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  role?: string | null;
  department?: string | null;
  branch?: string | null;
  status?: string | null;
  join_date?: string | null;
  monthly_target?: number | null;
  base_salary?: number | null;
  app_username?: string | null;
  certifications?: {
    id?: number | null;
    cert_name?: string | null;
    issuer?: string | null;
    issue_date?: string | null;
    expiry_date?: string | null;
    document_url?: string | null;
  }[] | null;
  schedule?: Record<string, string[]> | null;
}
