import api from '../../api/axiosConfig';
import { publicLeadFormUrl } from './lead-form-service';

// Marketing campaigns (Promotions & Campaigns › Campaigns): social-media / ad pushes linked
// to the lead forms their ads point to. camelCase on the wire (@JsonNaming on the backend
// records), so no snake_case mapping is needed here.

export type CampaignPlatform = 'instagram' | 'facebook' | 'meta' | 'google' | 'youtube' | 'whatsapp' | 'offline' | 'other';
export type CampaignObjective = 'leads' | 'trials' | 'awareness' | 'renewals' | 'event';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
/** Status refined by the dates: an active campaign is scheduled / live / ended. */
export type CampaignPhase = CampaignStatus | 'scheduled' | 'live' | 'ended';
export type SpendCategory = 'ad_spend' | 'creative' | 'boosting' | 'influencer' | 'printing' | 'team_time' | 'other';

export interface CampaignMetrics {
  leads: number;
  newLeads: number;
  contacted: number;
  followUp: number;
  converted: number;
  lost: number;
  conversionRate: number;
  spend: number;
  hours: number;
  costPerLead: number | null;
  costPerConversion: number | null;
  revenue: number;
  roi: number | null;
  budgetUsedPct: number | null;
  leadsPerHour: number | null;
  avgDaysToConvert: number | null;
  leadTargetPct: number | null;
  conversionTargetPct: number | null;
}

export interface CampaignLinkedForm {
  id: number;
  name: string;
  formKey: string | null;
  source: string | null;
  active: boolean;
  missing: boolean;
  leads: number;
  conversions: number;
}

export interface MarketingCampaign {
  id: number;
  campaignCode: string;
  name: string;
  description?: string;
  platform: CampaignPlatform;
  objective: CampaignObjective;
  status: CampaignStatus;
  phase: CampaignPhase;
  startDate: string;
  endDate: string;
  durationDays: number;
  daysElapsed: number;
  daysRemaining: number;
  budget: number | null;
  targetLeads: number | null;
  targetConversions: number | null;
  trackingCode?: string;
  ownerName?: string;
  notes?: string;
  branchId: number;
  branchName?: string;
  leadForms: CampaignLinkedForm[];
  metrics: CampaignMetrics;
  createdAt?: string;
  createdBy?: string;
}

export interface CampaignRequest {
  name?: string;
  description?: string;
  platform?: CampaignPlatform;
  objective?: CampaignObjective;
  status?: CampaignStatus;
  startDate?: string;
  endDate?: string;
  budget?: number;
  targetLeads?: number;
  targetConversions?: number;
  trackingCode?: string;
  ownerName?: string;
  notes?: string;
  branchId?: number;
  leadFormIds?: number[];
  creditExistingLeads?: boolean;
}

export interface CampaignDailyPoint { date: string; leads: number; conversions: number; spend: number; hours: number }
export interface CampaignBreakdown { key: string | null; label: string; leads: number; conversions: number; conversionRate: number }
export interface CampaignLead {
  id: number;
  leadId?: string;
  name: string;
  phone?: string;
  status?: string;
  source?: string;
  assignedStaff?: string;
  leadFormName?: string;
  memberId?: number | null;
  createdAt?: string;
}
export interface CampaignSpend {
  id: number;
  spendDate: string;
  category: SpendCategory;
  amount: number;
  hours: number;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
}
export interface SpendRequest { spendDate?: string; category?: SpendCategory; amount?: number; hours?: number; notes?: string }

export interface CampaignReport {
  campaign: MarketingCampaign;
  daily: CampaignDailyPoint[];
  bySource: CampaignBreakdown[];
  byStaff: CampaignBreakdown[];
  byForm: CampaignBreakdown[];
  spends: CampaignSpend[];
  recentLeads: CampaignLead[];
}

export interface CampaignOption {
  id: number;
  name: string;
  platform: CampaignPlatform;
  status: CampaignStatus;
  phase: CampaignPhase;
  startDate: string;
  endDate: string;
}

export interface CampaignLeadFormOption {
  id: number;
  name: string;
  formKey: string;
  source: string;
  active: boolean;
  branchId: number;
  submissionCount: number;
  campaigns: string[];
}

const BASE = '/marketing-campaigns';
// The backend reads "today" in the gym's zone (branch POS setting, else this header).
const CLIENT_TZ = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; }
})();
const tzHeaders = CLIENT_TZ ? { headers: { 'X-Client-Timezone': CLIENT_TZ } } : undefined;

export const marketingCampaignService = {
  list: async (): Promise<MarketingCampaign[]> => (await api.get<MarketingCampaign[]>(BASE, tzHeaders)).data,
  options: async (): Promise<CampaignOption[]> => (await api.get<CampaignOption[]>(`${BASE}/options`, tzHeaders)).data,
  leadForms: async (): Promise<CampaignLeadFormOption[]> =>
    (await api.get<CampaignLeadFormOption[]>(`${BASE}/lead-forms`, tzHeaders)).data,
  report: async (id: number): Promise<CampaignReport> => (await api.get<CampaignReport>(`${BASE}/${id}`, tzHeaders)).data,
  create: async (data: CampaignRequest): Promise<MarketingCampaign> =>
    (await api.post<MarketingCampaign>(BASE, data, tzHeaders)).data,
  update: async (id: number, data: CampaignRequest): Promise<MarketingCampaign> =>
    (await api.put<MarketingCampaign>(`${BASE}/${id}`, data, tzHeaders)).data,
  setStatus: async (id: number, status: CampaignStatus): Promise<MarketingCampaign> =>
    (await api.patch<MarketingCampaign>(`${BASE}/${id}/status`, { status }, tzHeaders)).data,
  linkLeadForms: async (id: number, leadFormIds: number[], creditExistingLeads = true): Promise<MarketingCampaign> =>
    (await api.put<MarketingCampaign>(`${BASE}/${id}/lead-forms`, { leadFormIds, creditExistingLeads }, tzHeaders)).data,
  remove: async (id: number): Promise<void> => { await api.delete(`${BASE}/${id}`); },
  addSpend: async (id: number, data: SpendRequest): Promise<CampaignSpend> =>
    (await api.post<CampaignSpend>(`${BASE}/${id}/spends`, data, tzHeaders)).data,
  updateSpend: async (id: number, spendId: number, data: SpendRequest): Promise<CampaignSpend> =>
    (await api.put<CampaignSpend>(`${BASE}/${id}/spends/${spendId}`, data, tzHeaders)).data,
  removeSpend: async (id: number, spendId: number): Promise<void> => { await api.delete(`${BASE}/${id}/spends/${spendId}`); },
};

/** The lead-form link to paste in this campaign's ads, tagged so leads are credited to it. */
export function campaignAdLink(formKey: string, campaign: Pick<MarketingCampaign, 'trackingCode' | 'platform'>): string {
  const url = publicLeadFormUrl(formKey);
  const params = new URLSearchParams();
  if (campaign.platform && campaign.platform !== 'offline' && campaign.platform !== 'other') params.set('utm_source', campaign.platform);
  if (campaign.trackingCode) params.set('utm_campaign', campaign.trackingCode);
  const q = params.toString();
  return q ? `${url}?${q}` : url;
}

/** Backend error bodies are { message } (GlobalExceptionHandler) — surface them when present. */
export function campaignErrorMessage(error: unknown, fallback: string): string {
  const data = (error as any)?.response?.data;
  if (data && typeof data.message === 'string' && data.message) return data.message;
  return fallback;
}
