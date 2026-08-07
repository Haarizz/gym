import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface HubFeatureCardProps {
  title: string;
  subtitle: string;
  iconName: keyof typeof Feather.glyphMap;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
  countLabel?: string;
  children?: React.ReactNode;
}

export function HubFeatureCard({
  title,
  subtitle,
  iconName,
  iconBg,
  iconColor,
  onPress,
  countLabel,
  children,
}: HubFeatureCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
            <Feather name={iconName} size={18} color={iconColor} />
          </View>
          <View style={styles.textWrap}>
            <Typography variant="bodySmallBold" style={styles.title}>
              {title}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {subtitle}
            </Typography>
          </View>
        </View>
        <Pressable onPress={onPress} style={styles.openBtn} accessibilityRole="button">
          <Typography variant="caption" style={styles.openText}>
            {countLabel ?? 'Open'}
          </Typography>
          <Feather name="arrow-right" size={14} color={BrandColors.teal} />
        </Pressable>
      </View>
      {children ? <View style={styles.preview}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.screenBackgroundAlt,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
    borderRadius: Radius.full,
  },
  openText: {
    color: BrandColors.teal,
    fontWeight: '700',
  },
  preview: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
