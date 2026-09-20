import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { GlassSurface } from './Glass/GlassSurface';
import { Typography } from './Typography';

export interface GlassHeaderProps {
  title: string;
  subtitle?: string;
  /** Gradient tint wash, e.g. a role's brand colour(s). @default teal */
  tint?: readonly [string, string, ...string[]];
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

/**
 * The floating, rounded glass header used by My Profile — a GlassSurface
 * card inset from the screen edges, sitting over the GlassBlobs, rather
 * than an edge-to-edge flat bar. Kept separate from AppHeader (used
 * app-wide outside the profile domain) so this restyle stays scoped.
 */
export function GlassHeader({
  title,
  subtitle,
  tint = [BrandColors.teal, BrandColors.tealDark],
  onBack,
  rightAction,
}: GlassHeaderProps) {
  return (
    <GlassSurface tint={tint} strong radius={Radius.xl} style={styles.header}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="chevron-left" size={20} color="#ffffff" />
        </Pressable>
      ) : (
        <View style={styles.backButton} />
      )}
      <View style={styles.titles}>
        <Typography variant="subtitle" style={styles.title}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="bodySmall" style={styles.subtitle}>
            {subtitle}
          </Typography>
        ) : null}
      </View>
      {rightAction}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
    marginHorizontal: Spacing.four,
    marginTop: Spacing.two,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 3,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
});
