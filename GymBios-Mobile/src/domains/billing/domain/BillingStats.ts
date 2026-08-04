/**
 * One month's collection data point for the billing chart.
 * Mirrors backend BillingStatsDTO.MonthlyData.
 */
export interface MonthlyCollectionData {
  month: string;
  collected: number;
  target: number;
}

/**
 * Dashboard summary stats for the Billing module.
 * Mirrors backend BillingStatsDTO.
 */
export interface BillingStats {
  monthlyCollection: number;
  monthlyTarget: number;
  overdueCount: number;
  overdueAmount: number;
  dueSoonCount: number;
  collectionRate: number;
  monthlyData: MonthlyCollectionData[];
  paymentMethodBreakdown: Record<string, number>;
}