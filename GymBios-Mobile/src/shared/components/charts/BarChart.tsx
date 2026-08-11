import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

import type { BarChartProps } from './types';

const DEFAULT_SERIES_COLORS = [
  BrandColors.teal,
  BrandColors.trainerAmber,
  BrandColors.memberGold,
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
];

export function BarChart({
  data,
  xKey,
  series,
  height = 200,
  orientation = 'vertical',
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  yAxisFormatter = (v: number) => String(v),
  xAxisFormatter = (v: unknown) => String(v ?? ''),
  emptyText = 'No chart data available',
  style,
}: BarChartProps) {
  const theme = useTheme();
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 2) {
      setContainerWidth(w);
    }
  };

  const seriesWithColors = useMemo(() => {
    return series.map((s, idx) => ({
      ...s,
      color: s.color ?? DEFAULT_SERIES_COLORS[idx % DEFAULT_SERIES_COLORS.length],
    }));
  }, [series]);

  // Extract numeric values
  const allValues = useMemo(() => {
    const vals: number[] = [];
    data.forEach((row) => {
      seriesWithColors.forEach((s) => {
        const raw = row[s.key];
        const num = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '0'));
        if (!isNaN(num)) {
          vals.push(num);
        }
      });
    });
    return vals.length > 0 ? vals : [0];
  }, [data, seriesWithColors]);

  const { maxVal, ticks } = useMemo(() => {
    const rawMax = Math.max(1, ...allValues);
    const tickCount = 4;
    const step = rawMax / tickCount;
    const tickList: number[] = [];
    for (let i = 0; i <= tickCount; i++) {
      tickList.push(step * i);
    }
    return {
      maxVal: rawMax,
      ticks: tickList,
    };
  }, [allValues]);

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }, style]}>
        <Typography variant="caption" color="textSecondary">
          {emptyText}
        </Typography>
      </View>
    );
  }

  const activeRow = selectedIndex !== null && data[selectedIndex] ? data[selectedIndex] : null;

  if (orientation === 'horizontal') {
    return (
      <View
        style={[styles.wrapper, style]}
        onLayout={handleLayout}
        accessibilityRole="image"
        accessibilityLabel="Horizontal bar chart visualization"
      >
        {/* Legend */}
        {showLegend && seriesWithColors.length > 0 ? (
          <View style={styles.legendContainer}>
            {seriesWithColors.map((s) => (
              <View key={s.key} style={styles.legendItem}>
                <View style={[styles.legendIndicator, { backgroundColor: s.color }]} />
                <Typography variant="caption" color="textSecondary" style={styles.legendLabel}>
                  {s.label}
                </Typography>
              </View>
            ))}
          </View>
        ) : null}

        {/* Horizontal Bars Container */}
        <View style={styles.horizontalContainer}>
          {data.map((row, rowIdx) => {
            const isSelected = selectedIndex === rowIdx;
            return (
              <Pressable
                key={rowIdx}
                style={[
                  styles.horizontalRowGroup,
                  isSelected && { backgroundColor: theme.backgroundSelected },
                ]}
                onPress={() => setSelectedIndex((prev) => (prev === rowIdx ? null : rowIdx))}
              >
                <Typography
                  variant="caption"
                  color="textSecondary"
                  style={styles.horizontalCategoryLabel}
                  numberOfLines={1}
                >
                  {xAxisFormatter(row[xKey])}
                </Typography>
                <View style={styles.horizontalBarsCanvas}>
                  {seriesWithColors.map((s) => {
                    const val = typeof row[s.key] === 'number' ? (row[s.key] as number) : parseFloat(String(row[s.key] ?? '0')) || 0;
                    const pct = Math.max((val / maxVal) * 100, 2);
                    return (
                      <View key={s.key} style={styles.horizontalBarTrack}>
                        <View
                          style={[
                            styles.horizontalBarFill,
                            { width: `${pct}%`, backgroundColor: s.color },
                          ]}
                        />
                        <Typography variant="caption" style={styles.barValueText}>
                          {yAxisFormatter(val)}
                        </Typography>
                      </View>
                    );
                  })}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  // Vertical orientation
  const paddingBottom = 28;
  const paddingTop = 12;
  const chartHeight = Math.max(height - paddingBottom - paddingTop, 50);
  const reversedTicks = [...ticks].reverse();


  return (
    <View
      style={[styles.wrapper, style]}
      onLayout={handleLayout}
      accessibilityRole="image"
      accessibilityLabel="Bar chart visualization"
    >
      {/* Legend */}
      {showLegend && seriesWithColors.length > 0 ? (
        <View style={styles.legendContainer}>
          {seriesWithColors.map((s) => (
            <View key={s.key} style={styles.legendItem}>
              <View style={[styles.legendIndicator, { backgroundColor: s.color }]} />
              <Typography variant="caption" color="textSecondary" style={styles.legendLabel}>
                {s.label}
              </Typography>
            </View>
          ))}
        </View>
      ) : null}

      {/* Tooltip */}
      {showTooltip && activeRow && selectedIndex !== null ? (
        <View style={[styles.tooltipContainer, { backgroundColor: theme.backgroundSelected }]}>
          <Typography variant="caption" style={{ fontWeight: '700', marginBottom: 2 }}>
            {xAxisFormatter(activeRow[xKey])}
          </Typography>
          <View style={styles.tooltipRows}>
            {seriesWithColors.map((s) => {
              const val = activeRow[s.key];
              const num = typeof val === 'number' ? val : parseFloat(String(val ?? '0')) || 0;
              return (
                <View key={s.key} style={styles.tooltipRow}>
                  <View style={[styles.tooltipDot, { backgroundColor: s.color }]} />
                  <Typography variant="caption" color="textSecondary">
                    {s.label}:{' '}
                  </Typography>
                  <Typography variant="caption" style={{ fontWeight: '600' }}>
                    {yAxisFormatter(num)}
                  </Typography>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Main Chart Canvas */}
      <View style={[styles.chartArea, { height }]}>
        {/* Y Axis Column */}
        <View style={styles.yAxisColumn}>
          {reversedTicks.map((tickVal, idx) => (
            <Typography key={idx} variant="caption" color="textSecondary" style={styles.yAxisLabel}>
              {yAxisFormatter(tickVal)}
            </Typography>
          ))}
        </View>

        {/* Plot Area */}
        <View style={[styles.plotCanvas, { height: chartHeight + paddingTop }]}>
          {/* Horizontal Grid lines */}
          {showGrid
            ? reversedTicks.map((_, idx) => {
                const topPos = (idx / (reversedTicks.length - 1)) * chartHeight + paddingTop;
                return (
                  <View
                    key={idx}
                    style={[styles.gridLine, { top: topPos, backgroundColor: theme.border }]}
                  />
                );
              })
            : null}

          {/* Grouped Bar Columns */}
          <View style={[styles.barsRow, { height: chartHeight, top: paddingTop }]}>
            {data.map((row, rowIdx) => {
              const isSelected = selectedIndex === rowIdx;
              return (
                <Pressable
                  key={rowIdx}
                  style={[
                    styles.barGroupColumn,
                    isSelected && { backgroundColor: theme.backgroundSelected },
                  ]}
                  onPress={() => setSelectedIndex((prev) => (prev === rowIdx ? null : rowIdx))}
                >
                  <View style={styles.barsGroupInner}>
                    {seriesWithColors.map((s) => {
                      const val = typeof row[s.key] === 'number' ? (row[s.key] as number) : parseFloat(String(row[s.key] ?? '0')) || 0;
                      const barHeight = Math.max((val / maxVal) * chartHeight, 4);
                      return (
                        <View
                          key={s.key}
                          style={[
                            styles.verticalBar,
                            {
                              height: barHeight,
                              backgroundColor: s.color,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>

                  {/* X Axis Label */}
                  <View style={styles.xAxisLabelWrapper}>
                    <Typography
                      variant="caption"
                      color={isSelected ? 'text' : 'textSecondary'}
                      style={[styles.xAxisText, isSelected && { fontWeight: '700' }]}
                      numberOfLines={1}
                    >
                      {xAxisFormatter(row[xKey])}
                    </Typography>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
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
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 11,
  },
  tooltipContainer: {
    padding: Spacing.two,
    borderRadius: Radius.sm,
    marginBottom: Spacing.two,
    alignSelf: 'flex-start',
  },
  tooltipRows: {
    gap: 2,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tooltipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chartArea: {
    flexDirection: 'row',
    width: '100%',
  },
  yAxisColumn: {
    width: 40,
    justifyContent: 'space-between',
    paddingRight: Spacing.one,
    paddingTop: 8,
    paddingBottom: 24,
  },
  yAxisLabel: {
    fontSize: 10,
    textAlign: 'right',
  },
  plotCanvas: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  barsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  barGroupColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 2,
    borderRadius: Radius.sm,
  },
  barsGroupInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
    width: '100%',
  },
  verticalBar: {
    flex: 1,
    maxWidth: 24,
    borderTopLeftRadius: Radius.sm,
    borderTopRightRadius: Radius.sm,
    minHeight: 4,
  },
  xAxisLabelWrapper: {
    position: 'absolute',
    bottom: -22,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  xAxisText: {
    fontSize: 10,
    textAlign: 'center',
  },

  // Horizontal styles
  horizontalContainer: {
    gap: Spacing.two,
  },
  horizontalRowGroup: {
    padding: Spacing.one,
    borderRadius: Radius.sm,
    gap: 4,
  },
  horizontalCategoryLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  horizontalBarsCanvas: {
    gap: 4,
  },
  horizontalBarTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  horizontalBarFill: {
    height: 16,
    borderTopRightRadius: Radius.sm,
    borderBottomRightRadius: Radius.sm,
    minWidth: 4,
  },
  barValueText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
