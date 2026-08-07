import { FlatList, StyleSheet } from 'react-native';
import { RecentCheckInCard } from './RecentCheckInCard';
import { EmptyState } from '../shared/EmptyState';
import { Skeleton } from '../shared/Skeleton';
import { Spacing } from '@/core/theme';
import { useRecentCheckIns } from '../../hooks/useRecentCheckIns';

export function RecentCheckInList() {
  const { recentMembers, isLoading } = useRecentCheckIns();

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

  if (recentMembers.length === 0) {
    return <EmptyState title="No recent check-ins" description="Latest member activity today will appear here." />;
  }

  return (
    <FlatList
      data={recentMembers}
      keyExtractor={(item) => String(item.id || Math.random())}
      renderItem={({ item }) => (
        <RecentCheckInCard 
          record={item} 
          onCheckOut={(record) => {
            // Mock checkout function
            console.log("Check out", record.id);
          }} 
        />
      )}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false} // usually wrapped in a ScrollView
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Spacing.four,
  },
});
