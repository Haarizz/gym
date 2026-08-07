import { FlatList, StyleSheet } from 'react-native';
import { MemberCheckInCard } from './MemberCheckInCard';
import { EmptyState } from '../shared/EmptyState';
import { Skeleton } from '../shared/Skeleton';
import { Spacing } from '@/core/theme';
import { useRecentCheckIns } from '../../hooks/useRecentCheckIns';

interface MemberListProps {
  members: any[];
  isLoading: boolean;
  onCheckIn: (member: any) => void;
}

export function MemberList({ members, isLoading, onCheckIn }: MemberListProps) {
  const { summary } = useRecentCheckIns(); 
  // Ideally, active status comes from a backend list of active members or we cross-check with today's attendance

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
      renderItem={({ item }) => (
        <MemberCheckInCard 
          member={item} 
          onCheckIn={onCheckIn} 
          // For mockup: assume active if member ID is 7 based on the web UI example, or just use a dummy logic
          isActive={item.id === 7 || item.bizId === 'MBR-0000000007'} 
        />
      )}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false} // since it might be rendered inside a ScrollView
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Spacing.four,
  },
});
