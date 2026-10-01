import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { EmptyState } from '@/shared/components/EmptyState';
import { Pagination } from '@/shared/components/Pagination';
import { SearchBar } from '@/shared/components/SearchBar';
import { Typography } from '@/shared/components/Typography';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { toast } from '@/shared/components/Toasts/toastStore';
import { useBranchContext } from '@/shared/providers/BranchProvider';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { MemberCard } from '../components/MemberCard';
import {
  EMPTY_MEMBER_FILTERS,
  FilterChip,
  MEMBER_STATUS_OPTIONS,
  MemberFilterSheet,
  type MemberListFilters,
} from '../components/MemberFilterSheet';
import { useMembers } from '../../hooks/useMembers';
import type { Member } from '../../domain/Member';

interface MembersListScreenProps {
  onNavigateToDetail: (member: Member) => void;
  onNavigateToCreate: () => void;
}

// RoleTabsLayout already pads the top inset and the list pads past the tab bar.
const TAB_SCREEN_EDGES = ['left', 'right'] as const;

const SEARCH_DEBOUNCE_MS = 350;

export function MembersListScreen({
  onNavigateToDetail,
  onNavigateToCreate,
}: MembersListScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { selectedBranchId } = useBranchContext();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<MemberListFilters>(EMPTY_MEMBER_FILTERS);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search]);

  // Filtering happens server-side so it covers every page, not just the one loaded.
  const queryFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: filters.status || undefined,
      membershipType: filters.membershipType || undefined,
      paymentStatus: filters.paymentStatus || undefined,
    }),
    [debouncedSearch, filters],
  );

  const { members, loading, error, page, totalPages, totalElements, refresh, goToPage } =
    useMembers(queryFilters);

  useEffect(() => {
    goToPage(1);
  }, [queryFilters, goToPage]);

  const activeFilterCount =
    (filters.status ? 1 : 0) + (filters.membershipType ? 1 : 0) + (filters.paymentStatus ? 1 : 0);
  const isFiltered = activeFilterCount > 0 || !!debouncedSearch;

  const handleCreate = useCallback(() => {
    if (selectedBranchId === 'ALL') {
      toast.error('Please select a specific branch from the header menu before creating a new member.', { title: 'Branch Required' });
      return;
    }
    onNavigateToCreate();
  }, [selectedBranchId, onNavigateToCreate]);

  const handleCall = useCallback((member: Member) => {
    if (!member.phone) {
      toast.info('This member does not have a phone number recorded.', {
        title: 'No Phone Number',
      });
      return;
    }
    Linking.openURL(`tel:${member.phone.replace(/\s+/g, '')}`).catch(() => {
      toast.error('Unable to start a call on this device.', { title: 'Error' });
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(EMPTY_MEMBER_FILTERS);
    setSearch('');
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Member }) => (
      <MemberCard member={item} onPress={onNavigateToDetail} onCall={handleCall} />
    ),
    [onNavigateToDetail, handleCall],
  );

  // Must be an element, not a component: a component whose identity changes on
  // every keystroke is remounted by FlatList, which drops focus from the search input.
  const listHeader = useMemo(
    () => (
      <View style={styles.headerContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, ID or phone..."
            />
          </View>
          <Pressable
            style={[
              styles.filterButton,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              activeFilterCount > 0 && { borderColor: BrandColors.teal },
            ]}
            onPress={() => setFilterSheetVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Open filters"
          >
            <Feather
              name="sliders"
              size={18}
              color={activeFilterCount > 0 ? BrandColors.teal : theme.text}
            />
            {activeFilterCount > 0 ? (
              <View style={styles.filterCount}>
                <Typography variant="caption" style={styles.filterCountLabel}>
                  {activeFilterCount}
                </Typography>
              </View>
            ) : null}
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {MEMBER_STATUS_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value || 'all'}
              label={opt.label}
              active={filters.status === opt.value}
              onPress={() => setFilters((prev) => ({ ...prev, status: opt.value }))}
            />
          ))}
        </ScrollView>

        <View style={styles.resultsRow}>
          <View style={styles.resultsText}>
            <Typography variant="subtitle" style={styles.resultsCount}>
              {totalElements}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {isFiltered ? 'matching members' : 'members'}
            </Typography>
            {isFiltered ? (
              <Pressable onPress={handleClearFilters} hitSlop={8} accessibilityRole="button">
                <Typography variant="caption" style={styles.clearLink}>
                  Clear
                </Typography>
              </Pressable>
            ) : null}
          </View>
          <Pressable
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
            onPress={handleCreate}
            accessibilityRole="button"
          >
            <Feather name="plus" size={16} color={BrandColors.white} />
            <Typography variant="bodySmallBold" style={styles.addButtonLabel}>
              Add Member
            </Typography>
          </Pressable>
        </View>
      </View>
    ),
    [search, filters, activeFilterCount, isFiltered, totalElements, theme, handleCreate, handleClearFilters],
  );

  const renderEmpty = useCallback(() => {
    if (loading) return <LoadingSkeleton count={3} />;
    if (error) {
      return (
        <EmptyState
          title="Failed to Load Members"
          description="Something went wrong. Pull to refresh to try again."
          icon="alert-circle"
        />
      );
    }
    return (
      <EmptyState
        title="No Members Found"
        description={
          isFiltered
            ? 'Try adjusting your search or filters.'
            : 'Add your first member to get started.'
        }
        icon="users"
        buttonLabel={isFiltered ? 'Clear Filters' : 'Add Member'}
        onPress={isFiltered ? handleClearFilters : handleCreate}
      />
    );
  }, [loading, error, isFiltered, handleCreate, handleClearFilters]);

  const renderFooter = useCallback(() => {
    if (members.length === 0) return null;
    return (
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={goToPage} />
    );
  }, [members.length, page, totalPages, goToPage]);

  return (
    <ScreenLayout edges={TAB_SCREEN_EDGES}>
      <View style={styles.container}>
        <FlatList
          data={members}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
          refreshing={loading && members.length > 0}
          onRefresh={refresh}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      </View>

      <MemberFilterSheet
        visible={filterSheetVisible}
        filters={filters}
        onApply={(next) => {
          setFilters(next);
          setFilterSheetVisible(false);
        }}
        onClose={() => setFilterSheetVisible(false)}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: Spacing.three,
    gap: Spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  searchWrap: {
    flex: 1,
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCount: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: BrandColors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountLabel: {
    color: BrandColors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  chipsRow: {
    gap: Spacing.two,
    paddingVertical: Spacing.half,
  },
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  resultsText: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.one,
    flexShrink: 1,
  },
  resultsCount: {
    fontWeight: '700',
  },
  clearLink: {
    color: BrandColors.teal,
    fontWeight: '700',
    marginLeft: Spacing.one,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.teal,
  },
  addButtonPressed: {
    backgroundColor: BrandColors.tealDark,
  },
  addButtonLabel: {
    color: BrandColors.white,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.three,
    gap: Spacing.md,
  },
});
