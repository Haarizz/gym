import React, { useCallback, useEffect } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { Typography } from '@/shared/components/Typography';

import { usePendingBills } from '../../hooks/useBills';
import { useBillSelection } from '../hooks/useBillSelection';
import type { Bill } from '../../domain/Bill';
import {
  BillingSkeleton,
  EmptyBillingState,
  ErrorState,
  MoneyText,
  PendingBillCard,
} from '../components';

interface PendingBillsScreenProps {
  memberId: number;
  memberName?: string;
  onBack: () => void;
  onProceedToPayment: (memberId: number, selectedBillIds: string[]) => void;
}

/**
 * Pending Bills Screen.
 *
 * Displays all Pending / Partial / Overdue bills for a member.
 * Supports multi-select; proceeds to Payment Settlement for selected bills.
 *
 * Consumes usePendingBills(memberId) + useBillSelection (local state).
 * No business logic — purely presentational.
 */
export function PendingBillsScreen({
  memberId,
  memberName,
  onBack,
  onProceedToPayment,
}: PendingBillsScreenProps) {
  const { bills, loading, error, refresh } = usePendingBills(memberId);
  const {
    selectedIds,
    isSelected,
    toggleSelection,
    selectAll,
    clearSelection,
    selectedCount,
  } = useBillSelection();

  const allSelected = bills.length > 0 && selectedCount === bills.length;

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAll(bills.map((b) => b.id));
    }
  }, [allSelected, bills, selectAll, clearSelection]);

  const handleProceed = useCallback(() => {
    onProceedToPayment(memberId, Array.from(selectedIds));
  }, [memberId, selectedIds, onProceedToPayment]);

  const totalSelected = bills
    .filter((b) => isSelected(b.id))
    .reduce((sum, b) => sum + b.dueAmount, 0);

  const renderItem = useCallback(
    ({ item }: { item: Bill }) => (
      <PendingBillCard
        bill={item}
        isSelected={isSelected(item.id)}
        onToggle={toggleSelection}
      />
    ),
    [isSelected, toggleSelection],
  );

  const keyExtractor = useCallback((item: Bill) => item.id, []);

  if (loading && bills.length === 0) {
    return (
      <ScreenLayout>
        <AppHeader
          title={memberName ?? 'Pending Bills'}
          subtitle="Select Bills to Settle"
          colors={['#327f74', '#2a6b62']}
          onBack={onBack}
        />
        <BillingSkeleton variant="list" count={4} />
      </ScreenLayout>
    );
  }

  if (error && bills.length === 0) {
    return (
      <ScreenLayout>
        <AppHeader
          title={memberName ?? 'Pending Bills'}
          subtitle="Select Bills to Settle"
          colors={['#327f74', '#2a6b62']}
          onBack={onBack}
        />
        <ErrorState message="Failed to load pending bills." onRetry={refresh} />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <AppHeader
        title={memberName ?? 'Pending Bills'}
        subtitle={bills.length > 0 ? `${bills.length} bill${bills.length !== 1 ? 's' : ''} outstanding` : 'No outstanding bills'}
        colors={['#327f74', '#2a6b62']}
        onBack={onBack}
      />

      {/* Select all toolbar */}
      {bills.length > 0 && (
        <View style={styles.toolbar}>
          <Pressable
            onPress={handleSelectAll}
            style={styles.selectAllBtn}
            accessibilityRole="button"
          >
            <View style={[styles.checkbox, allSelected && styles.checkboxActive]}>
              {allSelected && <Feather name="check" size={12} color="#ffffff" />}
            </View>
            <Typography variant="caption" style={styles.selectAllText}>
              {allSelected ? 'Deselect All' : 'Select All'}
            </Typography>
          </Pressable>

          {selectedCount > 0 && (
            <Typography variant="caption" color="textSecondary">
              {selectedCount} selected
            </Typography>
          )}
        </View>
      )}

      <FlatList
        data={bills}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={BrandColors.teal}
          />
        }
        ListEmptyComponent={
          <EmptyBillingState
            title="No pending bills"
            description="This member has no outstanding bills at the moment."
            icon="check-circle"
          />
        }
        // Reserve space for sticky footer
        ListFooterComponent={<View style={styles.listFooterSpace} />}
      />

      {/* Sticky proceed button */}
      {selectedCount > 0 && (
        <View style={styles.footer}>
          <View style={styles.footerSummary}>
            <Typography variant="caption" color="textSecondary">
              {selectedCount} bill{selectedCount !== 1 ? 's' : ''} · Total
            </Typography>
            <MoneyText
              amount={totalSelected}
              variant="bodySmallBold"
              color={BrandColors.teal}
            />
          </View>
          <Pressable
            onPress={handleProceed}
            style={styles.proceedBtn}
            accessibilityRole="button"
          >
            <Typography variant="bodySmallBold" style={styles.proceedText}>
              Proceed to Payment
            </Typography>
            <Feather name="arrow-right" size={18} color="#ffffff" />
          </Pressable>
        </View>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: BrandColors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: BrandColors.teal,
    borderColor: BrandColors.teal,
  },
  selectAllText: {
    color: BrandColors.textPrimary,
    fontWeight: '600',
  },
  list: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  listFooterSpace: {
    height: Spacing.six,
  },
  footer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  footerSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proceedBtn: {
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
  proceedText: {
    color: '#ffffff',
    fontSize: 15,
  },
});
