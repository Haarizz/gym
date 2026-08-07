import { View, StyleSheet, ActivityIndicator } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { StatCard } from '@/shared/components/StatCard';

interface CheckInStatCardProps {
  label: string;
  value: string | number;
  iconName: keyof typeof Feather.glyphMap;
  color: string;
  isLoading?: boolean;
}

export function CheckInStatCard({ label, value, iconName, color, isLoading }: CheckInStatCardProps) {
  if (isLoading) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <ActivityIndicator color={BrandColors.primary} />
      </View>
    );
  }

  return (
    <StatCard
      label={label}
      value={String(value)}
      iconName={iconName}
      color={color}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  loadingCard: {
    minHeight: 100,
  }
});
