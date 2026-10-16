import { apiClient } from '@/core/network/apiClient';

/** Category keys — the backend accepts only these. Labels live under enquiries.categories.* */
export const ENQUIRY_CATEGORIES = [
  'GENERAL', 'MEMBERSHIP', 'BILLING', 'FACILITIES', 'TRAINER', 'CLASSES', 'FEEDBACK', 'OTHER',
] as const;
export type EnquiryCategory = (typeof ENQUIRY_CATEGORIES)[number];

/** OPEN until the gym replies (REPLIED) or closes it (CLOSED). Only the gym closes one. */
export type EnquiryStatus = 'OPEN' | 'REPLIED' | 'CLOSED';

/** Must match the backend's MemberEnquiryService / MobileMemberEnquiryService constants. */
export const MEMBER_ENQUIRY_NOTIFICATION_MODULE = 'MEMBER_ENQUIRY';
export const MEMBER_ENQUIRY_PUSH_TYPE = 'member_enquiry_replied';
export const ENQUIRY_SUBJECT_MAX_LENGTH = 150;
export const ENQUIRY_MESSAGE_MAX_LENGTH = 2000;
export const MAX_OPEN_ENQUIRIES = 5;

export interface MemberEnquiry {
  id: number;
  branchId: number;
  branchName: string | null;
  category: EnquiryCategory;
  subject: string;
  message: string;
  status: EnquiryStatus;
  /** The gym's one reply; null until it answers. */
  reply: string | null;
  repliedAt: string | null;
  closedAt: string | null;
  createdAt: string;
}

export interface CreateEnquiryRequest {
  category: EnquiryCategory;
  subject: string;
  message: string;
}

// Wire format is snake_case (spring.jackson.property-naming-strategy=SNAKE_CASE on the backend).
function map(d: any): MemberEnquiry {
  return {
    id: d.id,
    branchId: d.branch_id,
    branchName: d.branch_name ?? null,
    category: d.category,
    subject: d.subject,
    message: d.message,
    status: d.status,
    reply: d.reply ?? null,
    repliedAt: d.replied_at ?? null,
    closedAt: d.closed_at ?? null,
    createdAt: d.created_at,
  };
}

export const enquiriesApi = {
  /** The signed-in member's enquiries, newest first. */
  async list(): Promise<MemberEnquiry[]> {
    const response = await apiClient.get<any>('/mobile/member/enquiries');
    return (response.data ?? []).map(map);
  },

  async create(request: CreateEnquiryRequest): Promise<MemberEnquiry> {
    const response = await apiClient.post<any>('/mobile/member/enquiries', request);
    return map(response.data);
  },
};
