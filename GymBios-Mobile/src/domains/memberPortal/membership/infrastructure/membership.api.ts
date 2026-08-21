import { apiClient } from '@/core/network/apiClient';
import { MemberMembershipState, MembershipPayment, AddOnCatalogResponse } from '../domain/models';

export const membershipApi = {
  getMemberMembership: async (): Promise<MemberMembershipState> => {
    const response = await apiClient.get<any>('/mobile/member/membership');
    return {
      membership: response.data.membership,
      benefits: response.data.benefits,
      freeze: {
        available: response.data.freeze.available,
        allowed_days: response.data.freeze.allowedDays || response.data.freeze.allowed_days,
        is_frozen: response.data.freeze.isFrozen || response.data.freeze.is_frozen || false,
        start_date: response.data.freeze.startDate || response.data.freeze.start_date,
        end_date: response.data.freeze.endDate || response.data.freeze.end_date,
      },
      renewal_offer: response.data.renewal_offer || response.data.renewalOffer,
    };
  },
  
  freezeMembership: async (durationDays: number, reason: string): Promise<any> => {
    const response = await apiClient.post<any>('/mobile/member/membership/freeze', {
      duration_days: durationDays,
      reason,
    });
    return response.data;
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
    }));
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
      plans: response.data.plans || [],
      pagination: {
        page: response.data.pagination?.page || 1,
        limit: response.data.pagination?.limit || 10,
        totalElements: response.data.pagination?.total_elements || 0,
        totalPages: response.data.pagination?.total_pages || 0,
      },
    };
  },

  previewMembershipChange: async (planId: number): Promise<any> => {
    const response = await apiClient.post<any>('/mobile/member/membership/change/preview', { plan_id: planId });
    return {
      selectedPlan: response.data.selected_plan,
      operation: response.data.operation,
      regularAmount: response.data.regular_amount,
      discountAmount: response.data.discount_amount,
      finalAmount: response.data.final_amount,
      features: response.data.features,
    };
  },

  changeMembershipPlan: async (request: any): Promise<any> => {
    const response = await apiClient.post<any>('/mobile/member/membership/change', {
      plan_id: request.planId,
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
