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
  leadId: number;
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
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
  leadId: number;
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
  const token = authService.getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function mapToFollowUpResponse(f: any): FollowUpResponse {
  return {
    id: f.id,
    followUpId: f.follow_up_id || f.followUpId,
    leadId: f.lead_id || f.leadId,
    leadName: f.lead_name || f.leadName,
    leadEmail: f.lead_email || f.leadEmail,
    leadPhone: f.lead_phone || f.leadPhone,
    type: f.type,
    status: f.status,
    priority: f.priority,
    assignedStaff: f.assigned_staff || f.assignedStaff,
    dueDate: f.due_date || f.dueDate,
    scheduledTime: f.scheduled_time || f.scheduledTime,
    completedDate: f.completed_date || f.completedDate,
    subject: f.subject,
    notes: f.notes,
    tags: f.tags,
    membershipStatus: f.membership_status || f.membershipStatus,
    membershipPlan: f.membership_plan || f.membershipPlan,
    followUpReason: f.follow_up_reason || f.followUpReason,
    estimatedDuration: f.estimated_duration || f.estimatedDuration,
    outcome: f.outcome,
    communicationHistory: f.communication_history || f.communicationHistory || [],
    createdAt: f.created_at || f.createdAt,
    updatedAt: f.updated_at || f.updatedAt,
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
    const followUpsRaw = raw.follow_ups ?? raw.followUps ?? [];
    const pg = raw.pagination ?? {};
    return {
      followUps: followUpsRaw.map(mapToFollowUpResponse),
      pagination: {
        currentPage: pg.page ?? 1,
        totalPages: pg.total_pages ?? pg.totalPages ?? 1,
        totalItems: pg.total ?? pg.totalItems ?? 0,
        itemsPerPage: pg.limit ?? pg.itemsPerPage ?? (params?.size ?? 20),
      },
    };
  },

  async getStats(): Promise<FollowUpStats> {
    const res = await fetch(`${BASE_URL}/follow-ups/stats`, { headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch follow-up stats');
    const raw = await res.json();
    return {
      totalFollowUps: raw.total_follow_ups ?? 0,
      pendingFollowUps: raw.pending_follow_ups ?? 0,
      overdueFollowUps: raw.overdue_follow_ups ?? 0,
      completedFollowUps: raw.completed_follow_ups ?? 0,
      cancelledFollowUps: raw.cancelled_follow_ups ?? 0,
      rescheduledFollowUps: raw.rescheduled_follow_ups ?? 0,
      completionRate: raw.completion_rate ?? 0,
    };
  },

  async getById(id: number): Promise<FollowUpResponse> {
    const res = await fetch(`${BASE_URL}/follow-ups/${id}`, { headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch follow-up');
    return mapToFollowUpResponse(await res.json());
  },

  async create(request: FollowUpRequest): Promise<FollowUpResponse> {
    const payload = {
      lead_id: request.leadId,
      type: request.type,
      status: request.status,
      priority: request.priority,
      assigned_staff: request.assignedStaff,
      due_date: request.dueDate,
      scheduled_time: request.scheduledTime,
      completed_date: request.completedDate,
      subject: request.subject,
      notes: request.notes,
      tags: request.tags,
      membership_status: request.membershipStatus,
      membership_plan: request.membershipPlan,
      follow_up_reason: request.followUpReason,
      estimated_duration: request.estimatedDuration,
      outcome: request.outcome
    };
    const res = await fetch(`${BASE_URL}/follow-ups`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to create follow-up: ${err}`);
    }
    return mapToFollowUpResponse(await res.json());
  },

  async update(id: number, request: FollowUpRequest): Promise<FollowUpResponse> {
    const payload = {
      lead_id: request.leadId,
      type: request.type,
      status: request.status,
      priority: request.priority,
      assigned_staff: request.assignedStaff,
      due_date: request.dueDate,
      scheduled_time: request.scheduledTime,
      completed_date: request.completedDate,
      subject: request.subject,
      notes: request.notes,
      tags: request.tags,
      membership_status: request.membershipStatus,
      membership_plan: request.membershipPlan,
      follow_up_reason: request.followUpReason,
      estimated_duration: request.estimatedDuration,
      outcome: request.outcome
    };
    const res = await fetch(`${BASE_URL}/follow-ups/${id}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update follow-up');
    return mapToFollowUpResponse(await res.json());
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
    return mapToFollowUpResponse(await res.json());
  },

  async cancel(id: number): Promise<FollowUpResponse> {
    const res = await fetch(`${BASE_URL}/follow-ups/${id}/cancel`, {
      method: 'POST',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to cancel follow-up');
    return mapToFollowUpResponse(await res.json());
  },

  async reschedule(id: number, dueDate: string): Promise<FollowUpResponse> {
    const res = await fetch(`${BASE_URL}/follow-ups/${id}/reschedule`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ dueDate }),
    });
    if (!res.ok) throw new Error('Failed to reschedule follow-up');
    return mapToFollowUpResponse(await res.json());
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
