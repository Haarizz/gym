import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

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
      <Typography variant="subtitle" style={styles.sectionTitle}>
        Referrals Menu
      </Typography>

      <View style={styles.list}>
        {REFERRAL_MENU_ITEMS.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => handlePress(item)}
            accessibilityRole="button"
            accessibilityLabel={item.title}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.iconBg }]}>
              <Feather name={item.icon} size={22} color={item.iconColor} />
            </View>

            <View style={styles.contentContainer}>
              <Typography variant="subtitle" style={styles.itemTitle}>
                {item.title}
              </Typography>
              <Typography variant="bodySmall" color="textSecondary" style={styles.itemDescription}>
                {item.description}
              </Typography>
            </View>

            <View style={styles.navButton}>
              <Typography variant="bodySmall" style={styles.navButtonText}>
                Open
              </Typography>
              <Feather name="arrow-right" size={14} color={BrandColors.teal} />
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.four,
    marginBottom: Spacing.six,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.two,
  },
  list: {
    gap: Spacing.two,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  cardPressed: {
    backgroundColor: '#f8fafc',
    opacity: 0.9,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  contentContainer: {
    flex: 1,
    marginRight: Spacing.two,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef7f6',
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  navButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.teal,
  },
});
