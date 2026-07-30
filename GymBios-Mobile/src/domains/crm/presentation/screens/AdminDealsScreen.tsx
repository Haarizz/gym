import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { ScreenLayout } from '@/shared/layouts';
import type { createUseRestoreSession } from '@/domains/auth/presentation/hooks/useAuthFlow';

interface AdminDealsScreenProps {
  useRestoreSession: ReturnType<typeof createUseRestoreSession>;
}

export function createAdminDealsScreen(useRestoreSession: ReturnType<typeof createUseRestoreSession>) {
  return function AdminDealsScreen() {
    const { logout, isLoggingOut } = useRestoreSession();

    const activeDeals = [
      {
        title: 'Summer Special',
        discount: '30% OFF',
        code: 'SUMMER30',
        validUntil: '2026-04-30',
        branches: ['All Branches'],
        usageCount: 45,
        usageLimit: 100,
        status: 'active',
      },
      {
        title: 'Student Discount',
        discount: '₹500 OFF',
        code: 'STUDENT500',
        validUntil: '2026-12-31',
        branches: ['Branch 1', 'Branch 2'],
        usageCount: 28,
        usageLimit: 50,
        status: 'active',
      },
    ];

    const referralCodes = [
      {
        code: 'REF2024A',
        owner: 'Rahul Sharma',
        discount: '₹1000',
        uses: 12,
        revenue: '₹24,000',
      },
      {
        code: 'FRIEND10',
        owner: 'Priya Patel',
        discount: '10%',
        uses: 8,
        revenue: '₹16,800',
      },
    ];

    return (
      <ScreenLayout scrollable>
        <View style={styles.container}>
          {/* Header Stats */}
          <View style={styles.headerStatsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Active Offers</Text>
              <Text style={[styles.statValue, { color: BrandColors.teal }]}>5</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Redemptions</Text>
              <Text style={[styles.statValue, { color: '#F5C742' }]}>156</Text>
            </View>
          </View>

          {/* Active Deals Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Offers</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dealsList}>
              {activeDeals.map((deal, index) => (
                <View key={index} style={styles.dealCard}>
                  {/* Deal Header */}
                  <View style={styles.dealHeader}>
                    <View>
                      <Text style={styles.dealTitle}>{deal.title}</Text>
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{deal.discount}</Text>
                      </View>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>ACTIVE</Text>
                    </View>
                  </View>

                  {/* Code Box */}
                  <View style={styles.codeBox}>
                    <View style={styles.codeInfo}>
                      <Text style={styles.codeLabel}>Promo Code</Text>
                      <Text style={styles.codeValue}>{deal.code}</Text>
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
                      <Text style={styles.detailValue}>{new Date(deal.validUntil).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Branches:</Text>
                      <Text style={styles.detailValue}>{deal.branches.join(', ')}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Usage:</Text>
                      <Text style={styles.detailValue}>
                        {deal.usageCount} / {deal.usageLimit}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${(deal.usageCount / deal.usageLimit) * 100}%` },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Referral Codes Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Referral Codes</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dealsList}>
              {referralCodes.map((referral, index) => (
                <View key={index} style={styles.referralCard}>
                  <View style={styles.referralHeader}>
                    <Text style={styles.referralCode}>{referral.code}</Text>
                    <Text style={styles.referralOwner}>{referral.owner}</Text>
                  </View>
                  <View style={styles.referralMetrics}>
                    <View style={styles.referralMetricBox}>
                      <Text style={styles.referralMetricLabel}>Discount</Text>
                      <Text style={styles.referralMetricValue}>{referral.discount}</Text>
                    </View>
                    <View style={styles.referralMetricBox}>
                      <Text style={styles.referralMetricLabel}>Uses</Text>
                      <Text style={styles.referralMetricValue}>{referral.uses}</Text>
                    </View>
                    <View style={styles.referralMetricBox}>
                      <Text style={styles.referralMetricLabel}>Revenue</Text>
                      <Text style={[styles.referralMetricValue, { color: '#16a34a' }]}>{referral.revenue}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Create New Deal */}
          <TouchableOpacity style={styles.createButton}>
            <Feather name="plus" size={20} color="#ffffff" />
            <Text style={styles.createButtonText}>Create New Offer</Text>
          </TouchableOpacity>

          {/* Quick Stats */}
          <View style={styles.quickStatsCard}>
            <Text style={styles.quickStatsTitle}>This Month's Impact</Text>
            <View style={styles.quickStatsRow}>
              <View style={styles.quickStatBox}>
                <Text style={styles.quickStatLabel}>Revenue from Deals</Text>
                <Text style={styles.quickStatValue}>₹3.2L</Text>
              </View>
              <View style={styles.quickStatBox}>
                <Text style={styles.quickStatLabel}>New Members</Text>
                <Text style={styles.quickStatValue}>87</Text>
              </View>
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
});
