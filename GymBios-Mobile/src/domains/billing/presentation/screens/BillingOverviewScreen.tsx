import React, { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout, useTabBarBottomInset } from '@/shared/layouts/ScreenLayout';
import { Typography } from '@/shared/components/Typography';

import {
  useBillingStats,
  useMemberDues,
  useReceipts,
} from '../../hooks/useBills';
import type { Receipt } from '../../domain/Receipt';
import type { MemberDue } from '../../domain/MemberDue';
import { DueStatus } from '../../domain/MemberDue';
import {
  BillingSection,
  BillingSkeleton,
  BillingSummaryCard,
  ErrorState,
  MoneyText,
  PaymentStatusBadge,
} from '../components';
import { getIntlLocale } from '@/core/i18n/format';

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
 *  1. Collect-payment banner with a full-width "+ Create Receipt" button
 *  2. 2×2 summary tiles (Collection, Outstanding, Overdue Members, Collection Rate)
 *  3. Receipts and Outstanding Dues cards with compact preview rows
 *  4. One card linking to Member Statements and Collection Reports
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
  const { t } = useTranslation();
  const bottomInset = useTabBarBottomInset() + Spacing.six;
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
          title={t('billing.overview.title')}
          subtitle={t('billing.overview.subtitle')}
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
          title={t('billing.overview.title')}
          subtitle={t('billing.overview.subtitle')}
          colors={['#327f74', '#2a6b62']}
        />
        <ErrorState message={t('common.error')} onRetry={handleRefresh} />
      </ScreenLayout>
    );
  }

  const latestReceiptsPreview = receipts.slice(0, 3);
  const latestDuesPreview = dues.slice(0, 3);
  const overdue = stats?.overdueAmount ?? 0;
  const rate = stats?.collectionRate ?? 0;

  return (
    <ScreenLayout>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={BrandColors.teal}
          />
        }
      >
        {/* ── Primary action: Collect payment ─────────────────────── */}
        <View style={styles.heroBanner}>
          <View style={styles.heroTextGroup}>
            <Typography variant="bodySmallBold" style={styles.heroTitle}>
              {t('billing.overview.collectPaymentTitle')}
            </Typography>
            <Typography variant="caption" style={styles.heroSubtitle}>
              {t('billing.overview.collectPaymentDesc')}
            </Typography>
          </View>

          <Pressable
            onPress={onNavigateToCreateReceipt}
            style={({ pressed }) => [styles.createReceiptBtn, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Feather name="plus-circle" size={16} color={BrandColors.teal} />
            <Typography variant="bodySmallBold" style={styles.createReceiptText}>
              {t('billing.overview.createReceipt')}
            </Typography>
          </Pressable>
        </View>

        {/* ── Summary stats (2×2) ─────────────────────────────────── */}
        <BillingSection title={t('billing.overview.financialOverview')}>
          <View style={styles.statsRow}>
            <BillingSummaryCard
              label={t('billing.overview.collection')}
              value={stats?.monthlyCollection ?? 0}
              iconName="trending-up"
              iconBg={BrandColors.teal}
            />
            <BillingSummaryCard
              label={t('billing.overview.outstanding')}
              value={overdue}
              iconName="alert-circle"
              iconBg="#f59e0b"
              valueColor={overdue > 0 ? '#b45309' : undefined}
            />
          </View>
          <View style={styles.statsRow}>
            <BillingSummaryCard
              label={t('billing.overview.overdueMembers')}
              value={stats?.overdueCount ?? 0}
              iconName="users"
              iconBg="#ef4444"
              format="count"
            />
            <BillingSummaryCard
              label={t('billing.overview.collectionRate')}
              value={rate}
              iconName="percent"
              iconBg="#8b5cf6"
              format="percent"
              valueColor={rate >= 80 ? '#16a34a' : '#b45309'}
            />
          </View>
        </BillingSection>

        {/* ── Receipts with latest preview ────────────────────────── */}
        <View style={styles.featureCard}>
          <FeatureHeader
            icon="file-text"
            iconColor="#0284c7"
            iconBg="#e0f2fe"
            title={t('billing.overview.receiptManagementTitle')}
            description={t('billing.overview.receiptManagementDesc')}
            actionLabel={t('billing.overview.viewAll')}
            onPress={onNavigateToReceipts}
          />
          {latestReceiptsPreview.length > 0 && (
            <View style={styles.previewList}>
              {latestReceiptsPreview.map((receipt) => (
                <PreviewRow
                  key={receipt.id}
                  initial={receipt.memberName}
                  title={receipt.memberName ?? '—'}
                  subtitle={`${receipt.receiptNo ?? `#${receipt.id}`} · ${formatShortDate(receipt.transactionDate)}`}
                  onPress={() => handleReceiptPress(receipt)}
                  right={
                    <>
                      <MoneyText amount={receipt.amount} variant="bodySmallBold" color={BrandColors.teal} numberOfLines={1} />
                      <PaymentStatusBadge status={receipt.status} />
                    </>
                  }
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Outstanding dues with preview ───────────────────────── */}
        <View style={styles.featureCard}>
          <FeatureHeader
            icon="alert-triangle"
            iconColor="#dc2626"
            iconBg="#fee2e2"
            title={t('billing.overview.outstandingDuesTitle')}
            description={t('billing.overview.outstandingDuesDesc', { count: dues.length })}
            actionLabel={t('billing.overview.viewAll')}
            onPress={onNavigateToDues}
          />
          {latestDuesPreview.length > 0 && (
            <View style={styles.previewList}>
              {latestDuesPreview.map((due) => {
                const isOverdue = due.status === DueStatus.Overdue || due.daysOverdue > 0;
                return (
                  <PreviewRow
                    key={due.id}
                    initial={due.memberName}
                    danger={isOverdue}
                    title={due.memberName ?? '—'}
                    subtitle={`${t('billing.cards.due')} ${formatShortDate(due.dueDate)}`}
                    onPress={() => handleDuePress(due)}
                    right={
                      <>
                        <MoneyText
                          amount={due.amount}
                          variant="bodySmallBold"
                          color={isOverdue ? '#b91c1c' : BrandColors.teal}
                          numberOfLines={1}
                        />
                        <Typography
                          variant="caption"
                          style={[styles.dueChip, isOverdue ? styles.dueChipOverdue : styles.dueChipSoon]}
                          numberOfLines={1}
                        >
                          {isOverdue
                            ? t('billing.cards.overdueDays', { count: due.daysOverdue })
                            : t('billing.cards.dueSoon')}
                        </Typography>
                      </>
                    }
                  />
                );
              })}
            </View>
          )}
        </View>

        {/* ── Statements & reports (navigation only) ─────────────── */}
        <View style={[styles.featureCard, styles.linksCard]}>
          <Pressable
            onPress={onNavigateToMemberStatements}
            style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <FeatureTitle
              icon="book-open"
              iconColor="#d97706"
              iconBg="#fef3c7"
              title={t('billing.overview.memberStatementsTitle')}
              description={t('billing.overview.memberStatementsDesc')}
            />
            <Feather name="chevron-right" size={18} color={BrandColors.textSecondary} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            onPress={onNavigateToCollectionReports}
            style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <FeatureTitle
              icon="bar-chart-2"
              iconColor="#9333ea"
              iconBg="#f3e8ff"
              title={t('billing.overview.collectionReportsTitle')}
              description={t('billing.overview.collectionReportsDesc')}
            />
            <Feather name="chevron-right" size={18} color={BrandColors.textSecondary} />
          </Pressable>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

// ── Local building blocks ──────────────────────────────────────────────────

function formatShortDate(dateStr?: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(getIntlLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
}

interface FeatureTitleProps {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
}

function FeatureTitle({ icon, iconColor, iconBg, title, description }: FeatureTitleProps) {
  return (
    <View style={styles.featureTitleGroup}>
      <View style={[styles.featureIconContainer, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.featureText}>
        <Typography variant="bodySmallBold" style={styles.featureTitle} numberOfLines={1}>
          {title}
        </Typography>
        <Typography variant="caption" color="textSecondary" numberOfLines={2}>
          {description}
        </Typography>
      </View>
    </View>
  );
}

function FeatureHeader({
  actionLabel,
  onPress,
  ...titleProps
}: FeatureTitleProps & { actionLabel: string; onPress: () => void }) {
  return (
    <View style={styles.featureHeader}>
      <FeatureTitle {...titleProps} />
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.viewAllBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        hitSlop={8}
      >
        <Typography variant="caption" style={styles.viewAllText}>
          {actionLabel}
        </Typography>
        <Feather name="arrow-right" size={13} color={BrandColors.teal} />
      </Pressable>
    </View>
  );
}

interface PreviewRowProps {
  initial?: string;
  title: string;
  subtitle: string;
  right: React.ReactNode;
  danger?: boolean;
  onPress: () => void;
}

function PreviewRow({ initial, title, subtitle, right, danger, onPress }: PreviewRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.previewRow, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={[styles.avatar, danger && styles.avatarDanger]}>
        <Typography variant="caption" style={[styles.avatarText, danger && styles.avatarTextDanger]}>
          {(initial ?? 'M').charAt(0).toUpperCase()}
        </Typography>
      </View>
      <View style={styles.previewText}>
        <Typography variant="bodySmall" style={styles.previewTitle} numberOfLines={1}>
          {title}
        </Typography>
        <Typography variant="caption" color="textSecondary" numberOfLines={1}>
          {subtitle}
        </Typography>
      </View>
      <View style={styles.previewRight}>{right}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  pressed: {
    opacity: 0.75,
  },
  heroBanner: {
    backgroundColor: BrandColors.teal,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.md,
    shadowColor: BrandColors.teal,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  heroTextGroup: {
    gap: Spacing.one,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 16,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    lineHeight: 17,
  },
  createReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: '#ffffff',
    paddingVertical: Spacing.md - 2,
    borderRadius: Radius.full,
  },
  createReceiptText: {
    color: BrandColors.teal,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  featureCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
    minWidth: 0,
  },
  featureIconContainer: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
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
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.full,
  },
  viewAllText: {
    color: BrandColors.teal,
    fontWeight: '700',
  },
  previewList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#e6f2f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDanger: {
    backgroundColor: '#fee2e2',
  },
  avatarText: {
    color: BrandColors.teal,
    fontWeight: '700',
  },
  avatarTextDanger: {
    color: '#b91c1c',
  },
  previewText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  previewTitle: {
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  previewRight: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
    maxWidth: '45%',
  },
  dueChip: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  dueChipOverdue: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
  },
  dueChipSoon: {
    backgroundColor: '#fef9c3',
    color: '#854d0e',
  },
  linksCard: {
    paddingVertical: Spacing.one,
    gap: 0,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
  },
});
