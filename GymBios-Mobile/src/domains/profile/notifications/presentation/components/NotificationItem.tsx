import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { NotificationItem as NotificationItemType } from '../../domain/notification.types';
import { formatRelativeTime } from '../utils/formatTime';

interface NotificationItemRowProps {
  notification: NotificationItemType;
  onPress: (item: NotificationItemType) => void;
}

function getIconForNotification(module?: string, type?: string): keyof typeof Feather.glyphMap {
  const mod = (module || '').toUpperCase();
  const typ = (type || '').toUpperCase();

  if (mod.includes('MEMBER') || typ.includes('MEMBER')) return 'user';
  if (mod.includes('FINANCE') || mod.includes('PAYMENT') || typ.includes('PAY')) return 'credit-card';
  if (mod.includes('LEAD') || typ.includes('LEAD')) return 'user-plus';
  if (mod.includes('ATTENDANCE') || typ.includes('ATTENDANCE')) return 'check-circle';
  if (mod.includes('STAFF') || typ.includes('STAFF')) return 'briefcase';
  if (mod.includes('TARGET') || typ.includes('TARGET')) return 'target';
  if (typ.includes('EXPIR') || typ.includes('ALERT') || typ.includes('WARN')) return 'alert-circle';

  return 'bell';
}

export function NotificationItemRow({ notification, onPress }: NotificationItemRowProps) {
  const iconName = getIconForNotification(notification.module, notification.type);
  const timeFormatted = formatRelativeTime(notification.createdAt);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        !notification.isRead && styles.unreadCard,
        pressed && styles.pressedCard,
      ]}
      onPress={() => onPress(notification)}
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}, ${notification.isRead ? 'read' : 'unread'}`}
    >
      <View style={styles.contentRow}>
        {/* Module/Type Icon */}
        <View
          style={[
            styles.iconContainer,
            !notification.isRead ? styles.unreadIconContainer : styles.readIconContainer,
          ]}
        >
          <Feather
            name={iconName}
            size={18}
            color={!notification.isRead ? BrandColors.teal : BrandColors.textSecondary}
          />
        </View>

        {/* Text Details */}
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                !notification.isRead && styles.unreadTitle,
              ]}
              numberOfLines={2}
            >
              {notification.title}
            </Text>
            {!notification.isRead && <View style={styles.unreadDot} />}
          </View>

          {!!notification.message && (
            <Text style={styles.message} numberOfLines={2}>
              {notification.message}
            </Text>
          )}

          {/* Bottom metadata row: Time and View > action */}
          <View style={styles.metaRow}>
            <View style={styles.metaLeft}>
              {!!timeFormatted && (
                <Text style={styles.timeText}>{timeFormatted}</Text>
              )}
              {!!notification.module && (
                <View style={styles.moduleBadge}>
                  <Text style={styles.moduleText}>
                    {notification.module.toLowerCase()}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.viewAction}>
              <Text style={styles.viewActionText}>View</Text>
              <Feather name="chevron-right" size={14} color={BrandColors.teal} />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  unreadCard: {
    backgroundColor: '#F8FAFC',
  },
  pressedCard: {
    backgroundColor: '#F1F5F9',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  unreadIconContainer: {
    backgroundColor: '#E6F4F1',
  },
  readIconContainer: {
    backgroundColor: '#F1F5F9',
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: BrandColors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  unreadTitle: {
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BrandColors.teal,
  },
  message: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginTop: 3,
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  moduleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: '#F1F5F9',
  },
  moduleText: {
    fontSize: 10,
    color: BrandColors.textSecondary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  viewAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.teal,
  },
});
