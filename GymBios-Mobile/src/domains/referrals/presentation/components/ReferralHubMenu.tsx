import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { useTranslation } from 'react-i18next';

export interface MenuItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
  iconBg: string;
  iconColor: string;
}

export const REFERRAL_MENU_ITEMS: MenuItem[] = [
  {
    id: 'overview',
    title: 'Overview',
    description: 'Referral program summary and recent activity',
    icon: 'grid',
    route: '/(admin)/referrals/overview',
    iconBg: '#ccfbf1',
    iconColor: BrandColors.teal,
  },
  {
    id: 'members',
    title: 'Members',
    description: 'View members and their referral performance',
    icon: 'users',
    route: '/(admin)/referrals/members',
    iconBg: '#dbeafe',
    iconColor: '#2563eb',
  },
  {
    id: 'activity',
    title: 'Activity',
    description: 'Track and manage referral activity',
    icon: 'activity',
    route: '/(admin)/referrals/activity',
    iconBg: '#fef3c7',
    iconColor: '#d97706',
  },
  {
    id: 'my-rewards',
    title: 'My Rewards',
    description: 'View member-earned rewards',
    icon: 'gift',
    route: '/(admin)/referrals/my-rewards',
    iconBg: '#fce7f3',
    iconColor: '#db2777',
  },
  {
    id: 'reward-queue',
    title: 'Reward Queue',
    description: 'Review pending reward redemptions',
    icon: 'clock',
    route: '/(admin)/referrals/reward-queue',
    iconBg: '#e0e7ff',
    iconColor: '#4f46e5',
  },
  {
    id: 'reward-rules',
    title: 'Reward Rules',
    description: 'Manage referral reward rules',
    icon: 'sliders',
    route: '/(admin)/referrals/reward-rules',
    iconBg: '#f3e8ff',
    iconColor: '#9333ea',
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Analyze referral conversion and performance',
    icon: 'bar-chart-2',
    route: '/(admin)/referrals/analytics',
    iconBg: '#dcfce7',
    iconColor: '#16a34a',
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Configure the referral program',
    icon: 'settings',
    route: '/(admin)/referrals/settings',
    iconBg: '#f1f5f9',
    iconColor: '#475569',
  },
];

interface ReferralHubMenuProps {
  onSelectItem?: (item: MenuItem) => void;
}

export function ReferralHubMenu({ onSelectItem }: ReferralHubMenuProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const handlePress = (item: MenuItem) => {
    if (onSelectItem) {
      onSelectItem(item);
    } else {
      router.push(item.route as any);
    }
  };

  return (
    <View style={styles.container}>
      <Typography variant="caption" style={styles.sectionTitle}>
        {t('adminReferrals.menuTitle')}
      </Typography>

      <View style={styles.grid}>
        {REFERRAL_MENU_ITEMS.map((item) => {
          const title = t(`adminReferrals.hub.${item.id}.title`, { defaultValue: item.title });
          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
              onPress={() => handlePress(item)}
              accessibilityRole="button"
              accessibilityLabel={title}
            >
              <View style={styles.tileTop}>
                <View style={[styles.iconContainer, { backgroundColor: item.iconBg }]}>
                  <Feather name={item.icon} size={18} color={item.iconColor} />
                </View>
                <Feather name="chevron-right" size={16} color={BrandColors.textSecondary} />
              </View>
              <Typography variant="bodySmallBold" style={styles.itemTitle} numberOfLines={1}>
                {title}
              </Typography>
              <Typography variant="caption" color="textSecondary" style={styles.itemDescription} numberOfLines={2}>
                {t(`adminReferrals.hub.${item.id}.description`, { defaultValue: item.description })}
              </Typography>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.four,
    gap: Spacing.two + 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.one,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.two + 2,
  },
  tile: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.one,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  tilePressed: {
    opacity: 0.75,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 14,
    color: BrandColors.textPrimary,
  },
  itemDescription: {
    fontSize: 11,
    lineHeight: 15,
    minHeight: 30,
  },
});
