import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useCommunityTheme } from '../../hooks/useCommunityTheme';
import { RefreshControl } from 'react-native';

import { BrandColors, Spacing } from '@/core/theme';
import { EmptyState, Loader, Typography } from '@/shared/components';

import { useCommunityLeaderboard } from '../../hooks/useCommunity';
import { CommunityLeaderboard } from '../components/CommunityLeaderboard';
import { useCommunityNavInset } from '../components/CommunityBottomNav';

export function CommunityLeaderboardScreen() {
  const { t } = useTranslation();
  const { primaryColor, headerColors } = useCommunityTheme();
  const { data, isLoading, isError, refetch, isRefetching } = useCommunityLeaderboard();
  const navInset = useCommunityNavInset();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Loader message={t('community.leaderboard.loading')} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <EmptyState
          icon="wifi-off"
          title={t('community.leaderboard.loadError')}
          description={t('community.feed.checkConnection')}
          buttonLabel={t('community.feed.retry')}
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
          title={t('community.leaderboard.emptyTitle')}
          description={t('community.leaderboard.emptyDescription')}
        />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.scroll, { paddingBottom: navInset + Spacing.three }]}
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
        {t('community.leaderboard.topContributors')}
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
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: 15,
    marginBottom: Spacing.two,
  },
});
