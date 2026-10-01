import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Share } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';

import { CurrencyValue, formatCurrency } from '@/core/providers';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { ScreenLayout } from '@/shared/layouts';
import { toast } from '@/shared/components/Toasts/toastStore';
import type { createUseRestoreSession } from '@/domains/auth/presentation/hooks/useAuthFlow';
import { usePromotions, usePromotionImpact } from '@/domains/promotions/hooks/usePromotions';
import type { PromotionCampaignResponse } from '@/domains/promotions/domain/PromotionCampaign';
import { useReferrals } from '@/domains/referrals/hooks/useReferrals';
import { useMembershipPlans } from '@/domains/membershipPlans';
import type { MembershipPlan } from '@/domains/membershipPlans';
import { formatCompactCurrency, formatCount } from '@/domains/dashboard/utils/adminDashboardFormat';

// Local yyyy-MM-dd, matching the date-only format the backend sends.
function todayIso(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

// The backend refreshes date-driven statuses on read, but a cached list can
// still outlive an end date (e.g. the app left open past midnight), so the
// badge is derived from the dates rather than trusted blindly.
function getEffectiveStatus(deal: PromotionCampaignResponse, today: string): string {
  const status = (deal.status || '').toLowerCase();
  if (status === 'draft' || status === 'paused') return status;
  if (deal.endDate && deal.endDate.slice(0, 10) < today) return 'expired';
  if (deal.startDate && deal.startDate.slice(0, 10) > today) return 'scheduled';
  return status;
}

// A plan's offer is live when the server says so for today and the plan itself
// is sellable. The end-date check covers a cached list that outlived midnight.
function isPlanOfferRunning(plan: MembershipPlan, today: string): boolean {
  if ((plan.status || '').toUpperCase() !== 'ACTIVE') return false;
  if (!plan.offerActive || !(plan.offerDiscountAmount > 0)) return false;
  return !plan.offerEndDate || plan.offerEndDate.slice(0, 10) >= today;
}

const STATUS_COLORS: Record<string, { bg: string; border: string; fg: string }> = {
  active: { bg: '#dcfce7', border: '#bbf7d0', fg: '#15803d' },
  scheduled: { bg: '#dbeafe', border: '#bfdbfe', fg: '#1d4ed8' },
  paused: { bg: '#fef3c7', border: '#fde68a', fg: '#b45309' },
  expired: { bg: '#fee2e2', border: '#fecaca', fg: '#b91c1c' },
  draft: { bg: '#f3f4f6', border: '#e5e7eb', fg: '#4b5563' },
};

export function createAdminDealsScreen(useRestoreSession: ReturnType<typeof createUseRestoreSession>) {
  return function AdminDealsScreen() {
    useRestoreSession();
    const router = useRouter();

    const { data: activePromotions, isLoading: isLoadingActive, error: activeError } = usePromotions('active');
    const { data: allPromotions, isLoading: isLoadingAll } = usePromotions();
    const { data: referralPage, isLoading: isLoadingReferrals, error: referralsError } = useReferrals();
    const { data: impact, isLoading: isLoadingImpact, error: impactError } = usePromotionImpact();
    const { plans, loading: isLoadingPlans, error: plansError } = useMembershipPlans();

    const handleCreateOffer = () => {
      router.push('/(admin)/promotions/create');
    };

    const today = todayIso();
    const activeDeals = (activePromotions || []).filter(
      (deal) => getEffectiveStatus(deal, today) === 'active',
    );
    const planOffers = plans.filter((plan) => isPlanOfferRunning(plan, today));
    const isLoadingOffers = isLoadingActive || (isLoadingPlans && plans.length === 0);
    const activeOfferCount = activeDeals.length + planOffers.length;

    const handleCopy = async (code: string) => {
      try {
        await Clipboard.setStringAsync(code);
        toast.success(`Promo code ${code} copied to clipboard.`);
      } catch {
        toast.error('Could not copy the promo code.');
      }
    };

    const handleShare = (deal: PromotionCampaignResponse, discountText: string) => {
      if (!deal.code) return;
      Share.share({
        message: `${deal.name}: use code ${deal.code} to get ${discountText}.`,
      }).catch(() => {});
    };
    const totalRedemptions = (allPromotions || []).reduce((sum, deal) => sum + (deal.usageCount || 0), 0);
    const referralsList = referralPage?.referrals || [];

    return (
      <ScreenLayout scrollable>
        <View style={styles.container}>
          {/* Header Stats */}
          <View style={styles.headerStatsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Active Offers</Text>
              <Text style={[styles.statValue, { color: BrandColors.teal }]}>
                {isLoadingOffers ? '-' : activeOfferCount}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Redemptions</Text>
              <Text style={[styles.statValue, { color: '#F5C742' }]}>
                {isLoadingAll ? '-' : totalRedemptions}
              </Text>
            </View>
          </View>

          {/* Active Deals Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Offers</Text>
              <TouchableOpacity onPress={() => router.push('/(admin)/promotions')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {isLoadingOffers ? (
              <ActivityIndicator size="small" color={BrandColors.teal} />
            ) : activeError && plansError ? (
              <Text style={{ color: 'red' }}>Failed to load offers.</Text>
            ) : activeOfferCount === 0 ? (
              <Text style={{ color: '#6b7280' }}>No active offers found.</Text>
            ) : (
              <View style={styles.dealsList}>
                {activeError ? (
                  <Text style={{ color: 'red' }}>Failed to load promo code offers.</Text>
                ) : null}
                {plansError ? (
                  <Text style={{ color: 'red' }}>Failed to load plan offers.</Text>
                ) : null}
                {planOffers.map((plan) => (
                  <TouchableOpacity
                    key={`plan-${plan.id}`}
                    style={styles.dealCard}
                    activeOpacity={0.8}
                    onPress={() => router.push(`/(admin)/membership-plans/edit/${plan.id}` as any)}>
                    <View style={styles.dealHeader}>
                      <View style={styles.dealHeaderInfo}>
                        <Text style={styles.dealTitle}>{plan.offerLabel || `${plan.name} Offer`}</Text>
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountText}>
                            {plan.offerType === 'percentage'
                              ? `${plan.offerValue}% OFF`
                              : <CurrencyValue amount={plan.offerDiscountAmount} suffix=" OFF" />}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: STATUS_COLORS.active.bg, borderColor: STATUS_COLORS.active.border },
                        ]}>
                        <Text style={[styles.statusText, { color: STATUS_COLORS.active.fg }]}>PLAN OFFER</Text>
                      </View>
                    </View>

                    <View style={styles.dealDetails}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Plan:</Text>
                        <Text style={styles.detailValue}>{plan.name}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Price:</Text>
                        <Text style={styles.detailValue}>
                          <Text style={styles.strikePrice}><CurrencyValue amount={plan.price} /></Text>
                          {'  '}
                          <CurrencyValue amount={plan.effectivePrice} />
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Valid Until:</Text>
                        <Text style={styles.detailValue}>
                          {plan.offerEndDate ? new Date(plan.offerEndDate).toLocaleDateString() : 'No Expiry'}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Applies:</Text>
                        <Text style={styles.detailValue}>Automatically, no code needed</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
                {activeDeals.map((deal) => {
                  // Plain text for the share message; the card itself shows the currency glyph.
                  const discountText = deal.discountType === 'percentage'
                    ? `${deal.discountValue}% OFF`
                    : `${formatCurrency(deal.discountValue)} OFF`;
                  const status = getEffectiveStatus(deal, today);
                  const statusColor = STATUS_COLORS[status] ?? STATUS_COLORS.draft;
                  const usageCount = deal.usageCount || 0;
                  const usagePercent = deal.usageLimit
                    ? Math.min((usageCount / deal.usageLimit) * 100, 100)
                    : 0;

                  return (
                    <View key={deal.id} style={styles.dealCard}>
                      {/* Deal Header */}
                      <View style={styles.dealHeader}>
                        <View style={styles.dealHeaderInfo}>
                          <Text style={styles.dealTitle}>{deal.name}</Text>
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>
                              {deal.discountType === 'percentage'
                                ? discountText
                                : <CurrencyValue amount={deal.discountValue} suffix=" OFF" />}
                            </Text>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: statusColor.bg, borderColor: statusColor.border },
                          ]}>
                          <Text style={[styles.statusText, { color: statusColor.fg }]}>
                            {status.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      {/* Code Box */}
                      <View style={styles.codeBox}>
                        <View style={styles.codeInfo}>
                          <Text style={styles.codeLabel}>Promo Code</Text>
                          <Text style={styles.codeValue}>{deal.code || 'N/A'}</Text>
                        </View>
                        <View style={styles.codeActions}>
                          <TouchableOpacity
                            style={styles.iconButton}
                            disabled={!deal.code}
                            onPress={() => deal.code && handleCopy(deal.code)}>
                            <Feather name="copy" size={16} color="#4b5563" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.iconButton, { backgroundColor: BrandColors.teal }]}
                            disabled={!deal.code}
                            onPress={() => handleShare(deal, discountText)}>
                            <Feather name="share-2" size={16} color="#ffffff" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Details */}
                      <View style={styles.dealDetails}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Valid Until:</Text>
                          <Text style={styles.detailValue}>
                            {deal.endDate ? new Date(deal.endDate).toLocaleDateString() : 'No Expiry'}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Branches:</Text>
                          <Text style={styles.detailValue}>{deal.branchName || 'Unknown Branch'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Usage:</Text>
                          <Text style={styles.detailValue}>
                            {usageCount} / {deal.usageLimit || '∞'}
                          </Text>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBarBg}>
                          <View style={[styles.progressBarFill, { width: `${usagePercent}%` }]} />
                        </View>
                        {!deal.usageLimit ? (
                          <Text style={styles.progressHint}>No usage limit set</Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Referral Codes Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Referral Codes</Text>
              <TouchableOpacity onPress={() => router.push('/(admin)/referrals')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            {isLoadingReferrals ? (
              <ActivityIndicator size="small" color={BrandColors.teal} />
            ) : referralsError ? (
              <Text style={{ color: 'red' }}>Failed to load referrals.</Text>
            ) : referralsList.length === 0 ? (
              <Text style={{ color: '#6b7280' }}>No referral codes found.</Text>
            ) : (
              <View style={styles.dealsList}>
                {referralsList.map((referral) => (
                  <View key={referral.id} style={styles.referralCard}>
                    <View style={styles.referralHeader}>
                      <Text style={styles.referralCode}>{referral.referralCode || 'N/A'}</Text>
                      <Text style={styles.referralOwner}>{referral.referrerName || 'Unknown'}</Text>
                    </View>
                    <View style={styles.referralMetrics}>
                      <View style={styles.referralMetricBox}>
                        <Text style={styles.referralMetricLabel}>Status</Text>
                        <Text style={styles.referralMetricValue}>
                          {referral.status ? referral.status.charAt(0).toUpperCase() + referral.status.slice(1) : 'Unknown'}
                        </Text>
                      </View>
                      <View style={styles.referralMetricBox}>
                        <Text style={styles.referralMetricLabel}>Date</Text>
                        <Text style={styles.referralMetricValue}>
                          {referral.date ? new Date(referral.date).toLocaleDateString() : 'N/A'}
                        </Text>
                      </View>
                      {referral.rewardAmount !== undefined && referral.rewardAmount !== null ? (
                        <View style={styles.referralMetricBox}>
                          <Text style={styles.referralMetricLabel}>Reward</Text>
                          <Text style={[styles.referralMetricValue, { color: '#16a34a' }]}>
                            <CurrencyValue amount={referral.rewardAmount} />
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Create New Deal */}
          <TouchableOpacity style={styles.createButton} onPress={handleCreateOffer}>
            <Feather name="plus" size={20} color="#ffffff" />
            <Text style={styles.createButtonText}>Create New Offer</Text>
          </TouchableOpacity>

          {/* Quick Stats */}
          <View style={styles.quickStatsCard}>
            <Text style={styles.quickStatsTitle}>{"This Month's Impact"}</Text>
            {isLoadingImpact ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : impactError ? (
              <Text style={styles.quickStatsError}>{"Failed to load this month's impact."}</Text>
            ) : (
              <View style={styles.quickStatsRow}>
                <View style={styles.quickStatBox}>
                  <Text style={styles.quickStatLabel}>Revenue from Deals</Text>
                  <Text style={styles.quickStatValue}>
                    {formatCompactCurrency(impact?.revenueFromDeals ?? 0)}
                  </Text>
                </View>
                <View style={styles.quickStatBox}>
                  <Text style={styles.quickStatLabel}>New Members</Text>
                  <Text style={styles.quickStatValue}>{formatCount(impact?.newMembers ?? 0)}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScreenLayout>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  headerStatsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: Spacing.four,
    borderRadius: Radius.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: Spacing.one,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  sectionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  viewAllText: {
    color: BrandColors.teal,
    fontSize: 13,
    fontWeight: '500',
  },
  dealsList: {
    gap: Spacing.three,
  },
  dealCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(50, 127, 116, 0.3)',
    borderRadius: Radius.md,
    padding: Spacing.four,
    backgroundColor: 'rgba(50, 127, 116, 0.02)',
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.three,
  },
  dealHeaderInfo: {
    flex: 1,
    marginRight: Spacing.two,
  },
  dealTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: Spacing.one,
  },
  discountBadge: {
    backgroundColor: '#F5C742',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
  },
  discountText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  statusText: {
    color: '#15803d',
    fontSize: 10,
    fontWeight: '600',
  },
  codeBox: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.sm,
    padding: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: Spacing.three,
  },
  codeInfo: {
    flex: 1,
  },
  codeLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  codeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  codeActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  iconButton: {
    padding: Spacing.two,
    backgroundColor: '#f3f4f6',
    borderRadius: Radius.sm,
  },
  dealDetails: {
    gap: Spacing.two,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#4b5563',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
  },
  strikePrice: {
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    fontWeight: '400',
  },
  progressContainer: {
    marginTop: Spacing.three,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: BrandColors.teal,
    borderRadius: 4,
  },
  progressHint: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: Spacing.one,
  },
  referralCard: {
    backgroundColor: 'rgba(245, 199, 66, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(245, 199, 66, 0.3)',
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  referralHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  referralCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  referralOwner: {
    fontSize: 12,
    color: '#4b5563',
  },
  referralMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  referralMetricBox: {
    flex: 1,
  },
  referralMetricLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  referralMetricValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.teal,
    paddingVertical: Spacing.four,
    borderRadius: Radius.md,
    gap: Spacing.two,
    shadowColor: BrandColors.teal,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  quickStatsCard: {
    backgroundColor: '#F5C742',
    borderRadius: Radius.md,
    padding: Spacing.four,
  },
  quickStatsTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.three,
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  quickStatBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: Spacing.three,
    borderRadius: Radius.sm,
  },
  quickStatLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    marginBottom: Spacing.one,
  },
  quickStatValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  quickStatsError: {
    color: '#ffffff',
    fontSize: 12,
  },
});
