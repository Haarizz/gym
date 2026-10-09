import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Feather from '@expo/vector-icons/Feather';
import type { NotificationItem as NotificationItemType } from '../../domain/notification.types';
import { isInformationalNotification } from '../../domain/notificationRoutes';
import { formatShortTime } from '../utils/formatTime';
import { NotificationGlass as G } from './notificationGlass';

interface NotificationItemRowProps {
  notification: NotificationItemType;
  onPress: (item: NotificationItemType) => void;
  /** Position in the list, used to stagger the entrance animation. */
  index?: number;
}

type IconName = keyof typeof Feather.glyphMap;

interface IconTone {
  name: IconName;
  background: string;
  color: string;
}

const TONES = {
  teal: { background: 'rgba(47,122,105,0.16)', color: '#24594E' },
  amber: { background: 'rgba(245,168,40,0.22)', color: '#8A5A06' },
  violet: { background: 'rgba(139,92,246,0.16)', color: '#5B32C7' },
  rose: { background: 'rgba(225,72,72,0.14)', color: '#A3302E' },
  neutral: { background: 'rgba(255,255,255,0.7)', color: '#24594E' },
} as const;

function getIconForNotification(module?: string, type?: string): IconTone {
  const mod = (module || '').toUpperCase();
  const typ = (type || '').toUpperCase();
  const has = (s: string) => mod.includes(s) || typ.includes(s);

  if (has('EXPIR') || has('ALERT') || has('WARN')) return { name: 'alert-circle', ...TONES.rose };
  if (has('COMMUNITY')) return { name: 'message-circle', ...TONES.violet };
  if (has('FINANCE') || has('PAYMENT') || has('PAY')) return { name: 'credit-card', ...TONES.teal };
  if (has('CLASS') || has('SCHEDULE') || has('BOOKING')) return { name: 'calendar', ...TONES.amber };
  if (has('STREAK') || has('REWARD')) return { name: 'award', ...TONES.violet };
  if (has('ATTENDANCE')) return { name: 'check-circle', ...TONES.teal };
  if (has('LEAD')) return { name: 'user-plus', ...TONES.amber };
  if (has('MEMBER')) return { name: 'user', ...TONES.teal };
  if (has('STAFF')) return { name: 'briefcase', ...TONES.amber };
  if (has('TARGET')) return { name: 'target', ...TONES.violet };

  return { name: 'bell', ...TONES.neutral };
}

function formatModuleLabel(module: string): string {
  return module
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

export function NotificationItemRow({ notification, onPress, index = 0 }: NotificationItemRowProps) {
  const icon = getIconForNotification(notification.module, notification.type);
  const time = formatShortTime(notification.createdAt);
  const unread = !notification.isRead;

  return (
    <Animated.View entering={FadeInDown.duration(380).delay(Math.min(index, 8) * 50)}>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          unread && styles.unreadCard,
          pressed && styles.pressedCard,
        ]}
        onPress={() => onPress(notification)}
        accessibilityRole="button"
        accessibilityLabel={`${notification.title}, ${unread ? 'unread' : 'read'}`}
      >
        <View style={[styles.iconContainer, { backgroundColor: icon.background }]}>
          <Feather name={icon.name} size={19} color={icon.color} />
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, unread && styles.unreadTitle]} numberOfLines={2}>
              {notification.title}
            </Text>
            {!!time && <Text style={styles.time}>{time}</Text>}
          </View>

          {!!notification.message && (
            <Text style={styles.message} numberOfLines={3}>
              {notification.message}
            </Text>
          )}

          <View style={styles.metaRow}>
            {notification.module ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{formatModuleLabel(notification.module)}</Text>
              </View>
            ) : (
              <View />
            )}
            {!isInformationalNotification(notification) && (
              <View style={styles.viewAction}>
                <Text style={styles.viewActionText}>View</Text>
                <Feather name="chevron-right" size={14} color={G.teal} />
              </View>
            )}
          </View>
        </View>

        {unread && <View style={styles.unreadDot} accessibilityLabel="Unread" />}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    paddingLeft: 12,
    paddingRight: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: G.cardRead,
    shadowColor: G.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  unreadCard: {
    backgroundColor: G.cardUnread,
  },
  pressedCard: {
    backgroundColor: G.cardPressed,
    transform: [{ scale: 0.985 }],
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: G.border,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.1,
    color: G.ink,
  },
  unreadTitle: {
    fontWeight: '800',
  },
  time: {
    fontSize: 11.5,
    fontWeight: '700',
    color: G.ink3,
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    color: G.ink2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3B4844',
  },
  viewAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewActionText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: G.teal,
  },
  unreadDot: {
    width: 9,
    height: 9,
    marginTop: 6,
    borderRadius: 5,
    backgroundColor: G.tealDot,
    borderWidth: 2,
    borderColor: 'rgba(47,122,105,0.25)',
    shadowColor: G.tealDot,
    shadowOpacity: 0.6,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
});
