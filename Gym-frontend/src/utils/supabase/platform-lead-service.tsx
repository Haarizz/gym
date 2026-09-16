import api from '../../api/axiosConfig';

// Super Admin's gym-signup pipeline (Leads -> Follow Up -> Pending Approval).
// POST submitLead is the one call made without auth (from the public onboarding
// form on the pricing page) — every other call requires GYMBIOS_ADMIN's
// PLATFORM_LEADS_* permissions, enforced server-side.
//
// The backend serializes/deserializes with spring.jackson.property-naming-strategy=
// SNAKE_CASE (confirmed live: POST /api/platform-leads both expects AND returns
// business_name/lead_status/follow_ups etc, not businessName/leadStatus/followUps) —
// same convention lead-service.tsx and gym-service.tsx's toGymRequestBody already
// work around. Everything below this comment speaks snake_case on the wire; the
// rest of the frontend gets clean camelCase via the map*() functions.

export type PlatformLeadStage = 'LEAD' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'LOST';
export type PlatformLeadStatus = 'NEW' | 'CONTACTED' | 'FOLLOW_UP';
export type PlatformFollowUpType = 'CALL' | 'EMAIL' | 'MEETING';
export type PlatformFollowUpStatus = 'PENDING' | 'COMPLETED';

interface PlatformLeadFollowUpWire {
  id: number;
  type: PlatformFollowUpType;
  due_date: string;
  notes?: string;
  status: PlatformFollowUpStatus;
}

interface PlatformLeadWire {
  id: number;
  stage: PlatformLeadStage;
  lead_status: PlatformLeadStatus;
  business_name: string;
  plan_interest?: string;
  business_types: string[];
  years_in_business?: string;
  country?: string;
  state?: string;
  city_area?: string;
  address?: string;
  branches?: string;
  member_count?: string;
  staff_count?: string;
  services: string[];
  current_software?: string;
  reasons_to_switch: string[];
  goals: string[];
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_whatsapp?: string;
  notes?: string;
  source: string;
  gym_tenant_id?: number;
  gym_slug?: string;
  approved_at?: string;
  created_at: string;
  updated_at?: string;
  follow_ups: PlatformLeadFollowUpWire[];
}

interface PlatformLeadPageWire {
  leads: PlatformLeadWire[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface PlatformLeadFollowUpResponse {
  id: number;
  type: PlatformFollowUpType;
  dueDate: string;
  notes?: string;
  status: PlatformFollowUpStatus;
}

export interface PlatformLeadResponse {
  id: number;
  stage: PlatformLeadStage;
  leadStatus: PlatformLeadStatus;
  businessName: string;
  planInterest?: string;
  businessTypes: string[];
  yearsInBusiness?: string;
  country?: string;
  state?: string;
  cityArea?: string;
  address?: string;
  branches?: string;
  memberCount?: string;
  staffCount?: string;
  services: string[];
  currentSoftware?: string;
  reasonsToSwitch: string[];
  goals: string[];
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  notes?: string;
  source: string;
  gymTenantId?: number;
  gymSlug?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt?: string;
  followUps: PlatformLeadFollowUpResponse[];
}

export interface PlatformLeadSubmission {
  businessName: string;
  planInterest?: string;
  businessTypes?: string[];
  yearsInBusiness?: string;
  country?: string;
  state?: string;
  cityArea?: string;
  address?: string;
  branches?: string;
  memberCount?: string;
  staffCount?: string;
  services?: string[];
  currentSoftware?: string;
  reasonsToSwitch?: string[];
  goals?: string[];
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  notes?: string;
}

export interface PlatformLeadPage {
  leads: PlatformLeadResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function mapFollowUp(f: PlatformLeadFollowUpWire): PlatformLeadFollowUpResponse {
  return {
    id: f.id,
    type: f.type,
    dueDate: f.due_date,
    notes: f.notes,
    status: f.status,
  };
}

function mapLead(w: PlatformLeadWire): PlatformLeadResponse {
  return {
    id: w.id,
    stage: w.stage,
    leadStatus: w.lead_status,
    businessName: w.business_name,
    planInterest: w.plan_interest,
    businessTypes: w.business_types || [],
    yearsInBusiness: w.years_in_business,
    country: w.country,
    state: w.state,
    cityArea: w.city_area,
    address: w.address,
    branches: w.branches,
    memberCount: w.member_count,
    staffCount: w.staff_count,
    services: w.services || [],
    currentSoftware: w.current_software,
    reasonsToSwitch: w.reasons_to_switch || [],
    goals: w.goals || [],
    contactName: w.contact_name,
    contactEmail: w.contact_email,
    contactPhone: w.contact_phone,
    contactWhatsapp: w.contact_whatsapp,
    notes: w.notes,
    source: w.source,
    gymTenantId: w.gym_tenant_id,
    gymSlug: w.gym_slug,
    approvedAt: w.approved_at,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
    followUps: (w.follow_ups || []).map(mapFollowUp),
  };
}

function submissionToWire(data: PlatformLeadSubmission): Record<string, unknown> {
  return {
    business_name: data.businessName,
    plan_interest: data.planInterest,
    business_types: data.businessTypes,
    years_in_business: data.yearsInBusiness,
    country: data.country,
    state: data.state,
    city_area: data.cityArea,
    address: data.address,
    branches: data.branches,
    member_count: data.memberCount,
    staff_count: data.staffCount,
    services: data.services,
    current_software: data.currentSoftware,
    reasons_to_switch: data.reasonsToSwitch,
    goals: data.goals,
    contact_name: data.contactName,
    contact_email: data.contactEmail,
    contact_phone: data.contactPhone,
    contact_whatsapp: data.contactWhatsapp,
    notes: data.notes,
  };
}

export const platformLeadService = {
  /** Public — no auth. Called from business-onboarding-fullscreen.tsx. */
  submitLead: async (data: PlatformLeadSubmission): Promise<PlatformLeadResponse> => {
    const res = await api.post<PlatformLeadWire>('/platform-leads', submissionToWire(data));
    return mapLead(res.data);
  },

  getByStage: async (
    stage: PlatformLeadStage,
    params: { page?: number; size?: number; search?: string } = {}
  ): Promise<PlatformLeadPage> => {
    const res = await api.get<PlatformLeadPageWire>('/platform-leads', {
      params: { stage, page: params.page ?? 1, size: params.size ?? 50, search: params.search || undefined },
    });
    return {
      leads: res.data.leads.map(mapLead),
      pagination: {
        page: res.data.pagination.page,
        limit: res.data.pagination.limit,
        total: res.data.pagination.total,
        totalPages: res.data.pagination.total_pages,
      },
    };
  },

  getById: async (id: number): Promise<PlatformLeadResponse> => {
    const res = await api.get<PlatformLeadWire>(`/platform-leads/${id}`);
    return mapLead(res.data);
  },

  // NOTE: this endpoint (and mark-approved below) binds a raw Map<String, Object>
  // server-side, not a POJO — Jackson's SNAKE_CASE naming strategy only rewrites
  // declared POJO field names, so a plain map's literal keys pass through
  // unchanged and must be sent as camelCase (matching PlatformLeadController's
  // body.get("leadStatus") etc), unlike submitLead/addFollowUp's DTO-bound bodies.
  updateLeadStatus: async (id: number, leadStatus: PlatformLeadStatus): Promise<PlatformLeadResponse> => {
    const res = await api.patch<PlatformLeadWire>(`/platform-leads/${id}/lead-status`, { leadStatus });
    return mapLead(res.data);
  },

  approveForOnboarding: async (id: number): Promise<PlatformLeadResponse> => {
    const res = await api.patch<PlatformLeadWire>(`/platform-leads/${id}/approve-for-onboarding`, {});
    return mapLead(res.data);
  },

  reject: async (id: number): Promise<PlatformLeadResponse> => {
    const res = await api.patch<PlatformLeadWire>(`/platform-leads/${id}/reject`, {});
    return mapLead(res.data);
  },

  // Raw-map endpoint — camelCase keys, see updateLeadStatus's note above.
  markApproved: async (id: number, gymTenantId: number, gymSlug: string): Promise<PlatformLeadResponse> => {
    const res = await api.patch<PlatformLeadWire>(`/platform-leads/${id}/mark-approved`, {
      gymTenantId,
      gymSlug,
    });
    return mapLead(res.data);
  },

  addFollowUp: async (
    id: number,
    data: { type: PlatformFollowUpType; dueDate: string; notes?: string }
  ): Promise<PlatformLeadResponse> => {
    const res = await api.post<PlatformLeadWire>(`/platform-leads/${id}/follow-ups`, {
      type: data.type,
      due_date: data.dueDate,
      notes: data.notes,
    });
    return mapLead(res.data);
  },

  completeFollowUp: async (id: number, followUpId: number): Promise<PlatformLeadResponse> => {
    const res = await api.patch<PlatformLeadWire>(`/platform-leads/${id}/follow-ups/${followUpId}/complete`, {});
    return mapLead(res.data);
  },
};
