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
  rewardRedeemed?: boolean;
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
  referralCode?: string;
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

export interface ReferralValidationResponse {
  referral: ReferralResponse;
  applicableRewardRules: RewardRuleResponse[];
}

export interface ReferralSettings {
  programEnabled: boolean;
  autoGenerateCodes: boolean;
  emailNotifications: boolean;
  autoProcessRewards: boolean;
  codePrefix: string;
  linkDomain: string;
  maxRewardsPerMember?: number | null;
  expiryDays: number;
  minPurchaseAmount?: number | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getHeaders(): Promise<HeadersInit> {
  const token = authService.getAccessToken();
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
      referrals: (raw.referrals ?? []).map((r: any) => ({
        ...r,
        referrerMemberId: r.referrer_member_id,
        referrerName: r.referrer_name,
        refereeName: r.referee_name,
        refereeEmail: r.referee_email,
        refereePhone: r.referee_phone,
        referralCode: r.referral_code,
        referralLink: r.referral_link,
        rewardAmount: r.reward_amount,
        signupDate: r.signup_date,
        paymentDate: r.payment_date,
        ruleId: r.rule_id,
        ruleName: r.rule_name,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      })),
      pagination: (() => {
        const pg = raw.pagination ?? {};
        return {
          currentPage: pg.page ?? 1,
          totalPages: pg.total_pages ?? pg.totalPages ?? 1,
          totalItems: pg.total ?? pg.totalItems ?? 0,
          itemsPerPage: pg.limit ?? pg.itemsPerPage ?? 20,
        };
      })(),
    };
  },

  async fixRewards(): Promise<void> {
    await fetch(`${BASE_URL}/referrals/fix-rewards`, { headers: await getHeaders() });
  },

  async getStats(): Promise<ReferralStats> {
    const res = await fetch(`${BASE_URL}/referrals/stats`, { headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch referral stats');
    const raw = await res.json();
    return {
      totalReferrals: raw.total_referrals,
      successfulReferrals: raw.successful_referrals,
      pendingReferrals: raw.pending_referrals,
      expiredReferrals: raw.expired_referrals,
      conversionRate: raw.conversion_rate,
      totalRewards: raw.total_rewards,
      activeRules: raw.active_rules
    };
  },

  async getById(id: number): Promise<ReferralResponse> {
    const res = await fetch(`${BASE_URL}/referrals/${id}`, { headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch referral');
    const r = await res.json();
    return {
      ...r,
      referrerMemberId: r.referrer_member_id,
      referrerName: r.referrer_name,
      refereeName: r.referee_name,
      refereeEmail: r.referee_email,
      refereePhone: r.referee_phone,
      referralCode: r.referral_code,
      referralLink: r.referral_link,
      rewardAmount: r.reward_amount,
      signupDate: r.signup_date,
      paymentDate: r.payment_date,
      ruleId: r.rule_id,
      ruleName: r.rule_name,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  },

  async create(request: ReferralRequest): Promise<ReferralResponse> {
    const payload = {
      referrer_member_id: request.referrerMemberId,
      referrer_name: request.referrerName,
      referee_name: request.refereeName,
      referee_email: request.refereeEmail,
      referee_phone: request.refereePhone,
      status: request.status,
      reward_amount: request.rewardAmount,
      date: request.date,
      signup_date: request.signupDate,
      payment_date: request.paymentDate,
      notes: request.notes,
      rule_id: request.ruleId,
      referral_code: request.referralCode
    };
    const res = await fetch(`${BASE_URL}/referrals`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create referral');
    const r = await res.json();
    return {
      ...r,
      referrerMemberId: r.referrer_member_id,
      referrerName: r.referrer_name,
      refereeName: r.referee_name,
      refereeEmail: r.referee_email,
      refereePhone: r.referee_phone,
      referralCode: r.referral_code,
      referralLink: r.referral_link,
      rewardAmount: r.reward_amount,
      signupDate: r.signup_date,
      paymentDate: r.payment_date,
      ruleId: r.rule_id,
      ruleName: r.rule_name,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  },

  async update(id: number, request: ReferralRequest): Promise<ReferralResponse> {
    const payload = {
      referrer_member_id: request.referrerMemberId,
      referrer_name: request.referrerName,
      referee_name: request.refereeName,
      referee_email: request.refereeEmail,
      referee_phone: request.refereePhone,
      status: request.status,
      reward_amount: request.rewardAmount,
      date: request.date,
      signup_date: request.signupDate,
      payment_date: request.paymentDate,
      notes: request.notes,
      rule_id: request.ruleId
    };
    const res = await fetch(`${BASE_URL}/referrals/${id}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update referral');
    const r = await res.json();
    return {
      ...r,
      referrerMemberId: r.referrer_member_id,
      referrerName: r.referrer_name,
      refereeName: r.referee_name,
      refereeEmail: r.referee_email,
      refereePhone: r.referee_phone,
      referralCode: r.referral_code,
      referralLink: r.referral_link,
      rewardAmount: r.reward_amount,
      signupDate: r.signup_date,
      paymentDate: r.payment_date,
      ruleId: r.rule_id,
      ruleName: r.rule_name,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  },

  async delete(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/referrals/${id}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete referral');
  },

  async markSuccessful(id: number, opts?: {
    purchaseAmount?: number;
    membershipPlanId?: number;
    refereeMemberId?: string;
  }): Promise<ReferralResponse> {
    const res = await fetch(`${BASE_URL}/referrals/${id}/mark-successful`, {
      method: 'POST',
      headers: await getHeaders(),
      body: opts ? JSON.stringify({
        purchase_amount: opts.purchaseAmount,
        membership_plan_id: opts.membershipPlanId,
        referee_member_id: opts.refereeMemberId,
      }) : undefined,
    });
    if (!res.ok) throw new Error('Failed to mark referral as successful');
    const r = await res.json();
    return {
      ...r,
      referrerMemberId: r.referrer_member_id,
      referrerName: r.referrer_name,
      refereeName: r.referee_name,
      refereeEmail: r.referee_email,
      refereePhone: r.referee_phone,
      referralCode: r.referral_code,
      referralLink: r.referral_link,
      rewardAmount: r.reward_amount,
      signupDate: r.signup_date,
      paymentDate: r.payment_date,
      ruleId: r.rule_id,
      ruleName: r.rule_name,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  },

  async markExpired(id: number): Promise<ReferralResponse> {
    const res = await fetch(`${BASE_URL}/referrals/${id}/mark-expired`, {
      method: 'POST',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to mark referral as expired');
    const r = await res.json();
    return {
      ...r,
      referrerMemberId: r.referrer_member_id,
      referrerName: r.referrer_name,
      refereeName: r.referee_name,
      refereeEmail: r.referee_email,
      refereePhone: r.referee_phone,
      referralCode: r.referral_code,
      referralLink: r.referral_link,
      rewardAmount: r.reward_amount,
      signupDate: r.signup_date,
      paymentDate: r.payment_date,
      ruleId: r.rule_id,
      ruleName: r.rule_name,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  },

  /**
   * The referrer's oldest unredeemed reward from a successful referral, if any —
   * offered as a discount at checkout (e.g. an add-on purchase). Returns null
   * when there's nothing to redeem.
   */
  async getUnredeemedReward(memberId: string): Promise<ReferralResponse | null> {
    const res = await fetch(`${BASE_URL}/referrals/unredeemed-reward?memberId=${encodeURIComponent(memberId)}`, {
      headers: await getHeaders(),
    });
    if (res.status === 204) return null;
    if (!res.ok) throw new Error('Failed to fetch unredeemed reward');
    const r = await res.json();
    return {
      ...r,
      referrerMemberId: r.referrer_member_id,
      referrerName: r.referrer_name,
      refereeName: r.referee_name,
      refereeEmail: r.referee_email,
      refereePhone: r.referee_phone,
      referralCode: r.referral_code,
      referralLink: r.referral_link,
      rewardAmount: r.reward_amount,
      signupDate: r.signup_date,
      paymentDate: r.payment_date,
      ruleId: r.rule_id,
      ruleName: r.rule_name,
      rewardRedeemed: r.reward_redeemed,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  },

  async redeemReward(id: number): Promise<ReferralResponse> {
    const res = await fetch(`${BASE_URL}/referrals/${id}/redeem-reward`, {
      method: 'POST',
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to redeem reward');
    const r = await res.json();
    return {
      ...r,
      referrerMemberId: r.referrer_member_id,
      referrerName: r.referrer_name,
      refereeName: r.referee_name,
      refereeEmail: r.referee_email,
      refereePhone: r.referee_phone,
      referralCode: r.referral_code,
      referralLink: r.referral_link,
      rewardAmount: r.reward_amount,
      signupDate: r.signup_date,
      paymentDate: r.payment_date,
      ruleId: r.rule_id,
      ruleName: r.rule_name,
      rewardRedeemed: r.reward_redeemed,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  },

  /**
   * Validate a referral code for use during member creation.
   * Returns the referral details plus applicable reward rules for the referee (new member).
   */
  async validateCode(code: string): Promise<ReferralValidationResponse> {
    const res = await fetch(`${BASE_URL}/referrals/validate-code?code=${encodeURIComponent(code)}`, {
      headers: await getHeaders(),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || 'Invalid referral code');
    }
    const r = await res.json();
    return {
      referral: {
        ...r.referral,
        referrerMemberId: r.referral.referrer_member_id,
        referrerName: r.referral.referrer_name,
        refereeName: r.referral.referee_name,
        refereeEmail: r.referral.referee_email,
        refereePhone: r.referral.referee_phone,
        referralCode: r.referral.referral_code,
        referralLink: r.referral.referral_link,
        rewardAmount: r.referral.reward_amount,
        signupDate: r.referral.signup_date,
        paymentDate: r.referral.payment_date,
        ruleId: r.referral.rule_id,
        ruleName: r.referral.rule_name,
        createdAt: r.referral.created_at,
        updatedAt: r.referral.updated_at
      },
      applicableRewardRules: (r.applicable_reward_rules || []).map((rule: any) => ({
        ...rule,
        conditionTrigger: rule.condition_trigger,
        isActive: rule.is_active,
        expiryDays: rule.expiry_days,
        createdAt: rule.created_at
      }))
    };
  },

  // Reward Rules
  async getRules(): Promise<RewardRuleResponse[]> {
    const res = await fetch(`${BASE_URL}/referrals/rules`, { headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch reward rules');
    const raw = await res.json();
    return raw.map((r: any) => ({
      ...r,
      conditionTrigger: r.condition_trigger,
      isActive: r.is_active,
      expiryDays: r.expiry_days,
      createdAt: r.created_at
    }));
  },

  async createRule(request: RewardRuleRequest): Promise<RewardRuleResponse> {
    const payload = {
      name: request.name,
      type: request.type,
      value: request.value,
      unit: request.unit,
      eligibility: request.eligibility,
      condition_trigger: request.conditionTrigger,
      is_active: request.isActive,
      expiry_days: request.expiryDays
    };
    const res = await fetch(`${BASE_URL}/referrals/rules`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create reward rule');
    return res.json();
  },

  async updateRule(id: number, request: RewardRuleRequest): Promise<RewardRuleResponse> {
    const payload = {
      name: request.name,
      type: request.type,
      value: request.value,
      unit: request.unit,
      eligibility: request.eligibility,
      condition_trigger: request.conditionTrigger,
      is_active: request.isActive,
      expiry_days: request.expiryDays
    };
    const res = await fetch(`${BASE_URL}/referrals/rules/${id}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(payload),
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

  // ── Settings ─────────────────────────────────────────────────────────────

  async getSettings(): Promise<ReferralSettings> {
    const res = await fetch(`${BASE_URL}/referrals/settings`, { headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch referral settings');
    const s = await res.json();
    return {
      programEnabled: s.program_enabled,
      autoGenerateCodes: s.auto_generate_codes,
      emailNotifications: s.email_notifications,
      autoProcessRewards: s.auto_process_rewards,
      codePrefix: s.code_prefix,
      linkDomain: s.link_domain,
      maxRewardsPerMember: s.max_rewards_per_member,
      expiryDays: s.expiry_days,
      minPurchaseAmount: s.min_purchase_amount,
    };
  },

  async updateSettings(settings: Partial<ReferralSettings>): Promise<ReferralSettings> {
    const payload = {
      program_enabled: settings.programEnabled,
      auto_generate_codes: settings.autoGenerateCodes,
      email_notifications: settings.emailNotifications,
      auto_process_rewards: settings.autoProcessRewards,
      code_prefix: settings.codePrefix,
      link_domain: settings.linkDomain,
      max_rewards_per_member: settings.maxRewardsPerMember,
      expiry_days: settings.expiryDays,
      min_purchase_amount: settings.minPurchaseAmount,
    };
    const res = await fetch(`${BASE_URL}/referrals/settings`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update referral settings');
    const s = await res.json();
    return {
      programEnabled: s.program_enabled,
      autoGenerateCodes: s.auto_generate_codes,
      emailNotifications: s.email_notifications,
      autoProcessRewards: s.auto_process_rewards,
      codePrefix: s.code_prefix,
      linkDomain: s.link_domain,
      maxRewardsPerMember: s.max_rewards_per_member,
      expiryDays: s.expiry_days,
      minPurchaseAmount: s.min_purchase_amount,
    };
  },
};

