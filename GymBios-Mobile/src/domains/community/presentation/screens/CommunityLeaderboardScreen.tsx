import { ScrollView, StyleSheet, View } from 'react-native';
import { useCommunityTheme } from '../../hooks/useCommunityTheme';
import { RefreshControl } from 'react-native';

import { BrandColors, Spacing } from '@/core/theme';
import { EmptyState, Loader, Typography } from '@/shared/components';

import { useCommunityLeaderboard } from '../../hooks/useCommunity';
import { CommunityLeaderboard } from '../components/CommunityLeaderboard';

export function CommunityLeaderboardScreen() {
  const { primaryColor, headerColors } = useCommunityTheme();
  const { data, isLoading, isError, refetch, isRefetching } = useCommunityLeaderboard();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Loader message="Loading leaderboard…" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <EmptyState
          icon="wifi-off"
          title="Could not load leaderboard"
          description="Check your connection and try again."
          buttonLabel="Retry"
          onPress={() => refetch()}
        />
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.centered}>
        <EmptyState
          icon="bar-chart-2"
          title="No leaderboard data yet"
          description="The leaderboard will populate once members start posting and engaging."
        />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          tintColor={primaryColor}
          colors={[primaryColor]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <Typography variant="bodySmallBold" style={styles.sectionTitle}>
        Top Contributors
      </Typography>
      <CommunityLeaderboard entries={data} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  scroll: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: 15,
    marginBottom: Spacing.two,
  },
});
