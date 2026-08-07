import { StyleSheet, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface TrendInsightCardProps {
  label: string;
  value: string;
  subtitle: string;
}

export function TrendInsightCard({ label, value, subtitle }: TrendInsightCardProps) {
  return (
    <View style={styles.card}>
      <Typography variant="caption" color="textSecondary" style={styles.label}>
        {label}
      </Typography>
      <Typography variant="bodySmallBold" style={styles.value}>
        {value}
      </Typography>
      <Typography variant="caption" color="textSecondary">
        {subtitle}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '700',
    fontSize: 10,
  },
  value: {
    fontSize: 20,
    color: BrandColors.teal,
  },
});
