import { useCallback, useMemo, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Glass, heroTint } from '@/core/theme';
import { AppBottomSheet, GlassSurface, ModuleSheet } from '@/shared/components';
import { Avatar } from '@/shared/components/Avatar';
import {
  NotificationPanel,
  useProfile,
  useUnreadNotificationCount,
} from '@/domains/profile';
import { useBranchContext } from '@/shared/providers/BranchProvider';
import { getGreeting } from '@/shared/utils/greeting';
import {
  isCommunityRoute,
  isFullScreenRoute,
  isRoleHeaderHiddenRoute,
  MODULE_ROUTES,
} from './layoutRoutes';
import { TabIcon } from './tabConfigs';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { RoleTabBar, TAB_BAR_HEIGHT, TAB_SCENE_TRANSITION_SPEC, forTabSlide } from './RoleTabBar';

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


// Header glass tint: the role colours at slightly-below-full opacity so the
// pill reads as tinted glass rather than a flat painted bar.
function glassTint(color: string, alpha: number): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? heroTint(color, alpha) : color;
}

// Light role colours (member gold) need dark header content; darker ones
// (teal, amber/orange) read better in white.
function isLightColor(color: string): boolean {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return true;
  const r = parseInt(color.substring(1, 3), 16);
  const g = parseInt(color.substring(3, 5), 16);
  const b = parseInt(color.substring(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.7;
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
  const insets = useSafeAreaInsets();
  const [isModulesOpen, setIsModulesOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isBranchSelectorOpen, setIsBranchSelectorOpen] = useState(false);
  const { profile, initials } = useProfile();
  const { count: unreadCount } = useUnreadNotificationCount();
  const { selectedBranchId, availableBranches, setSelectedBranchId } = useBranchContext();
  const reduceMotion = useReducedMotion();

  const roleGroup = segments[0] || '(admin)';

  const isFullScreen = isFullScreenRoute(segments);
  const isCommunityScreen = isCommunityRoute(segments);
  const showRoleHeader = !isCommunityScreen && !isRoleHeaderHiddenRoute(segments);

  const resolvedColors = (headerColors && headerColors.length > 0
    ? (headerColors.length === 1 ? [headerColors[0], headerColors[0]] : headerColors)
    : [headerColor || BrandColors.teal, headerColor || BrandColors.teal]) as unknown as readonly [string, string, ...string[]];

  const headerTint = resolvedColors.map((c, i) =>
    glassTint(c, i === 0 ? 0.92 : 0.82),
  ) as unknown as readonly [string, string, ...string[]];
  const headerOnLight = isLightColor(resolvedColors[0]);
  const headerFg = headerOnLight ? BrandColors.textPrimary : '#FFFFFF';
  const headerFgMuted = headerOnLight ? 'rgba(30,42,58,0.65)' : 'rgba(255,255,255,0.8)';

  const greeting = getGreeting();

  const isAdmin = roleGroup === '(admin)';
  const tabBarBottom = (insets.bottom > 0 ? insets.bottom : 24) + 6;

  // Only admins have an "All branches" scope. Everyone else sees the name of
  // the branch they actually belong to — and nothing at all until they have
  // one (e.g. a fresh member with no gym membership yet).
  const selectedBranchName = selectedBranchId === 'ALL'
    ? undefined
    : availableBranches.find(b => b.id === selectedBranchId)?.branch_name;
  const branchLabel = isAdmin
    ? selectedBranchName || 'All branches'
    : selectedBranchName;

  const isTabBarHidden = isFullScreen || isCommunityScreen;

  // Stable renderer and options so header-only updates (unread count, branch)
  // don't re-render the tab bar or rebuild every screen's options.
  const renderTabBar = useCallback(
    ({ state, navigation }: BottomTabBarProps) => (
      <RoleTabBar
        state={state}
        navigation={navigation}
        tabs={tabs}
        activeColor={activeColor}
        hidden={isTabBarHidden}
        bottom={tabBarBottom}
      />
    ),
    [tabs, activeColor, isTabBarHidden, tabBarBottom],
  );

  const screenOptions = useMemo(
    () => ({
      headerShown: false,

      sceneStyle: {
        backgroundColor: BrandColors.screenBackground,
      },

      // Screens slide in from the side of the tab being moved to.
      ...(reduceMotion
        ? { animation: 'none' as const }
        : {
            animation: 'shift' as const,
            sceneStyleInterpolator: forTabSlide,
            transitionSpec: TAB_SCENE_TRANSITION_SPEC,
          }),
    }),
    [reduceMotion],
  );

  return (
    <SafeAreaView
      edges={isFullScreen ? [] : ['top']}
      style={styles.safeArea}>
      <View style={styles.container}>
        {!isFullScreen && showRoleHeader && (
          <View style={styles.headerWrap}>
            <GlassSurface tint={headerTint} radius={HEADER_RADIUS} style={styles.header}>
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
                    size={40}
                    initials={initials}
                    imageUrl={profile?.photoUrl}
                    backgroundColor="rgba(255,255,255,0.55)"
                    textColor={BrandColors.textPrimary}
                  />
                </Pressable>

                <View style={styles.headerTextContainer}>
                  <Text style={[styles.greeting, { color: headerFgMuted }]} numberOfLines={1}>
                    {greeting}
                  </Text>
                  <Pressable
                    onPress={() => isAdmin && setIsBranchSelectorOpen(true)}
                    disabled={!isAdmin}
                    style={styles.titleRow}
                  >
                    <Text style={[styles.titleText, { color: headerFg }]} numberOfLines={1}>
                      {profile?.name || title}
                    </Text>
                    {isAdmin && <Feather name="chevron-down" size={16} color={headerFg} style={{ marginLeft: 2 }} />}
                  </Pressable>
                  {!!branchLabel && (
                    <Text style={[styles.branchText, { color: headerFgMuted }]} numberOfLines={1}>
                      {branchLabel}
                    </Text>
                  )}
                </View>
              </View>

              <Pressable
                hitSlop={8}
                style={({ pressed }) => [styles.notificationButton, pressed && styles.headerButtonPressed]}
                onPress={() => setIsNotificationsOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={`Notifications, ${unreadCount} unread`}
              >
                <Feather name="bell" size={19} color={headerFg} />
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
            </GlassSurface>
          </View>
        )}

        <Tabs tabBar={renderTabBar} screenOptions={screenOptions}>
          {tabs.map((tab) => (
            <Tabs.Screen
              key={tab.name}
              name={tab.name}
              options={{
                title: tab.title,
                href: (tab.name === 'index' ? `/${roleGroup}` : `/${roleGroup}/${tab.name}`) as any,
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
              { bottom: tabBarBottom + MODULES_FAB_OFFSET },
              pressed && styles.modulesFabPressed,
            ]}
            onPress={() => setIsModulesOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open Modules"
          >
            <GlassSurface
              tint={[heroTint(BrandColors.teal, 0.92), heroTint(BrandColors.tealDark, 0.78)]}
              radius={MODULES_FAB_SIZE / 2}
              style={styles.modulesFab}
            >
              <Feather name="grid" size={22} color="#FFF" />
            </GlassSurface>
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

// Normal design spacing below the tab bar's icon/label content — the actual
// system nav/gesture clearance is added on top at runtime via insets.bottom.
const TAB_BAR_BOTTOM_PADDING = 12;

// The modules FAB is anchored to the tab bar: centred on it, then lifted so
// it floats slightly proud of the pill's top edge.
const HEADER_RADIUS = 24;

const MODULES_FAB_SIZE = 56;
const MODULES_FAB_LIFT = 14;
const MODULES_FAB_OFFSET = TAB_BAR_HEIGHT / 2 - MODULES_FAB_SIZE / 2 + MODULES_FAB_LIFT;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // Always screen background — the floating header pill provides the role
    // colour, and the space around it blends with the screen content below.
    backgroundColor: BrandColors.screenBackground,
  },

  container: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },

  // Floating pill, inset from the screen edges like the bottom tab bar, so the
  // header no longer reads as a bar pasted over a strip of background.
  // zIndex keeps its shadow above the scene rendered after it.
  headerWrap: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 4,
    zIndex: 10,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 10,
  },

  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 10,
  },

  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },

  avatarText: {
    color: BrandColors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },

  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },

  greeting: {
    fontSize: 12,
    fontWeight: '500',
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  titleText: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  branchText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },

  // Frosted circle for the bell, the same white-glass fill used inside other
  // glass panels.
  notificationButton: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.28)',
  },

  headerButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },

  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
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



  modulesFabContainer: {
    position: 'absolute',
    alignSelf: 'center',
    // bottom is set dynamically (see the Pressable above) to clear the
    // device's actual system nav/gesture inset.
    alignItems: 'center',
    zIndex: 99,
    elevation: 20,
  },

  modulesFabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },

  modulesFab: {
    width: MODULES_FAB_SIZE,
    height: MODULES_FAB_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Glass.border,
    shadowColor: BrandColors.teal,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 10,
  },
});