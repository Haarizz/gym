import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface ReferralHeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
}

export function ReferralHeader({
  title = 'Referrals',
  subtitle = 'Track and manage member referral programs and rewards',
  onBack,
}: ReferralHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {onBack ? (
          <Pressable accessibilityRole="button" onPress={onBack} hitSlop={8} style={styles.backButton}>
            <Feather name="chevron-left" size={24} color="#ffffff" />
          </Pressable>
        ) : (
          <View style={styles.iconBadge}>
            <Feather name="share-2" size={20} color="#ffffff" />
          </View>
        )}
        <View style={styles.textContainer}>
          <Typography variant="title" style={styles.titleText}>
            {title}
          </Typography>
          <Typography variant="bodySmall" style={styles.subtitleText} numberOfLines={2}>
            {subtitle}
          </Typography>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BrandColors.teal,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  titleText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitleText: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 12,
    marginTop: Spacing.half,
  },
});
