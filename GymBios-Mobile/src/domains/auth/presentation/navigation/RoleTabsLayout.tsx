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
import {
  isCommunityRoute,
  isFullScreenRoute,
  isRoleHeaderHiddenRoute,
  MODULE_ROUTES,
} from './layoutRoutes';
import { TabIcon } from './tabConfigs';

export type { TabIcon };
export * from './layoutRoutes';
export * from './tabConfigs';

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

  const isFullScreen = isFullScreenRoute(segments);
  const isCommunityScreen = isCommunityRoute(segments);
  const showRoleHeader = !isCommunityScreen && !isRoleHeaderHiddenRoute(segments);

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
              (isFullScreen || isCommunityScreen) && {
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
          {MODULE_ROUTES.filter(name => !tabs.some(t => t.name === name)).map((name) => (
            <Tabs.Screen
              key={name}
              name={name}
              options={{ href: null }}
            />
          ))}
        </Tabs>

        {!isFullScreen && !isCommunityScreen && (
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