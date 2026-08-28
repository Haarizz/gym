import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';

import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { BottomTabInset, Spacing } from '@/core/theme';
import { SlideIn } from '@/shared/components/Animations/SlideIn';
import { AppHeader } from '@/shared/components/AppHeader';

import { MemberSearchBar } from '../../components/members/MemberSearchBar';
import { CheckInConfirmationModal } from '../../components/members/CheckInConfirmationModal';
import { StaffCheckInStats } from '../../components/staff/StaffCheckInStats';
import { StaffCheckInList, ListFilter } from '../../components/staff/StaffCheckInList';

import { useMemberSearch } from '../../hooks/useMemberSearch';
import { useAllMembers } from '../../hooks/useAllMembers';
import { useRecentCheckIns } from '../../hooks/useRecentCheckIns';
import { useCheckIn } from '../../../hooks/useCheckInActions';
import { useCheckout } from '@/domains/attendance/hooks/useAttendanceActions';
import { useProfile } from '@/domains/profile';

const CHECK_IN_COLORS: [string, string] = ['#155c4c', '#0f4a3d'];

export function StaffCheckInScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const branchName = profile?.branch || 'All Branches';

  const [listFilter, setListFilter] = useState<ListFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [actionType, setActionType] = useState<'checkIn' | 'checkOut'>('checkIn');

  // --- Member Queries ---
  const { members: allMembers, isLoading: isLoadingMembers, isRefetching: isRefetchingMembers, refetch: refetchMembers } = useAllMembers();
  const { members: searchResults, loading: isSearchingMembers, idle: isSearchIdle } = useMemberSearch(searchQuery);
  const { recentMembers, refetch: refetchRecent, isRefetching: isRefetchingRecent } = useRecentCheckIns();

  // --- Mutations ---
  const { mutateAsync: performMemberCheckIn, isPending: isCheckingInMember } = useCheckIn();
  const { mutateAsync: performMemberCheckOut, isPending: isCheckingOutMember } = useCheckout();

  // --- Computed State ---
  const activeMemberIds = useMemo(() => {
    const ids = new Set<number>();
    recentMembers.forEach((r: any) => {
      // Checked in if 'active', 'In Gym', or checkOutTime is null
      if ((r.status === 'In Gym' || r.status === 'active' || r.checkOutTime === null || r.check_out_time === null) && (r.memberDbId || r.member_id)) {
        ids.add(r.memberDbId || r.member_id);
      }
    });
    return ids;
  }, [recentMembers]);

  // Combined List
  const combinedList = useMemo(() => {
    if (!isSearchIdle) {
      return searchResults;
    }
    return allMembers;
  }, [isSearchIdle, allMembers, searchResults]);

  const getIsActive = useCallback((person: any) => {
    return activeMemberIds.has(person.id ?? person.memberDbId);
  }, [activeMemberIds]);

  const totalCount = combinedList.length;
  const checkedInCount = combinedList.filter(getIsActive).length;
  const notCheckedInCount = totalCount - checkedInCount;

  const handleRefresh = useCallback(() => {
    refetchMembers();
    refetchRecent();
  }, [refetchMembers, refetchRecent]);

  const handleCheckIn = (person: any) => {
    setSelectedPerson(person);
    setActionType('checkIn');
  };

  const handleCheckOut = (person: any) => {
    setSelectedPerson(person);
    setActionType('checkOut');
  };

  const confirmAction = async () => {
    if (!selectedPerson) return;
    try {
      if (actionType === 'checkIn') {
        await performMemberCheckIn({ memberId: selectedPerson.id });
      } else {
        // Member check out requires the attendance record ID, which we need to find
        const activeRecord = recentMembers.find((r: any) => {
           const matchesId = (r.memberDbId === selectedPerson.id || r.member_id === selectedPerson.id);
           const isActive = (r.status === 'In Gym' || r.status === 'active' || !r.checkOutTime || !r.check_out_time);
           return matchesId && isActive;
        });
        if (activeRecord) {
          await performMemberCheckOut(activeRecord.id);
        }
      }
      setSelectedPerson(null);
    } catch {
      // Handled by global error boundary or toast
    }
  };

  const isRefreshing = isRefetchingMembers || isRefetchingRecent;
  const isListLoading = isSearchIdle ? isLoadingMembers : isSearchingMembers;
  const isPendingAction = isCheckingInMember || isCheckingOutMember;

  return (
    <ScreenLayout>
      <AppHeader
        title="Check-In"
        subtitle={`Manage access · ${branchName}`}
        colors={CHECK_IN_COLORS}
        onBack={() => router.back()}
        rightAction={
          <Pressable onPress={handleRefresh} style={styles.refreshBtn}>
            <Feather name="refresh-cw" size={17} color="#ffffff" />
          </Pressable>
        }
      />
      <SlideIn right style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#1c6e5a"
            />
          }
        >
          <StaffCheckInStats />

          <View style={styles.searchRow}>
            <View style={styles.searchBoxWrapper}>
              <MemberSearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                isLoading={isSearchingMembers}
              />
            </View>
            <Pressable 
              style={styles.walkInBtnWrapper}
              onPress={() => router.push('/(staff)/check-in/register')}
            >
              <LinearGradient
                colors={['#f2a53a', '#e08a1f']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addWalkInBtn}
              >
                <Feather name="user-plus" size={15} color="#ffffff" />
                <Text style={styles.addWalkInText}>Walk-in</Text>
              </LinearGradient>
            </Pressable>
          </View>
          
          <View style={styles.filterRow}>
            <Pressable 
              style={[styles.chip, listFilter === 'all' && styles.chipActive]} 
              onPress={() => setListFilter('all')}
            >
              <Text style={[styles.chipText, listFilter === 'all' && styles.chipTextActive]}>All</Text>
              <View style={[styles.countBadge, listFilter === 'all' && styles.countBadgeActive]}>
                <Text style={[styles.countText, listFilter === 'all' && styles.countTextActive]}>{totalCount}</Text>
              </View>
            </Pressable>
            <Pressable 
              style={[styles.chip, listFilter === 'checked-in' && styles.chipActive]} 
              onPress={() => setListFilter('checked-in')}
            >
              <Text style={[styles.chipText, listFilter === 'checked-in' && styles.chipTextActive]}>Checked In</Text>
              <View style={[styles.countBadge, listFilter === 'checked-in' && styles.countBadgeActive]}>
                <Text style={[styles.countText, listFilter === 'checked-in' && styles.countTextActive]}>{checkedInCount}</Text>
              </View>
            </Pressable>
            <Pressable 
              style={[styles.chip, listFilter === 'not-checked-in' && styles.chipActive]} 
              onPress={() => setListFilter('not-checked-in')}
            >
              <Text style={[styles.chipText, listFilter === 'not-checked-in' && styles.chipTextActive]}>Not Checked In</Text>
              <View style={[styles.countBadge, listFilter === 'not-checked-in' && styles.countBadgeActive]}>
                <Text style={[styles.countText, listFilter === 'not-checked-in' && styles.countTextActive]}>{notCheckedInCount}</Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.listHeading}>
            <Text style={styles.listHeadingTitle}>Members & Visitors</Text>
            <Text style={styles.listHeadingCount}>{totalCount} total</Text>
          </View>

          <StaffCheckInList
            persons={combinedList}
            isLoading={isListLoading}
            filter={listFilter}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            activeMemberIds={activeMemberIds}
          />
        </ScrollView>
      </SlideIn>

      <CheckInConfirmationModal
        visible={!!selectedPerson}
        member={selectedPerson}
        actionType={actionType}
        onConfirm={confirmAction}
        onCancel={() => setSelectedPerson(null)}
        isLoading={isPendingAction}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: BottomTabInset + Spacing.six,
    paddingTop: Spacing.three,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    paddingHorizontal: Spacing.three,
  },
  searchBoxWrapper: {
    flex: 1,
  },
  walkInBtnWrapper: {
    shadowColor: '#e08a1f',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 4,
    borderRadius: 12,
  },
  addWalkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: '100%',
  },
  addWalkInText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    paddingHorizontal: Spacing.three,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#e3ece9',
    backgroundColor: '#ffffff',
  },
  chipActive: {
    backgroundColor: '#155c4c',
    borderColor: '#155c4c',
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#5b7770',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  countBadge: {
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 20,
    backgroundColor: '#f6f9f8',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  countText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#8fa39d',
  },
  countTextActive: {
    color: '#ffffff',
  },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: Spacing.three,
  },
  listHeadingTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#173a32',
  },
  listHeadingCount: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#8fa39d',
  },
});
