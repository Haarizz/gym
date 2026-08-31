import { useState } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { Avatar } from '@/shared/components/Avatar';
import {
  NotificationPanel,
  useProfile,
  useUnreadNotificationCount,
} from '@/domains/profile';
import { useBranchContext } from '@/shared/providers/BranchProvider';
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
  const router = useRouter();
  const segments = useSegments();
  const [isModulesOpen, setIsModulesOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isBranchSelectorOpen, setIsBranchSelectorOpen] = useState(false);
  const { profile, initials } = useProfile();
  const { count: unreadCount } = useUnreadNotificationCount();
  const { selectedBranchId, availableBranches, setSelectedBranchId } = useBranchContext();

  const roleGroup = segments[0] || '(admin)';

  const isFullScreen = isFullScreenRoute(segments);
  const isCommunityScreen = isCommunityRoute(segments);
  const showRoleHeader = !isCommunityScreen && !isRoleHeaderHiddenRoute(segments);

  const resolvedColors = (headerColors && headerColors.length > 0
    ? (headerColors.length === 1 ? [headerColors[0], headerColors[0]] : headerColors)
    : [headerColor || BrandColors.teal, headerColor || BrandColors.teal]) as unknown as readonly [string, string, ...string[]];

  const greeting = getGreeting();

  const isAdmin = roleGroup === '(admin)';

  return (
    <SafeAreaView
      edges={isFullScreen ? [] : ['top']}
      style={[styles.safeArea, { backgroundColor: isFullScreen ? BrandColors.screenBackground : resolvedColors[0] }]}>
      <View style={styles.container}>
        {!isFullScreen && showRoleHeader && (
          <View style={[styles.header, { backgroundColor: resolvedColors[0] }]}>
            <View style={styles.headerLeft}>
              <Pressable
                hitSlop={12}
                style={styles.avatarButton}
                onPress={() => {
                  router.push(`/${roleGroup}/profile` as any);
                }}
                accessibilityRole="button"
                accessibilityLabel="Open profile hub"
              >
                <Avatar
                  size={36}
                  initials={initials}
                  imageUrl={profile?.photoUrl}
                  backgroundColor="rgba(255,255,255,0.2)"
                  textColor="#FFFFFF"
                />
              </Pressable>

              <View style={styles.headerTextContainer}>
                <Text style={styles.greeting}>{greeting}</Text>
                <Pressable 
                  onPress={() => isAdmin && setIsBranchSelectorOpen(true)}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  <Text style={styles.titleText}>
                    {profile?.name || title} · {selectedBranchId === 'ALL' ? 'All branches' : availableBranches.find(b => b.id === selectedBranchId)?.branch_name || 'All branches'}
                  </Text>
                  {isAdmin && <Feather name="chevron-down" size={16} color="#FFF" style={{ marginLeft: 4 }} />}
                </Pressable>
              </View>
            </View>

            <Pressable
              hitSlop={12}
              style={styles.notificationButton}
              onPress={() => setIsNotificationsOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Notifications, ${unreadCount} unread`}
            >
              <Feather name="bell" size={20} color="#FFF" />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  {unreadCount > 1 && unreadCount <= 99 ? (
                    <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
                  ) : unreadCount > 99 ? (
                    <Text style={styles.notificationBadgeText}>99+</Text>
                  ) : null}
                </View>
              )}
            </Pressable>
          </View>
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
                href: (tab.name === 'index' ? `/${roleGroup}` : `/${roleGroup}/${tab.name}`) as any,
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

        {!isFullScreen && !isCommunityScreen && isAdmin && (
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

        <AppBottomSheet
          visible={isBranchSelectorOpen}
          title="Select Branch"
          subtitle="Choose a branch context"
          onClose={() => setIsBranchSelectorOpen(false)}
        >
          <View style={{ padding: 16 }}>
            <Pressable
              style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
              onPress={() => {
                setSelectedBranchId('ALL');
                setIsBranchSelectorOpen(false);
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: selectedBranchId === 'ALL' ? '700' : '400', color: selectedBranchId === 'ALL' ? BrandColors.teal : '#000' }}>All Branches</Text>
            </Pressable>
            {availableBranches.map((branch) => (
              <Pressable
                key={branch.id}
                style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
                onPress={() => {
                  setSelectedBranchId(branch.id);
                  setIsBranchSelectorOpen(false);
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: selectedBranchId === branch.id ? '700' : '400', color: selectedBranchId === branch.id ? BrandColors.teal : '#000' }}>{branch.branch_name}</Text>
              </Pressable>
            ))}
          </View>
        </AppBottomSheet>

        <NotificationPanel
          visible={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
        />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginRight: 10,
  },

  avatarText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },

  headerTextContainer: {
    justifyContent: 'center',
  },

  greeting: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },

  titleText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  notificationButton: {
    position: 'relative',
    padding: 4,
  },

  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },

  notificationBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
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