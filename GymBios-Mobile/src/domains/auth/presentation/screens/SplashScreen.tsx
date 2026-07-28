import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { Typography } from '@/shared/components';

const SPLASH_DURATION_MS = 2500;

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const logoScale = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [logoScale, textOpacity]);

  useEffect(() => {
    const timer = setTimeout(onComplete, SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <LinearGradient colors={[BrandColors.teal, BrandColors.tealDark]} style={styles.container}>
      <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }] }]}>
        <View style={styles.logoCircle}>
          <Feather name="activity" size={48} color={BrandColors.teal} />
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: textOpacity }}>
        <Typography variant="title" style={styles.title}>
          GymBios
        </Typography>
        <Typography variant="bodySmall" style={styles.subtitle}>
          Your Complete Fitness Business OS
        </Typography>
      </Animated.View>

      <View style={styles.dots}>
        <View style={[styles.dot, styles.dotOne]} />
        <View style={[styles.dot, styles.dotTwo]} />
        <View style={[styles.dot, styles.dotThree]} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  logoWrap: {
    marginBottom: Spacing.five,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: Radius.full,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: TypographyScale.display,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontSize: 15,
    paddingHorizontal: Spacing.five,
  },
  dots: {
    position: 'absolute',
    bottom: 48,
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: '#ffffff',
  },
  dotOne: { opacity: 0.4 },
  dotTwo: { opacity: 0.6 },
  dotThree: { opacity: 0.8 },
});
