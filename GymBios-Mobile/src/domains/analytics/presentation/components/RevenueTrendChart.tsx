import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, GestureResponderEvent } from 'react-native';
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { fullMonth, niceStep, shortMonth } from './chartUtils';

interface RevenueTrendData {
  month: string;
  revenue: number;
}

interface RevenueTrendChartProps {
  data: RevenueTrendData[];
}

const CHART_HEIGHT = 220;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 24;
const PADDING_RIGHT = 12;
const TICK_COUNT = 4;
const AXIS_FONT_SIZE = 11;
const TOOLTIP_WIDTH = 124;
const GRID_COLOR = '#e5e7eb';
const AXIS_COLOR = '#9ca3af';

function trimNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}

function formatCompactRupees(value: number) {
  if (value >= 1e7) return `₹${trimNumber(value / 1e7)}Cr`;
  if (value >= 1e5) return `₹${trimNumber(value / 1e5)}L`;
  if (value >= 1e3) return `₹${trimNumber(value / 1e3)}K`;
  return `₹${Math.round(value)}`;
}

function formatFullRupees(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

// Monotone cubic interpolation (Fritsch–Carlson): smooth like a bezier but never overshoots the data
function monotonePath(points: { x: number; y: number }[]) {
  const n = points.length;
  if (n === 0) return '';
  if (n === 1) return `M${points[0].x},${points[0].y}`;

  const dx: number[] = [];
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1].x - points[i].x);
    slopes.push((points[i + 1].y - points[i].y) / dx[i]);
  }

  const tangents: number[] = [slopes[0]];
  for (let i = 1; i < n - 1; i++) {
    tangents.push(slopes[i - 1] * slopes[i] <= 0 ? 0 : (slopes[i - 1] + slopes[i]) / 2);
  }
  tangents.push(slopes[n - 2]);

  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    const a = tangents[i] / slopes[i];
    const b = tangents[i + 1] / slopes[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      tangents[i] = t * a * slopes[i];
      tangents[i + 1] = t * b * slopes[i];
    }
  }

  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const third = dx[i] / 3;
    d += ` C${p0.x + third},${p0.y + tangents[i] * third} ${p1.x - third},${p1.y - tangents[i + 1] * third} ${p1.x},${p1.y}`;
  }
  return d;
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (!data || data.length === 0 || width === 0) return null;

    const maxRevenue = Math.max(...data.map(d => d.revenue), 0);
    const step = maxRevenue > 0 ? niceStep(maxRevenue / TICK_COUNT) : 250;
    const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => i * step);
    const yMax = ticks[ticks.length - 1];
    const tickLabels = ticks.map(formatCompactRupees);

    // Size the left gutter to the widest Y label so it never collides with the plot
    const longestLabel = Math.max(...tickLabels.map(label => label.length));
    const paddingLeft = longestLabel * AXIS_FONT_SIZE * 0.6 + 10;

    const plotWidth = width - paddingLeft - PADDING_RIGHT;
    const plotHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
    const baseline = PADDING_TOP + plotHeight;

    const xFor = (i: number) =>
      data.length === 1 ? paddingLeft + plotWidth / 2 : paddingLeft + (i / (data.length - 1)) * plotWidth;
    const yFor = (value: number) => baseline - (value / yMax) * plotHeight;

    const points = data.map((d, i) => ({ x: xFor(i), y: yFor(d.revenue) }));
    const linePath = monotonePath(points);
    const areaPath = `${linePath} L${points[points.length - 1].x},${baseline} L${points[0].x},${baseline} Z`;

    return { ticks, tickLabels, paddingLeft, plotWidth, baseline, yFor, points, linePath, areaPath };
  }, [data, width]);

  if (!data || data.length === 0) return null;

  const handleLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const selectNearest = (event: GestureResponderEvent) => {
    if (!chart) return;
    const touchX = event.nativeEvent.locationX;
    let nearest = 0;
    chart.points.forEach((point, i) => {
      if (Math.abs(point.x - touchX) < Math.abs(chart.points[nearest].x - touchX)) nearest = i;
    });
    setActiveIndex(nearest);
  };

  const activePoint = chart && activeIndex !== null ? chart.points[activeIndex] : null;
  const activeDatum = activeIndex !== null ? data[activeIndex] : null;

  // Place the tooltip beside the point, flipping to the other side near the right edge
  let tooltipLeft = 0;
  if (activePoint) {
    tooltipLeft = activePoint.x + 12;
    if (tooltipLeft + TOOLTIP_WIDTH > width) tooltipLeft = activePoint.x - TOOLTIP_WIDTH - 12;
    tooltipLeft = Math.max(0, tooltipLeft);
  }
  const tooltipTop = activePoint ? Math.min(Math.max(activePoint.y - 56, 0), CHART_HEIGHT - PADDING_BOTTOM - 60) : 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Revenue Trend ({data.length} Months)</Text>

      <View
        style={styles.chartArea}
        onLayout={handleLayout}
        onStartShouldSetResponder={() => true}
        onResponderGrant={selectNearest}
        onResponderMove={selectNearest}
      >
        {chart && (
          <Svg width={width} height={CHART_HEIGHT} pointerEvents="none">
            <Defs>
              <LinearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="5%" stopColor={BrandColors.teal} stopOpacity={0.3} />
                <Stop offset="95%" stopColor={BrandColors.teal} stopOpacity={0} />
              </LinearGradient>
            </Defs>

            {/* Horizontal grid + Y axis labels */}
            {chart.ticks.map((tick, i) => {
              const y = chart.yFor(tick);
              return (
                <React.Fragment key={`tick-${i}`}>
                  <Line
                    x1={chart.paddingLeft}
                    x2={chart.paddingLeft + chart.plotWidth}
                    y1={y}
                    y2={y}
                    stroke={GRID_COLOR}
                    strokeDasharray="3 3"
                  />
                  <SvgText
                    x={chart.paddingLeft - 6}
                    y={y + 4}
                    fontSize={AXIS_FONT_SIZE}
                    fill={BrandColors.textSecondary}
                    textAnchor="end"
                  >
                    {chart.tickLabels[i]}
                  </SvgText>
                </React.Fragment>
              );
            })}

            {/* Vertical grid + X axis labels */}
            {chart.points.map((point, i) => (
              <React.Fragment key={`x-${i}`}>
                <Line
                  x1={point.x}
                  x2={point.x}
                  y1={PADDING_TOP}
                  y2={chart.baseline}
                  stroke={GRID_COLOR}
                  strokeDasharray="3 3"
                />
                <SvgText
                  x={point.x}
                  y={chart.baseline + 16}
                  fontSize={AXIS_FONT_SIZE}
                  fill={BrandColors.textSecondary}
                  textAnchor="middle"
                >
                  {shortMonth(data[i].month)}
                </SvgText>
              </React.Fragment>
            ))}

            {/* Axis lines */}
            <Line
              x1={chart.paddingLeft}
              x2={chart.paddingLeft}
              y1={PADDING_TOP}
              y2={chart.baseline}
              stroke={AXIS_COLOR}
            />
            <Line
              x1={chart.paddingLeft}
              x2={chart.paddingLeft + chart.plotWidth}
              y1={chart.baseline}
              y2={chart.baseline}
              stroke={AXIS_COLOR}
            />

            <Path d={chart.areaPath} fill="url(#revenueFill)" />
            <Path d={chart.linePath} fill="none" stroke={BrandColors.teal} strokeWidth={2} />

            {activePoint && (
              <>
                <Line
                  x1={activePoint.x}
                  x2={activePoint.x}
                  y1={PADDING_TOP}
                  y2={chart.baseline}
                  stroke={AXIS_COLOR}
                  strokeWidth={1}
                />
                <Circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r={4}
                  fill={BrandColors.teal}
                  stroke={BrandColors.surface}
                  strokeWidth={2}
                />
              </>
            )}
          </Svg>
        )}

        {activePoint && activeDatum && (
          <View pointerEvents="none" style={[styles.tooltip, { left: tooltipLeft, top: tooltipTop }]}>
            <Text style={styles.tooltipLabel}>{fullMonth(activeDatum.month)}</Text>
            <Text style={styles.tooltipValue}>Revenue: {formatFullRupees(activeDatum.revenue)}</Text>
          </View>
        )}
      </View>

      <Text style={styles.hint}>Tap or drag across the chart to see monthly revenue</Text>
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
    marginBottom: Spacing.four,
  },
  title: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '600',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.three,
  },
  chartArea: {
    width: '100%',
    height: CHART_HEIGHT,
  },
  tooltip: {
    position: 'absolute',
    width: TOOLTIP_WIDTH,
    backgroundColor: BrandColors.surface,
    borderWidth: 1,
    borderColor: GRID_COLOR,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  tooltipLabel: {
    fontSize: TypographyScale.small,
    color: BrandColors.textPrimary,
    marginBottom: 2,
  },
  tooltipValue: {
    fontSize: TypographyScale.small,
    fontWeight: '600',
    color: BrandColors.teal,
  },
  hint: {
    fontSize: TypographyScale.caption,
    color: BrandColors.textSecondary,
    marginTop: Spacing.two,
    textAlign: 'center',
  },
});
