import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { Input } from '@/shared/components/Input';
import { SearchBar } from '@/shared/components/SearchBar';
import { Typography } from '@/shared/components/Typography';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { MemberCard } from '../components/MemberCard';
import { useMembers } from '../../hooks/useMembers';
import type { Member } from '../../domain/Member';

interface MembersListScreenProps {
  onNavigateToDetail: (member: Member) => void;
  onNavigateToCreate: () => void;
}

export function MembersListScreen({
  onNavigateToDetail,
  onNavigateToCreate,
}: MembersListScreenProps) {
  const theme = useTheme();
  const { members, loading, error, totalElements, refresh } = useMembers();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [membershipTypeFilter, setMembershipTypeFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');

  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const query = search.toLowerCase();
      const matchesSearch =
        !query ||
        member.name.toLowerCase().includes(query) ||
        String(member.id).includes(query) ||
        (member.membershipPlanName ?? '').toLowerCase().includes(query);

      const matchesStatus =
        !statusFilter || member.status.toUpperCase() === statusFilter.toUpperCase();
      const matchesMembershipType =
        !membershipTypeFilter ||
        member.membershipType.toUpperCase() === membershipTypeFilter.toUpperCase();
      const matchesPaymentStatus =
        !paymentStatusFilter ||
        member.paymentStatus.toUpperCase() === paymentStatusFilter.toUpperCase();

      return (
        matchesSearch &&
        matchesStatus &&
        matchesMembershipType &&
        matchesPaymentStatus
      );
    });
  }, [members, search, statusFilter, membershipTypeFilter, paymentStatusFilter]);

  const renderItem = useCallback(
    ({ item }: { item: Member }) => (
      <MemberCard member={item} onPress={onNavigateToDetail} />
    ),
    [onNavigateToDetail],
  );

  const renderHeader = useCallback(
    () => (
      <View style={styles.headerContainer}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search members by name or ID..."
        />

        <View style={styles.filterRow}>
          <View style={styles.filterWrap}>
            <Input
              label="Status"
              value={statusFilter}
              onChangeText={setStatusFilter}
              placeholder="ACTIVE"
            />
          </View>
          <View style={styles.filterWrap}>
            <Input
              label="Membership"
              value={membershipTypeFilter}
              onChangeText={setMembershipTypeFilter}
              placeholder="STANDARD"
            />
          </View>
          <View style={styles.filterWrap}>
            <Input
              label="Payment"
              value={paymentStatusFilter}
              onChangeText={setPaymentStatusFilter}
              placeholder="PAID"
            />
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement }]}>
            <Typography variant="caption" color="textSecondary">
              Total Members
            </Typography>
            <Typography variant="title" style={styles.summaryValue}>
              {totalElements}
            </Typography>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement }]}>
            <Typography variant="caption" color="textSecondary">
              Showing
            </Typography>
            <Typography variant="title" style={styles.summaryValue}>
              {filteredMembers.length}
            </Typography>
          </View>
        </View>

        <Button
          label="+ Add Member"
          onPress={onNavigateToCreate}
          size="lg"
        />
      </View>
    ),
    [
      search,
      statusFilter,
      membershipTypeFilter,
      paymentStatusFilter,
      totalElements,
      filteredMembers.length,
      theme,
      onNavigateToCreate,
    ],
  );

  const renderEmpty = useCallback(() => {
    if (loading) return null;
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
          search
            ? 'Try adjusting your search or filters.'
            : 'Add your first member to get started.'
        }
        icon="users"
        buttonLabel={!search ? 'Add Member' : undefined}
        onPress={!search ? onNavigateToCreate : undefined}
      />
    );
  }, [loading, error, search, onNavigateToCreate]);

  if (loading && members.length === 0) {
    return (
      <ScreenLayout>
        <LoadingSkeleton count={3} />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <FlatList
          data={filteredMembers}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={refresh}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  filterWrap: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  summaryCard: {
    flex: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  summaryValue: {
    fontSize: 20,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: Spacing.four,
  },
});