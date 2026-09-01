import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';

import { BrandColors } from '@/core/theme';

import { useCommunityNavigation } from '../hooks/useCommunityNavigation';
import { CommunityHeader } from '../components/CommunityHeader';
import { CommunityBottomNav } from '../components/CommunityBottomNav';
import { CommunityFab } from '../components/CommunityFab';
import { CommunityFeedScreen } from './CommunityFeedScreen';
import { CommunityEventsScreen } from './CommunityEventsScreen';
import { CommunityAchievementsScreen } from './CommunityAchievementsScreen';
import { CommunityLeaderboardScreen } from './CommunityLeaderboardScreen';
import { CommunityAnalyticsScreen } from '@/domains/analytics/community';

/**
 * Root Community container.
 *
 * Manages its own five-destination navigation via useCommunityNavigation().
 * Does NOT use nested Expo Router tabs. The FAB opens CreateCommunityPostScreen
 * as a full-screen Expo Router route.
 */
export function CommunityScreen() {
  const router = useRouter();
  const segments = useSegments();
  const { activeTab, setActiveTab } = useCommunityNavigation();

  const renderDestination = () => {
    switch (activeTab) {
      case 'feed':        return <CommunityFeedScreen />;
      case 'events':      return <CommunityEventsScreen />;
      case 'achievements':return <CommunityAchievementsScreen />;
      case 'leaderboard': return <CommunityLeaderboardScreen />;
      case 'stats':       return <CommunityAnalyticsScreen />;
    }
  };

  return (
    <View style={styles.container}>
      <CommunityHeader />

      <View style={styles.content}>
        {renderDestination()}
      </View>

      <CommunityFab onPress={() => {
        const roleSegment = segments[0] || '(member)';
        router.push(`/${roleSegment}/community/create-post` as never);
      }} />

      <CommunityBottomNav activeTab={activeTab} onTabPress={setActiveTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  content: {
    flex: 1,
  },
});
