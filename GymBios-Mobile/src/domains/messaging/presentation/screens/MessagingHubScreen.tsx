import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { useMessagingAnalytics } from '../../hooks/useMessagingHooks';

type MessagingModule = {
  id: string;
  title: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
  description?: string;
};

export function MessagingHubScreen() {
  const router = useRouter();
  const segments = useSegments();
  const { data: analytics } = useMessagingAnalytics();
  
  const roleGroup = segments[0] || '(admin)';

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
    { id: 'compose', title: 'Compose Message', icon: 'edit', route: `/${roleGroup}/messaging/compose`, description: 'Send new messages & campaigns' },
    { id: 'history', title: 'Message History', icon: 'clock', route: `/${roleGroup}/messaging/history`, description: 'View sent & scheduled messages' },
    { id: 'templates', title: 'Templates', icon: 'layout', route: `/${roleGroup}/messaging/templates`, description: 'Manage reusable message templates' },
    { id: 'analytics', title: 'Analytics', icon: 'bar-chart-2', route: `/${roleGroup}/messaging/analytics`, description: 'Messaging performance & insights' },
  ], [roleGroup]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messaging Center</Text>
          <Text style={styles.headerSubtitle}>Manage member communications</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {analytics && (
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Sent Today</Text>
                <Text style={styles.statValue}>{analytics.sentToday}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Scheduled</Text>
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
  itemSubtitle: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
});

