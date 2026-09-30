import { apiClient } from '@/core/network/apiClient';
import { DiscountCode } from '../domain/types';

// Wire format is snake_case (spring.jackson.property-naming-strategy=SNAKE_CASE on the backend).
interface DiscountCodeResponseDTO {
  source: 'PROMOTION' | 'COUPON';
  promotion_id: number | null;
  code: string;
  name: string;
  discount_type: 'percentage' | 'fixed' | 'free';
  discount_value: number;
  discount_amount: number | null;
}

function map(d: DiscountCodeResponseDTO): DiscountCode {
  return {
    source: d.source,
    promotionId: d.promotion_id,
    code: d.code,
    name: d.name,
    discountType: d.discount_type,
    discountValue: Number(d.discount_value ?? 0),
    discountAmount: d.discount_amount != null ? Number(d.discount_amount) : null,
  };
}

export const discountCodeApi = {
  /** A promotion or referral coupon code, checked in the signed-in member's own gym. */
  validate: async (code: string): Promise<DiscountCode> => {
    const response = await apiClient.get<DiscountCodeResponseDTO>('/discount-codes/validate', {
      params: { code },
      skipGlobalErrorToast: true, // the picker shows the reason inline
    });
    return map(response.data);
  },

  /**
   * Same, for a gym the user is about to join (no tenant on their session yet). With
   * `amount`, the server also prices the code on it (promotion caps/minimums included).
   */
  validateForCenter: async (
    tenantSlug: string,
    branchId: number | string,
    code: string,
    amount?: number,
  ): Promise<DiscountCode> => {
    const response = await apiClient.get<DiscountCodeResponseDTO>(
      `/mobile/discovery/centers/${tenantSlug}/${branchId}/discount-codes/validate`,
      { params: { code, amount }, skipGlobalErrorToast: true },
    );
    return map(response.data);
  },
};

/** Same maths as the backend's RewardRedemptionService.discountFor — percent or flat, capped at gross. */
export function rewardDiscount(unit: string | null | undefined, value: number | null | undefined, gross: number): number {
  if (!value || value <= 0 || gross <= 0) return 0;
  const d = unit === 'PERCENT' || unit === 'percentage' ? (gross * value) / 100 : value;
  return Math.round(Math.min(d, gross) * 100) / 100;
}
