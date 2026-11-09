import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated as RNAnimated,
  Easing as RNEasing,
  Keyboard,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { BrandColors, Fonts } from '@/core/theme';
import { TabIcon } from './tabConfigs';

export const TAB_BAR_HEIGHT = 68;

// Gradient stops for the bar, top to bottom.
export type TabBarColors = readonly [string, string];

const BAR_RADIUS = 26;
const BAR_SIDE_INSET = 12;

// The active tab's icon sits in a soft pill that slides between tabs.
const PILL_WIDTH = 46;
const PILL_HEIGHT = 28;
const TAB_CONTENT_TOP = 11;

// Centre quick-access button (admin only). It sits in a gap between the two
// halves of the tabs and rises above the bar's top edge.
const CENTER_SLOT_WIDTH = 76;
const FAB_SIZE = 60;
const FAB_RING = 5;
const FAB_OVERHANG = 20;
const FAB_COLORS = ['#FFC053', '#E08A0B'] as const;

const BUBBLE_SPRING = { damping: 16, stiffness: 180, mass: 0.9 };
const ICON_SPRING = { damping: 18, stiffness: 180, mass: 1 };

// Light bars (member gold) take dark content; darker ones (teal, orange)
// take white.
function isLightColor(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.7;
}

type BarPalette = { active: string; inactive: string; pill: string };

function paletteFor(colors: TabBarColors): BarPalette {
  return isLightColor(colors[0])
    ? { active: '#1B2433', inactive: 'rgba(27,36,51,0.62)', pill: 'rgba(255,255,255,0.45)' }
    : { active: '#FFFFFF', inactive: 'rgba(255,255,255,0.72)', pill: 'rgba(255,255,255,0.2)' };
}

// ---------------------------------------------------------------------------
// Screen transition
// ---------------------------------------------------------------------------

// Tab scenes get progress -1 (left of the active tab), 0 (active) or 1 (right
// of it), so sliding by progress makes the incoming screen enter from the side
// the user is travelling towards and the outgoing one leave the other way.
export function forTabSlide({ current }: { current: { progress: RNAnimated.Value } }) {
  return {
    sceneStyle: {
      opacity: current.progress.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [0, 1, 0],
      }),
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [-56, 0, 56],
          }),
        },
        {
          scale: current.progress.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [0.98, 1, 0.98],
          }),
        },
      ],
    },
  };
}

export const TAB_SCENE_TRANSITION_SPEC = {
  animation: 'timing',
  config: {
    duration: 320,
    easing: RNEasing.bezier(0.2, 0.8, 0.2, 1),
  },
} as const;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

export const RoleTabBarStyles = StyleSheet.create({
  // Holds the bar plus, for admins, the room the quick-access button rises
  // into, so the button stays inside its parent's bounds and keeps receiving
  // touches on Android.
  wrap: {
    position: 'absolute',
    left: BAR_SIDE_INSET,
    right: BAR_SIDE_INSET,
    zIndex: 40,
    elevation: 18,
  },

  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_BAR_HEIGHT,
    paddingHorizontal: 6,
    borderRadius: BAR_RADIUS,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },

  barFill: {
    borderRadius: BAR_RADIUS,
    overflow: 'hidden',
  },

  // Soft top highlight, like an inset 1px light edge.
  barHighlight: {
    borderRadius: BAR_RADIUS,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
  },

  row: {
    flex: 1,
    flexDirection: 'row',
  },

  centerSlot: {
    width: CENTER_SLOT_WIDTH,
  },

  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    paddingTop: TAB_CONTENT_TOP,
    gap: 3,
  },

  iconBox: {
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconLayer: {
    position: 'absolute',
  },

  indicator: {
    position: 'absolute',
    left: 0,
    top: TAB_CONTENT_TOP,
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
  },

  tabLabel: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
    letterSpacing: 0.1,
    textAlign: 'center',
    paddingHorizontal: 2,
    alignSelf: 'stretch',
  },

  fab: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -FAB_SIZE / 2,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: FAB_COLORS[1],
    shadowColor: FAB_COLORS[1],
    shadowOpacity: 0.45,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
    zIndex: 2,
  },

  fabFace: {
    flex: 1,
    borderRadius: FAB_SIZE / 2,
    borderWidth: FAB_RING,
    borderColor: BrandColors.screenBackground,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ---------------------------------------------------------------------------
// Tab bar
// ---------------------------------------------------------------------------

function useIsKeyboardShown(): boolean {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subscriptions = [
      Keyboard.addListener(showEvent, () => setShown(true)),
      Keyboard.addListener(hideEvent, () => setShown(false)),
    ];
    return () => subscriptions.forEach((s) => s.remove());
  }, []);

  return shown;
}

// Only state and navigation are taken from the navigator's props: it builds
// a fresh insets object on every render, which would defeat the memo below.
interface RoleTabBarProps extends Pick<BottomTabBarProps, 'state' | 'navigation'> {
  tabs: PillTab[];
  colors: TabBarColors;
  hidden: boolean;
  bottom: number;
  /** Shows the centre quick-access button (admins only). */
  onCenterPress?: () => void;
  /** Whether the sheet the centre button opens is showing (turns + into x). */
  centerOpen?: boolean;
}

export const RoleTabBar = memo(function RoleTabBar({
  state,
  navigation,
  tabs,
  colors,
  hidden,
  bottom,
  onCenterPress,
  centerOpen,
}: RoleTabBarProps) {
  const visibleTabs = useMemo(
    () => tabs.filter((tab) => state.routes.some((r) => r.name === tab.name)),
    [tabs, state.routes],
  );

  // Handlers below are stable across renders and read the latest navigator
  // state from this ref at call time.
  const latest = useRef({ state, navigation });
  useLayoutEffect(() => {
    latest.current = { state, navigation };
  });

  const handlePress = useCallback((name: string) => {
    const { state, navigation } = latest.current;
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    const focused = state.routes[state.index]?.name === name;

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  }, []);

  const handleLongPress = useCallback((name: string) => {
    const { state, navigation } = latest.current;
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    navigation.emit({ type: 'tabLongPress', target: route.key });
  }, []);

  return (
    <PillTabBar
      tabs={visibleTabs}
      activeName={state.routes[state.index]?.name}
      colors={colors}
      hidden={hidden}
      bottom={bottom}
      onTabPress={handlePress}
      onTabLongPress={handleLongPress}
      onCenterPress={onCenterPress}
      centerOpen={centerOpen}
    />
  );
});

// ---------------------------------------------------------------------------
// Pill tab bar
// ---------------------------------------------------------------------------

export type PillTab = { name: string; title: string; icon: TabIcon };

// Navigator-agnostic floating bar. RoleTabBar drives it from Expo Router tabs;
// screens with their own in-screen sections (e.g. Community) drive it from
// local state so both bars look identical.
interface PillTabBarProps {
  tabs: PillTab[];
  activeName: string | undefined;
  colors: TabBarColors;
  hidden: boolean;
  bottom: number;
  onTabPress: (name: string) => void;
  onTabLongPress?: (name: string) => void;
  onCenterPress?: () => void;
  centerOpen?: boolean;
}

type TabLayout = { x: number; width: number };

export const PillTabBar = memo(function PillTabBar({
  tabs,
  activeName,
  colors,
  hidden,
  bottom,
  onTabPress,
  onTabLongPress,
  onCenterPress,
  centerOpen = false,
}: PillTabBarProps) {
  const reduceMotion = useReducedMotion();
  const isKeyboardShown = useIsKeyboardShown();
  const palette = useMemo(() => paletteFor(colors), [colors]);

  const activeIndex = tabs.findIndex((t) => t.name === activeName);
  const hasCenter = !!onCenterPress;
  // With the centre button, tabs split evenly either side of it.
  const splitAt = hasCenter ? Math.ceil(tabs.length / 2) : tabs.length;
  const labelSize = tabs.length > 5 ? 10 : 11;

  const indicatorX = useSharedValue(0);
  const indicatorOpacity = useSharedValue(0);
  const stretchX = useSharedValue(1);

  // Tab positions live in a ref, not state: measuring them shouldn't
  // re-render the bar.
  const layoutsRef = useRef<Record<string, TabLayout>>({});
  const lastIndexRef = useRef<number | null>(null);

  // Handlers below are stable across renders and read the latest values from
  // these refs at call time, so memoised tab items never act on stale state.
  const latest = useRef({ tabs, activeIndex, reduceMotion, onTabPress, onTabLongPress });
  useLayoutEffect(() => {
    latest.current = { tabs, activeIndex, reduceMotion, onTabPress, onTabLongPress };
  });

  const moveIndicator = useCallback(() => {
    const { tabs, activeIndex, reduceMotion } = latest.current;

    // Module routes (e.g. a member detail page) aren't in the bar — keep the
    // pill where it was but fade it out until a real tab is focused again.
    if (activeIndex < 0) {
      indicatorOpacity.set(withTiming(0, { duration: 150 }));
      return;
    }

    const layout = layoutsRef.current[tabs[activeIndex].name];
    if (!layout) return;

    const targetX = layout.x + layout.width / 2 - PILL_WIDTH / 2;
    const previousIndex = lastIndexRef.current;
    lastIndexRef.current = activeIndex;

    // First placement (or re-layout without a tab change) snaps into place.
    if (previousIndex === null || previousIndex === activeIndex || reduceMotion) {
      indicatorX.set(targetX);
      indicatorOpacity.set(reduceMotion ? 1 : withTiming(1, { duration: 150 }));
      return;
    }

    indicatorOpacity.set(withTiming(1, { duration: 150 }));
    indicatorX.set(withSpring(targetX, BUBBLE_SPRING));

    // A light stretch while travelling; longer jumps stretch a bit more.
    const s = 1 + Math.min(Math.abs(activeIndex - previousIndex), 3) * 0.12;
    const easeOut = Easing.out(Easing.quad);
    stretchX.set(withSequence(
      withTiming(s, { duration: 180, easing: easeOut }),
      withTiming(0.96, { duration: 180, easing: easeOut }),
      withTiming(1, { duration: 160, easing: easeOut }),
    ));
  }, [indicatorX, indicatorOpacity, stretchX]);

  useEffect(() => {
    moveIndicator();
  }, [activeIndex, tabs, hasCenter, reduceMotion, moveIndicator]);

  const handleLayout = useCallback(
    (name: string, e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      const prev = layoutsRef.current[name];
      if (prev?.x === x && prev?.width === width) return;
      layoutsRef.current = { ...layoutsRef.current, [name]: { x, width } };
      moveIndicator();
    },
    [moveIndicator],
  );

  const handlePress = useCallback((name: string) => {
    latest.current.onTabPress(name);
  }, []);

  const handleLongPress = useCallback((name: string) => {
    latest.current.onTabLongPress?.(name);
  }, []);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorOpacity.value,
    transform: [
      { translateX: indicatorX.value },
      { scaleX: stretchX.value },
    ],
  }));

  // Hidden via display rather than unmounting so the pill keeps its place
  // and doesn't re-animate in when returning from a full-screen route.
  const isHidden = hidden || isKeyboardShown;

  const renderTab = (tab: PillTab, index: number) => (
    <TabItem
      key={tab.name}
      name={tab.name}
      focused={index === activeIndex}
      iconName={tab.icon}
      title={tab.title}
      palette={palette}
      labelSize={labelSize}
      reduceMotion={reduceMotion}
      onPress={handlePress}
      onLongPress={handleLongPress}
      onLayout={handleLayout}
    />
  );

  return (
    <View
      pointerEvents="box-none"
      style={[
        RoleTabBarStyles.wrap,
        { bottom, height: TAB_BAR_HEIGHT + (hasCenter ? FAB_OVERHANG : 0) },
        isHidden && { display: 'none' },
      ]}
    >
      <View
        style={[
          RoleTabBarStyles.tabBar,
          { backgroundColor: colors[1], shadowColor: colors[1] },
        ]}
      >
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, RoleTabBarStyles.barFill]}>
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, RoleTabBarStyles.barHighlight]} />

        <View style={RoleTabBarStyles.row} role="tablist">
          <Animated.View
            pointerEvents="none"
            style={[RoleTabBarStyles.indicator, { backgroundColor: palette.pill }, indicatorStyle]}
          />

          {tabs.slice(0, splitAt).map((tab, i) => renderTab(tab, i))}
          {hasCenter && <View style={RoleTabBarStyles.centerSlot} />}
          {tabs.slice(splitAt).map((tab, i) => renderTab(tab, splitAt + i))}
        </View>
      </View>

      {hasCenter && (
        <CenterButton open={centerOpen} reduceMotion={reduceMotion} onPress={onCenterPress} />
      )}
    </View>
  );
});

// ---------------------------------------------------------------------------
// Centre quick-access button
// ---------------------------------------------------------------------------

interface CenterButtonProps {
  open: boolean;
  reduceMotion: boolean;
  onPress: () => void;
}

const CenterButton = memo(function CenterButton({ open, reduceMotion, onPress }: CenterButtonProps) {
  const { t } = useTranslation();
  const rotation = useSharedValue(open ? 1 : 0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    rotation.set(reduceMotion ? (open ? 1 : 0) : withTiming(open ? 1 : 0, { duration: 250 }));
  }, [open, reduceMotion, rotation]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 45}deg` }],
  }));

  return (
    <Animated.View style={[RoleTabBarStyles.fab, buttonStyle]}>
      <Pressable
        style={RoleTabBarStyles.fabFace}
        onPress={onPress}
        onPressIn={() => {
          if (!reduceMotion) pressScale.set(withTiming(0.94, { duration: 100 }));
        }}
        onPressOut={() => {
          pressScale.set(reduceMotion ? 1 : withSpring(1, ICON_SPRING));
        }}
        accessibilityRole="button"
        accessibilityLabel={t('shared.modules.openModules', { defaultValue: 'Open Modules' })}
        accessibilityState={{ expanded: open }}
      >
        <LinearGradient
          colors={FAB_COLORS}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={iconStyle}>
          <Feather name="plus" size={24} color="#FFFFFF" />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

// ---------------------------------------------------------------------------
// Tab item
// ---------------------------------------------------------------------------

interface TabItemProps {
  name: string;
  focused: boolean;
  iconName: TabIcon;
  title: string;
  palette: BarPalette;
  labelSize: number;
  reduceMotion: boolean;
  onPress: (name: string) => void;
  onLongPress: (name: string) => void;
  onLayout: (name: string, e: LayoutChangeEvent) => void;
}

const TabItem = memo(function TabItem({
  name,
  focused,
  iconName,
  title,
  palette,
  labelSize,
  reduceMotion,
  onPress,
  onLongPress,
  onLayout,
}: TabItemProps) {
  const progress = useSharedValue(focused ? 1 : 0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    progress.set(reduceMotion ? (focused ? 1 : 0) : withTiming(focused ? 1 : 0, { duration: 200 }));
  }, [focused, reduceMotion, progress]);

  const iconBoxStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  // Cross-fade between the inactive and active icon colours — an icon's
  // colour is a prop, so it can't be interpolated on the UI thread.
  const inactiveIconStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const activeIconStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const { active, inactive } = palette;
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [inactive, active]),
  }));

  return (
    <Pressable
      style={RoleTabBarStyles.tabItem}
      onLayout={(e) => onLayout(name, e)}
      onPress={() => onPress(name)}
      onLongPress={() => onLongPress(name)}
      onPressIn={() => {
        if (!focused && !reduceMotion) pressScale.set(withTiming(0.88, { duration: 100 }));
      }}
      onPressOut={() => {
        pressScale.set(reduceMotion ? 1 : withSpring(1, ICON_SPRING));
      }}
      role="tab"
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={title}
    >
      <Animated.View style={[RoleTabBarStyles.iconBox, iconBoxStyle]}>
        <Animated.View style={[RoleTabBarStyles.iconLayer, inactiveIconStyle]}>
          <Feather name={iconName} color={inactive} size={22} />
        </Animated.View>
        <Animated.View style={[RoleTabBarStyles.iconLayer, activeIconStyle]}>
          <Feather name={iconName} color={active} size={22} />
        </Animated.View>
      </Animated.View>

      <Animated.Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        maxFontSizeMultiplier={1.2}
        style={[RoleTabBarStyles.tabLabel, { fontSize: labelSize }, labelStyle]}
      >
        {title}
      </Animated.Text>
    </Pressable>
  );
});
