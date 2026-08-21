import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandColors, Spacing } from '@/core/theme';

interface NotificationFooterProps {
  totalCount: number;
  hasUnread: boolean;
  isMarkingAllRead?: boolean;
  onMarkAllRead: () => void;
}

export function NotificationFooter({
  totalCount,
  hasUnread,
  isMarkingAllRead = false,
  onMarkAllRead,
}: NotificationFooterProps) {
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.totalText}>
          {totalCount} {totalCount === 1 ? 'total' : 'total'}
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.markAllButton,
            (!hasUnread || isMarkingAllRead) && styles.disabledButton,
            pressed && hasUnread && styles.pressedButton,
          ]}
          onPress={onMarkAllRead}
          disabled={!hasUnread || isMarkingAllRead}
          accessibilityRole="button"
          accessibilityLabel="Mark all as read"
        >
          {isMarkingAllRead ? (
            <ActivityIndicator size="small" color={BrandColors.teal} />
          ) : (
            <Text
              style={[
                styles.markAllText,
                !hasUnread && styles.disabledMarkAllText,
              ]}
            >
              Mark all as read
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: BrandColors.surface,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: -2 },
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 52,
  },
  totalText: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  markAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  pressedButton: {
    backgroundColor: '#F1F5F9',
  },
  disabledButton: {
    opacity: 0.6,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.teal,
  },
  disabledMarkAllText: {
    color: '#94A3B8',
  },
});
