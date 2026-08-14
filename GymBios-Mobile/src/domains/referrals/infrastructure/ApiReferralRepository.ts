import { apiClient } from '@/core/network/apiClient';
import type { ReferralRepository } from '../application/ReferralRepository';
import type { Referral, ReferralPage } from '../domain/Referral';
import type { ReferralStats } from '../domain/ReferralStats';
import type { ReferralRule } from '../domain/ReferralRule';
import type { ReferralSettings, UpdateReferralSettingsPayload } from '../domain/ReferralSettings';
import type { ReferralListParams } from '../domain/ReferralListParams';
import type {
  CreateReferralPayload,
  UpdateReferralPayload,
  MarkSuccessfulPayload,
  ReferralValidationResponse,
} from '../domain/ReferralPayloads';

interface ReferralResponseDTO {
  id: number;
  referralId?: string;
  referral_id?: string;
  referrerMemberId?: string;
  referrer_member_id?: string;
  referrerName?: string;
  referrer_name?: string;
  refereeName?: string;
  referee_name?: string;
  refereeEmail?: string;
  referee_email?: string;
  refereePhone?: string;
  referee_phone?: string;
  referralCode?: string;
  referral_code?: string;
  referralLink?: string;
  referral_link?: string;
  status: 'pending' | 'successful' | 'expired';
  rewardAmount?: number;
  reward_amount?: number;
  date?: string;
  signupDate?: string;
  signup_date?: string;
  paymentDate?: string;
  payment_date?: string;
  notes?: string;
  ruleId?: number;
  rule_id?: number;
  ruleName?: string;
  rule_name?: string;
  rewardRedeemed?: boolean;
  reward_redeemed?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

interface ReferralPageResponseDTO {
  referrals?: ReferralResponseDTO[];
  pagination?: {
    currentPage?: number;
    page?: number;
    totalPages?: number;
    total_pages?: number;
    totalItems?: number;
    total?: number;
    itemsPerPage?: number;
    limit?: number;
  };
}

interface ReferralStatsResponseDTO {
  total_referrals?: number;
  totalReferrals?: number;
  successful_referrals?: number;
  successfulReferrals?: number;
  pending_referrals?: number;
  pendingReferrals?: number;
  expired_referrals?: number;
  expiredReferrals?: number;
  conversion_rate?: number;
  conversionRate?: number;
  total_rewards?: number;
  totalRewards?: number;
  active_rules?: number;
  activeRules?: number;
}

interface ReferralRuleResponseDTO {
  id: number;
  name: string;
  type: string;
  value: number;
  unit: string;
  eligibility: string;
  conditionTrigger?: string;
  condition_trigger?: string;
  isActive?: boolean;
  is_active?: boolean;
  expiryDays?: number;
  expiry_days?: number;
  createdAt?: string;
  created_at?: string;
}

interface ReferralSettingsDTO {
  programEnabled?: boolean;
  program_enabled?: boolean;
  autoGenerateCodes?: boolean;
  auto_generate_codes?: boolean;
  emailNotifications?: boolean;
  email_notifications?: boolean;
  autoProcessRewards?: boolean;
  auto_process_rewards?: boolean;
  codePrefix?: string;
  code_prefix?: string;
  linkDomain?: string;
  link_domain?: string;
  maxRewardsPerMember?: number | null;
  max_rewards_per_member?: number | null;
  expiryDays?: number;
  expiry_days?: number;
  minPurchaseAmount?: number | null;
  min_purchase_amount?: number | null;
}

interface ValidationResponseDTO {
  referral: ReferralResponseDTO;
  applicableRewardRules?: ReferralRuleResponseDTO[];
  applicable_reward_rules?: ReferralRuleResponseDTO[];
}

export class ApiReferralRepository implements ReferralRepository {
  async getStats(): Promise<ReferralStats> {
    const response = await apiClient.get<ReferralStatsResponseDTO>('/referrals/stats');
    const raw = response.data;
    return {
      totalReferrals: raw.total_referrals ?? raw.totalReferrals ?? 0,
      successfulReferrals: raw.successful_referrals ?? raw.successfulReferrals ?? 0,
      pendingReferrals: raw.pending_referrals ?? raw.pendingReferrals ?? 0,
      expiredReferrals: raw.expired_referrals ?? raw.expiredReferrals ?? 0,
      conversionRate: raw.conversion_rate ?? raw.conversionRate ?? 0,
      totalRewards: Number(raw.total_rewards ?? raw.totalRewards ?? 0),
      activeRules: raw.active_rules ?? raw.activeRules ?? 0,
    };
  }

  async getReferrals(params?: ReferralListParams): Promise<ReferralPage> {
    const response = await apiClient.get<ReferralPageResponseDTO>('/referrals', {
      params: {
        ...(params?.page ? { page: params.page } : {}),
        ...(params?.size ? { size: params.size } : {}),
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.search ? { search: params.search } : {}),
      },
    });

    const raw = response.data;
    const items = raw.referrals ?? [];
    const pg = raw.pagination ?? {};

    return {
      referrals: items.map(item => this.mapReferralToDomain(item)),
      pagination: {
        currentPage: pg.page ?? pg.currentPage ?? 1,
        totalPages: pg.total_pages ?? pg.totalPages ?? 1,
        totalItems: pg.total ?? pg.totalItems ?? 0,
        itemsPerPage: pg.limit ?? pg.itemsPerPage ?? 20,
      },
    };
  }

  async getById(id: number): Promise<Referral> {
    const response = await apiClient.get<ReferralResponseDTO>(`/referrals/${id}`);
    return this.mapReferralToDomain(response.data);
  }

  async getRules(): Promise<ReferralRule[]> {
    const response = await apiClient.get<ReferralRuleResponseDTO[]>('/referrals/rules');
    return response.data.map(r => this.mapRuleToDomain(r));
  }

  async getSettings(): Promise<ReferralSettings> {
    const response = await apiClient.get<ReferralSettingsDTO>('/referrals/settings');
    return this.mapSettingsToDomain(response.data);
  }

  async updateSettings(payload: UpdateReferralSettingsPayload): Promise<ReferralSettings> {
    const requestDTO: ReferralSettingsDTO = {
      program_enabled: payload.programEnabled,
      auto_generate_codes: payload.autoGenerateCodes,
      email_notifications: payload.emailNotifications,
      auto_process_rewards: payload.autoProcessRewards,
      code_prefix: payload.codePrefix,
      link_domain: payload.linkDomain,
      max_rewards_per_member: payload.maxRewardsPerMember,
      expiry_days: payload.expiryDays,
      min_purchase_amount: payload.minPurchaseAmount,
    };

    const response = await apiClient.put<ReferralSettingsDTO>('/referrals/settings', requestDTO);
    return this.mapSettingsToDomain(response.data);
  }

  async create(payload: CreateReferralPayload): Promise<Referral> {
    const requestDTO = {
      referrer_member_id: payload.referrerMemberId,
      referrer_name: payload.referrerName,
      referee_name: payload.refereeName,
      referee_email: payload.refereeEmail,
      referee_phone: payload.refereePhone,
      status: payload.status,
      reward_amount: payload.rewardAmount,
      date: payload.date,
      signup_date: payload.signupDate,
      payment_date: payload.paymentDate,
      notes: payload.notes,
      rule_id: payload.ruleId,
      referral_code: payload.referralCode,
    };

    const response = await apiClient.post<ReferralResponseDTO>('/referrals', requestDTO);
    return this.mapReferralToDomain(response.data);
  }

  async update(id: number, payload: UpdateReferralPayload): Promise<Referral> {
    const requestDTO = {
      referrer_member_id: payload.referrerMemberId,
      referrer_name: payload.referrerName,
      referee_name: payload.refereeName,
      referee_email: payload.refereeEmail,
      referee_phone: payload.refereePhone,
      status: payload.status,
      reward_amount: payload.rewardAmount,
      date: payload.date,
      signup_date: payload.signupDate,
      payment_date: payload.paymentDate,
      notes: payload.notes,
      rule_id: payload.ruleId,
    };

    const response = await apiClient.put<ReferralResponseDTO>(`/referrals/${id}`, requestDTO);
    return this.mapReferralToDomain(response.data);
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/referrals/${id}`);
  }

  async markSuccessful(id: number, payload?: MarkSuccessfulPayload): Promise<Referral> {
    const requestDTO = payload ? {
      purchase_amount: payload.purchaseAmount,
      membership_plan_id: payload.membershipPlanId,
      referee_member_id: payload.refereeMemberId,
    } : undefined;

    const response = await apiClient.post<ReferralResponseDTO>(
      `/referrals/${id}/mark-successful`,
      requestDTO,
    );
    return this.mapReferralToDomain(response.data);
  }

  async markExpired(id: number): Promise<Referral> {
    const response = await apiClient.post<ReferralResponseDTO>(`/referrals/${id}/mark-expired`);
    return this.mapReferralToDomain(response.data);
  }

  async getUnredeemedReward(memberId: string): Promise<Referral | null> {
    const response = await apiClient.get<ReferralResponseDTO | null>('/referrals/unredeemed-reward', {
      params: { memberId },
      validateStatus: (status) => status === 200 || status === 204,
    });

    if (response.status === 204 || !response.data) {
      return null;
    }

    return this.mapReferralToDomain(response.data);
  }

  async redeemReward(id: number): Promise<Referral> {
    const response = await apiClient.post<ReferralResponseDTO>(`/referrals/${id}/redeem-reward`);
    return this.mapReferralToDomain(response.data);
  }

  async validateCode(code: string): Promise<ReferralValidationResponse> {
    const response = await apiClient.get<ValidationResponseDTO>('/referrals/validate-code', {
      params: { code },
    });

    const raw = response.data;
    const rulesRaw = raw.applicable_reward_rules ?? raw.applicableRewardRules ?? [];

    return {
      referral: this.mapReferralToDomain(raw.referral),
      applicableRewardRules: rulesRaw.map(r => this.mapRuleToDomain(r)),
    };
  }

  async fixRewards(): Promise<void> {
    await apiClient.get('/referrals/fix-rewards');
  }

  private mapReferralToDomain(dto: ReferralResponseDTO): Referral {
    return {
      id: dto.id,
      referralId: dto.referral_id ?? dto.referralId ?? String(dto.id),
      referrerMemberId: dto.referrer_member_id ?? dto.referrerMemberId,
      referrerName: dto.referrer_name ?? dto.referrerName ?? '',
      refereeName: dto.referee_name ?? dto.refereeName ?? '',
      refereeEmail: dto.referee_email ?? dto.refereeEmail,
      refereePhone: dto.referee_phone ?? dto.refereePhone,
      referralCode: dto.referral_code ?? dto.referralCode ?? '',
      referralLink: dto.referral_link ?? dto.referralLink ?? '',
      status: dto.status,
      rewardAmount: dto.reward_amount ?? dto.rewardAmount,
      date: dto.date ?? dto.createdAt ?? dto.created_at ?? new Date().toISOString(),
      signupDate: dto.signup_date ?? dto.signupDate,
      paymentDate: dto.payment_date ?? dto.paymentDate,
      notes: dto.notes,
      ruleId: dto.rule_id ?? dto.ruleId,
      ruleName: dto.rule_name ?? dto.ruleName,
      rewardRedeemed: dto.reward_redeemed ?? dto.rewardRedeemed,
      createdAt: dto.created_at ?? dto.createdAt ?? new Date().toISOString(),
      updatedAt: dto.updated_at ?? dto.updatedAt,
    };
  }

  private mapRuleToDomain(dto: ReferralRuleResponseDTO): ReferralRule {
    return {
      id: dto.id,
      name: dto.name,
      type: dto.type,
      value: dto.value,
      unit: dto.unit,
      eligibility: dto.eligibility,
      conditionTrigger: dto.condition_trigger ?? dto.conditionTrigger ?? 'signup',
      isActive: dto.is_active ?? dto.isActive ?? true,
      expiryDays: dto.expiry_days ?? dto.expiryDays,
      createdAt: dto.created_at ?? dto.createdAt ?? new Date().toISOString(),
    };
  }

  private mapSettingsToDomain(dto: ReferralSettingsDTO): ReferralSettings {
    return {
      programEnabled: dto.program_enabled ?? dto.programEnabled ?? true,
      autoGenerateCodes: dto.auto_generate_codes ?? dto.autoGenerateCodes ?? true,
      emailNotifications: dto.email_notifications ?? dto.emailNotifications ?? true,
      autoProcessRewards: dto.auto_process_rewards ?? dto.autoProcessRewards ?? false,
      codePrefix: dto.code_prefix ?? dto.codePrefix ?? 'GYM',
      linkDomain: dto.link_domain ?? dto.linkDomain ?? 'gymbios.app/ref',
      maxRewardsPerMember: dto.max_rewards_per_member ?? dto.maxRewardsPerMember,
      expiryDays: dto.expiry_days ?? dto.expiryDays ?? 90,
      minPurchaseAmount: dto.min_purchase_amount ?? dto.minPurchaseAmount,
    };
  }
}
