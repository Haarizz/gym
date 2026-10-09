import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Feather from '@expo/vector-icons/Feather';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { BrandColors, Glass } from '@/core/theme';
import { TabIcon } from './tabConfigs';

// Picks a legible icon colour for the near-solid active-tab fill — light
// brand colours (e.g. member gold) need a dark icon, dark ones (teal, amber)
// read fine in white.
function contrastIconColor(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.7 ? BrandColors.textPrimary : '#FFFFFF';
}

export const ICON_SIZE = 46;
export const TAB_BAR_VERTICAL_PADDING = 12;
export const TAB_BAR_HEIGHT = ICON_SIZE + TAB_BAR_VERTICAL_PADDING * 2; // 70

// The active icon lifts this far, and the bubble sits centred on the lifted
// icon so the label has room underneath.
const ACTIVE_ICON_LIFT = 6;
const BUBBLE_SIZE = 38;
const BUBBLE_RING = 6;
const BUBBLE_TOP = ICON_SIZE / 2 - ACTIVE_ICON_LIFT - BUBBLE_SIZE / 2;

const INACTIVE_ICON_COLOR = 'rgba(30,42,58,0.45)';

// Bubble travel: a slightly overshooting spring, like the CSS
// cubic-bezier(.34,1.45,.5,1) in the design reference.
const BUBBLE_SPRING = { damping: 15, stiffness: 170, mass: 0.9 };
const ICON_SPRING = { damping: 18, stiffness: 180, mass: 1 };
const LABEL_DELAY_MS = 120;

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
  tabBar: {
    position: 'absolute',

    left: 20,
    right: 20,

    height: TAB_BAR_HEIGHT,
    paddingTop: TAB_BAR_VERTICAL_PADDING,
    paddingBottom: TAB_BAR_VERTICAL_PADDING,
    paddingHorizontal: 10,

    backgroundColor: 'rgba(238,240,243,0.92)',

    borderWidth: 1,
    borderColor: 'transparent',

    borderRadius: TAB_BAR_HEIGHT / 2,
    overflow: 'hidden',

    zIndex: 40,
    elevation: 18,

    shadowColor: Glass.shadowColor,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 8,
    },
  },

  // Faint dark hairline over the glass fill so the pill still reads as a
  // distinct surface when it sits directly on top of a white card, since a
  // pure white/translucent border alone disappears against white content.
  tabBarHairline: {
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderWidth: 1,
    borderColor: 'rgba(30,42,58,0.06)',
    borderTopColor: 'transparent',
  },

  row: {
    flex: 1,
    flexDirection: 'row',
  },

  tabItem: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  iconWrapper: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconStack: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconLayer: {
    position: 'absolute',
  },

  indicator: {
    position: 'absolute',
    left: 0,
    top: BUBBLE_TOP,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
  },

  bubbleRing: {
    position: 'absolute',
    top: -BUBBLE_RING,
    left: -BUBBLE_RING,
    width: BUBBLE_SIZE + BUBBLE_RING * 2,
    height: BUBBLE_SIZE + BUBBLE_RING * 2,
    borderRadius: (BUBBLE_SIZE + BUBBLE_RING * 2) / 2,
    opacity: 0.2,
  },

  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  tabLabel: {
    position: 'absolute',
    bottom: -8,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    width: 80,
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
  tabs: { name: string; title: string; icon: TabIcon }[];
  activeColor: string;
  hidden: boolean;
  bottom: number;
}

type TabLayout = { x: number; width: number };

export const RoleTabBar = memo(function RoleTabBar({
  state,
  navigation,
  tabs,
  activeColor,
  hidden,
  bottom,
}: RoleTabBarProps) {
  const reduceMotion = useReducedMotion();
  const isKeyboardShown = useIsKeyboardShown();

  const focusedName = state.routes[state.index]?.name;
  const activeIndex = tabs.findIndex((t) => t.name === focusedName);

  const indicatorX = useSharedValue(0);
  const indicatorOpacity = useSharedValue(0);
  const stretchX = useSharedValue(1);
  const stretchY = useSharedValue(1);

  // Tab positions live in a ref, not state: measuring them shouldn't
  // re-render the bar.
  const layoutsRef = useRef<Record<string, TabLayout>>({});
  const lastIndexRef = useRef<number | null>(null);

  // Handlers below are stable across renders and read the latest values from
  // these refs at call time, so memoised tab items never act on stale state.
  const latest = useRef({ state, navigation, tabs, activeIndex, reduceMotion });
  useLayoutEffect(() => {
    latest.current = { state, navigation, tabs, activeIndex, reduceMotion };
  });

  const moveIndicator = useCallback(() => {
    const { tabs, activeIndex, reduceMotion } = latest.current;

    // Module routes (e.g. a member detail page) aren't in the bar — keep the
    // bubble where it was but fade it out until a real tab is focused again.
    if (activeIndex < 0) {
      indicatorOpacity.set(withTiming(0, { duration: 150 }));
      return;
    }

    const layout = layoutsRef.current[tabs[activeIndex].name];
    if (!layout) return;

    const targetX = layout.x + layout.width / 2 - BUBBLE_SIZE / 2;
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

    // Liquid squash-and-stretch while travelling; longer jumps stretch more.
    const s = 1 + Math.min(Math.abs(activeIndex - previousIndex), 3) * 0.14;
    const easeOut = Easing.out(Easing.quad);
    stretchX.set(withSequence(
      withTiming(s, { duration: 190, easing: easeOut }),
      withTiming(0.94, { duration: 190, easing: easeOut }),
      withTiming(1, { duration: 170, easing: easeOut }),
    ));
    stretchY.set(withSequence(
      withTiming(2 - s, { duration: 190, easing: easeOut }),
      withTiming(1.06, { duration: 190, easing: easeOut }),
      withTiming(1, { duration: 170, easing: easeOut }),
    ));
  }, [indicatorX, indicatorOpacity, stretchX, stretchY]);

  useEffect(() => {
    moveIndicator();
  }, [activeIndex, tabs, reduceMotion, moveIndicator]);

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

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorOpacity.value,
    transform: [
      { translateX: indicatorX.value },
      { scaleX: stretchX.value },
      { scaleY: stretchY.value },
    ],
  }));

  // Hidden via display rather than unmounting so the bubble keeps its place
  // and doesn't re-animate in when returning from a full-screen route.
  const isHidden = hidden || isKeyboardShown;

  return (
    <View style={[RoleTabBarStyles.tabBar, { bottom }, isHidden && { display: 'none' }]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, RoleTabBarStyles.tabBarHairline]} />

      <View style={RoleTabBarStyles.row} role="tablist">
        <Animated.View pointerEvents="none" style={[RoleTabBarStyles.indicator, indicatorStyle]}>
          <View style={[RoleTabBarStyles.bubbleRing, { backgroundColor: activeColor }]} />
          <View
            style={[
              RoleTabBarStyles.bubble,
              { backgroundColor: `${activeColor}E6`, shadowColor: activeColor },
            ]}
          />
        </Animated.View>

        {tabs.map((tab, index) =>
          state.routes.some((r) => r.name === tab.name) ? (
            <TabItem
              key={tab.name}
              name={tab.name}
              focused={index === activeIndex}
              iconName={tab.icon}
              title={tab.title}
              activeColor={activeColor}
              reduceMotion={reduceMotion}
              onPress={handlePress}
              onLongPress={handleLongPress}
              onLayout={handleLayout}
            />
          ) : null,
        )}
      </View>
    </View>
  );
});

interface TabItemProps {
  name: string;
  focused: boolean;
  iconName: TabIcon;
  title: string;
  activeColor: string;
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
  activeColor,
  reduceMotion,
  onPress,
  onLongPress,
  onLayout,
}: TabItemProps) {
  const progress = useSharedValue(focused ? 1 : 0);
  const labelProgress = useSharedValue(focused ? 1 : 0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      progress.set(focused ? 1 : 0);
      labelProgress.set(focused ? 1 : 0);
      return;
    }
    progress.set(withSpring(focused ? 1 : 0, ICON_SPRING));
    // The label follows the icon in slightly late so the lift reads first.
    labelProgress.set(
      focused
        ? withDelay(LABEL_DELAY_MS, withSpring(1, ICON_SPRING))
        : withTiming(0, { duration: 150 }),
    );
  }, [focused, reduceMotion, progress, labelProgress]);

  const iconStackStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -ACTIVE_ICON_LIFT]) },
      { scale: interpolate(progress.value, [0, 1], [1, 0.9]) * pressScale.value },
    ],
  }));

  // Cross-fade between the inactive and active icon colours — colour itself
  // isn't animated on the UI thread here.
  const inactiveIconStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const activeIconStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelProgress.value,
    transform: [
      { translateY: interpolate(labelProgress.value, [0, 1], [6, 2]) },
      { scale: interpolate(labelProgress.value, [0, 1], [0.9, 1]) },
    ],
  }));

  return (
    <Pressable
      style={RoleTabBarStyles.tabItem}
      onLayout={(e) => onLayout(name, e)}
      onPress={() => onPress(name)}
      onLongPress={() => onLongPress(name)}
      onPressIn={() => {
        if (!focused && !reduceMotion) pressScale.set(withTiming(0.85, { duration: 100 }));
      }}
      onPressOut={() => {
        pressScale.set(reduceMotion ? 1 : withSpring(1, ICON_SPRING));
      }}
      role="tab"
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={title}
    >
      <View style={RoleTabBarStyles.iconWrapper}>
        <Animated.View style={[RoleTabBarStyles.iconStack, iconStackStyle]}>
          <Animated.View style={[RoleTabBarStyles.iconLayer, inactiveIconStyle]}>
            <Feather name={iconName} color={INACTIVE_ICON_COLOR} size={22} />
          </Animated.View>
          <Animated.View style={[RoleTabBarStyles.iconLayer, activeIconStyle]}>
            <Feather name={iconName} color={contrastIconColor(activeColor)} size={22} />
          </Animated.View>
        </Animated.View>

        <Animated.Text numberOfLines={1} style={[RoleTabBarStyles.tabLabel, { color: activeColor }, labelStyle]}>
          {title}
        </Animated.Text>
      </View>
    </Pressable>
  );
});
