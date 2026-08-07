import { Pressable, StyleSheet, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { DatePeriod } from '../../hooks/useAttendanceFilters';

const PERIOD_OPTIONS: { value: DatePeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this-week', label: 'This Week' },
];

interface DatePeriodFilterProps {
  value: DatePeriod;
  onChange: (period: DatePeriod) => void;
}

export function DatePeriodFilter({ value, onChange }: DatePeriodFilterProps) {
  return (
    <View style={styles.container}>
      {PERIOD_OPTIONS.map(option => (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          style={[styles.chip, value === option.value && styles.chipActive]}
          accessibilityRole="button"
        >
          <Typography
            variant="caption"
            style={[styles.chipText, value === option.value && styles.chipTextActive]}
          >
            {option.label}
          </Typography>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: BrandColors.teal,
    borderColor: BrandColors.teal,
  },
  chipText: {
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  chipTextActive: {
    color: '#ffffff',
  },
});
