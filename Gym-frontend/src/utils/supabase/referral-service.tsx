import { authService } from './auth-service';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface ReferralResponse {
  id: number;
  referralId: string;
  referrerMemberId?: string;
  referrerName: string;
  refereeName: string;
  refereeEmail?: string;
  refereePhone?: string;
  referralCode: string;
  referralLink: string;
  status: 'pending' | 'successful' | 'expired';
  rewardAmount?: number;
  date: string;
  signupDate?: string;
  paymentDate?: string;
  notes?: string;
  ruleId?: number;
  ruleName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ReferralRequest {
  referrerMemberId?: string;
  referrerName: string;
  refereeName: string;
  refereeEmail?: string;
  refereePhone?: string;
  status?: string;
  rewardAmount?: number;
  date?: string;
  signupDate?: string;
  paymentDate?: string;
  notes?: string;
  ruleId?: number;
}

export interface ReferralStats {
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  expiredReferrals: number;
  conversionRate: number;
  totalRewards: number;
  activeRules: number;
}

export interface RewardRuleResponse {
  id: number;
  name: string;
  type: 'discount' | 'credit' | 'points' | 'free_session';
  value: number;
  unit: string;
  eligibility: 'referrer' | 'referee' | 'both';
  conditionTrigger: 'signup' | 'payment' | 'both';
  isActive: boolean;
  expiryDays?: number;
  createdAt: string;
}

export interface RewardRuleRequest {
  name: string;
  type: string;
  value: number;
  unit: string;
  eligibility: string;
  conditionTrigger: string;
  isActive?: boolean;
  expiryDays?: number;
}

export interface ReferralPage {
  referrals: ReferralResponse[];
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

export const referralService = {

  async getReferrals(params?: {
    page?: number;
    size?: number;
    status?: string;
    search?: string;
  }): Promise<ReferralPage> {
    const p = new URLSearchParams();
    if (params?.page)   p.set('page', String(params.page));
    if (params?.size)   p.set('size', String(params.size));
    if (params?.status) p.set('status', params.status);
    if (params?.search) p.set('search', params.search);
    const res = await fetch(`${BASE_URL}/referrals?${p}`, { headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch referrals');
    const raw = await res.json();
    return {
      referrals: raw.referrals ?? [],
      pagination: raw.pagination ?? {},
    };
  },

  async getStats(): Promise<ReferralStats> {
    const res = await fetch(`${BASE_URL}/referrals/stats`, { headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch referral stats');
    return res.json();
  },

  async getById(id: number): Promise<ReferralResponse> {
    const res = await fetch(`${BASE_URL}/referrals/${id}`, { headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch referral');
    return res.json();
  },

  async create(request: ReferralRequest): Promise<ReferralResponse> {
    const res = await fetch(`${BASE_URL}/referrals`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error('Failed to create referral');
    return res.json();
  },

  async update(id: number, request: ReferralRequest): Promise<ReferralResponse> {
    const res = await fetch(`${BASE_URL}/referrals/${id}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error('Failed to update referral');
    return res.json();
  },

  async delete(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/referrals/${id}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete referral');
  },

  async markSuccessful(id: number): Promise<ReferralResponse> {
    const res = await fetch(`${BASE_URL}/referrals/${id}/mark-successful`, {
      method: 'POST',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to mark referral as successful');
    return res.json();
  },

  async markExpired(id: number): Promise<ReferralResponse> {
    const res = await fetch(`${BASE_URL}/referrals/${id}/mark-expired`, {
      method: 'POST',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to mark referral as expired');
    return res.json();
  },

  // Reward Rules
  async getRules(): Promise<RewardRuleResponse[]> {
    const res = await fetch(`${BASE_URL}/referrals/rules`, { headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch reward rules');
    return res.json();
  },

  async createRule(request: RewardRuleRequest): Promise<RewardRuleResponse> {
    const res = await fetch(`${BASE_URL}/referrals/rules`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error('Failed to create reward rule');
    return res.json();
  },

  async updateRule(id: number, request: RewardRuleRequest): Promise<RewardRuleResponse> {
    const res = await fetch(`${BASE_URL}/referrals/rules/${id}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error('Failed to update reward rule');
    return res.json();
  },

  async toggleRule(id: number): Promise<RewardRuleResponse> {
    const res = await fetch(`${BASE_URL}/referrals/rules/${id}/toggle`, {
      method: 'POST',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to toggle reward rule');
    return res.json();
  },

  async deleteRule(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/referrals/rules/${id}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete reward rule');
  },
};
