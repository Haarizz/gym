import type { PromotionCampaignResponse } from '../../domain/PromotionCampaign';

export interface PromotionStatisticsData {
  totalPromotions: number;
  activePromotions: number;
  expiredPromotions: number;
  totalRedemptions: number;
  totalRevenue: number;
  totalSavings: number;
  conversionRate: number;
  growth: number;
}

export function calculatePromotionStatistics(
  promotions: PromotionCampaignResponse[],
): PromotionStatisticsData {
  const totalPromotions = promotions.length;
  const activePromotions = promotions.filter((p) => p.status === 'active').length;
  const expiredPromotions = promotions.filter((p) => p.status === 'expired').length;

  const totalRedemptions = promotions.reduce(
    (sum, p) => sum + (p.usageCount ?? 0),
    0,
  );
  const totalRevenue = promotions.reduce(
    (sum, p) => sum + (p.totalRevenue ?? 0),
    0,
  );
  const totalSavings = promotions.reduce(
    (sum, p) => sum + (p.totalSavings ?? 0),
    0,
  );

  const avgConversionRate =
    totalPromotions > 0
      ? promotions.reduce((sum, p) => sum + (p.conversionRate ?? 0), 0) /
        totalPromotions
      : 0;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonthCount = promotions.filter((p) => {
    const rawDate = p.createdDate ?? p.createdAt;
    if (!rawDate) return false;
    const d = new Date(rawDate);
    return !isNaN(d.getTime()) && d >= startOfMonth;
  }).length;

  const lastMonthCount = promotions.filter((p) => {
    const rawDate = p.createdDate ?? p.createdAt;
    if (!rawDate) return false;
    const d = new Date(rawDate);
    return !isNaN(d.getTime()) && d >= startOfLastMonth && d < startOfMonth;
  }).length;

  const growth =
    lastMonthCount > 0
      ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)
      : thisMonthCount > 0
        ? 100
        : 0;

  return {
    totalPromotions,
    activePromotions,
    expiredPromotions,
    totalRedemptions,
    totalRevenue,
    totalSavings,
    conversionRate: Number(avgConversionRate.toFixed(1)),
    growth,
  };
}

export function formatDiscountDisplay(
  discountType?: string | null,
  discountValue?: number | null,
): string {
  const val = discountValue ?? 0;
  if (discountType === 'percentage') {
    return `${val}% OFF`;
  }
  if (discountType === 'fixed') {
    return `$${val} OFF`;
  }
  return val > 0 ? `${val} OFF` : 'SPECIAL OFFER';
}
