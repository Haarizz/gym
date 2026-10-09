import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useSegments, type Href } from 'expo-router';
import type { NotificationItem } from '../../domain/notification.types';
import { isInformationalNotification, resolveNotificationRoute } from '../../domain/notificationRoutes';
import { toast } from '@/shared/components/Toasts';
import { useNotifications } from '../../hooks/useNotifications';
import { useUnreadNotificationCount } from '../../hooks/useUnreadNotificationCount';
import { useNotificationMutations } from '../../hooks/useNotificationMutations';
import { NotificationHeader } from './NotificationHeader';
import { NotificationFilterPills } from './NotificationFilterPills';
import { NotificationList } from './NotificationList';
import { NotificationFooter } from './NotificationFooter';
import { NotificationGlass as G } from './notificationGlass';

const glassAvailable = isLiquidGlassAvailable();
/** Sheet sits inset from the screen edges so it reads as a floating glass card. */
const SHEET_RIGHT = 10;
const SHEET_RADIUS = 32;
/** Room under the list for the floating footer pill. */
const FOOTER_CLEARANCE = 96;

interface NotificationPanelProps {
  visible: boolean;
  onClose: () => void;
  /** Scope the panel (list, unread count, mark-all-read) to one backend notification module. */
  module?: string;
  title?: string;
  /**
   * Replaces the default "navigate to actionUrl" behaviour on tap. The item is
   * still marked read first; the caller decides whether to close the panel.
   */
  onItemPress?: (item: NotificationItem) => void;
}

export function NotificationPanel({ visible, onClose, module, title, onItemPress }: NotificationPanelProps) {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const panelWidth = Math.min(screenWidth - 44, 420);
  // Fully off-screen, including the right gutter and shadow.
  const hiddenOffset = panelWidth + SHEET_RIGHT + 24;

  const translateX = useState(() => new Animated.Value(hiddenOffset))[0];
  const scale = useState(() => new Animated.Value(0.98))[0];
  const backdropOpacity = useState(() => new Animated.Value(0))[0];
  const [isMounted, setIsMounted] = useState(visible);

  const {
    groupedNotifications,
    filter,
    setFilter,
    totalElements,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useNotifications(module);

  const { count: unreadCount, refetch: refetchUnreadCount } = useUnreadNotificationCount(module);
  const { markRead, markAllRead, isMarkingAllRead } = useNotificationMutations(module);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      // Auto-refetch when panel opens
      refetch();
      refetchUnreadCount();

      // Spring in with a touch of overshoot, like the reference's cubic-bezier(.2,.9,.25,1.05).
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 190,
          mass: 0.9,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 18,
          stiffness: 160,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: hiddenOffset,
          duration: 260,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.98,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setIsMounted(false);
        }
      });
    }
  }, [visible, hiddenOffset, translateX, scale, backdropOpacity, refetch, refetchUnreadCount]);

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchUnreadCount()]);
  };

  const handleItemPress = async (item: NotificationItem) => {
    if (!item.isRead) {
      await markRead(item.id);
    }

    if (onItemPress) {
      onItemPress(item);
      return;
    }

    // Purely informational — tapping only marks it read.
    if (isInformationalNotification(item)) return;

    // Close first either way: the toast host sits under this Modal and would be hidden.
    onClose();
    const route = resolveNotificationRoute(item, segments[0] ?? '');
    if (route) {
      router.push(route as Href);
    } else {
      toast.info('This isn’t available in the mobile app yet. Please check the web app.');
    }
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
  };

  if (!isMounted) {
    return null;
  }

  const renderContent = () => (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
        style={styles.sheen}
      />

      <NotificationHeader
        title={title}
        unreadCount={unreadCount}
        isRefreshing={isFetching && !isFetchingNextPage}
        onClose={onClose}
        onRefresh={handleRefresh}
      />

      <NotificationFilterPills
        activeFilter={filter}
        onSelectFilter={setFilter}
        unreadCount={unreadCount}
        totalCount={totalElements}
      />

      <View style={styles.listContainer}>
        <NotificationList
          sections={groupedNotifications}
          filter={filter}
          isLoading={isLoading}
          isFetching={isFetching}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          onRefresh={handleRefresh}
          onLoadMore={fetchNextPage}
          onItemPress={handleItemPress}
          bottomInset={FOOTER_CLEARANCE}
        />
      </View>

      <NotificationFooter
        totalCount={totalElements}
        hasUnread={unreadCount > 0}
        isMarkingAllRead={isMarkingAllRead}
        onMarkAllRead={handleMarkAllRead}
      />
    </>
  );

  return (
    <Modal
      transparent
      visible={isMounted}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlayContainer}>
        {/* Dimmed backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropOpacity },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Dismiss notifications"
          />
        </Animated.View>

        {/* Floating glass sheet */}
        <Animated.View
          style={[
            styles.sheetShadow,
            {
              width: panelWidth,
              top: insets.top + 8,
              bottom: Math.max(insets.bottom, 12),
              opacity: translateX.interpolate({
                inputRange: [0, hiddenOffset],
                outputRange: [1, 0.6],
              }),
              transform: [{ translateX }, { scale }],
            },
          ]}
        >
          {glassAvailable ? (
            <GlassView glassEffectStyle="regular" colorScheme="light" style={styles.sheet}>
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glassFill]} />
              {renderContent()}
            </GlassView>
          ) : (
            <View style={[styles.sheet, styles.sheetFallback]}>{renderContent()}</View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: G.scrim,
  },
  sheetShadow: {
    position: 'absolute',
    right: SHEET_RIGHT,
    borderRadius: SHEET_RADIUS,
    shadowColor: G.shadow,
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 24 },
    elevation: 24,
  },
  sheet: {
    flex: 1,
    borderRadius: SHEET_RADIUS,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: G.border,
  },
  glassFill: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  sheetFallback: {
    backgroundColor: G.sheetFallback,
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  listContainer: {
    flex: 1,
  },
});
