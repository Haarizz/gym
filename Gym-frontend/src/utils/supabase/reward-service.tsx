import { authService } from './auth-service';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// ── Types ──────────────────────────────────────────────────────────────────────

export type RewardStatus = 'PENDING' | 'AVAILABLE' | 'CLAIMED' | 'REDEEMED' | 'EXPIRED' | 'CANCELLED';
export type RewardMemberType = 'REFERRER' | 'REFEREE';
export type RewardType =
  | 'WALLET_CREDIT' | 'MEMBERSHIP_EXTENSION' | 'MEMBERSHIP_DISCOUNT' | 'FREE_PT'
  | 'FREE_CLASS' | 'COUPON' | 'LOYALTY_POINTS' | 'GIFT' | 'CASH';
export type RedemptionAction =
  | 'AUTO_WALLET' | 'USE_DURING_PAYMENT' | 'EXTEND_MEMBERSHIP' | 'BOOK_PT'
  | 'BOOK_CLASS' | 'COPY_COUPON' | 'COLLECT_GIFT' | 'REQUEST_CASH';

export interface ReferralReward {
  id: number;
  rewardCode: string;
  referralId: number;
  rewardRuleId: number;
  campaignId?: number;
  campaignName?: string;
  memberId: string;
  memberType: RewardMemberType;
  rewardName: string;
  rewardType: RewardType;
  rewardValue?: number;
  currency?: string;
  status: RewardStatus;
  redemptionAction?: RedemptionAction;
  approvalRequired?: boolean;
  approvedBy?: string;
  approvedDate?: string;
  generatedDate?: string;
  expiryDate?: string;
  claimedDate?: string;
  redeemedDate?: string;
  remarks?: string;
  couponCode?: string;
}

export interface RewardPage {
  rewards: ReferralReward[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface RewardRule {
  id: number;
  name: string;
  type?: string;
  value?: number;
  unit?: string;
  eligibility: 'referrer' | 'referee' | 'both';
  conditionTrigger?: string;
  isActive: boolean;
  expiryDays?: number;
  rewardType?: RewardType;
  redemptionAction?: RedemptionAction;
  currency?: string;
  priority?: number;
  stackable?: boolean;
  requiresApproval?: boolean;
  campaignId?: number;
  campaignName?: string;
  campaignStartDate?: string;
  campaignEndDate?: string;
  targetMembershipPlanId?: number;
  minPurchaseAmount?: number;
  minReferralCount?: number;
  maxRewardsPerMember?: number;
  createdAt?: string;
}

export type RewardRuleRequest = Partial<Omit<RewardRule, 'id' | 'createdAt' | 'campaignName'>>;

export interface ReferralCampaign {
  id: number;
  campaignId: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status: string;
  priority?: number;
  stackable?: boolean;
  createdAt?: string;
}

export type ReferralCampaignRequest = Partial<Omit<ReferralCampaign, 'id' | 'campaignId' | 'createdAt'>>;

export interface RewardAuditLogEntry {
  id: number;
  rewardId: number;
  action: string;
  performedBy?: string;
  remarks?: string;
  createdAt: string;
}

export interface RewardStats {
  totalGenerated: number;
  available: number;
  pendingApproval: number;
  redeemed: number;
  expired: number;
  cancelled: number;
  walletCreditsIssued: number;
  couponsUsed: number;
  topRewardType?: string;
  mostActiveReferrer?: string;
  highestRewardEarned?: number;
  monthlyRewards: { month: string; count: number }[];
  rewardTypeDistribution: Record<string, number>;
}

export interface WalletEntry {
  id: number;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  balanceAfter: number;
  sourceType?: string;
  sourceId?: number;
  remarks?: string;
  createdAt: string;
}

export interface Wallet {
  memberId: string;
  balance: number;
  transactions: WalletEntry[];
}

export interface Coupon {
  id: number;
  code: string;
  rewardId: number;
  discountValue?: number;
  discountUnit?: string;
  currency?: string;
  expiryDate?: string;
  maxUses?: number;
  usedCount?: number;
  status: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getHeaders(): Promise<HeadersInit> {
  const token = authService.getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function mapReward(r: any): ReferralReward {
  return {
    ...r,
    rewardCode: r.reward_code ?? r.rewardCode,
    referralId: r.referral_id ?? r.referralId,
    rewardRuleId: r.reward_rule_id ?? r.rewardRuleId,
    campaignId: r.campaign_id ?? r.campaignId,
    campaignName: r.campaign_name ?? r.campaignName,
    memberId: r.member_id ?? r.memberId,
    memberType: r.member_type ?? r.memberType,
    rewardName: r.reward_name ?? r.rewardName,
    rewardType: r.reward_type ?? r.rewardType,
    rewardValue: r.reward_value ?? r.rewardValue,
    redemptionAction: r.redemption_action ?? r.redemptionAction,
    approvalRequired: r.approval_required ?? r.approvalRequired,
    approvedBy: r.approved_by ?? r.approvedBy,
    approvedDate: r.approved_date ?? r.approvedDate,
    generatedDate: r.generated_date ?? r.generatedDate,
    expiryDate: r.expiry_date ?? r.expiryDate,
    claimedDate: r.claimed_date ?? r.claimedDate,
    redeemedDate: r.redeemed_date ?? r.redeemedDate,
    couponCode: r.coupon_code ?? r.couponCode,
  };
}

function mapRule(r: any): RewardRule {
  return {
    ...r,
    conditionTrigger: r.condition_trigger ?? r.conditionTrigger,
    isActive: r.is_active ?? r.isActive,
    expiryDays: r.expiry_days ?? r.expiryDays,
    rewardType: r.reward_type ?? r.rewardType,
    redemptionAction: r.redemption_action ?? r.redemptionAction,
    requiresApproval: r.requires_approval ?? r.requiresApproval,
    campaignId: r.campaign_id ?? r.campaignId,
    campaignName: r.campaign_name ?? r.campaignName,
    campaignStartDate: r.campaign_start_date ?? r.campaignStartDate,
    campaignEndDate: r.campaign_end_date ?? r.campaignEndDate,
    targetMembershipPlanId: r.target_membership_plan_id ?? r.targetMembershipPlanId,
    minPurchaseAmount: r.min_purchase_amount ?? r.minPurchaseAmount,
    minReferralCount: r.min_referral_count ?? r.minReferralCount,
    maxRewardsPerMember: r.max_rewards_per_member ?? r.maxRewardsPerMember,
    createdAt: r.created_at ?? r.createdAt,
  };
}

function ruleToPayload(request: RewardRuleRequest) {
  return {
    name: request.name,
    type: request.type,
    value: request.value,
    unit: request.unit,
    eligibility: request.eligibility,
    condition_trigger: request.conditionTrigger,
    is_active: request.isActive,
    expiry_days: request.expiryDays,
    reward_type: request.rewardType,
    redemption_action: request.redemptionAction,
    currency: request.currency,
    priority: request.priority,
    stackable: request.stackable,
    requires_approval: request.requiresApproval,
    campaign_id: request.campaignId,
    campaign_start_date: request.campaignStartDate,
    campaign_end_date: request.campaignEndDate,
    target_membership_plan_id: request.targetMembershipPlanId,
    min_purchase_amount: request.minPurchaseAmount,
    min_referral_count: request.minReferralCount,
    max_rewards_per_member: request.maxRewardsPerMember,
  };
}

function mapCampaign(c: any): ReferralCampaign {
  return {
    ...c,
    campaignId: c.campaign_id ?? c.campaignId,
    startDate: c.start_date ?? c.startDate,
    endDate: c.end_date ?? c.endDate,
    createdAt: c.created_at ?? c.createdAt,
  };
}

function campaignToPayload(request: ReferralCampaignRequest) {
  return {
    name: request.name,
    description: request.description,
    start_date: request.startDate,
    end_date: request.endDate,
    status: request.status,
    priority: request.priority,
    stackable: request.stackable,
  };
}

function mapAuditLog(a: any): RewardAuditLogEntry {
  return {
    ...a,
    rewardId: a.reward_id ?? a.rewardId,
    performedBy: a.performed_by ?? a.performedBy,
    createdAt: a.created_at ?? a.createdAt,
  };
}

function mapWallet(w: any): Wallet {
  return {
    memberId: w.member_id ?? w.memberId,
    balance: w.balance,
    transactions: (w.transactions ?? []).map((t: any) => ({
      ...t,
      balanceAfter: t.balance_after ?? t.balanceAfter,
      sourceType: t.source_type ?? t.sourceType,
      sourceId: t.source_id ?? t.sourceId,
      createdAt: t.created_at ?? t.createdAt,
    })),
  };
}

// ── Rewards ────────────────────────────────────────────────────────────────────

export const rewardService = {
  async getRewards(params?: {
    page?: number; size?: number; status?: string; rewardType?: string;
    memberId?: string; search?: string;
  }): Promise<RewardPage> {
    const p = new URLSearchParams();
    if (params?.page) p.set('page', String(params.page));
    if (params?.size) p.set('size', String(params.size));
    if (params?.status) p.set('status', params.status);
    if (params?.rewardType) p.set('rewardType', params.rewardType);
    if (params?.memberId) p.set('memberId', params.memberId);
    if (params?.search) p.set('search', params.search);
    const res = await fetch(`${BASE_URL}/rewards?${p}`, { headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch rewards');
    const raw = await res.json();
    const pg = raw.pagination ?? {};
    return {
      rewards: (raw.rewards ?? []).map(mapReward),
      pagination: {
        currentPage: pg.page ?? 1,
        totalPages: pg.total_pages ?? pg.totalPages ?? 1,
        totalItems: pg.total ?? pg.totalItems ?? 0,
        itemsPerPage: pg.limit ?? pg.itemsPerPage ?? 20,
      },
    };
  },

  async getById(id: number): Promise<ReferralReward> {
    const res = await fetch(`${BASE_URL}/rewards/${id}`, { headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch reward');
    return mapReward(await res.json());
  },

  async getByMember(memberId: string): Promise<ReferralReward[]> {
    const res = await fetch(`${BASE_URL}/rewards/member/${encodeURIComponent(memberId)}`, { headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch member rewards');
    const raw = await res.json();
    return raw.map(mapReward);
  },

  async getAuditTrail(rewardId: number): Promise<RewardAuditLogEntry[]> {
    const res = await fetch(`${BASE_URL}/rewards/audit/${rewardId}`, { headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch reward audit trail');
    const raw = await res.json();
    return raw.map(mapAuditLog);
  },

  async getStats(): Promise<RewardStats> {
    const res = await fetch(`${BASE_URL}/rewards/stats`, { headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch reward stats');
    const s = await res.json();
    return {
      ...s,
      walletCreditsIssued: s.wallet_credits_issued ?? s.walletCreditsIssued ?? 0,
      couponsUsed: s.coupons_used ?? s.couponsUsed ?? 0,
      topRewardType: s.top_reward_type ?? s.topRewardType,
      mostActiveReferrer: s.most_active_referrer ?? s.mostActiveReferrer,
      highestRewardEarned: s.highest_reward_earned ?? s.highestRewardEarned,
      monthlyRewards: s.monthly_rewards ?? s.monthlyRewards ?? [],
      rewardTypeDistribution: s.reward_type_distribution ?? s.rewardTypeDistribution ?? {},
    };
  },

  async claim(id: number): Promise<ReferralReward> {
    const res = await fetch(`${BASE_URL}/rewards/${id}/claim`, { method: 'POST', headers: await getHeaders() });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to claim reward');
    return mapReward(await res.json());
  },

  async redeem(id: number): Promise<ReferralReward> {
    const res = await fetch(`${BASE_URL}/rewards/${id}/redeem`, { method: 'POST', headers: await getHeaders() });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to redeem reward');
    return mapReward(await res.json());
  },

  async approve(id: number, remarks?: string): Promise<ReferralReward> {
    const res = await fetch(`${BASE_URL}/rewards/${id}/approve`, {
      method: 'POST', headers: await getHeaders(), body: JSON.stringify({ remarks }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to approve reward');
    return mapReward(await res.json());
  },

  async reject(id: number, remarks?: string): Promise<ReferralReward> {
    const res = await fetch(`${BASE_URL}/rewards/${id}/reject`, {
      method: 'POST', headers: await getHeaders(), body: JSON.stringify({ remarks }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to reject reward');
    return mapReward(await res.json());
  },

  async cancel(id: number, remarks?: string): Promise<ReferralReward> {
    const res = await fetch(`${BASE_URL}/rewards/${id}/cancel`, {
      method: 'POST', headers: await getHeaders(), body: JSON.stringify({ remarks }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to cancel reward');
    return mapReward(await res.json());
  },
};

// ── Reward Rules ───────────────────────────────────────────────────────────────

export const rewardRuleService = {
  async getAll(): Promise<RewardRule[]> {
    const res = await fetch(`${BASE_URL}/reward-rules`, { headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch reward rules');
    const raw = await res.json();
    return raw.map(mapRule);
  },

  async create(request: RewardRuleRequest): Promise<RewardRule> {
    const res = await fetch(`${BASE_URL}/reward-rules`, {
      method: 'POST', headers: await getHeaders(), body: JSON.stringify(ruleToPayload(request)),
    });
    if (!res.ok) throw new Error('Failed to create reward rule');
    return mapRule(await res.json());
  },

  async update(id: number, request: RewardRuleRequest): Promise<RewardRule> {
    const res = await fetch(`${BASE_URL}/reward-rules/${id}`, {
      method: 'PUT', headers: await getHeaders(), body: JSON.stringify(ruleToPayload(request)),
    });
    if (!res.ok) throw new Error('Failed to update reward rule');
    return mapRule(await res.json());
  },

  async delete(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/reward-rules/${id}`, { method: 'DELETE', headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to delete reward rule');
  },

  async toggle(id: number): Promise<RewardRule> {
    const res = await fetch(`${BASE_URL}/reward-rules/${id}/toggle`, { method: 'PATCH', headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to toggle reward rule');
    return mapRule(await res.json());
  },

  async duplicate(id: number): Promise<RewardRule> {
    const res = await fetch(`${BASE_URL}/reward-rules/${id}/duplicate`, { method: 'POST', headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to duplicate reward rule');
    return mapRule(await res.json());
  },
};

// ── Referral Campaigns ─────────────────────────────────────────────────────────

export const referralCampaignService = {
  async getAll(): Promise<ReferralCampaign[]> {
    const res = await fetch(`${BASE_URL}/referral-campaigns`, { headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch campaigns');
    const raw = await res.json();
    return raw.map(mapCampaign);
  },

  async create(request: ReferralCampaignRequest): Promise<ReferralCampaign> {
    const res = await fetch(`${BASE_URL}/referral-campaigns`, {
      method: 'POST', headers: await getHeaders(), body: JSON.stringify(campaignToPayload(request)),
    });
    if (!res.ok) throw new Error('Failed to create campaign');
    return mapCampaign(await res.json());
  },

  async update(id: number, request: ReferralCampaignRequest): Promise<ReferralCampaign> {
    const res = await fetch(`${BASE_URL}/referral-campaigns/${id}`, {
      method: 'PUT', headers: await getHeaders(), body: JSON.stringify(campaignToPayload(request)),
    });
    if (!res.ok) throw new Error('Failed to update campaign');
    return mapCampaign(await res.json());
  },

  async delete(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/referral-campaigns/${id}`, { method: 'DELETE', headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to delete campaign');
  },
};

// ── Wallet ─────────────────────────────────────────────────────────────────────

export const walletService = {
  async getWallet(memberId: string): Promise<Wallet> {
    const res = await fetch(`${BASE_URL}/wallet/${encodeURIComponent(memberId)}`, { headers: await getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch wallet');
    return mapWallet(await res.json());
  },

  async debit(memberId: string, amount: number, sourceType?: string, sourceId?: number, remarks?: string): Promise<Wallet> {
    const res = await fetch(`${BASE_URL}/wallet/${encodeURIComponent(memberId)}/debit`, {
      method: 'POST', headers: await getHeaders(),
      body: JSON.stringify({ amount, source_type: sourceType, source_id: sourceId, remarks }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to debit wallet');
    return mapWallet(await res.json());
  },
};

// ── Coupons ────────────────────────────────────────────────────────────────────

export const couponService = {
  async validate(code: string): Promise<Coupon> {
    const res = await fetch(`${BASE_URL}/coupons/validate?code=${encodeURIComponent(code)}`, { headers: await getHeaders() });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Invalid coupon code');
    return res.json();
  },

  async consume(code: string): Promise<Coupon> {
    const res = await fetch(`${BASE_URL}/coupons/consume?code=${encodeURIComponent(code)}`, {
      method: 'POST', headers: await getHeaders(),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to consume coupon');
    return res.json();
  },
};
