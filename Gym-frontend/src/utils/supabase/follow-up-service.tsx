import { authService } from './auth-service';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface CommunicationRecord {
  id?: number;
  type: 'call' | 'email' | 'sms' | 'whatsapp' | 'in_app' | 'meeting' | 'visit';
  date: string;
  staffMember: string;
  duration?: number;
  outcome: 'successful' | 'no_response' | 'callback_requested' | 'not_interested' | 'converted' | 'rescheduled';
  notes: string;
  nextAction?: string;
}

export interface FollowUpResponse {
  id: number;
  followUpId: string;
  memberId?: string;
  memberName: string;
  memberEmail?: string;
  memberPhone?: string;
  type: 'call' | 'email' | 'sms' | 'whatsapp' | 'in_app' | 'meeting' | 'visit';
  status: 'pending' | 'completed' | 'overdue' | 'cancelled' | 'rescheduled';
  priority: 'high' | 'medium' | 'low';
  assignedStaff?: string;
  dueDate: string;
  scheduledTime?: string;
  completedDate?: string;
  subject: string;
  notes?: string;
  tags?: string[];
  membershipStatus?: 'active' | 'pending' | 'expired' | 'frozen' | 'cancelled';
  membershipPlan?: string;
  followUpReason?: string;
  estimatedDuration?: number;
  outcome?: string;
  communicationHistory: CommunicationRecord[];
  createdAt: string;
  updatedAt?: string;
}

export interface FollowUpRequest {
  memberId?: string;
  memberName: string;
  memberEmail?: string;
  memberPhone?: string;
  type: string;
  status?: string;
  priority?: string;
  assignedStaff?: string;
  dueDate: string;
  scheduledTime?: string;
  completedDate?: string;
  subject: string;
  notes?: string;
  tags?: string[];
  membershipStatus?: string;
  membershipPlan?: string;
  followUpReason?: string;
  estimatedDuration?: number;
  outcome?: string;
}

export interface FollowUpStats {
  totalFollowUps: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  completedFollowUps: number;
  cancelledFollowUps: number;
  rescheduledFollowUps: number;
  completionRate: number;
}

export interface FollowUpPage {
  followUps: FollowUpResponse[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getHeaders(): Promise<HeadersInit> {
  const token = authService.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── API Methods ────────────────────────────────────────────────────────────────

export const followUpService = {

  async getFollowUps(params?: {
    page?: number;
    size?: number;
    status?: string;
    type?: string;
    priority?: string;
    assignedStaff?: string;
    search?: string;
  }): Promise<FollowUpPage> {
    const p = new URLSearchParams();
    if (params?.page)          p.set('page', String(params.page));
    if (params?.size)          p.set('size', String(params.size));
    if (params?.status)        p.set('status', params.status);
    if (params?.type)          p.set('type', params.type);
    if (params?.priority)      p.set('priority', params.priority);
    if (params?.assignedStaff) p.set('assignedStaff', params.assignedStaff);
    if (params?.search)        p.set('search', params.search);
    const res = await fetch(`${BASE_URL}/follow-ups?${p}`, { headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch follow-ups');
    const raw = await res.json();
    return {
      followUps: raw.follow_ups ?? raw.followUps ?? [],
      pagination: raw.pagination ?? {},
    };
  },

  async getStats(): Promise<FollowUpStats> {
    const res = await fetch(`${BASE_URL}/follow-ups/stats`, { headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch follow-up stats');
    return res.json();
  },

  async getById(id: number): Promise<FollowUpResponse> {
    const res = await fetch(`${BASE_URL}/follow-ups/${id}`, { headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch follow-up');
    return res.json();
  },

  async create(request: FollowUpRequest): Promise<FollowUpResponse> {
    const res = await fetch(`${BASE_URL}/follow-ups`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error('Failed to create follow-up');
    return res.json();
  },

  async update(id: number, request: FollowUpRequest): Promise<FollowUpResponse> {
    const res = await fetch(`${BASE_URL}/follow-ups/${id}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error('Failed to update follow-up');
    return res.json();
  },

  async delete(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/follow-ups/${id}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete follow-up');
  },

  async complete(id: number, outcome: string, notes?: string): Promise<FollowUpResponse> {
    const res = await fetch(`${BASE_URL}/follow-ups/${id}/complete`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ outcome, notes }),
    });
    if (!res.ok) throw new Error('Failed to complete follow-up');
    return res.json();
  },

  async cancel(id: number): Promise<FollowUpResponse> {
    const res = await fetch(`${BASE_URL}/follow-ups/${id}/cancel`, {
      method: 'POST',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to cancel follow-up');
    return res.json();
  },

  async reschedule(id: number, dueDate: string): Promise<FollowUpResponse> {
    const res = await fetch(`${BASE_URL}/follow-ups/${id}/reschedule`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ dueDate }),
    });
    if (!res.ok) throw new Error('Failed to reschedule follow-up');
    return res.json();
  },

  async markOverdue(): Promise<void> {
    await fetch(`${BASE_URL}/follow-ups/mark-overdue`, {
      method: 'POST',
      headers: await getHeaders(),
    });
  },

  async addRecord(followUpId: number, record: CommunicationRecord): Promise<CommunicationRecord> {
    const res = await fetch(`${BASE_URL}/follow-ups/${followUpId}/records`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(record),
    });
    if (!res.ok) throw new Error('Failed to add communication record');
    return res.json();
  },

  async deleteRecord(recordId: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/follow-ups/records/${recordId}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete communication record');
  },
};
