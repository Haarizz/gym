import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

import type { LineChartProps } from './types';

const DEFAULT_SERIES_COLORS = [
  BrandColors.teal,
  BrandColors.trainerAmber,
  BrandColors.memberGold,
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
];

export function LineChart({
  data,
  xKey,
  series,
  height = 200,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  yAxisFormatter = (v: number) => String(v),
  xAxisFormatter = (v: unknown) => String(v ?? ''),
  emptyText = 'No chart data available',
  style,
}: LineChartProps) {
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

  // Extract all numeric values across series
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

  const { minY, maxY, ticks } = useMemo(() => {
    const rawMin = Math.min(0, ...allValues);
    const rawMax = Math.max(1, ...allValues);
    const range = rawMax - rawMin || 1;
    const tickCount = 4;
    const step = range / tickCount;
    const tickList: number[] = [];
    for (let i = 0; i <= tickCount; i++) {
      tickList.push(rawMin + step * i);
    }
    return {
      minY: rawMin,
      maxY: rawMax,
      ticks: tickList.reverse(), // Top to bottom
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

  const yAxisWidth = 40;
  const paddingBottom = 28;
  const paddingTop = 12;
  const chartWidth = Math.max(containerWidth - yAxisWidth - Spacing.two, 50);
  const chartHeight = Math.max(height - paddingBottom - paddingTop, 50);

  // Compute coordinates for data points
  const pointsBySeries = seriesWithColors.map((s) => {
    return data.map((row, idx) => {
      const xRatio = data.length > 1 ? idx / (data.length - 1) : 0.5;
      const x = xRatio * chartWidth;

      const raw = row[s.key];
      const val = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '0')) || 0;
      const yRatio = maxY - minY > 0 ? (val - minY) / (maxY - minY) : 0.5;
      const y = chartHeight * (1 - yRatio);

      return { x, y, val, label: xAxisFormatter(row[xKey]) };
    });
  });

  const activeRow = selectedIndex !== null && data[selectedIndex] ? data[selectedIndex] : null;

  return (
    <View
      style={[styles.wrapper, style]}
      onLayout={handleLayout}
      accessibilityRole="image"
      accessibilityLabel="Line chart visualization"
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

      {/* Tooltip Overlay */}
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
        {/* Y Axis Labels & Grid Lines */}
        <View style={styles.yAxisColumn}>
          {ticks.map((tickVal, idx) => (
            <Typography
              key={idx}
              variant="caption"
              color="textSecondary"
              style={styles.yAxisLabel}
            >
              {yAxisFormatter(tickVal)}
            </Typography>
          ))}
        </View>

        {/* Plot Area */}
        <View style={[styles.plotCanvas, { height: chartHeight + paddingTop }]}>
          {/* Horizontal Grid lines */}
          {showGrid
            ? ticks.map((_, idx) => {
                const topPos = (idx / (ticks.length - 1)) * chartHeight + paddingTop;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.gridLine,
                      { top: topPos, backgroundColor: theme.border },
                    ]}
                  />
                );
              })
            : null}

          {/* Lines and Data Points */}
          {containerWidth > 0 &&
            seriesWithColors.map((s, seriesIdx) => {
              const pts = pointsBySeries[seriesIdx];
              return (
                <View key={s.key} style={StyleSheet.absoluteFill} pointerEvents="box-none">
                  {/* Segment lines */}
                  {pts.map((pt, i) => {
                    if (i === 0) return null;
                    const prev = pts[i - 1];
                    const dx = pt.x - prev.x;
                    const dy = pt.y - prev.y;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                    const cx = (prev.x + pt.x) / 2;
                    const cy = (prev.y + pt.y) / 2 + paddingTop;

                    return (
                      <View
                        key={`line-${i}`}
                        style={{
                          position: 'absolute',
                          left: cx - length / 2,
                          top: cy - 1,
                          width: length,
                          height: 2,
                          backgroundColor: s.color,
                          transform: [{ rotate: `${angle}deg` }],
                        }}
                      />
                    );
                  })}

                  {/* Point dots */}
                  {pts.map((pt, i) => (
                    <View
                      key={`dot-${i}`}
                      style={[
                        styles.dot,
                        {
                          left: pt.x - 4,
                          top: pt.y + paddingTop - 4,
                          borderColor: s.color,
                          backgroundColor:
                            selectedIndex === i ? s.color : theme.backgroundElement,
                        },
                      ]}
                    />
                  ))}
                </View>
              );
            })}

          {/* Touch Area Overlay per X index */}
          {containerWidth > 0 && (
            <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>

              {data.map((_, idx) => (
                <Pressable
                  key={idx}
                  style={styles.touchColumn}
                  onPress={() =>
                    setSelectedIndex((prev) => (prev === idx ? null : idx))
                  }
                />
              ))}
            </View>
          )}

          {/* X Axis Labels */}
          <View style={[styles.xAxisRow, { top: chartHeight + paddingTop + 4 }]}>
            {data.map((row, idx) => {
              const xRatio = data.length > 1 ? idx / (data.length - 1) : 0.5;
              const x = xRatio * chartWidth;
              return (
                <View key={idx} style={[styles.xAxisLabelWrapper, { left: x - 25 }]}>
                  <Typography
                    variant="caption"
                    color={selectedIndex === idx ? 'text' : 'textSecondary'}
                    style={[
                      styles.xAxisText,
                      selectedIndex === idx && { fontWeight: '700' },
                    ]}
                    numberOfLines={1}
                  >
                    {xAxisFormatter(row[xKey])}
                  </Typography>
                </View>
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
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
  touchColumn: {
    flex: 1,
    height: '100%',
  },
  xAxisRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 20,
  },
  xAxisLabelWrapper: {
    position: 'absolute',
    width: 50,
    alignItems: 'center',
  },
  xAxisText: {
    fontSize: 10,
    textAlign: 'center',
  },
});
