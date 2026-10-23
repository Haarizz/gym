import { useCallback, useState } from 'react';
import { Animated, Easing, I18nManager, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';

// Same motion as the bottom-tab screens (see forTabSlide in RoleTabBar).
export const SCREEN_SLIDE = 56;
export const SCREEN_DURATION = 320;
export const SCREEN_EASING = Easing.bezier(0.2, 0.8, 0.2, 1);

// Web stacks don't animate, and the list is hidden while a center's page is open.
// The page sets this before going back, so the list knows to slide in on return
// (and not when it's focused by a tab switch, which already animates).
let returningFromCenter = false;

export function markReturningToCenters() {
  returningFromCenter = true;
}

/** Style for the centers list root: slides in from the left when coming back from a center (web only). */
export function useCentersReturnEntrance() {
  const reduceMotion = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));

  useFocusEffect(
    useCallback(() => {
      if (!returningFromCenter) return;
      returningFromCenter = false;
      if (Platform.OS !== 'web' || reduceMotion) return;
      progress.setValue(1);
      Animated.timing(progress, {
        toValue: 0,
        duration: SCREEN_DURATION,
        easing: SCREEN_EASING,
        useNativeDriver: true,
      }).start();
    }, [progress, reduceMotion])
  );

  return {
    opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    transform: [
      {
        translateX: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, I18nManager.isRTL ? SCREEN_SLIDE : -SCREEN_SLIDE],
        }),
      },
      { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] }) },
    ],
  };
}
