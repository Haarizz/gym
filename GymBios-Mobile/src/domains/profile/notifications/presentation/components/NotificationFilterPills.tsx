import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { NotificationFilter } from '../../domain/notification.types';

interface NotificationFilterPillsProps {
  activeFilter: NotificationFilter;
  onSelectFilter: (filter: NotificationFilter) => void;
  unreadCount?: number;
}

export function NotificationFilterPills({
  activeFilter,
  onSelectFilter,
  unreadCount,
}: NotificationFilterPillsProps) {
  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.pill,
          activeFilter === 'ALL' && styles.activePill,
        ]}
        onPress={() => onSelectFilter('ALL')}
        accessibilityRole="button"
        accessibilityState={{ selected: activeFilter === 'ALL' }}
      >
        <Text
          style={[
            styles.pillText,
            activeFilter === 'ALL' && styles.activePillText,
          ]}
        >
          All
        </Text>
      </Pressable>

      <Pressable
        style={[
          styles.pill,
          activeFilter === 'UNREAD' && styles.activePill,
        ]}
        onPress={() => onSelectFilter('UNREAD')}
        accessibilityRole="button"
        accessibilityState={{ selected: activeFilter === 'UNREAD' }}
      >
        <Text
          style={[
            styles.pillText,
            activeFilter === 'UNREAD' && styles.activePillText,
          ]}
        >
          Unread {unreadCount !== undefined && unreadCount > 0 ? `(${unreadCount})` : ''}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BrandColors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activePill: {
    backgroundColor: BrandColors.teal,
    borderColor: BrandColors.teal,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  activePillText: {
    color: '#FFFFFF',
  },
});
