import { useTranslation } from 'react-i18next';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  LayoutAnimationConfig,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
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
import { COMMUNITY_TABS, CommunityBottomNav } from '../components/CommunityBottomNav';
import { CommunityFab } from '../components/CommunityFab';
import { CommunityCommentsSheet } from '../components/CommunityCommentsSheet';
import { CommunityFeedScreen } from './CommunityFeedScreen';
import { CommunityEventsScreen } from './CommunityEventsScreen';
import { CommunityAchievementsScreen } from './CommunityAchievementsScreen';
import { CommunityLeaderboardScreen } from './CommunityLeaderboardScreen';
import { CommunityAnalyticsScreen } from '@/domains/analytics/community';
import type { CommunityTab } from '../hooks/useCommunityNavigation';

// Matches the role tabs' forTabSlide / TAB_SCENE_TRANSITION_SPEC so moving
// between Community sections feels like moving between app tabs.
const SLIDE_DISTANCE = 56;
const SLIDE_SCALE = 0.98;
const SLIDE_TIMING = { duration: 320, easing: Easing.bezier(0.2, 0.8, 0.2, 1) };

// Direction is read on the UI thread when the animation starts: the outgoing
// section never re-renders after the switch, so it can't take it as a prop.
function makeSectionTransitions(direction: SharedValue<number>) {
  const entering = () => {
    'worklet';
    return {
      initialValues: {
        opacity: 0,
        transform: [{ translateX: SLIDE_DISTANCE * direction.value }, { scale: SLIDE_SCALE }],
      },
      animations: {
        opacity: withTiming(1, SLIDE_TIMING),
        transform: [{ translateX: withTiming(0, SLIDE_TIMING) }, { scale: withTiming(1, SLIDE_TIMING) }],
      },
    };
  };
  const exiting = () => {
    'worklet';
    return {
      initialValues: {
        opacity: 1,
        transform: [{ translateX: 0 }, { scale: 1 }],
      },
      animations: {
        opacity: withTiming(0, SLIDE_TIMING),
        transform: [
          { translateX: withTiming(-SLIDE_DISTANCE * direction.value, SLIDE_TIMING) },
          { scale: withTiming(SLIDE_SCALE, SLIDE_TIMING) },
        ],
      },
    };
  };
  return { entering, exiting };
}

const tabIndex = (tab: CommunityTab) => COMMUNITY_TABS.findIndex((t) => t.key === tab);

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
  const { t } = useTranslation();
  const router = useRouter();
  const segments = useSegments();
  const { activeTab, setActiveTab } = useCommunityNavigation();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationPostId, setNotificationPostId] = useState<number | null>(null);
  const { count: unreadCount } = useUnreadNotificationCount(COMMUNITY_NOTIFICATION_MODULE);
  const canPost = useCommunityCanPost();
  const reduceMotion = useReducedMotion();

  // +1 when moving to a section further right in the nav, -1 when moving left.
  const direction = useSharedValue(1);
  const transitions = useMemo(() => makeSectionTransitions(direction), [direction]);

  const handleTabPress = useCallback((tab: CommunityTab) => {
    if (tab === activeTab) return;
    direction.set(tabIndex(tab) > tabIndex(activeTab) ? 1 : -1);
    setActiveTab(tab);
  }, [activeTab, direction, setActiveTab]);

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
        {/* skipEntering: the first section appears without sliding in. */}
        <LayoutAnimationConfig skipEntering>
          <Animated.View
            key={activeTab}
            style={StyleSheet.absoluteFill}
            entering={reduceMotion ? undefined : transitions.entering}
            exiting={reduceMotion ? undefined : transitions.exiting}
          >
            {renderDestination()}
          </Animated.View>
        </LayoutAnimationConfig>
      </View>

      {canPost && (
        <CommunityFab onPress={() => {
          const roleSegment = segments[0] || '(member)';
          router.push(`/${roleSegment}/community/create-post` as never);
        }} />
      )}

      <CommunityBottomNav activeTab={activeTab} onTabPress={handleTabPress} />

      <NotificationPanel
        visible={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        module={COMMUNITY_NOTIFICATION_MODULE}
        title={t('community.title')}
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
