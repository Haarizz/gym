import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Glass, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  colors: [string, string] | [string, string, ...string[]];
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function AppHeader({ title, subtitle, colors, onBack, rightAction }: AppHeaderProps) {
  return (
    <View style={styles.header}>
      {/* Gradient wash — the colour that makes the glass readable */}
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Very subtle white sheen — just enough to lift the surface without hiding the colour */}
      <View pointerEvents="none" style={styles.glassFill} />
      {/* Bottom highlight line */}
      <View pointerEvents="none" style={styles.bottomHighlight} />

      {onBack ? (
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          hitSlop={8}
          style={styles.backButton}
        >
          <Feather name="chevron-left" size={24} color="#ffffff" />
        </Pressable>
      ) : (
        <View style={styles.backPlaceholder} />
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

      {rightAction ?? <View style={styles.backPlaceholder} />}
    </View>
  );
}

export function BrandHeader() {
  return (
    <View style={styles.brandHeader}>
      <View style={styles.brandRow}>
        {/* Glass avatar circle */}
        <View style={styles.brandIcon}>
          <Feather name="activity" size={22} color="#ffffff" />
        </View>
        <View>
          <Typography variant="subtitle" style={styles.brandTitle}>
            GymBios
          </Typography>
          <Typography variant="caption" style={styles.brandTagline}>
            Fitness Business OS
          </Typography>
        </View>
      </View>
      <Typography variant="bodySmall" color="textSecondary" style={styles.brandDescription}>
        Choose your experience to get started
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    overflow: 'hidden',
    // Glass border + shadow
    borderBottomWidth: 1,
    borderBottomColor: Glass.border,
    shadowColor: Glass.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  glassFill: {
    ...StyleSheet.absoluteFill,
    // Barely-there white sheen — lets the gradient colour show through
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  bottomHighlight: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  backButton: {
    zIndex: 1,
  },
  backPlaceholder: {
    width: 24,
  },
  titles: {
    flex: 1,
    zIndex: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
  },
  // BrandHeader
  brandHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.four,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  brandIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: BrandColors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle glass border
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: BrandColors.teal,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  brandTitle: {
    color: BrandColors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  brandTagline: {
    color: BrandColors.teal,
    fontSize: 12,
    fontWeight: '600',
  },
  brandDescription: {
    marginTop: Spacing.two,
  },
});
