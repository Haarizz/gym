import axios from 'axios';
import api from '../../api/axiosConfig';

// Service Portfolios share link: an admin shares /join/{tenant}/{branch}/{token}; a
// visitor browses the gym's plans and services without logging in and applies for a
// membership, paying cash at the gym or online (simulated card checkout). Staff
// approve applications in Approvals → Applications — only approval creates the member.
// snake_case on the wire (global Jackson naming).

export interface ShareLink {
  /** Relative — put window.location.origin in front. */
  path: string;
  branch_id: number;
  branch_name?: string;
}

/** A Family / Couple plan's household rules. Caps are null when the plan doesn't limit them. */
export interface PortfolioHousehold {
  kind: 'couple' | 'family';
  max_adults?: number | null;
  max_children?: number | null;
  max_members?: number | null;
  allow_additional_members: boolean;
  /** Set when priced per person (applicant included); otherwise effective_price covers everyone. */
  price_per_member?: number | null;
  additional_member_price?: number | null;
}

/** Someone joining with the applicant on a Family / Couple plan. */
export interface ApplicationFamilyMember {
  name: string;
  relationship: string;
  gender?: string;
  date_of_birth?: string | null;
  minor?: boolean;
  phone?: string | null;
  email?: string | null;
}

export interface PortfolioPlan {
  id: number;
  name: string;
  plan_type?: string;
  duration?: string;
  description?: string;
  price: number;
  effective_price: number;
  offer_label?: string | null;
  features: string[];
  /** False for plans that can only be set up at reception. */
  joinable: boolean;
  /** Set for Family / Couple plans: who can join and how the household is priced. */
  household?: PortfolioHousehold | null;
}

export interface PortfolioStream {
  id: string;
  title: string;
  instructor_name?: string;
  category?: string;
  difficulty?: string;
  duration?: number;
  status: string;
  scheduled_time?: string;
  description?: string;
}

export interface PortfolioSession {
  id: string;
  name: string;
  type: string;
  trainer_id?: number | null;
  trainer_name?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  location?: string;
  capacity?: number | null;
  spots_left?: number | null;
  price?: number | null;
  description?: string;
}

export interface PortfolioFacility {
  id: string;
  name: string;
  description?: string;
  icon_name?: string;
}

export interface PortfolioTrainer {
  id: number;
  name: string;
  role?: string;
  photo_url?: string;
  average_rating?: number | null;
  rating_count: number;
  join_date?: string | null;
  certifications?: string[];
  /** Ratings per star: index 0 = 1 star … index 4 = 5 stars. */
  rating_distribution?: number[];
  top_tags?: string[];
}

export interface PublicPortfolio {
  gym_name?: string;
  branch_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  operating_hours?: string;
  about?: string;
  terms_and_policies?: string;
  cover_image_url?: string;
  gallery_image_urls: string[];
  currency_code: string;
  online_payment_enabled: boolean;
  plans: PortfolioPlan[];
  streams: PortfolioStream[];
  classes: PortfolioSession[];
  programs: PortfolioSession[];
  facilities: PortfolioFacility[];
  trainers: PortfolioTrainer[];
  /** Branch Access Type: who may join, by gender. */
  access?: 'MIXED' | 'LADIES_ONLY' | 'MEN_ONLY';
}

export type ApplicationPaymentMethod = 'CASH' | 'ONLINE';

export interface PublicApplicationRequest {
  full_name: string;
  phone: string;
  email: string;
  gender: string;
  date_of_birth: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
  plan_id: number;
  payment_method: ApplicationPaymentMethod;
  card?: { number: string; exp_month: number; exp_year: number; cvc: string; name_on_card?: string };
  accept_terms: boolean;
  website?: string; // honeypot
  /** Family / Couple plans only. */
  family_members?: ApplicationFamilyMember[];
}

export interface ApplicationReceipt {
  reference: string;
  plan_name: string;
  amount: number;
  currency_code: string;
  payment_method: ApplicationPaymentMethod;
  payment_status: 'PENDING' | 'PAID';
  approval_status: 'PENDING';
  payment_reference?: string;
  card_brand?: string;
  card_last4?: string;
  paid_at?: string;
  message: string;
}

export type ApplicationPaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'VOID';
export type ApplicationApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface MembershipApplication {
  id: number;
  reference: string;
  branch_id: number;
  branch_name?: string;
  full_name: string;
  phone: string;
  email?: string;
  gender?: string;
  date_of_birth?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
  plan_id: number;
  plan_name: string;
  plan_duration?: string;
  list_price: number;
  amount: number;
  offer_label?: string | null;
  payment_method: ApplicationPaymentMethod;
  payment_status: ApplicationPaymentStatus;
  payment_reference?: string;
  card_brand?: string;
  card_last4?: string;
  paid_at?: string;
  cash_received_by?: string;
  approval_status: ApplicationApprovalStatus;
  decided_by?: string;
  decided_at?: string;
  rejection_reason?: string;
  member_id?: number;
  member_code?: string;
  created_at: string;
  /** SHARE_LINK (visitor on the public link) or DESK (raised by staff for a walk-in). */
  source?: 'SHARE_LINK' | 'DESK';
  /** Staff user who raised a DESK application. */
  submitted_by?: string;
  reg_doc_number?: string;
  medical_conditions?: string;
  /** The rest of the household on a Family / Couple plan. */
  family_members?: ApplicationFamilyMember[];
  /** The approve / reject email to the applicant; null until a decision. */
  decision_email_status?: DecisionEmailStatus | null;
  /** Why the last attempt failed, in words a gym owner can act on. */
  decision_email_error?: string | null;
  decision_email_at?: string | null;
  /** The gym (GymOS › Settings › Email) or the server has a mailbox to send from. */
  email_configured?: boolean;
}

/** SENT, FAILED, or NOT_CONFIGURED (no mailbox set up, so nothing was sent). */
export type DecisionEmailStatus = 'SENT' | 'FAILED' | 'NOT_CONFIGURED';

/** Staff raise an application for a walk-in (Service Portfolios → Choose Plan → New Member). Always cash at reception. */
export interface DeskApplicationRequest {
  full_name: string;
  phone: string;
  email: string;
  gender: string;
  date_of_birth: string;
  address?: string;
  reg_doc_number?: string;
  medical_conditions?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  plan_id: number;
  /** The rest of the household on a Family / Couple plan. */
  family_members?: ApplicationFamilyMember[];
}

// The public page is opened by strangers — never attach a stored session token,
// and never trigger the shared client's 401 -> /login redirect.
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

const publicBase = (tenantSlug: string, branchId: string, token: string) =>
  `/public/join/${encodeURIComponent(tenantSlug)}/${encodeURIComponent(branchId)}/${encodeURIComponent(token)}`;

/** The server's message for a failed request, else the fallback. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as any)?.response?.data;
  if (data && typeof data.message === 'string' && data.message) return data.message;
  return fallback;
}

export const servicePortfolioService = {
  // Staff
  getShareLink: async (): Promise<ShareLink> =>
    (await api.get<ShareLink>('/plans/catalog-share-link')).data,
  resetShareLink: async (): Promise<ShareLink> =>
    (await api.post<ShareLink>('/plans/catalog-share-link/reset')).data,

  listApplications: async (status: 'pending' | 'decided' = 'pending'): Promise<MembershipApplication[]> =>
    (await api.get<MembershipApplication[]>('/members/applications', { params: { status } })).data,
  createDeskApplication: async (data: DeskApplicationRequest): Promise<ApplicationReceipt> =>
    (await api.post<ApplicationReceipt>('/members/applications', data)).data,
  countPending: async (): Promise<number> =>
    (await api.get<{ pending: number }>('/members/applications/count')).data.pending ?? 0,
  approve: async (id: number, cashReceived: boolean): Promise<MembershipApplication> =>
    (await api.post<MembershipApplication>(`/members/applications/${id}/approve`, { cash_received: cashReceived })).data,
  reject: async (id: number, reason: string): Promise<MembershipApplication> =>
    (await api.post<MembershipApplication>(`/members/applications/${id}/reject`, { reason })).data,
  /** Emails the applicant their approval / rejection again. */
  resendDecisionEmail: async (id: number): Promise<MembershipApplication> =>
    (await api.post<MembershipApplication>(`/members/applications/${id}/resend-email`)).data,

  // Public
  getPublic: async (tenantSlug: string, branchId: string, token: string): Promise<PublicPortfolio> =>
    (await publicApi.get<PublicPortfolio>(publicBase(tenantSlug, branchId, token))).data,
  apply: async (tenantSlug: string, branchId: string, token: string, data: PublicApplicationRequest): Promise<ApplicationReceipt> =>
    (await publicApi.post<ApplicationReceipt>(`${publicBase(tenantSlug, branchId, token)}/apply`, data)).data,
};
