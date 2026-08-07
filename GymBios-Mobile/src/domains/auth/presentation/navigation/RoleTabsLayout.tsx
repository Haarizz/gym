import { useState } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors } from '@/core/theme';
import { AppBottomSheet, ModuleSheet } from '@/shared/components';

type TabIcon = keyof typeof Feather.glyphMap;

interface RoleTabsLayoutProps {
  title: string;
  subtitle: string;
  headerColors?: string[];
  headerColor?: string;
  activeColor: string;
  tabs: Array<{
    name: string;
    title: string;
    icon: TabIcon;
  }>;
}

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 5) return 'Welcome Back';
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  if (hour < 22) return 'Good Evening';

  return 'Welcome Back';
}

export function RoleTabsLayout({
  title,
  subtitle,
  headerColors,
  headerColor,
  activeColor,
  tabs,
}: RoleTabsLayoutProps) {
  // router is kept for future use (e.g. avatar -> profile navigation)
  const router = useRouter();
  const segments = useSegments();
  const [isModulesOpen, setIsModulesOpen] = useState(false);

  const FULL_SCREEN_ROUTES = [
    ['staff', 'create'],
    ['staff', 'edit'],
    ['membership-plans', 'create'],
    ['membership-plans', 'edit'],
    ['members', 'create'],
    ['members', 'edit'],
    ['billing', 'create-receipt'],
  ] as const;

  // Module routes that should be accessible via navigation but hidden from the bottom tab bar.
  const MODULE_ROUTES = ['membership-plans', 'members', 'billing', 'attendance'] as const;

  const isFullScreen = FULL_SCREEN_ROUTES.some(
    ([feature, action]) =>
      segments[1] === feature &&
      segments[2] === action,
  );

  const HIDE_ROLE_HEADER_ROUTES = [
    ['billing', 'receipts'],
    ['billing', 'dues'],
    ['billing', 'statements'],
    ['billing', 'members'],
    ['billing', 'reports'],
    ['billing', 'create-receipt'],

    ['members', '[id]'],
    ['staff', '[id]'],

    ['attendance', 'staffs'],
    ['attendance', 'reports'],
    ['attendance', 'today'],
    ['attendance', 'members'],
  ] as const;

  const showRoleHeader = !HIDE_ROLE_HEADER_ROUTES.some(
    ([feature, page]) =>
      segments[1] === feature &&
      segments[2] === page,
  );

  const resolvedColors = (headerColors && headerColors.length > 0
    ? (headerColors.length === 1 ? [headerColors[0], headerColors[0]] : headerColors)
    : [headerColor || BrandColors.teal, headerColor || BrandColors.teal]) as unknown as readonly [string, string, ...string[]];

  const greeting = getGreeting();

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: resolvedColors[0] }]}>
      <View style={styles.container}>
        {!isFullScreen && showRoleHeader && (
          <LinearGradient
            colors={resolvedColors}
            style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.greeting}>{greeting}</Text>

              <Pressable
                hitSlop={12}
                style={styles.avatarButton}
                onPress={() => {
                  // Future: navigate to profile screen
                }}>
                <Feather
                  name="user"
                  size={20}
                  color="#FFF"
                />
              </Pressable>
            </View>

            <View style={styles.headerBody}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
          </LinearGradient>
        )}

        <Tabs
          screenOptions={{
            headerShown: false,

            tabBarHideOnKeyboard: true,

            sceneStyle: {
              backgroundColor: BrandColors.screenBackground,
            },

            tabBarActiveTintColor: activeColor,
            tabBarInactiveTintColor: '#94A3B8',

            tabBarShowLabel: true,

            tabBarStyle: [
              styles.tabBar,
              isFullScreen && {
                display: 'none',
              },
            ],

            tabBarItemStyle: styles.tabItem,

            tabBarLabelStyle: styles.tabLabel,

            tabBarIconStyle: {
              marginBottom: 2,
            },
          }}>
          {tabs.map((tab) => (
            <Tabs.Screen
              key={tab.name}
              name={tab.name}
              options={{
                title: tab.title,
                tabBarLabel: tab.title,
                tabBarIcon: ({ color, size }) => (
                  <Feather
                    name={tab.icon}
                    color={color}
                    size={size}
                  />
                ),
              }}
            />
          ))}

          {/* Module routes: accessible via navigation but hidden from the bottom tab bar */}
          {MODULE_ROUTES.map((name) => (
            <Tabs.Screen
              key={name}
              name={name}
              options={{ href: null }}
            />
          ))}
        </Tabs>

        {!isFullScreen && (
          <Pressable
            style={({ pressed }) => [
              styles.modulesFabContainer,
              pressed && styles.modulesFabPressed,
            ]}
            onPress={() => setIsModulesOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open Modules"
          >
            <View style={styles.modulesFab}>
              <Feather name="grid" size={24} color="#FFF" />
            </View>
            <Text style={styles.modulesFabLabel}>Modules</Text>
          </Pressable>
        )}

        <AppBottomSheet
          visible={isModulesOpen}
          title="Modules"
          subtitle="Quick Access"
          onClose={() => setIsModulesOpen(false)}
        >
          <ModuleSheet onNavigate={() => setIsModulesOpen(false)} />
        </AppBottomSheet>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },

  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,

    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  greeting: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },

  avatarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  headerBody: {
    marginTop: 18,
  },

  title: {
    color: '#FFF',
    fontSize: 30,
    fontWeight: '700',
  },

  subtitle: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontWeight: '500',
  },

  tabBar: {
    position: 'absolute',

    left: 0,
    right: 0,
    bottom: 0,

    height: 74,

    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,

    backgroundColor: '#FFF',

    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',

    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,

    elevation: 16,

    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: -2,
    },
  },

  tabItem: {
    paddingVertical: 4,
    gap: 2,
  },

  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },

  modulesFabContainer: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: Platform.OS === 'ios' ? 22 : 18,
    alignItems: 'center',
    zIndex: 99,
    elevation: 20,
  },

  modulesFabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },

  modulesFab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: BrandColors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: BrandColors.surface,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  modulesFabLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.textSecondary,
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
  headerColors: [BrandColors.teal, BrandColors.teal] as string[],
  activeColor: BrandColors.teal,
};

export const MEMBER_HEADER = {
  title: 'Member Portal',
  subtitle: 'Your Fitness Journey',
  headerColors: [BrandColors.memberGold, BrandColors.trainerAmber] as string[],
  activeColor: BrandColors.memberGold,
};

export const TRAINER_HEADER = {
  title: 'Trainer Portal',
  subtitle: 'Coach Portal',
  headerColors: [BrandColors.trainerAmber, '#ea580c'] as string[],
  activeColor: BrandColors.trainerAmber,
};

export const STAFF_HEADER = {
  title: 'Staff Portal',
  subtitle: 'Front Desk',
  headerColors: [BrandColors.teal, BrandColors.tealDark] as string[],
  activeColor: BrandColors.teal,
};