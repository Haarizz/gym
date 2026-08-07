import { Pressable, StyleSheet, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { ReportPeriod } from '../../hooks/useReportDateRange';

const PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
];

interface ReportPeriodSelectorProps {
  value: ReportPeriod;
  onChange: (period: ReportPeriod) => void;
}

export function ReportPeriodSelector({ value, onChange }: ReportPeriodSelectorProps) {
  return (
    <View style={styles.container}>
      {PERIOD_OPTIONS.map(option => (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          style={[styles.tab, value === option.value && styles.tabActive]}
          accessibilityRole="button"
        >
          <Typography
            variant="caption"
            style={[styles.tabText, value === option.value && styles.tabTextActive]}
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
  tab: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: BrandColors.teal,
    borderColor: BrandColors.teal,
  },
  tabText: {
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  tabTextActive: {
    color: '#ffffff',
  },
});
