import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { Typography } from '@/shared/components/Typography';

import { useReceipts } from '../../hooks/useBills';
import type { Receipt } from '../../domain/Receipt';
import {
  BillingSkeleton,
  EmptyBillingState,
  ErrorState,
  ReceiptCard,
} from '../components';

import { toast } from '@/shared/components/Toasts/toastStore';

interface ReceiptsScreenProps {
  onBack: () => void;
  onNavigateToReceipt: (receiptId: string) => void;
}

const TRANSACTION_TYPES = ['All', 'New', 'Renewal', 'Add-on', 'Payment', 'Daily Entry'];
const STATUS_OPTIONS = ['All', 'Paid', 'Pending', 'Partial', 'Overdue'];

/**
 * Dedicated Receipt Management Screen.
 * Displays search, filters, pull-to-refresh, receipt list, empty state, skeleton, and Export CSV.
 */
export function ReceiptsScreen({ onBack, onNavigateToReceipt }: ReceiptsScreenProps) {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const filters = {
    search: search.trim() || undefined,
    transactionType: selectedType !== 'All' ? selectedType : undefined,
    status: selectedStatus !== 'All' ? selectedStatus : undefined,
    limit: 50,
  };

  const { receipts, pagination, loading, error, refresh } = useReceipts(filters);

  const handleReceiptPress = useCallback(
    (receipt: Receipt) => {
      onNavigateToReceipt(receipt.id);
    },
    [onNavigateToReceipt],
  );

  const handleExportCSV = useCallback(() => {
    const totalCount = pagination?.total ?? receipts.length;
    toast.info(
      `Exporting entire receipt list (${totalCount} record${totalCount !== 1 ? 's' : ''}) to CSV file.`,
      {
        title: 'Export Receipts CSV'
      }
    );
  }, [pagination?.total, receipts.length]);

  const renderItem = useCallback(
    ({ item }: { item: Receipt }) => (
      <ReceiptCard receipt={item} onPress={handleReceiptPress} />
    ),
    [handleReceiptPress],
  );

  const keyExtractor = useCallback((item: Receipt) => item.id, []);

  return (
    <ScreenLayout>
      <AppHeader
        title="Receipt Management"
        subtitle={pagination ? `${pagination.total} Total Receipts` : 'Payment Receipts & History'}
        colors={['#327f74', '#2a6b62']}
        onBack={onBack}
      />

      <View style={styles.container}>
        {/* Search Bar + Export CSV Action */}
        <View style={styles.topBar}>
          <View style={styles.searchContainer}>
            <Feather name="search" size={16} color={BrandColors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search receipt #, member name..."
              placeholderTextColor={BrandColors.textSecondary}
              value={search}
              onChangeText={setSearch}
              clearButtonMode="while-editing"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} style={styles.clearBtn}>
                <Feather name="x" size={14} color={BrandColors.textSecondary} />
              </Pressable>
            )}
          </View>

          <Pressable onPress={handleExportCSV} style={styles.exportBtn} accessibilityRole="button">
            <Feather name="download" size={14} color={BrandColors.teal} />
            <Typography variant="caption" style={styles.exportBtnText}>
              Export
            </Typography>
          </Pressable>
        </View>

        {/* Filters */}
        <View style={styles.filtersSection}>
          <Typography variant="caption" color="textSecondary" style={styles.filterLabel}>
            Type:
          </Typography>
          <FlatList
            horizontal
            data={TRANSACTION_TYPES}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipList}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setSelectedType(item)}
                style={[styles.chip, selectedType === item && styles.chipActive]}
              >
                <Typography
                  variant="caption"
                  style={[styles.chipText, selectedType === item && styles.chipTextActive]}
                >
                  {item}
                </Typography>
              </Pressable>
            )}
          />

          <Typography variant="caption" color="textSecondary" style={styles.filterLabel}>
            Status:
          </Typography>
          <FlatList
            horizontal
            data={STATUS_OPTIONS}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipList}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setSelectedStatus(item)}
                style={[styles.chip, selectedStatus === item && styles.chipActive]}
              >
                <Typography
                  variant="caption"
                  style={[styles.chipText, selectedStatus === item && styles.chipTextActive]}
                >
                  {item}
                </Typography>
              </Pressable>
            )}
          />
        </View>

        {/* Content List */}
        {loading && !receipts.length ? (
          <BillingSkeleton variant="list" count={5} />
        ) : error && !receipts.length ? (
          <ErrorState message="Failed to load receipts." onRetry={refresh} />
        ) : (
          <FlatList
            data={receipts}
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
                title="No receipts found"
                description="Try adjusting your search query or status filters."
                icon="file-text"
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    height: 42,
  },
  searchIcon: {
    marginRight: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: BrandColors.textPrimary,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: Spacing.three,
    height: 42,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: BrandColors.teal,
  },
  exportBtnText: {
    color: BrandColors.teal,
    fontWeight: '700',
  },
  filtersSection: {
    gap: 4,
    marginBottom: Spacing.two,
  },
  filterLabel: {
    marginLeft: Spacing.three,
    fontSize: 11,
    fontWeight: '600',
  },
  filterChipList: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.one + 2,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 4,
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
    fontSize: 12,
    fontWeight: '500',
  },
  chipTextActive: {
    color: BrandColors.teal,
    fontWeight: '700',
  },
  list: {
    padding: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
});
