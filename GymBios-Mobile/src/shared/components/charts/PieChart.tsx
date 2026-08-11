import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

import type { PieChartProps, PieChartSlice } from './types';

const DEFAULT_PIE_COLORS = [
  BrandColors.teal,
  BrandColors.trainerAmber,
  BrandColors.memberGold,
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#6366F1', // Indigo
];

export function PieChart({
  data,
  nameKey,
  valueKey,
  variant = 'donut',
  height,
  showLegend = true,
  showTooltip = true,
  valueFormatter = (v: number) => String(v),
  colors = DEFAULT_PIE_COLORS,
  emptyText = 'No chart data available',
  style,
}: PieChartProps) {
  const theme = useTheme();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Normalize slices data
  const { slices, totalValue } = useMemo(() => {
    let total = 0;
    const rawSlices: { name: string; value: number; color: string }[] = [];

    data.forEach((row, idx) => {
      const name = String(row[nameKey] ?? `Category ${idx + 1}`);
      const rawVal = row[valueKey];
      const val = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal ?? '0')) || 0;
      if (val > 0) {
        total += val;
        const color = colors[idx % colors.length];
        rawSlices.push({ name, value: val, color });
      }
    });

    const normalized: PieChartSlice[] = rawSlices.map((item) => ({
      ...item,
      percentage: total > 0 ? (item.value / total) * 100 : 0,
    }));

    return { slices: normalized, totalValue: total };
  }, [data, nameKey, valueKey, colors]);

  if (!data || data.length === 0 || slices.length === 0) {
    return (
      <View style={[styles.emptyContainer, height ? { height } : undefined, style]}>
        <Typography variant="caption" color="textSecondary">
          {emptyText}
        </Typography>
      </View>
    );
  }

  const selectedSlice = selectedIndex !== null ? slices[selectedIndex] : null;

  return (
    <View
      style={[styles.wrapper, style]}
      accessibilityRole="image"
      accessibilityLabel={`${variant === 'donut' ? 'Donut' : 'Pie'} chart visualization`}
    >
      {/* Proportion Ring Segment Bar */}
      <View style={styles.ringBarContainer}>
        {slices.map((slice, idx) => {
          const isSelected = selectedIndex === idx;
          return (
            <Pressable
              key={idx}
              style={[
                styles.ringSegment,
                {
                  flex: slice.percentage,
                  backgroundColor: slice.color,
                  opacity: selectedIndex === null || isSelected ? 1 : 0.4,
                  transform: [{ scaleY: isSelected ? 1.15 : 1 }],
                },
              ]}
              onPress={() => setSelectedIndex((prev) => (prev === idx ? null : idx))}
            />
          );
        })}
      </View>

      {/* Donut Center / Tooltip Indicator Header */}
      {variant === 'donut' || (showTooltip && selectedSlice) ? (
        <View style={[styles.summaryCard, { backgroundColor: theme.backgroundSelected }]}>
          {selectedSlice ? (
            <View style={styles.selectedSliceView}>
              <View style={[styles.colorDot, { backgroundColor: selectedSlice.color }]} />
              <Typography variant="subtitle" style={{ fontWeight: '700' }}>
                {selectedSlice.name}
              </Typography>
              <Typography variant="subtitle" style={{ fontWeight: '700', marginLeft: 'auto' }}>
                {valueFormatter(selectedSlice.value)} ({selectedSlice.percentage.toFixed(1)}%)
              </Typography>
            </View>
          ) : (
            <View style={styles.totalView}>
              <Typography variant="caption" color="textSecondary">
                Total Output
              </Typography>
              <Typography variant="subtitle" style={{ fontWeight: '700' }}>
                {valueFormatter(totalValue)}
              </Typography>
            </View>
          )}
        </View>
      ) : null}

      {/* Breakdown Legend List */}
      {showLegend ? (
        <View style={styles.legendList}>
          {slices.map((slice, idx) => {
            const isSelected = selectedIndex === idx;
            return (
              <Pressable
                key={idx}
                style={[
                  styles.legendRow,
                  { backgroundColor: isSelected ? theme.backgroundSelected : 'transparent' },
                ]}
                onPress={() => setSelectedIndex((prev) => (prev === idx ? null : idx))}
              >
                <View style={[styles.legendIndicatorDot, { backgroundColor: slice.color }]} />
                <Typography
                  variant="caption"
                  color={isSelected ? 'text' : 'textSecondary'}
                  style={[styles.legendName, isSelected && { fontWeight: '700' }]}
                  numberOfLines={1}
                >
                  {slice.name}
                </Typography>
                <Typography
                  variant="caption"
                  style={[styles.legendValue, isSelected && { fontWeight: '700' }]}
                >
                  {valueFormatter(slice.value)}
                </Typography>
                <Typography variant="caption" color="textSecondary" style={styles.legendPercentage}>
                  {slice.percentage.toFixed(0)}%
                </Typography>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    minHeight: 140,
  },
  ringBarContainer: {
    flexDirection: 'row',
    height: 16,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: Spacing.three,
    gap: 2,
  },
  ringSegment: {
    height: '100%',
    borderRadius: Radius.sm,
  },
  summaryCard: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    marginBottom: Spacing.three,
  },
  selectedSliceView: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  totalView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendList: {
    gap: Spacing.one,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.sm,
    gap: Spacing.two,
  },
  legendIndicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    flex: 1,
    fontSize: 12,
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  legendPercentage: {
    fontSize: 11,
    width: 36,
    textAlign: 'right',
  },
});
