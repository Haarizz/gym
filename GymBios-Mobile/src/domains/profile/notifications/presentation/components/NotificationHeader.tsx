import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Spacing } from '@/core/theme';

interface NotificationHeaderProps {
  unreadCount: number;
  isRefreshing?: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function NotificationHeader({
  unreadCount,
  isRefreshing = false,
  onClose,
  onRefresh,
}: NotificationHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.titleSection}>
          <Pressable
            hitSlop={12}
            style={styles.iconButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close notifications"
          >
            <Feather name="x" size={22} color={BrandColors.textPrimary} />
          </Pressable>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.unreadSubtitle}>
              {unreadCount} {unreadCount === 1 ? 'unread' : 'unread'}
            </Text>
          </View>
        </View>

        <Pressable
          hitSlop={12}
          style={styles.iconButton}
          onPress={onRefresh}
          disabled={isRefreshing}
          accessibilityRole="button"
          accessibilityLabel="Refresh notifications"
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={BrandColors.teal} />
          ) : (
            <Feather name="rotate-cw" size={20} color={BrandColors.textSecondary} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: BrandColors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  titleContainer: {
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    letterSpacing: -0.2,
  },
  unreadSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
});
