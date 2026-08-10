import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { Typography } from '@/shared/components/Typography';
import { BrandColors, BottomTabInset, Spacing } from '@/core/theme';

import { MemberSearchBar } from '../components/members/MemberSearchBar';
import { MemberList } from '../components/members/MemberList';
import { RecentCheckInList } from '../components/members/RecentCheckInList';
import { CheckInConfirmationModal } from '../components/members/CheckInConfirmationModal';
import { Skeleton } from '../components/shared/Skeleton';

import { useMemberSearch } from '../hooks/useMemberSearch';
import { useAllMembers } from '../hooks/useAllMembers';
import { useRecentCheckIns } from '../hooks/useRecentCheckIns';
import { useCheckIn } from '../../hooks/useCheckInActions';

const CHECK_IN_COLORS: [string, string] = [BrandColors.teal, '#1a7a47'];

export function MembersStaffCheckInScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);

  // All members — the primary list
  const { members: allMembers, isLoading: isLoadingAll, isRefetching: isRefetchingAll, refetch: refetchAll } = useAllMembers();

  // Search results — used when user is actively searching
  const { members: searchResults, loading: isSearching, idle: isSearchIdle } = useMemberSearch(searchQuery);

  // Recent check-ins for active status cross-referencing
  const { recentMembers, isLoading: isLoadingRecent, refetch: refetchRecent, isRefetching: isRefetchingRecent } = useRecentCheckIns();

  const { mutateAsync: performCheckIn, isPending: isCheckingIn } = useCheckIn();

  // Build a set of currently-active member IDs for fast lookup
  const activeIds = useMemo(() => {
    const ids = new Set<number>();
    recentMembers.forEach((r) => {
      if ((r.status === 'In Gym' || !r.checkOutTime) && r.memberDbId) {
        ids.add(r.memberDbId);
      }
    });
    return ids;
  }, [recentMembers]);

  const handleRefresh = useCallback(() => {
    refetchAll();
    refetchRecent();
  }, [refetchAll, refetchRecent]);

  const handleCheckIn = (member: any) => {
    setSelectedMember(member);
  };

  const confirmCheckIn = async () => {
    if (!selectedMember) return;
    try {
      await performCheckIn({ memberId: selectedMember.id });
      setSelectedMember(null);
    } catch {
      // Handled by global error boundary or toast
    }
  };

  // Which list to show: search results when searching, full list when idle
  const displayedMembers = isSearchIdle ? allMembers : searchResults;
  const isDisplayLoading = isSearchIdle ? isLoadingAll : isSearching;

  const isRefreshing = isRefetchingAll || isRefetchingRecent;

  return (
    <ScreenLayout>
      {/* Header */}
      <AppHeader
        title="Members & Staff"
        subtitle="Search and perform manual check-ins"
        colors={CHECK_IN_COLORS}
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={BrandColors.teal}
          />
        }
      >
        {/* ── Search ── */}
        <View style={styles.searchContainer}>
          <MemberSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            isLoading={isSearching}
          />
        </View>

        {/* ── All Members & Staff (primary section) ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Feather name="users" size={14} color={BrandColors.textSecondary} />
              <Typography variant="bodySmallBold" style={styles.sectionTitle}>
                {isSearchIdle ? 'All Members & Staff' : 'Search Results'}
              </Typography>
            </View>
            {!isDisplayLoading && (
              <Typography variant="caption" color="textSecondary">
                {displayedMembers.length} total
              </Typography>
            )}
          </View>

          {isDisplayLoading ? (
            <View style={styles.skeletons}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} height={70} style={styles.skeleton} />
              ))}
            </View>
          ) : (
            <MemberList
              members={displayedMembers}
              isLoading={false}
              onCheckIn={handleCheckIn}
              activeIds={activeIds}
            />
          )}
        </View>

        {/* ── Recent Check-Ins (secondary section) ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Feather name="clock" size={14} color={BrandColors.textSecondary} />
              <Typography variant="bodySmallBold" style={styles.sectionTitle}>
                Recent Check-Ins
              </Typography>
            </View>
            <Typography variant="caption" color="textSecondary">
              Latest activity today
            </Typography>
          </View>
          <RecentCheckInList />
        </View>
      </ScrollView>

      {/* Check-in confirmation modal */}
      <CheckInConfirmationModal
        visible={!!selectedMember}
        member={selectedMember}
        onConfirm={confirmCheckIn}
        onCancel={() => setSelectedMember(null)}
        isLoading={isCheckingIn}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: BottomTabInset + Spacing.six,
  },
  searchContainer: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  sectionTitle: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  skeletons: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  skeleton: {
    borderRadius: 10,
  },
});

