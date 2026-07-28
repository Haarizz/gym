import { Tabs, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors } from '@/core/theme';
import { AppHeader } from '@/shared/components';

import { ROLE_SELECTION_HREF } from './routes';

type TabIcon = keyof typeof Feather.glyphMap;

interface RoleTabsLayoutProps {
  title: string;
  subtitle: string;
  headerColors: [string, string];
  activeColor: string;
  tabs: Array<{ name: string; title: string; icon: TabIcon }>;
}

export function RoleTabsLayout({
  title,
  subtitle,
  headerColors,
  activeColor,
  tabs,
}: RoleTabsLayoutProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <AppHeader
        title={title}
        subtitle={subtitle}
        colors={headerColors}
        onBack={() => router.replace(ROLE_SELECTION_HREF)}
      />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: activeColor,
          tabBarInactiveTintColor: '#6b7280',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopColor: '#e5e7eb',
            height: 64,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
          },
        }}>
        {tabs.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              tabBarIcon: ({ color, size }) => (
                <Feather name={tab.icon} size={size} color={color} />
              ),
            }}
          />
        ))}
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
});

export const ADMIN_TABS = [
  { name: 'index', title: 'Dashboard', icon: 'grid' as const },
  { name: 'staff', title: 'Staff', icon: 'users' as const },
  { name: 'deals', title: 'Deals', icon: 'tag' as const },
  { name: 'analytics', title: 'Analytics', icon: 'bar-chart-2' as const },
];

export const MEMBER_TABS = [
  { name: 'index', title: 'Home', icon: 'home' as const },
  { name: 'bookings', title: 'Bookings', icon: 'calendar' as const },
  { name: 'centers', title: 'Centers', icon: 'map-pin' as const },
  { name: 'membership', title: 'Membership', icon: 'credit-card' as const },
  { name: 'profile', title: 'Profile', icon: 'user' as const },
];

export const TRAINER_TABS = [
  { name: 'index', title: 'Home', icon: 'home' as const },
  { name: 'schedule', title: 'Schedule', icon: 'calendar' as const },
  { name: 'performance', title: 'Performance', icon: 'trending-up' as const },
  { name: 'ledger', title: 'Ledger', icon: 'book-open' as const },
  { name: 'profile', title: 'Profile', icon: 'user' as const },
];

export const STAFF_TABS = [
  { name: 'index', title: 'Home', icon: 'home' as const },
  { name: 'performance', title: 'Performance', icon: 'trending-up' as const },
  { name: 'schedule', title: 'Schedule', icon: 'calendar' as const },
  { name: 'ledger', title: 'Ledger', icon: 'book-open' as const },
  { name: 'profile', title: 'Profile', icon: 'user' as const },
];

export const ADMIN_HEADER = {
  title: 'Admin',
  subtitle: 'Command Center',
  headerColors: [BrandColors.teal, BrandColors.teal] as [string, string],
  activeColor: BrandColors.teal,
};

export const MEMBER_HEADER = {
  title: 'Member Portal',
  subtitle: 'Your Fitness Journey',
  headerColors: [BrandColors.memberGold, BrandColors.trainerAmber] as [string, string],
  activeColor: BrandColors.memberGold,
};

export const TRAINER_HEADER = {
  title: 'Trainer Portal',
  subtitle: 'Coach Portal',
  headerColors: [BrandColors.trainerAmber, '#ea580c'] as [string, string],
  activeColor: BrandColors.trainerAmber,
};

export const STAFF_HEADER = {
  title: 'Staff Portal',
  subtitle: 'Front Desk',
  headerColors: [BrandColors.teal, BrandColors.tealDark] as [string, string],
  activeColor: BrandColors.teal,
};
