import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
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
    <LinearGradient colors={colors} style={styles.header}>
      {onBack ? (
        <Pressable accessibilityRole="button" onPress={onBack} hitSlop={8}>
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
      {rightAction}
    </LinearGradient>
  );
}

export function BrandHeader() {
  return (
    <View style={styles.brandHeader}>
      <View style={styles.brandRow}>
        <View style={styles.brandIcon}>
          <Feather name="activity" size={24} color="#ffffff" />
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
  },
  backPlaceholder: {
    width: 24,
  },
  titles: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
  },
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
    borderRadius: Radius.full,
    backgroundColor: BrandColors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    color: BrandColors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
  },
  brandTagline: {
    color: BrandColors.teal,
    fontSize: 12,
  },
  brandDescription: {
    marginTop: Spacing.two,
  },
});
