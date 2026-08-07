import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface AttendanceSummaryCardProps {
  label: string;
  value: string;
  subtitle?: string;
  iconName: keyof typeof Feather.glyphMap;
  iconBg: string;
  valueColor?: string;
}

export function AttendanceSummaryCard({
  label,
  value,
  subtitle,
  iconName,
  iconBg,
  valueColor,
}: AttendanceSummaryCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Feather name={iconName} size={18} color="#ffffff" />
      </View>
      <Typography
        variant="bodySmallBold"
        style={[styles.value, valueColor ? { color: valueColor } : null]}
        numberOfLines={1}
      >
        {value}
      </Typography>
      <Typography variant="caption" color="textSecondary" style={styles.label}>
        {label}
      </Typography>
      {subtitle ? (
        <Typography variant="caption" color="textSecondary" style={styles.subtitle}>
          {subtitle}
        </Typography>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: Spacing.half,
    minWidth: 80,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.half,
  },
  value: {
    textAlign: 'center',
    fontSize: 18,
  },
  label: {
    textAlign: 'center',
    lineHeight: 14,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 12,
  },
});
