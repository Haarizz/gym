import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Radius, Spacing, BrandColors, TypographyScale } from '@/core/theme';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBgColor: string;
  subtitleColor?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  iconColor,
  iconBgColor,
  subtitleColor = BrandColors.textSecondary,
}: MetricCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
          <Feather name={icon} size={16} color={iconColor} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    flex: 1,
    minWidth: '45%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 11,
    color: BrandColors.textSecondary,
  },
  value: {
    fontSize: 20,
    fontWeight: '600',
    color: BrandColors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
  },
});
