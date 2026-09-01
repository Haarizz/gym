import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { ScreenLayout } from '@/shared/layouts';
import type { createUseRestoreSession } from '@/domains/auth/presentation/hooks/useAuthFlow';
import { usePromotions } from '@/domains/promotions/hooks/usePromotions';
import { useReferrals } from '@/domains/referrals/hooks/useReferrals';

interface AdminDealsScreenProps {
  useRestoreSession: ReturnType<typeof createUseRestoreSession>;
}

export function createAdminDealsScreen(useRestoreSession: ReturnType<typeof createUseRestoreSession>) {
  return function AdminDealsScreen() {
    const { logout, isLoggingOut } = useRestoreSession();
    const router = useRouter();

    const { data: activePromotions, isLoading: isLoadingActive, error: activeError } = usePromotions('active');
    const { data: allPromotions, isLoading: isLoadingAll } = usePromotions();
    const { data: referralPage, isLoading: isLoadingReferrals, error: referralsError } = useReferrals();

    const handleCreateOffer = () => {
      router.push('/(admin)/promotions/create');
    };

    const activeDeals = activePromotions || [];
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
                {isLoadingActive ? '-' : activeDeals.length}
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

            {isLoadingActive ? (
              <ActivityIndicator size="small" color={BrandColors.teal} />
            ) : activeError ? (
              <Text style={{ color: 'red' }}>Failed to load offers.</Text>
            ) : activeDeals.length === 0 ? (
              <Text style={{ color: '#6b7280' }}>No active offers found.</Text>
            ) : (
              <View style={styles.dealsList}>
                {activeDeals.map((deal) => {
                  const discountText = deal.discountType === 'percentage' 
                    ? `${deal.discountValue}% OFF` 
                    : `₹${deal.discountValue} OFF`;
                    
                  return (
                    <View key={deal.id} style={styles.dealCard}>
                      {/* Deal Header */}
                      <View style={styles.dealHeader}>
                        <View>
                          <Text style={styles.dealTitle}>{deal.name}</Text>
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>{discountText}</Text>
                          </View>
                        </View>
                        <View style={styles.statusBadge}>
                          <Text style={styles.statusText}>{deal.status.toUpperCase()}</Text>
                        </View>
                      </View>

                      {/* Code Box */}
                      <View style={styles.codeBox}>
                        <View style={styles.codeInfo}>
                          <Text style={styles.codeLabel}>Promo Code</Text>
                          <Text style={styles.codeValue}>{deal.code || 'N/A'}</Text>
                        </View>
                        <View style={styles.codeActions}>
                          <TouchableOpacity style={styles.iconButton}>
                            <Feather name="copy" size={16} color="#4b5563" />
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.iconButton, { backgroundColor: BrandColors.teal }]}>
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
                          {/* Gap identified: Branch data is not available on PromotionCampaignResponse */}
                          <Text style={[styles.detailValue, { color: '#ef4444', fontStyle: 'italic' }]}>
                            Pending Backend Data
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Usage:</Text>
                          <Text style={styles.detailValue}>
                            {deal.usageCount || 0} / {deal.usageLimit || '∞'}
                          </Text>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      {deal.usageLimit ? (
                        <View style={styles.progressContainer}>
                          <View style={styles.progressBarBg}>
                            <View
                              style={[
                                styles.progressBarFill,
                                { width: `${Math.min(((deal.usageCount || 0) / deal.usageLimit) * 100, 100)}%` },
                              ]}
                            />
                          </View>
                        </View>
                      ) : null}
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
                            ₹{referral.rewardAmount}
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
            <Text style={styles.quickStatsTitle}>This Month's Impact</Text>
            <View style={styles.pendingContainerDark}>
              <Feather name="clock" size={24} color="rgba(255, 255, 255, 0.7)" />
              <Text style={styles.pendingTextDark}>Pending Backend Support</Text>
              <Text style={styles.pendingSubtextDark}>
                Missing API capabilities:
                1. Revenue attributable to promotions/referrals scoped to the current month.
                2. New member conversions attributable to deals/referrals scoped to the current month.
              </Text>
            </View>
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
  pendingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    gap: Spacing.two,
    backgroundColor: '#f9fafb',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderStyle: 'dashed',
  },
  pendingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  pendingSubtext: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
  },
  pendingContainerDark: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.two,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: Radius.md,
  },
  pendingTextDark: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  pendingSubtextDark: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
  },
});
