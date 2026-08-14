import { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BottomTabInset, BrandColors, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { SearchBar } from '@/shared/components/SearchBar';

import { useTrainingStreams, useTrainingStreamAnalytics } from '../../hooks/useTrainingStreams';
import { useTrainingStreamFilters, type HubTab } from '../hooks/useTrainingStreamFilters';

import { HubActionButton } from '../components/HubActionButton';
import { TrainingStreamList } from '../components/TrainingStreamList';
import { TrainingStreamStats } from '../components/TrainingStreamStats';

export function TrainingStreamsHubScreen() {
  const router = useRouter();
  const { activeTab, setActiveTab, search, setSearch, getQueryFilters } = useTrainingStreamFilters();
  
  const filters = getQueryFilters();
  const { data: streams = [], isLoading: loadingStreams, error: errorStreams, refetch: refetchStreams, isFetching: fetchingStreams } = useTrainingStreams(filters);
  const { data: stats, isLoading: loadingStats, refetch: refetchStats, isFetching: fetchingStats } = useTrainingStreamAnalytics();

  const handleRefresh = useCallback(() => {
    refetchStreams();
    refetchStats();
  }, [refetchStreams, refetchStats]);

  const isRefreshing = fetchingStreams || fetchingStats;

  return (
    <ScreenLayout>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={BrandColors.teal}
          />
        }
      >
        {/* Actions */}
        <View style={styles.actionsRow}>
          <HubActionButton
            title="Upload Recording"
            iconName="upload-cloud"
            onPress={() => router.push('/(admin)/training-streams/upload')}
            style={styles.actionButton}
          />

          <HubActionButton
            title="Create Stream"
            iconName="video"
            onPress={() => router.push('/(admin)/training-streams/create')}
            style={styles.actionButton}
          />
        </View>

        {/* Search */}
        {activeTab !== 'Analytics' && (
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search streams..."
          />
        )}

        {/* Segmented Tabs (Horizontal Scroll) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {['All', 'Live', 'Scheduled', 'Library', 'Analytics'].map((tab) => (
            <HubActionButton
              key={tab}
              title={tab}
              iconName={
                tab === 'All' ? 'list' :
                tab === 'Live' ? 'radio' :
                tab === 'Scheduled' ? 'calendar' :
                tab === 'Library' ? 'folder' : 'bar-chart-2'
              }
              onPress={() => setActiveTab(tab as HubTab)}
              style={[styles.tabCard, activeTab === tab && styles.tabCardActive]}
            />
          ))}
        </ScrollView>

        {/* Content Area */}
        <View style={styles.contentArea}>
          {activeTab === 'Analytics' ? (
            <TrainingStreamStats stats={stats} loading={loadingStats} />
          ) : (
            <>

              <TrainingStreamList
                streams={streams}
                loading={loadingStreams}
                error={errorStreams as Error | null}
                onCreateAction={() => router.push('/(admin)/training-streams/create')}
              />
            </>
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.three,
    gap: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
  },
  tabsScroll: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  tabCard: {
    minWidth: 140,
    padding: Spacing.two,
  },
  tabCardActive: {
    borderColor: BrandColors.teal,
    borderWidth: 1,
  },
  contentArea: {
    marginTop: Spacing.one,
  },
});
