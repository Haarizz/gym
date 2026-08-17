import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BrandColors } from '@/core/theme';
import type { NotificationItem } from '../../domain/notification.types';
import { useNotifications } from '../../hooks/useNotifications';
import { useUnreadNotificationCount } from '../../hooks/useUnreadNotificationCount';
import { useNotificationMutations } from '../../hooks/useNotificationMutations';
import { NotificationHeader } from './NotificationHeader';
import { NotificationFilterPills } from './NotificationFilterPills';
import { NotificationList } from './NotificationList';
import { NotificationFooter } from './NotificationFooter';

interface NotificationPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationPanel({ visible, onClose }: NotificationPanelProps) {
  const router = useRouter();
  const screenWidth = Dimensions.get('window').width;
  const panelWidth = Math.min(screenWidth * 0.9, 420);

  const translateX = useRef(new Animated.Value(panelWidth)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
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
  } = useNotifications();

  const { count: unreadCount, refetch: refetchUnreadCount } = useUnreadNotificationCount();
  const { markRead, markAllRead, isMarkingAllRead } = useNotificationMutations();

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      // Auto-refetch when panel opens
      refetch();
      refetchUnreadCount();

      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.5,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: panelWidth,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setIsMounted(false);
        }
      });
    }
  }, [visible, panelWidth, translateX, backdropOpacity, refetch, refetchUnreadCount]);

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchUnreadCount()]);
  };

  const handleItemPress = async (item: NotificationItem) => {
    if (!item.isRead) {
      await markRead(item.id);
    }

    if (item.actionUrl) {
      onClose();
      try {
        router.push(item.actionUrl as any);
      } catch (err) {
        // Fallback gracefully if route does not exist
      }
    }
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
  };

  if (!isMounted) {
    return null;
  }

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

        {/* Slide-over panel */}
        <Animated.View
          style={[
            styles.panel,
            { width: panelWidth, transform: [{ translateX }] },
          ]}
        >
          <SafeAreaView edges={['top']} style={styles.safeAreaContainer}>
            {/* 1. Fixed Header */}
            <NotificationHeader
              unreadCount={unreadCount}
              isRefreshing={isFetching && !isFetchingNextPage}
              onClose={onClose}
              onRefresh={handleRefresh}
            />

            {/* 2. Fixed Filter Controls */}
            <NotificationFilterPills
              activeFilter={filter}
              onSelectFilter={setFilter}
              unreadCount={unreadCount}
            />

            {/* 3. Flexible Scrollable Notification List */}
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
              />
            </View>

            {/* 4. Fixed Bottom Footer */}
            <NotificationFooter
              totalCount={totalElements}
              hasUnread={unreadCount > 0}
              isMarkingAllRead={isMarkingAllRead}
              onMarkAllRead={handleMarkAllRead}
            />
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
  },
  panel: {
    height: '100%',
    backgroundColor: BrandColors.screenBackground,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: -4, height: 0 },
    elevation: 24,
  },
  safeAreaContainer: {
    flex: 1,
    backgroundColor: BrandColors.surface,
  },
  listContainer: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
});
