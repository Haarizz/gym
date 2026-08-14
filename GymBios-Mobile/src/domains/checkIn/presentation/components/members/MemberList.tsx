import { FlatList, StyleSheet } from 'react-native';
import { MemberCheckInCard } from './MemberCheckInCard';
import { EmptyState } from '../shared/EmptyState';
import { Skeleton } from '../shared/Skeleton';
import { Spacing } from '@/core/theme';

interface MemberListProps {
  members: any[];
  isLoading: boolean;
  onCheckIn: (member: any) => void;
  /** Set of memberDbId values that are currently checked in (active). */
  activeIds?: Set<number>;
}

export function MemberList({ members, isLoading, onCheckIn, activeIds }: MemberListProps) {
  if (isLoading) {
    return (
      <FlatList
        data={[1, 2, 3]}
        keyExtractor={(i) => i.toString()}
        renderItem={() => <Skeleton height={70} style={{ marginBottom: Spacing.two }} />}
        contentContainerStyle={styles.list}
      />
    );
  }

  if (members.length === 0) {
    return <EmptyState title="No members found" description="Try a different search term or ID." />;
  }

  return (
    <FlatList
      data={members}
      keyExtractor={(item) => String(item.id || item.bizId)}
      renderItem={({ item }) => {
        // Determine active status from the provided activeIds set
        const memberId = item.id ?? item.memberDbId;
        const isActive = activeIds ? activeIds.has(memberId) : false;
        return (
          <MemberCheckInCard
            member={item}
            onCheckIn={onCheckIn}
            isActive={isActive}
          />
        );
      }}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false} // rendered inside a ScrollView
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
});

