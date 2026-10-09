import React, { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import type { NotificationFilter } from '../../domain/notification.types';
import { NotificationGlass as G } from './notificationGlass';

interface NotificationFilterPillsProps {
  activeFilter: NotificationFilter;
  onSelectFilter: (filter: NotificationFilter) => void;
  unreadCount?: number;
  totalCount?: number;
}

const TRACK_PADDING = 4;
const GAP = 4;

/** Segmented All / Unread control with a glass thumb that springs between the two options. */
export function NotificationFilterPills({
  activeFilter,
  onSelectFilter,
  unreadCount = 0,
  totalCount,
}: NotificationFilterPillsProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const position = useState(() => new Animated.Value(activeFilter === 'UNREAD' ? 1 : 0))[0];

  useEffect(() => {
    Animated.spring(position, {
      toValue: activeFilter === 'UNREAD' ? 1 : 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
      mass: 0.8,
    }).start();
  }, [activeFilter, position]);

  const thumbWidth = trackWidth > 0 ? (trackWidth - TRACK_PADDING * 2 - GAP) / 2 : 0;
  const translateX = position.interpolate({ inputRange: [0, 1], outputRange: [0, thumbWidth + GAP] });

  const onTrackLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.wrap}>
      <View style={styles.track} onLayout={onTrackLayout} accessibilityRole="tablist">
        {thumbWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[styles.thumb, { width: thumbWidth, transform: [{ translateX }] }]}
          />
        )}

        <Pressable
          style={styles.option}
          onPress={() => onSelectFilter('ALL')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeFilter === 'ALL' }}
        >
          <Text style={[styles.optionText, activeFilter === 'ALL' && styles.optionTextActive]}>All</Text>
          {totalCount !== undefined && totalCount > 0 && <Text style={styles.count}>{totalCount}</Text>}
        </Pressable>

        <Pressable
          style={styles.option}
          onPress={() => onSelectFilter('UNREAD')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeFilter === 'UNREAD' }}
        >
          <Text style={[styles.optionText, activeFilter === 'UNREAD' && styles.optionTextActive]}>Unread</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  track: {
    flexDirection: 'row',
    gap: GAP,
    padding: TRACK_PADDING,
    borderRadius: 999,
    backgroundColor: G.track,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  thumb: {
    position: 'absolute',
    top: TRACK_PADDING,
    bottom: TRACK_PADDING,
    left: TRACK_PADDING,
    borderRadius: 999,
    backgroundColor: G.thumb,
    shadowColor: G.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  option: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B4844',
  },
  optionTextActive: {
    color: G.ink,
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5A6763',
  },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: G.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
