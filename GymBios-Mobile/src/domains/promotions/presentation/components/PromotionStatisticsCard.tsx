import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';

interface PromotionStatisticsCardProps {
  title: string;
  value: string | number;
  iconName: React.ComponentProps<typeof Feather>['name'];
  iconColor?: string;
  iconBgColor?: string;
  subtitle?: string;
  style?: object;
}

export function PromotionStatisticsCard({
  title,
  value,
  iconName,
  iconColor = BrandColors.teal,
  iconBgColor = '#F0FDFA',
  subtitle,
  style,
}: PromotionStatisticsCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.iconBox, { backgroundColor: iconBgColor }]}>
          <Feather name={iconName} size={18} color={iconColor} />
        </View>
      </View>

      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>

      {!!subtitle && (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1.5,
    flex: 1,
    minWidth: 140,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    flex: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
});
