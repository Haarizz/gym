import { apiClient } from '@/core/network/apiClient';
import { MemberMembershipState, MembershipPayment, AddOnCatalogResponse, MobileReceiptDetail, FreezeMembershipResult, MobileMembershipPlan } from '../domain/models';

// Snake_case plan from /mobile/member/membership/plans and the change preview.
function mapPlan(plan: any): MobileMembershipPlan {
  return {
    ...plan,
    planType: plan.plan_type,
    discount: Number(plan.discount ?? 0),
    offerLabel: plan.offer_label ?? null,
    effectivePrice: Number(plan.effective_price ?? plan.price ?? 0),
  };
}

export const membershipApi = {
  getMemberMembership: async (): Promise<MemberMembershipState> => {
    const response = await apiClient.get<any>('/mobile/member/membership');
    return {
      membership: response.data.membership,
      benefits: response.data.benefits,
      freeze: {
        available: response.data.freeze.available,
        allowed_days: response.data.freeze.allowedDays || response.data.freeze.allowed_days || 0,
        is_frozen: response.data.freeze.isFrozen || response.data.freeze.is_frozen || false,
        start_date: response.data.freeze.startDate || response.data.freeze.start_date,
        end_date: response.data.freeze.endDate || response.data.freeze.end_date,
        max_days: response.data.freeze.max_days ?? 0,
        used_days: response.data.freeze.used_days ?? 0,
        max_occurrences: response.data.freeze.max_occurrences ?? null,
        used_occurrences: response.data.freeze.used_occurrences ?? 0,
        remaining_occurrences: response.data.freeze.remaining_occurrences ?? null,
        free_days_remaining: response.data.freeze.free_days_remaining ?? 0,
        charge_per_extra_day: Number(response.data.freeze.charge_per_extra_day ?? 0),
        currency_symbol: response.data.freeze.currency_symbol ?? null,
        auto_unfreeze: response.data.freeze.auto_unfreeze ?? false,
        unavailable_reason: response.data.freeze.unavailable_reason ?? null,
        unavailable_message: response.data.freeze.unavailable_message ?? null,
      },
      renewal_offer: response.data.renewal_offer || response.data.renewalOffer,
    };
  },
  
  freezeMembership: async (durationDays: number, reason: string): Promise<FreezeMembershipResult> => {
    const response = await apiClient.post<any>('/mobile/member/membership/freeze', {
      duration_days: durationDays,
      reason,
    });
    return {
      freezeEnd: response.data.freeze_end,
      days: response.data.days ?? durationDays,
      freeDaysApplied: response.data.free_days_applied ?? 0,
      chargedDays: response.data.charged_days ?? 0,
      chargeAmount: Number(response.data.charge_amount ?? 0),
    };
  },

  unfreezeMembership: async (): Promise<any> => {
    const response = await apiClient.post<any>('/mobile/member/membership/unfreeze');
    return response.data;
  },
  
  getMembershipPayments: async (): Promise<MembershipPayment[]> => {
    const response = await apiClient.get<any[]>('/mobile/member/membership/payments');
    // Map snake_case response to camelCase model
    return response.data.map((item) => ({
      id: item.id,
      receiptNo: item.receipt_no,
      transactionDate: item.transaction_date,
      transactionType: item.transaction_type,
      amount: item.amount,
      paidAmount: item.paid_amount,
      paymentMethod: item.payment_method,
      status: item.status,
      discountAmount: item.discount_amount,
      discountLabel: item.discount_label,
    }));
  },

  getMemberReceipt: async (receiptId: number): Promise<MobileReceiptDetail> => {
    const response = await apiClient.get<any>(`/mobile/member/receipts/${receiptId}`);
    return {
      id: response.data.id,
      receiptNo: response.data.receipt_no,
      transactionDate: response.data.transaction_date,
      transactionType: response.data.transaction_type,
      amount: response.data.amount,
      paidAmount: response.data.paid_amount,
      dueAmount: response.data.due_amount,
      paymentMethod: response.data.payment_method,
      status: response.data.status,
      planName: response.data.plan_name,
      validFrom: response.data.valid_from,
      validTill: response.data.valid_till,
      processedBy: response.data.processed_by,
      memberName: response.data.member_name,
      memberId: response.data.member_id,
      memberPhone: response.data.member_phone,
      membershipType: response.data.membership_type,
      remarks: response.data.remarks,
      discountAmount: response.data.discount_amount,
      discountLabel: response.data.discount_label,
    };
  },
  
  getMemberAddOns: async (page: number = 1, limit: number = 10): Promise<AddOnCatalogResponse> => {
    const response = await apiClient.get<any>('/mobile/member/add-ons', {
      params: { page, limit },
    });
    // Map snake_case to camelCase
    return {
      available: response.data.available?.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        currency: item.currency,
        pricingUnit: item.pricingUnit || item.pricing_unit,
      })) || [],
      pagination: {
        page: response.data.pagination?.page || 1,
        limit: response.data.pagination?.limit || 10,
        totalElements: response.data.pagination?.totalElements || response.data.pagination?.total_elements || 0,
        totalPages: response.data.pagination?.totalPages || response.data.pagination?.total_pages || 0,
      },
      active: response.data.active?.map((item: any) => ({
        id: item.id,
        addonName: item.addonName || item.addon_name,
        category: item.category,
        expiryDate: item.expiryDate || item.expiry_date,
        status: item.status,
      })) || [],
    };
  },

  purchaseAddOn: async (addonId: number, request: any): Promise<any> => {
    // request matches PaymentResult but tailored for the backend
    const response = await apiClient.post<any>(`/mobile/member/add-ons/${addonId}/purchase`, request);
    return response.data;
  },

  getMembershipPlans: async (page: number = 1, limit: number = 10, search?: string): Promise<any> => {
    const response = await apiClient.get<any>('/mobile/member/membership/plans', {
      params: { page, limit, search },
    });
    return {
      plans: (response.data.plans || []).map(mapPlan),
      pagination: {
        page: response.data.pagination?.page || 1,
        limit: response.data.pagination?.limit || 10,
        totalElements: response.data.pagination?.total_elements || 0,
        totalPages: response.data.pagination?.total_pages || 0,
      },
    };
  },

  previewMembershipChange: async (
    planId: number,
    reward?: { rewardPassId?: number; couponCode?: string },
  ): Promise<any> => {
    const withReward = !!(reward?.rewardPassId || reward?.couponCode);
    const response = await apiClient.post<any>('/mobile/member/membership/change/preview', {
      plan_id: planId,
      reward_pass_id: reward?.rewardPassId,
      coupon_code: reward?.couponCode,
    }, {
      // A rejected pass/coupon is reported (and dropped) by the renew modal itself.
      skipGlobalErrorToast: withReward,
    });
    return {
      selectedPlan: mapPlan(response.data.selected_plan),
      operation: response.data.operation,
      regularAmount: response.data.regular_amount,
      discountAmount: response.data.discount_amount,
      offerLabel: response.data.offer_label ?? null,
      rewardDiscountAmount: response.data.reward_discount_amount ?? 0,
      finalAmount: response.data.final_amount,
      features: response.data.features,
    };
  },

  changeMembershipPlan: async (request: any): Promise<any> => {
    const response = await apiClient.post<any>('/mobile/member/membership/change', {
      plan_id: request.planId,
      reward_pass_id: request.rewardPassId,
      coupon_code: request.couponCode,
      payment_method_used: request.paymentMethodUsed,
      payment_breakdown: request.paymentBreakdown?.map((split: any) => ({
        method: split.method,
        amount: split.amount,
        reference: split.reference,
        card_type: split.cardType,
        cheque_number: split.chequeNumber,
        cheque_date: split.chequeDate,
        bank_name: split.bankName,
        bank_account_code: split.bankAccountCode,
        bank_account_name: split.bankAccountName,
        online_payment_type: split.onlinePaymentType,
        provider_name: split.providerName,
      })),
    });
    return response.data;
  },
};
