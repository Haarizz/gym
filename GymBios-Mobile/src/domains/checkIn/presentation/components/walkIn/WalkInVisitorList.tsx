import { FlatList, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { WalkInVisitorCard } from './WalkInVisitorCard';
import { EmptyState } from '../shared/EmptyState';
import { Skeleton } from '../shared/Skeleton';
import { Spacing } from '@/core/theme';
import { useRecentCheckIns } from '../../hooks/useRecentCheckIns';

export function WalkInVisitorList() {
  const { t } = useTranslation();
  const { recentVisitors, isLoading } = useRecentCheckIns();

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

  if (recentVisitors.length === 0) {
    return (
      <EmptyState
        title={t('checkIn.walkIn.noDailyVisitorsYet')}
        description={t('checkIn.walkIn.noDailyVisitorsYetDesc')}
        icon="users"
      />
    );
  }

  return (
    <FlatList
      data={recentVisitors}
      keyExtractor={(item) => String(item.id || Math.random())}
      renderItem={({ item }) => <WalkInVisitorCard visitor={item} />}
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
