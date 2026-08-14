import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';

export interface PromotionFilterState {
  status: string;
  type: string;
  category: string;
}

export const DEFAULT_PROMOTION_FILTERS: PromotionFilterState = {
  status: 'all',
  type: 'all',
  category: 'all',
};

interface PromotionFilterSheetProps {
  visible: boolean;
  filters: PromotionFilterState;
  onClose: () => void;
  onApplyFilters: (filters: PromotionFilterState) => void;
  onResetFilters: () => void;
}

const STATUS_OPTIONS = [
  { label: 'All Status', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Expired', value: 'expired' },
  { label: 'Paused', value: 'paused' },
  { label: 'Draft', value: 'draft' },
];

const TYPE_OPTIONS = [
  { label: 'All Types', value: 'all' },
  { label: 'Discount', value: 'discount' },
  { label: 'Voucher', value: 'voucher' },
  { label: 'Combo', value: 'combo' },
  { label: 'BOGO', value: 'bogo' },
  { label: 'Seasonal', value: 'seasonal' },
  { label: 'Loyalty', value: 'loyalty' },
  { label: 'Access Days', value: 'promotional-access-days' },
];

const CATEGORY_OPTIONS = [
  { label: 'All Categories', value: 'all' },
  { label: 'Membership', value: 'Membership' },
  { label: 'Services', value: 'Services' },
  { label: 'Special Events', value: 'Special Events' },
  { label: 'Loyalty', value: 'Loyalty' },
];

export function PromotionFilterSheet({
  visible,
  filters,
  onClose,
  onApplyFilters,
  onResetFilters,
}: PromotionFilterSheetProps) {
  const [localFilters, setLocalFilters] = useState<PromotionFilterState>(filters);

  const handleSelectStatus = (status: string) => {
    setLocalFilters((prev) => ({ ...prev, status }));
  };

  const handleSelectType = (type: string) => {
    setLocalFilters((prev) => ({ ...prev, type }));
  };

  const handleSelectCategory = (category: string) => {
    setLocalFilters((prev) => ({ ...prev, category }));
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_PROMOTION_FILTERS);
    onResetFilters();
    onClose();
  };

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title="Filter Promotions"
      subtitle="Refine promotional campaigns by attributes"
    >
      <View style={styles.content}>
        {/* Status Filter Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.chipRow}>
            {STATUS_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.chip,
                  localFilters.status === opt.value && styles.activeChip,
                ]}
                onPress={() => handleSelectStatus(opt.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    localFilters.status === opt.value && styles.activeChipText,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Type Filter Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Promotion Type</Text>
          <View style={styles.chipRow}>
            {TYPE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.chip,
                  localFilters.type === opt.value && styles.activeChip,
                ]}
                onPress={() => handleSelectType(opt.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    localFilters.type === opt.value && styles.activeChipText,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Category Filter Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.chip,
                  localFilters.category === opt.value && styles.activeChip,
                ]}
                onPress={() => handleSelectCategory(opt.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    localFilters.category === opt.value && styles.activeChipText,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Footer Actions */}
        <View style={styles.footerActions}>
          <Pressable style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>Reset All</Text>
          </Pressable>
          <Pressable style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </Pressable>
        </View>
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
    paddingBottom: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeChip: {
    backgroundColor: BrandColors.teal,
    borderColor: BrandColors.teal,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  activeChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footerActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  resetButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: '#F1F5F9',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  applyButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: BrandColors.teal,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
