import axios from 'axios';
import api from '../../api/axiosConfig';

// Walk-in self-registration: a visitor scans the gym's (or a staff member's) QR,
// signs up on the public /w/{tenant}/{branch} page, and waits in a pending list
// until staff take payment through the normal walk-in check-in.
// snake_case on the wire (global Jackson naming).

export interface PublicWalkInPlan {
  id: number;
  name: string;
  duration?: string;
  price: number;
}

export interface PublicWalkInPage {
  gym_name?: string;
  branch_name?: string;
  branch_phone?: string;
  currency_code: string;
  /** Set when the link carried a valid staff code. */
  staff_name?: string;
  plans: PublicWalkInPlan[];
}

export interface PublicWalkInSubmission {
  full_name: string;
  phone: string;
  email?: string;
  plan_id?: number;
  staff_code?: string;
  website?: string; // honeypot
}

export interface PendingWalkInRegistration {
  id: number;
  name: string;
  phone: string;
  email?: string;
  plan_id?: number;
  plan_name?: string;
  referred_by_staff_id?: number;
  referred_by_staff_name?: string;
  created_at: string;
}

export interface MyWalkInLink {
  /** Personal (?s=code) for staff; same as branch_path for accounts without a staff record. */
  path: string;
  branch_path: string;
  staff_name?: string;
  branch_name?: string;
  enabled: boolean;
}

// The public page is opened by strangers — never attach a stored session token,
// and never trigger the shared client's 401 -> /login redirect.
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

const publicBase = (tenantSlug: string, branchId: string) =>
  `/public/walk-in/${encodeURIComponent(tenantSlug)}/${encodeURIComponent(branchId)}`;

export const walkInUrl = (path: string) => `${window.location.origin}${path}`;

export const walkInRegistrationService = {
  getPublic: async (tenantSlug: string, branchId: string, staffCode?: string): Promise<PublicWalkInPage> =>
    (await publicApi.get<PublicWalkInPage>(publicBase(tenantSlug, branchId), {
      params: staffCode ? { s: staffCode } : undefined,
    })).data,
  submitPublic: async (tenantSlug: string, branchId: string, data: PublicWalkInSubmission): Promise<{ success: boolean; message: string }> =>
    (await publicApi.post(`${publicBase(tenantSlug, branchId)}/submit`, data)).data,

  listPending: async (): Promise<PendingWalkInRegistration[]> =>
    (await api.get<PendingWalkInRegistration[]>('/attendance/walkin-registrations')).data,
  dismiss: async (id: number): Promise<void> => {
    await api.post(`/attendance/walkin-registrations/${id}/dismiss`);
  },
  myLink: async (): Promise<MyWalkInLink> =>
    (await api.get<MyWalkInLink>('/attendance/walkin/my-link')).data,
};
