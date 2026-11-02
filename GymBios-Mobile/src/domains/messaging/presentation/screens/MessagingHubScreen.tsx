import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Text } from '@/shared/components/AppText';
import { useRouter, useSegments } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { useMessagingAnalytics } from '../../hooks/useMessagingHooks';
import { useUnreadChatCount } from '@/domains/conversations';

type MessagingModule = {
  id: string;
  title: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
  description?: string;
  badge?: number;
};

export function MessagingHubScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const segments = useSegments();
  const { data: analytics } = useMessagingAnalytics();
  
  const roleGroup = segments[0] || '(admin)';
  // Member chats are for the staff and trainer apps; admins use the web reports.
  const hasChats = roleGroup === '(staff)' || roleGroup === '(trainer)';
  const { data: unreadChats = 0 } = useUnreadChatCount('staff', hasChats);

  let brandColor: string = BrandColors.teal;
  let bgOverlay: string = 'rgba(50, 127, 116, 0.1)';
  
  if (roleGroup === '(trainer)') {
    brandColor = BrandColors.trainerAmber;
    bgOverlay = 'rgba(245, 158, 11, 0.1)';
  } else if (roleGroup === '(member)') {
    brandColor = BrandColors.memberGold;
    bgOverlay = 'rgba(245, 199, 66, 0.1)';
  } else if (roleGroup === '(staff)') {
    brandColor = BrandColors.tealDark;
    bgOverlay = 'rgba(42, 107, 98, 0.1)';
  }

  const messagingModules: MessagingModule[] = useMemo(() => [
    ...(hasChats
      ? [{ id: 'chats', title: t('conversations.hubTitle'), icon: 'message-circle' as const, route: `/${roleGroup}/messaging/chats`, description: t('conversations.hubDesc'), badge: unreadChats }]
      : []),
    { id: 'compose', title: t('messaging.hub.composeTitle'), icon: 'edit', route: `/${roleGroup}/messaging/compose`, description: t('messaging.hub.composeDesc') },
    { id: 'history', title: t('messaging.hub.historyTitle'), icon: 'clock', route: `/${roleGroup}/messaging/history`, description: t('messaging.hub.historyDesc') },
    { id: 'templates', title: t('messaging.hub.templatesTitle'), icon: 'layout', route: `/${roleGroup}/messaging/templates`, description: t('messaging.hub.templatesDesc') },
    { id: 'analytics', title: t('messaging.hub.analyticsTitle'), icon: 'bar-chart-2', route: `/${roleGroup}/messaging/analytics`, description: t('messaging.hub.analyticsDesc') },
  ], [roleGroup, t, hasChats, unreadChats]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('messaging.hub.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('messaging.hub.subtitle')}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {analytics && (
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>{t('messaging.hub.sentToday')}</Text>
                <Text style={styles.statValue}>{analytics.sentToday}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>{t('messaging.hub.scheduled')}</Text>
                <Text style={styles.statValue}>{analytics.scheduledMessages}</Text>
              </View>
            </View>
          )}

          <View style={styles.listContainer}>
            {messagingModules.map((item) => (
              <Pressable
                key={item.id}
                style={styles.listItem}
                onPress={() => router.push(item.route as never)}
                android_ripple={{ color: '#F3F4F6' }}
              >
                <View style={styles.listItemContent}>
                  <View style={[styles.iconContainer, { backgroundColor: bgOverlay }]}>
                    <Feather name={item.icon} size={20} color={brandColor} />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {item.description && (
                      <Text style={styles.itemSubtitle}>{item.description}</Text>
                    )}
                  </View>
                </View>
                {!!item.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
                  </View>
                )}
                <Feather name="chevron-right" size={20} color={BrandColors.textSecondary} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  headerTitle: {
    fontSize: TypographyScale.title,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  headerSubtitle: {
    fontSize: TypographyScale.body,
    color: BrandColors.textSecondary,
    marginTop: Spacing.one,
  },
  scrollContent: {
    paddingBottom: Spacing.six,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.four,
    gap: Spacing.three,
  },
  statCard: {
    flex: 1,
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
    marginBottom: Spacing.one,
  },
  statValue: {
    fontSize: TypographyScale.title,
    fontWeight: 'bold',
    color: BrandColors.textPrimary,
  },
  listContainer: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: TypographyScale.body,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.danger,
    marginEnd: Spacing.two,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  itemSubtitle: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
});

