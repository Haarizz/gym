import { StyleSheet, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

export interface BarChartPoint {
  label: string;
  value: number;
}

interface SimpleBarChartProps {
  data: BarChartPoint[];
  height?: number;
  barColor?: string;
}

export function SimpleBarChart({
  data,
  height = 160,
  barColor = BrandColors.teal,
}: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  if (data.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Typography variant="caption" color="textSecondary">
          No trend data available
        </Typography>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.barsRow}>
        {data.map(point => {
          const barHeight = Math.max((point.value / maxValue) * (height - 40), 4);
          return (
            <View key={point.label} style={styles.barColumn}>
              <Typography variant="caption" style={styles.valueLabel}>
                {point.value}
              </Typography>
              <View style={[styles.bar, { height: barHeight, backgroundColor: barColor }]} />
              <Typography variant="caption" color="textSecondary" style={styles.axisLabel}>
                {point.label}
              </Typography>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'flex-end',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafe',
    borderRadius: Radius.md,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flex: 1,
    gap: Spacing.one,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  bar: {
    width: '70%',
    borderTopLeftRadius: Radius.sm,
    borderTopRightRadius: Radius.sm,
    minHeight: 4,
  },
  valueLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  axisLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
});
