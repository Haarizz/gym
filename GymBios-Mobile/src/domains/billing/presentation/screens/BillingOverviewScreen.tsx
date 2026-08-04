import React, { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BottomTabInset, BrandColors, Radius, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { Typography } from '@/shared/components/Typography';

import {
  useBillingStats,
  useMemberDues,
  useReceipts,
} from '../../hooks/useBills';
import type { Receipt } from '../../domain/Receipt';
import type { MemberDue } from '../../domain/MemberDue';
import {
  BillingSection,
  BillingSkeleton,
  BillingSummaryCard,
  ErrorState,
  MemberDueCard,
  ReceiptCard,
} from '../components';

interface BillingOverviewScreenProps {
  onNavigateToReceipts: () => void;
  onNavigateToReceipt: (receiptId: string) => void;
  onNavigateToDues: () => void;
  onNavigateToMemberStatements: () => void;
  onNavigateToMemberStatement: (memberId: number, memberName?: string) => void;
  onNavigateToCollectionReports: () => void;
  onNavigateToCreateReceipt?: () => void;
}

/**
 * Billing Overview — mobile-first hub for the Billing module.
 *
 * Renders:
 *  1. Primary CTA banner for "+ Create Receipt"
 *  2. Top summary stat cards (Monthly Collection, Outstanding, Overdue, Collection Rate)
 *  3. 4 Feature Cards with previews & quick navigation (Receipt Management, Outstanding Dues, Member Statements, Collection Reports)
 */
export function BillingOverviewScreen({
  onNavigateToReceipts,
  onNavigateToReceipt,
  onNavigateToDues,
  onNavigateToMemberStatements,
  onNavigateToMemberStatement,
  onNavigateToCollectionReports,
  onNavigateToCreateReceipt,
}: BillingOverviewScreenProps) {
  const { stats, loading: statsLoading, error: statsError, refresh: refreshStats } = useBillingStats();
  const { receipts, loading: receiptsLoading, error: receiptsError, refresh: refreshReceipts } = useReceipts({ limit: 3, page: 1 });
  const { dues, loading: duesLoading, error: duesError, refresh: refreshDues } = useMemberDues();

  const isLoading = statsLoading && receiptsLoading && duesLoading;
  const isRefreshing = (statsLoading || receiptsLoading || duesLoading) && !isLoading;

  const handleRefresh = useCallback(() => {
    refreshStats();
    refreshReceipts();
    refreshDues();
  }, [refreshStats, refreshReceipts, refreshDues]);

  const handleReceiptPress = useCallback(
    (receipt: Receipt) => {
      onNavigateToReceipt(receipt.id);
    },
    [onNavigateToReceipt],
  );

  const handleDuePress = useCallback(
    (due: MemberDue) => {
      onNavigateToMemberStatement(due.id, due.memberName);
    },
    [onNavigateToMemberStatement],
  );

  if (isLoading) {
    return (
      <ScreenLayout>
        <AppHeader
          title="Billing Hub"
          subtitle="Financial Overview & Workflows"
          colors={['#327f74', '#2a6b62']}
        />
        <BillingSkeleton variant="overview" count={4} />
      </ScreenLayout>
    );
  }

  if (statsError && receiptsError && duesError) {
    return (
      <ScreenLayout>
        <AppHeader
          title="Billing Hub"
          subtitle="Financial Overview & Workflows"
          colors={['#327f74', '#2a6b62']}
        />
        <ErrorState message="Failed to load billing data." onRetry={handleRefresh} />
      </ScreenLayout>
    );
  }

  const latestReceiptsPreview = receipts.slice(0, 2);
  const latestDuesPreview = dues.slice(0, 2);

  return (
    <ScreenLayout>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={BrandColors.teal}
          />
        }
      >
        {/* ── Primary Action: Create Receipt Hero Banner ─────────── */}
        <View style={styles.heroBanner}>
          <View style={styles.heroTextGroup}>
            <Typography variant="bodySmallBold" style={styles.heroTitle}>
              Collect Member Payment
            </Typography>
            <Typography variant="caption" style={styles.heroSubtitle}>
              Search member, select pending bills, and generate receipt.
            </Typography>
          </View>

          <Pressable
            onPress={onNavigateToCreateReceipt}
            style={styles.createReceiptBtn}
            accessibilityRole="button"
          >
            <Feather name="plus-circle" size={16} color="#ffffff" />
            <Typography variant="bodySmallBold" style={styles.createReceiptText}>
              Create Receipt
            </Typography>
          </Pressable>
        </View>

        {/* ── Top Summary Cards ───────────────────────────────────── */}
        <BillingSection title="Financial Overview">
          <View style={styles.statsRow}>
            <BillingSummaryCard
              label="Collection"
              value={stats?.monthlyCollection ?? 0}
              iconName="trending-up"
              iconBg={BrandColors.teal}
            />
            <BillingSummaryCard
              label="Outstanding"
              value={stats?.overdueAmount ?? 0}
              iconName="alert-circle"
              iconBg="#f59e0b"
              valueColor={(stats?.overdueAmount ?? 0) > 0 ? '#b45309' : undefined}
            />
          </View>
          <View style={styles.statsRow}>
            <BillingSummaryCard
              label="Overdue Members"
              value={stats?.overdueCount ?? 0}
              iconName="users"
              iconBg="#ef4444"
              isPercent={false}
            />
            <BillingSummaryCard
              label="Collection Rate"
              value={stats?.collectionRate ?? 0}
              iconName="percent"
              iconBg="#8b5cf6"
              isPercent
              valueColor={(stats?.collectionRate ?? 0) >= 80 ? '#16a34a' : '#b45309'}
            />
          </View>
        </BillingSection>

        {/* ── Feature Cards Hub ───────────────────────────────────── */}

        {/* 1. Receipt Management Feature Card */}
        <View style={styles.featureCard}>
          <View style={styles.featureHeader}>
            <View style={styles.featureTitleGroup}>
              <View style={[styles.featureIconContainer, { backgroundColor: '#e0f2fe' }]}>
                <Feather name="file-text" size={18} color="#0284c7" />
              </View>
              <View>
                <Typography variant="bodySmallBold" style={styles.featureTitle}>
                  Receipt Management
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Transaction history & receipt verification
                </Typography>
              </View>
            </View>
            <Pressable
              onPress={onNavigateToReceipts}
              style={styles.viewAllBtn}
              accessibilityRole="button"
            >
              <Typography variant="caption" style={styles.viewAllText}>
                View All
              </Typography>
              <Feather name="arrow-right" size={14} color={BrandColors.teal} />
            </Pressable>
          </View>

          {/* Preview snippet */}
          {latestReceiptsPreview.length > 0 && (
            <View style={styles.previewList}>
              {latestReceiptsPreview.map((receipt) => (
                <ReceiptCard
                  key={receipt.id}
                  receipt={receipt}
                  onPress={handleReceiptPress}
                />
              ))}
            </View>
          )}
        </View>

        {/* 2. Outstanding Dues Feature Card */}
        <View style={styles.featureCard}>
          <View style={styles.featureHeader}>
            <View style={styles.featureTitleGroup}>
              <View style={[styles.featureIconContainer, { backgroundColor: '#fee2e2' }]}>
                <Feather name="alert-triangle" size={18} color="#dc2626" />
              </View>
              <View>
                <Typography variant="bodySmallBold" style={styles.featureTitle}>
                  Outstanding Dues
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {dues.length} member{dues.length !== 1 ? 's' : ''} with pending payments
                </Typography>
              </View>
            </View>
            <Pressable
              onPress={onNavigateToDues}
              style={styles.viewAllBtn}
              accessibilityRole="button"
            >
              <Typography variant="caption" style={styles.viewAllText}>
                View All
              </Typography>
              <Feather name="arrow-right" size={14} color={BrandColors.teal} />
            </Pressable>
          </View>

          {/* Preview snippet */}
          {latestDuesPreview.length > 0 && (
            <View style={styles.previewList}>
              {latestDuesPreview.map((due) => (
                <MemberDueCard
                  key={due.id}
                  due={due}
                  onPress={handleDuePress}
                />
              ))}
            </View>
          )}
        </View>

        {/* 3. Member Statements Feature Card */}
        <View style={styles.featureCard}>
          <View style={styles.featureHeader}>
            <View style={styles.featureTitleGroup}>
              <View style={[styles.featureIconContainer, { backgroundColor: '#fef3c7' }]}>
                <Feather name="book-open" size={18} color="#d97706" />
              </View>
              <View>
                <Typography variant="bodySmallBold" style={styles.featureTitle}>
                  Member Statements
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Generate & view running balances & timeline
                </Typography>
              </View>
            </View>
            <Pressable
              onPress={onNavigateToMemberStatements}
              style={styles.viewAllBtn}
              accessibilityRole="button"
            >
              <Typography variant="caption" style={styles.viewAllText}>
                Open
              </Typography>
              <Feather name="arrow-right" size={14} color={BrandColors.teal} />
            </Pressable>
          </View>
        </View>

        {/* 4. Collection Reports Feature Card */}
        <View style={styles.featureCard}>
          <View style={styles.featureHeader}>
            <View style={styles.featureTitleGroup}>
              <View style={[styles.featureIconContainer, { backgroundColor: '#f3e8ff' }]}>
                <Feather name="bar-chart-2" size={18} color="#9333ea" />
              </View>
              <View>
                <Typography variant="bodySmallBold" style={styles.featureTitle}>
                  Collection Reports
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Daily, monthly, custom analytics & exports
                </Typography>
              </View>
            </View>
            <Pressable
              onPress={onNavigateToCollectionReports}
              style={styles.viewAllBtn}
              accessibilityRole="button"
            >
              <Typography variant="caption" style={styles.viewAllText}>
                Open
              </Typography>
              <Feather name="arrow-right" size={14} color={BrandColors.teal} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BrandColors.teal,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: BrandColors.teal,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  heroTextGroup: {
    flex: 1,
    gap: 2,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 15,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
  },
  createReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  createReceiptText: {
    color: '#ffffff',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  featureCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featureTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 14,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.screenBackgroundAlt,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
    borderRadius: Radius.full,
  },
  viewAllText: {
    color: BrandColors.teal,
    fontWeight: '700',
  },
  previewList: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
