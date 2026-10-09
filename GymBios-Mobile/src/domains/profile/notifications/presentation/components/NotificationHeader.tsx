import React, { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { NotificationGlass as G } from './notificationGlass';

interface NotificationHeaderProps {
  title?: string;
  unreadCount: number;
  isRefreshing?: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function NotificationHeader({
  title = 'Notifications',
  unreadCount,
  isRefreshing = false,
  onClose,
  onRefresh,
}: NotificationHeaderProps) {
  const spin = useState(() => new Animated.Value(0))[0];

  // Keep the refresh icon turning while a refresh is in flight.
  useEffect(() => {
    if (!isRefreshing) return;
    spin.setValue(0);
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 700, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => {
      loop.stop();
      spin.setValue(0);
    };
  }, [isRefreshing, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.container}>
      <Pressable
        hitSlop={8}
        style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close notifications"
      >
        <Feather name="x" size={18} color={G.ink} />
      </Pressable>

      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.subtitle}>
          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        </Text>
      </View>

      <Pressable
        hitSlop={8}
        style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
        onPress={onRefresh}
        disabled={isRefreshing}
        accessibilityRole="button"
        accessibilityLabel="Refresh notifications"
      >
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Feather name="rotate-cw" size={18} color={G.ink} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: G.control,
    borderWidth: 1,
    borderColor: G.borderStrong,
    shadowColor: G.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  iconButtonPressed: {
    backgroundColor: G.controlPressed,
    transform: [{ scale: 0.94 }],
  },
  titleContainer: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: G.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: G.muted,
  },
});
