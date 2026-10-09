import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';

import { BrandColors } from '@/core/theme';

interface NoInternetScreenProps {
  onRetry: () => void;
}

/**
 * Full-screen offline wall. Shown instead of the app whenever there is no
 * internet connection. Prevents any tab bar, headers, or API calls from
 * rendering in the background.
 */
export function NoInternetScreen({ onRetry }: NoInternetScreenProps) {
  // Floating animation for the wifi-off icon
  const floatAnim = useRef(new Animated.Value(0)).current;
  // Pulse ring opacity
  const ringAnim = useRef(new Animated.Value(0)).current;
  // Scale for the icon container
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  // Fade-in for entire content
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // Button press scale
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance fade-in + scale pop
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 14,
        stiffness: 160,
        mass: 0.9,
        useNativeDriver: true,
      }),
    ]).start();

    // Infinite float
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Expanding ring pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [fadeAnim, floatAnim, ringAnim, scaleAnim]);

  const ringScale = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
  const ringOpacity = ringAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.15, 0] });

  const handlePressIn = () => {
    Animated.spring(btnScale, {
      toValue: 0.95,
      useNativeDriver: true,
      damping: 12,
      stiffness: 200,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(btnScale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 12,
      stiffness: 200,
    }).start();
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Rich gradient background */}
      <LinearGradient
        colors={['#0f1f3d', '#1a3a5c', '#0d2a40']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle decorative blobs */}
      <View style={[styles.blob, styles.blobTopLeft]} />
      <View style={[styles.blob, styles.blobBottomRight]} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>

          {/* Icon area */}
          <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
            {/* Pulse ring */}
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  opacity: ringOpacity,
                  transform: [{ scale: ringScale }],
                },
              ]}
            />

            {/* Icon container with glass-morphism */}
            <View style={styles.iconContainer}>
              <View style={styles.iconGlass}>
                <Feather name="wifi-off" size={44} color="#FFFFFF" />
              </View>
            </View>
          </Animated.View>

          {/* Text content */}
          <View style={styles.textBlock}>
            <Text style={styles.title}>No Internet Connection</Text>
            <Text style={styles.subtitle}>
              Your device isn't connected to the internet.{'\n'}
              Please check your Wi-Fi or mobile data and try again.
            </Text>
          </View>

          {/* Tips */}
          <View style={styles.tipsCard}>
            <TipRow icon="wifi" text="Toggle Wi-Fi off and on again" />
            <TipRow icon="smartphone" text="Check mobile data is enabled" />
            <TipRow icon="radio" text="Move to an area with better signal" />
          </View>

          {/* Retry button */}
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <Pressable
              style={styles.retryButton}
              onPress={onRetry}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              accessibilityRole="button"
              accessibilityLabel="Retry connection"
            >
              <LinearGradient
                colors={[BrandColors.teal, BrandColors.tealDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.retryGradient}
              >
                <Feather name="refresh-cw" size={18} color="#FFF" style={styles.retryIcon} />
                <Text style={styles.retryText}>Try Again</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

function TipRow({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  return (
    <View style={styles.tipRow}>
      <View style={styles.tipIconWrap}>
        <Feather name={icon} size={14} color={BrandColors.teal} />
      </View>
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
}

const ICON_SIZE = 96;
const PULSE_SIZE = ICON_SIZE * 1.4;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f1f3d',
  },

  safeArea: {
    flex: 1,
  },

  // Decorative background blobs
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.15,
  },
  blobTopLeft: {
    width: 280,
    height: 280,
    backgroundColor: BrandColors.teal,
    top: -80,
    left: -80,
  },
  blobBottomRight: {
    width: 240,
    height: 240,
    backgroundColor: '#1e40af',
    bottom: -60,
    right: -60,
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 32,
  },

  // Pulse ring
  pulseRing: {
    position: 'absolute',
    width: PULSE_SIZE,
    height: PULSE_SIZE,
    borderRadius: PULSE_SIZE / 2,
    backgroundColor: BrandColors.teal,
    alignSelf: 'center',
    top: -(PULSE_SIZE - ICON_SIZE) / 2,
    left: -(PULSE_SIZE - ICON_SIZE) / 2,
  },

  iconContainer: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconGlass: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    // Glass shadow
    ...Platform.select({
      ios: {
        shadowColor: BrandColors.teal,
        shadowOpacity: 0.6,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 16,
      },
    }),
  },

  textBlock: {
    alignItems: 'center',
    gap: 10,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Tips card
  tipsCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },

  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  tipIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(50,127,116,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tipText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    flex: 1,
  },

  // Retry button
  retryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: BrandColors.teal,
        shadowOpacity: 0.5,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 10,
      },
    }),
  },

  retryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
    gap: 8,
  },

  retryIcon: {
    marginRight: 2,
  },

  retryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
