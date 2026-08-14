import React, { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { Typography } from '@/shared/components/Typography';

import { useMemberStatement } from '../../hooks/useBills';
import { useStatementFilters, type StatementPeriod } from '../hooks/useStatementFilters';
import {
  BillingSection,
  BillingSkeleton,
  EmptyBillingState,
  ErrorState,
  MoneyText,
  OutstandingBalanceCard,
  StatementRow,
} from '../components';

interface MemberStatementScreenProps {
  memberId: number;
  memberName?: string;
  onBack: () => void;
  onNavigateToPendingBills: (memberId: number, memberName?: string) => void;
}

const PERIOD_LABELS: { key: StatementPeriod; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: '6m', label: '6m' },
  { key: '1y', label: '1y' },
];

/**
 * Member Statement Screen.
 *
 * Displays:
 *  - Member summary (name, IDs)
 *  - Outstanding balance card
 *  - Date period filter chips
 *  - Timeline-style statement of account
 *  - CTA to pay pending bills
 *
 * Consumes useMemberStatement(). No business logic.
 */
export function MemberStatementScreen({
  memberId,
  memberName,
  onBack,
  onNavigateToPendingBills,
}: MemberStatementScreenProps) {
  const { period, range, setPeriod } = useStatementFilters();
  const { statement, loading, error, refresh } = useMemberStatement(memberId, range);

  const handlePayBills = useCallback(() => {
    onNavigateToPendingBills(memberId, memberName ?? statement?.memberName);
  }, [memberId, memberName, statement?.memberName, onNavigateToPendingBills]);

  const hasBalance = (statement?.closingBalance ?? 0) > 0;

  if (loading && !statement) {
    return (
      <ScreenLayout>
        <AppHeader
          title={memberName ?? 'Member Statement'}
          subtitle="Statement of Account"
          colors={['#327f74', '#2a6b62']}
          onBack={onBack}
        />
        <BillingSkeleton variant="list" count={6} />
      </ScreenLayout>
    );
  }

  if (error && !statement) {
    return (
      <ScreenLayout>
        <AppHeader
          title={memberName ?? 'Member Statement'}
          subtitle="Statement of Account"
          colors={['#327f74', '#2a6b62']}
          onBack={onBack}
        />
        <ErrorState message="Failed to load member statement." onRetry={refresh} />
      </ScreenLayout>
    );
  }

  const lines = statement?.lines ?? [];

  return (
    <ScreenLayout>
      <AppHeader
        title={statement?.memberName ?? memberName ?? 'Member Statement'}
        subtitle="Statement of Account"
        colors={['#327f74', '#2a6b62']}
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={BrandColors.teal}
          />
        }
      >
        {/* ── Member summary ───────────────────────────────────── */}
        <View style={styles.memberCard}>
          <View style={styles.memberAvatar}>
            <Typography variant="bodySmallBold" style={styles.avatarInitial}>
              {(statement?.memberName ?? memberName ?? 'M')[0].toUpperCase()}
            </Typography>
          </View>
          <View style={styles.memberInfo}>
            <Typography variant="bodySmallBold" style={styles.memberName}>
              {statement?.memberName ?? memberName ?? '—'}
            </Typography>
            {statement?.memberId && (
              <Typography variant="caption" color="textSecondary">
                ID: {statement.memberId}
              </Typography>
            )}
            {statement?.memberPhone && (
              <Typography variant="caption" color="textSecondary">
                {statement.memberPhone}
              </Typography>
            )}
            {statement?.isMinor && statement.familyHeadName && (
              <View style={styles.minorTag}>
                <Typography variant="caption" style={styles.minorTagText}>
                  Minor · billed to {statement.familyHeadName}
                </Typography>
              </View>
            )}
          </View>
        </View>

        {/* ── Outstanding balance ──────────────────────────────── */}
        <OutstandingBalanceCard balance={statement?.closingBalance} />

        {/* ── Totals summary row ───────────────────────────────── */}
        <View style={styles.totalsRow}>
          <View style={styles.totalItem}>
            <Typography variant="caption" color="textSecondary">
              Opening
            </Typography>
            <MoneyText
              amount={statement?.openingBalance}
              variant="bodySmall"
            />
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalItem}>
            <Typography variant="caption" color="textSecondary">
              Billed
            </Typography>
            <MoneyText
              amount={statement?.totalBilled}
              variant="bodySmall"
              color="#dc2626"
            />
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalItem}>
            <Typography variant="caption" color="textSecondary">
              Paid
            </Typography>
            <MoneyText
              amount={statement?.totalPaid}
              variant="bodySmall"
              color="#16a34a"
            />
          </View>
        </View>

        {/* ── Period filter chips ──────────────────────────────── */}
        <BillingSection title="Transaction History">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.periodChips}
          >
            {PERIOD_LABELS.map(({ key, label }) => (
              <Pressable
                key={key}
                onPress={() => setPeriod(key)}
                style={[styles.chip, period === key && styles.chipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: period === key }}
              >
                <Typography
                  variant="caption"
                  style={[styles.chipText, period === key && styles.chipTextActive]}
                >
                  {label}
                </Typography>
              </Pressable>
            ))}
          </ScrollView>

          {/* Timeline list */}
          {loading ? (
            <BillingSkeleton variant="list" count={4} />
          ) : lines.length === 0 ? (
            <EmptyBillingState
              title="No transactions"
              description="No transactions found for this period."
              icon="file-text"
            />
          ) : (
            <View style={styles.timeline}>
              {lines.map((line, index) => (
                <StatementRow
                  key={`${line.receiptNo ?? ''}-${index}`}
                  line={line}
                  isLast={index === lines.length - 1}
                />
              ))}
            </View>
          )}
        </BillingSection>
      </ScrollView>

      {/* Sticky CTA — pay pending bills */}
      {hasBalance && (
        <View style={styles.stickyFooter}>
          <Pressable
            onPress={handlePayBills}
            style={styles.payButton}
            accessibilityRole="button"
          >
            <Feather name="credit-card" size={18} color="#ffffff" />
            <Typography variant="bodySmallBold" style={styles.payButtonText}>
              Pay Outstanding Bills
            </Typography>
          </Pressable>
        </View>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: 90,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.screenBackgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: BrandColors.teal,
    fontSize: 18,
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontSize: 15,
  },
  minorTag: {
    backgroundColor: '#eff6ff',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  minorTagText: {
    color: '#1d4ed8',
    fontSize: 10,
  },
  totalsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  totalItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  totalDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 2,
  },
  periodChips: {
    gap: Spacing.two,
    paddingBottom: Spacing.one,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.full,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: BrandColors.screenBackgroundAlt,
    borderColor: BrandColors.teal,
  },
  chipText: {
    color: BrandColors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: BrandColors.teal,
  },
  timeline: {
    marginTop: Spacing.two,
  },
  stickyFooter: {
    padding: Spacing.three,
    paddingBottom: Spacing.four,
    backgroundColor: 'transparent',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: BrandColors.teal,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.three,
    shadowColor: BrandColors.teal,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  payButtonText: {
    color: '#ffffff',
    fontSize: 15,
  },
});
