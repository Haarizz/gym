import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { GlassSurface } from '@/shared/components';

interface ProfileNavigationRowProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  badge?: string;
  iconBgColor?: string;
  iconColor?: string;
  onPress: () => void;
}

export function ProfileNavigationRow({
  icon,
  title,
  subtitle,
  badge,
  iconBgColor = '#eef7f6',
  iconColor = BrandColors.teal,
  onPress,
}: ProfileNavigationRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.pressable, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <GlassSurface radius={Radius.lg} style={styles.row}>
        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
          <Feather name={icon} size={20} color={iconColor} />
        </View>

        <View style={styles.textContainer}>
          <Typography variant="body" style={styles.title}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="textSecondary" style={styles.subtitle}>
              {subtitle}
            </Typography>
          )}
        </View>

        {badge && (
          <View style={styles.badge}>
            <Typography variant="caption" style={styles.badgeText}>
              {badge}
            </Typography>
          </View>
        )}

        <Feather name="chevron-right" size={20} color="#94a3b8" />
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  rowPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginRight: Spacing.two,
  },
  badgeText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '700',
  },
});
