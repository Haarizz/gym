import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { FeatherIcon } from '@/shared/components/CurrencyIcon';

import { useTheme } from '@/core/hooks';
import { Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface StepHeroProps {
  iconName: string;
  title: React.ReactNode;
  note?: React.ReactNode;
  /** Pulsing rings around the icon — "waiting for you" screens. */
  pulse?: boolean;
}

/** The big icon + title + note block that opens each method screen. */
export function StepHero({ iconName, title, note, pulse = true }: StepHeroProps) {
  const theme = useTheme();
  const ringA = useState(() => new Animated.Value(0))[0];
  const ringB = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (!pulse) return;
    const loop = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, { toValue: 1, duration: 2400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );
    const a = loop(ringA, 0);
    const b = loop(ringB, 1200);
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [pulse, ringA, ringB]);

  const ringStyle = (value: Animated.Value) => ({
    borderColor: theme.primary,
    opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
    transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.6] }) }],
  });

  return (
    <View style={styles.container}>
      <View style={styles.orbWrap}>
        {pulse ? (
          <>
            <Animated.View pointerEvents="none" style={[styles.ring, ringStyle(ringA)]} />
            <Animated.View pointerEvents="none" style={[styles.ring, ringStyle(ringB)]} />
          </>
        ) : null}
        <View style={[styles.orb, { backgroundColor: theme.primary + '14', borderColor: theme.primary + '30' }]}>
          <FeatherIcon name={iconName as any} size={44} color={theme.primary} />
        </View>
      </View>
      <Typography variant="subtitle" style={[styles.title, { color: theme.text }]}>
        {title}
      </Typography>
      {note ? (
        <Typography variant="bodySmall" style={[styles.note, { color: theme.textSecondary }]}>
          {note}
        </Typography>
      ) : null}
    </View>
  );
}

const ORB = 128;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  orbWrap: {
    width: ORB,
    height: ORB,
    marginBottom: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb: {
    width: ORB,
    height: ORB,
    borderRadius: ORB / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: ORB,
    height: ORB,
    borderRadius: ORB / 2,
    borderWidth: 2,
  },
  title: {
    fontWeight: '800',
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  note: {
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
  },
});
