import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, ActivityIndicator, Text } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Pagination } from '@/shared/components/Pagination';
import { BrandColors, Spacing, Radius } from '@/core/theme';

import { useMembershipPlans } from '../../hooks/useMembershipPlans';
import { MobileMembershipPlan } from '../../domain/models';
import { MembershipPlanCard } from './MembershipPlanCard';

export interface MembershipPlanPickerBottomSheetProps {
  visible: boolean;
  currentPlanName?: string;
  selectedPlanId?: number;
  onClose: () => void;
  onSelectPlan: (plan: MobileMembershipPlan) => void;
}

export function MembershipPlanPickerBottomSheet({
  visible,
  currentPlanName,
  selectedPlanId,
  onClose,
  onSelectPlan,
}: MembershipPlanPickerBottomSheetProps) {
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Debounce search text
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchText);
      setPage(1); // Reset to page 1 on new search
    }, 400);
    return () => clearTimeout(handler);
  }, [searchText]);

  // Fetch plans
  const { data, isFetching, isLoading } = useMembershipPlans(page, limit, debouncedSearch);

  const plans = data?.plans || [];
  const totalPages = data?.pagination?.totalPages || 0;

  // Reset state when sheet opens
  useEffect(() => {
    if (visible) {
      setSearchText('');
      setDebouncedSearch('');
      setPage(1);
    }
  }, [visible]);

  return (
    <AppBottomSheet
      visible={visible}
      title="Select Membership Plan"
      onClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color={BrandColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search plans..."
            placeholderTextColor={BrandColors.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <Feather
              name="x-circle"
              size={18}
              color={BrandColors.textSecondary}
              onPress={() => setSearchText('')}
              style={{ padding: 4 }}
            />
          )}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BrandColors.memberGold} />
          </View>
        ) : plans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No plans found.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {plans.map((plan) => (
              <MembershipPlanCard
                key={plan.id}
                name={plan.name}
                price={plan.price}
                duration={plan.duration}
                isCurrent={plan.name === currentPlanName}
                isSelected={plan.id === selectedPlanId}
                onSelect={() => {
                  onSelectPlan(plan);
                  onClose();
                }}
              />
            ))}
          </View>
        )}

        {totalPages > 1 && (
          <View style={styles.paginationContainer}>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
            {isFetching && !isLoading && (
              <ActivityIndicator
                size="small"
                color={BrandColors.memberGold}
                style={styles.fetchingIndicator}
              />
            )}
          </View>
        )}
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    marginBottom: Spacing.four,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.two,
    fontSize: 15,
    color: BrandColors.textPrimary,
  },
  listContainer: {
    gap: Spacing.three,
  },
  loadingContainer: {
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  emptyText: {
    color: BrandColors.textSecondary,
    fontSize: 15,
  },
  paginationContainer: {
    marginTop: Spacing.two,
    alignItems: 'center',
  },
  fetchingIndicator: {
    marginTop: Spacing.two,
  },
});
