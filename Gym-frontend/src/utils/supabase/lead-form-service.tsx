import axios from 'axios';
import api from '../../api/axiosConfig';

// Gym lead forms: public links a gym pastes into social-media ads. Submissions
// become Leads (+ a first follow-up) in that gym's own Leads page.
// Unlike most services, these DTOs are camelCase on the wire (@JsonNaming on the
// backend DTOs), so no snake_case mapping is needed here.

export type LeadFormSource = 'social-media' | 'facebook-ads' | 'instagram' | 'google-ads' | 'website' | 'other';

export interface LeadForm {
  id: number;
  formKey: string;
  name: string;
  branchId: number;
  branchName?: string;
  headline?: string;
  description?: string;
  successMessage?: string;
  privacyPolicyUrl?: string;
  source: LeadFormSource;
  assignedStaff?: string;
  showEmail: boolean;
  requireEmail: boolean;
  showInterest: boolean;
  active: boolean;
  submissionCount: number;
  lastSubmissionAt?: string;
  createdAt?: string;
}

export interface LeadFormRequest {
  name?: string;
  branchId?: number;
  headline?: string;
  description?: string;
  successMessage?: string;
  privacyPolicyUrl?: string;
  source?: LeadFormSource;
  assignedStaff?: string;
  showEmail?: boolean;
  requireEmail?: boolean;
  showInterest?: boolean;
  active?: boolean;
}

export interface PublicLeadForm {
  gymName?: string;
  branchName?: string;
  branchPhone?: string;
  headline?: string;
  description?: string;
  successMessage?: string;
  privacyPolicyUrl?: string;
  showEmail: boolean;
  requireEmail: boolean;
  showInterest: boolean;
  interestOptions?: string[];
}

export interface PublicLeadSubmission {
  fullName: string;
  phone: string;
  email?: string;
  interest?: string;
  preferredContactMethod?: string;
  message?: string;
  consent: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  website?: string; // honeypot
}

// The public page is opened by strangers from an ad — never attach a stored
// session token, and never trigger the shared client's 401 -> /login redirect.
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

export const publicLeadFormUrl = (formKey: string) => `${window.location.origin}/f/${formKey}`;

export const leadFormService = {
  list: async (): Promise<LeadForm[]> => (await api.get<LeadForm[]>('/lead-forms')).data,
  create: async (data: LeadFormRequest): Promise<LeadForm> => (await api.post<LeadForm>('/lead-forms', data)).data,
  update: async (id: number, data: LeadFormRequest): Promise<LeadForm> =>
    (await api.put<LeadForm>(`/lead-forms/${id}`, data)).data,
  remove: async (id: number): Promise<void> => {
    await api.delete(`/lead-forms/${id}`);
  },

  getPublic: async (formKey: string): Promise<PublicLeadForm> =>
    (await publicApi.get<PublicLeadForm>(`/public/lead-forms/${encodeURIComponent(formKey)}`)).data,
  submitPublic: async (formKey: string, data: PublicLeadSubmission): Promise<{ success: boolean; message: string }> =>
    (await publicApi.post(`/public/lead-forms/${encodeURIComponent(formKey)}/submit`, data)).data,
};

/** Backend error bodies are { message } (GlobalExceptionHandler) — surface them when present. */
export function leadFormErrorMessage(error: unknown, fallback: string): string {
  const data = (error as any)?.response?.data;
  if (data && typeof data.message === 'string' && data.message) return data.message;
  return fallback;
}
