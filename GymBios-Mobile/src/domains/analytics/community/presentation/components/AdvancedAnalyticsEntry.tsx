import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Surface, Typography } from '@/shared/components';

interface AdvancedAnalyticsEntryProps {
  onPress: () => void;
}

export function AdvancedAnalyticsEntry({ onPress }: AdvancedAnalyticsEntryProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Navigate to Advanced Analytics"
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Surface background="backgroundElement" style={styles.card}>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Feather name="trending-up" size={20} color={BrandColors.teal} />
          </View>

          <View style={styles.textContainer}>
            <Typography variant="bodySmallBold" style={styles.title}>
              Advanced Analytics
            </Typography>
            <Typography variant="caption" color="textSecondary" style={styles.subtitle}>
              Deeper insights into community, churn, trainers & profitability
            </Typography>
          </View>

          <Feather name="chevron-right" size={22} color={BrandColors.textSecondary} />
        </View>
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(50, 127, 116, 0.2)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(50, 127, 116, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    color: BrandColors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
