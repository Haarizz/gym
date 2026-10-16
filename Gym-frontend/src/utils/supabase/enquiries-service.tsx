import { authService } from './auth-service';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export type EnquiryStatus = 'OPEN' | 'REPLIED' | 'CLOSED';

export interface MemberEnquiry {
  id: number;
  branch_id: number;
  branch_name: string | null;
  member_id: number;
  member_name: string | null;
  member_code: string | null;
  member_phone: string | null;
  category: string;
  subject: string;
  message: string;
  status: EnquiryStatus;
  reply: string | null;
  replied_by: string | null;
  replied_at: string | null;
  closed_by: string | null;
  closed_at: string | null;
  created_at: string;
}

export interface EnquiryPage {
  items: MemberEnquiry[];
  total: number;
  page: number;
  size: number;
  status_counts: Record<EnquiryStatus, number>;
}

// English labels for the category keys the mobile app sends.
export const ENQUIRY_CATEGORY_LABELS: Record<string, string> = {
  GENERAL: 'General',
  MEMBERSHIP: 'Membership',
  BILLING: 'Billing & payments',
  FACILITIES: 'Facilities',
  TRAINER: 'Trainers',
  CLASSES: 'Classes',
  FEEDBACK: 'Feedback',
  OTHER: 'Other',
};

async function readError(response: Response, fallback: string): Promise<Error> {
  try {
    const body = await response.json();
    return new Error(body?.message || fallback);
  } catch {
    return new Error(fallback);
  }
}

class EnquiriesService {

  async list(params: { status?: EnquiryStatus | null; category?: string | null; page?: number; size?: number }): Promise<EnquiryPage> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.category) query.set('category', params.category);
    query.set('page', String(params.page ?? 0));
    query.set('size', String(params.size ?? 20));
    const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/enquiries?${query}`);
    if (!response.ok) throw await readError(response, `Failed to fetch enquiries: ${response.status}`);
    return response.json();
  }

  async reply(id: number, reply: string): Promise<MemberEnquiry> {
    const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/enquiries/${id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply }),
    });
    if (!response.ok) throw await readError(response, `Failed to send reply: ${response.status}`);
    return response.json();
  }

  async close(id: number): Promise<MemberEnquiry> {
    const response = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/enquiries/${id}/close`, { method: 'POST' });
    if (!response.ok) throw await readError(response, `Failed to close enquiry: ${response.status}`);
    return response.json();
  }
}

export const enquiriesService = new EnquiriesService();
