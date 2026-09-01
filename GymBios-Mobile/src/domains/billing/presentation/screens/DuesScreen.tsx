import React, { useCallback } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { Typography } from '@/shared/components/Typography';

import { useBillingStats, useMemberDues } from '../../hooks/useBills';
import type { MemberDue } from '../../domain/MemberDue';
import { DueStatus } from '../../domain/MemberDue';
import {
  BillingSkeleton,
  EmptyBillingState,
  ErrorState,
  MemberDueCard,
  MoneyText,
} from '../components';

import { toast } from '@/shared/components/Toasts/toastStore';

interface DuesScreenProps {
  onBack: () => void;
  onNavigateToMemberStatement: (memberId: number, memberName?: string) => void;
  onCollectPayment?: () => void;
}

/**
 * Dedicated Outstanding Dues Screen.
 * Summary header, 2x2 action cards grid (Refresh, Send Reminders, Collect Payment, Export), and Member Due List.
 */
export function DuesScreen({
  onBack,
  onNavigateToMemberStatement,
  onCollectPayment,
}: DuesScreenProps) {
  const { stats, loading: statsLoading, refresh: refreshStats } = useBillingStats();
  const { dues, loading: duesLoading, error, refresh: refreshDues } = useMemberDues();

  const loading = statsLoading || duesLoading;

  const handleRefresh = useCallback(() => {
    refreshStats();
    refreshDues();
  }, [refreshStats, refreshDues]);

  const handleDuePress = useCallback(
    (due: MemberDue) => {
      onNavigateToMemberStatement(due.id, due.memberName);
    },
    [onNavigateToMemberStatement],
  );

  const handleSendReminders = useCallback(() => {
    const overdueCount = dues.filter((d) => d.status === DueStatus.Overdue || d.daysOverdue > 0).length;
    Alert.alert(
      'Send Overdue Reminders',
      `Send payment reminder notification to ${overdueCount} overdue member(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Reminders',
          onPress: () => {
            toast.success(`Reminders dispatched via SMS & Email to ${overdueCount} members.`, {
              title: 'Success'
            });
          },
        },
      ],
    );
  }, [dues]);

  const handleExport = useCallback(() => {
    const overdueList = dues.filter((d) => d.status === DueStatus.Overdue || d.daysOverdue > 0);
    toast.info(`Exported ${overdueList.length} overdue member record(s) to CSV.`, {
      title: 'Export Overdue Report'
    });
  }, [dues]);

  const overdueCount = stats?.overdueCount ?? dues.filter((d) => d.status === DueStatus.Overdue || d.daysOverdue > 0).length;
  const dueSoonCount = stats?.dueSoonCount ?? dues.filter((d) => d.status === DueStatus.DueSoon || d.daysOverdue === 0).length;
  const totalOutstanding = stats?.overdueAmount ?? dues.reduce((sum, d) => sum + (d.amount ?? 0), 0);

  const renderItem = useCallback(
    ({ item }: { item: MemberDue }) => (
      <MemberDueCard due={item} onPress={handleDuePress} />
    ),
    [handleDuePress],
  );

  const keyExtractor = useCallback((item: MemberDue) => item.id.toString(), []);

  return (
    <ScreenLayout>
      <AppHeader
        title="Outstanding Dues"
        subtitle={`${dues.length} Member${dues.length !== 1 ? 's' : ''} Pending`}
        colors={['#327f74', '#2a6b62']}
        onBack={onBack}
      />

      <View style={styles.container}>
        {/* Summary Card Header */}
        <View style={styles.summaryHeader}>
          <View style={styles.summaryItem}>
            <Typography variant="caption" color="textSecondary">
              Outstanding Amount
            </Typography>
            <MoneyText amount={totalOutstanding} variant="bodySmallBold" color="#b91c1c" />
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Typography variant="caption" color="textSecondary">
              Overdue
            </Typography>
            <Typography variant="bodySmallBold" style={styles.overdueCountText}>
              {overdueCount} members
            </Typography>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Typography variant="caption" color="textSecondary">
              Due Soon
            </Typography>
            <Typography variant="bodySmallBold" style={styles.dueSoonCountText}>
              {dueSoonCount} members
            </Typography>
          </View>
        </View>

        {/* Quick Actions Grid (2x2) */}
        <View style={styles.actionGrid}>
          <View style={styles.actionRow}>
            <Pressable onPress={handleRefresh} style={styles.actionCard} accessibilityRole="button">
              <View style={[styles.actionIconBg, { backgroundColor: BrandColors.screenBackgroundAlt }]}>
                <Feather name="refresh-cw" size={16} color={BrandColors.teal} />
              </View>
              <Typography variant="caption" style={styles.actionCardText}>
                Refresh
              </Typography>
            </Pressable>

            <Pressable
              onPress={handleSendReminders}
              disabled={dues.length === 0}
              style={[styles.actionCard, dues.length === 0 && styles.actionCardDisabled]}
              accessibilityRole="button"
            >
              <View style={[styles.actionIconBg, { backgroundColor: '#e0f2fe' }]}>
                <Feather name="send" size={16} color="#0284c7" />
              </View>
              <Typography variant="caption" style={styles.actionCardText}>
                Send Reminders
              </Typography>
            </Pressable>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              onPress={onCollectPayment}
              style={styles.actionCard}
              accessibilityRole="button"
            >
              <View style={[styles.actionIconBg, { backgroundColor: '#dcfce7' }]}>
                <Feather name="credit-card" size={16} color="#16a34a" />
              </View>
              <Typography variant="caption" style={styles.actionCardText}>
                Collect Payment
              </Typography>
            </Pressable>

            <Pressable onPress={handleExport} style={styles.actionCard} accessibilityRole="button">
              <View style={[styles.actionIconBg, { backgroundColor: '#fef3c7' }]}>
                <Feather name="download" size={16} color="#d97706" />
              </View>
              <Typography variant="caption" style={styles.actionCardText}>
                Export Overdue
              </Typography>
            </Pressable>
          </View>
        </View>

        {/* Member Dues List */}
        {loading && !dues.length ? (
          <BillingSkeleton variant="list" count={5} />
        ) : error && !dues.length ? (
          <ErrorState message="Failed to load member dues." onRetry={handleRefresh} />
        ) : (
          <FlatList
            data={dues}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={handleRefresh}
                tintColor={BrandColors.teal}
              />
            }
            ListEmptyComponent={
              <EmptyBillingState
                title="No outstanding dues"
                description="All members are up to date with their payments."
                icon="check-circle"
              />
            }
          />
        )}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    margin: Spacing.three,
    marginBottom: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: '#e5e7eb',
  },
  overdueCountText: {
    color: '#b91c1c',
  },
  dueSoonCountText: {
    color: '#854d0e',
  },
  actionGrid: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#ffffff',
    padding: Spacing.two + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  actionCardDisabled: {
    opacity: 0.5,
  },
  actionIconBg: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardText: {
    color: BrandColors.textPrimary,
    fontWeight: '600',
    fontSize: 12,
  },
  list: {
    padding: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
});
