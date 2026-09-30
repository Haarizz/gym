import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';

import { BrandColors } from '@/core/theme';
import {
  NotificationPanel,
  useUnreadNotificationCount,
  type NotificationItem,
} from '@/domains/profile/notifications';

import { COMMUNITY_NOTIFICATION_MODULE } from '../../domain/community.types';
import { useCommunityCanPost } from '../../hooks/useCommunity';

import { useCommunityNavigation } from '../hooks/useCommunityNavigation';
import { CommunityHeader } from '../components/CommunityHeader';
import { CommunityBottomNav } from '../components/CommunityBottomNav';
import { CommunityFab } from '../components/CommunityFab';
import { CommunityCommentsSheet } from '../components/CommunityCommentsSheet';
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
 * as a full-screen Expo Router route. The header bell opens a notification
 * panel scoped to activity on the user's own posts; tapping one opens that
 * post's comments.
 */
export function CommunityScreen() {
  const router = useRouter();
  const segments = useSegments();
  const { activeTab, setActiveTab } = useCommunityNavigation();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationPostId, setNotificationPostId] = useState<number | null>(null);
  const { count: unreadCount } = useUnreadNotificationCount(COMMUNITY_NOTIFICATION_MODULE);
  const canPost = useCommunityCanPost();

  const handleNotificationPress = (item: NotificationItem) => {
    setIsNotificationsOpen(false);
    if (item.referenceId) {
      setNotificationPostId(item.referenceId);
    }
  };

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
      <CommunityHeader
        unreadCount={unreadCount}
        onNotificationsPress={() => setIsNotificationsOpen(true)}
      />

      <View style={styles.content}>
        {renderDestination()}
      </View>

      {canPost && (
        <CommunityFab onPress={() => {
          const roleSegment = segments[0] || '(member)';
          router.push(`/${roleSegment}/community/create-post` as never);
        }} />
      )}

      <CommunityBottomNav activeTab={activeTab} onTabPress={setActiveTab} />

      <NotificationPanel
        visible={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        module={COMMUNITY_NOTIFICATION_MODULE}
        title="Community"
        onItemPress={handleNotificationPress}
      />

      <CommunityCommentsSheet
        postId={notificationPostId}
        visible={notificationPostId !== null}
        onClose={() => setNotificationPostId(null)}
      />
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
