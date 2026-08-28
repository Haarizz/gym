import React, { PropsWithChildren } from 'react';
import { StyleProp, ViewStyle, Dimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;

type SlideInProps = PropsWithChildren<{
  left?: boolean;
  right?: boolean;
  duration?: number;
  distance?: number;
  isExiting?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function SlideIn({
  children,
  left,
  right,
  duration = 300,
  distance = SCREEN_WIDTH, 
  isExiting = false,
  style,
}: SlideInProps) {
  const translateX = useSharedValue(
    right ? distance : -distance
  );

  React.useEffect(() => {
    if (isExiting) {
      translateX.value = withTiming(right ? distance : -distance, {
        duration,
        easing: Easing.in(Easing.cubic),
      });
    } else {
      translateX.value = withTiming(0, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [duration, translateX, isExiting, right, distance]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}