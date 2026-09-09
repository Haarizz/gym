import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Glass, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { GlassSurface } from '@/shared/components/Glass/GlassSurface';

interface StatCardProps {
  label: string;
  value: string;
  iconName: keyof typeof Feather.glyphMap;
  color: string;
  /** When omitted the card is rendered as non-interactive (disabled state). */
  onPress?: () => void;
}

export function StatCard({ label, value, iconName, color, onPress }: StatCardProps) {
  const content = (
    <>
      <View style={[styles.icon, { backgroundColor: color }]}>
        <Feather name={iconName} size={20} color="#ffffff" />
      </View>
      <Typography variant="subtitle" style={styles.value}>
        {value}
      </Typography>
      <Typography variant="caption" color="textSecondary">
        {label}
      </Typography>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.cardWrapper,
          !onPress && styles.cardInactive,
          pressed && styles.cardPressed,
        ]}
        onPress={onPress}
        accessibilityRole="button"
      >
        <GlassSurface style={styles.card}>{content}</GlassSurface>
      </Pressable>
    );
  }

  return (
    <GlassSurface style={[styles.card, styles.cardInactive]}>
      {content}
    </GlassSurface>
  );
}

export function PlaceholderPanel({ title, description }: { title: string; description: string }) {
  return (
    <GlassSurface style={styles.panel}>
      <Typography variant="subtitle">{title}</Typography>
      <Typography variant="bodySmall" color="textSecondary" style={styles.panelDescription}>
        {description}
      </Typography>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    flex: 1,
  },
  card: {
    flex: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    alignItems: 'center',
  },
  cardInactive: {
    opacity: 0.55,
  },
  cardPressed: {
    opacity: 0.75,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: Spacing.half,
  },
  panel: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  panelDescription: {
    lineHeight: 20,
  },
});
