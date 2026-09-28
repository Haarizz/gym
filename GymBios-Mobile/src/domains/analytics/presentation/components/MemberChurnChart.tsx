import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, GestureResponderEvent } from 'react-native';
import Svg, { Path, Rect, Line, Text as SvgText } from 'react-native-svg';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { fullMonth, niceStep, shortMonth } from './chartUtils';

interface MemberChurnData {
  month: string;
  newMembers: number;
  churned: number;
}

interface MemberChurnChartProps {
  data: MemberChurnData[];
}

const CHART_HEIGHT = 220;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 24;
const PADDING_RIGHT = 12;
const TICK_COUNT = 4;
const AXIS_FONT_SIZE = 11;
const TOOLTIP_WIDTH = 124;
const MAX_BAR_WIDTH = 18;
const BAR_GAP = 4;
const BAR_RADIUS = 6;
const GRID_COLOR = '#e5e7eb';
const AXIS_COLOR = '#9ca3af';
const CURSOR_COLOR = '#f3f4f6';
const NEW_COLOR = BrandColors.memberGold;
const CHURN_COLOR = '#ef4444';

// Bar with only the top corners rounded, so short bars stay flat on the baseline instead of turning into pills
function topRoundedBar(x: number, y: number, width: number, height: number) {
  const r = Math.min(BAR_RADIUS, width / 2, height);
  const bottom = y + height;
  return (
    `M${x},${bottom} L${x},${y + r} Q${x},${y} ${x + r},${y} ` +
    `L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${bottom} Z`
  );
}

export function MemberChurnChart({ data }: MemberChurnChartProps) {
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (!data || data.length === 0 || width === 0) return null;

    const maxValue = Math.max(...data.map(d => Math.max(d.newMembers, d.churned)), 0);
    const step = maxValue > 0 ? Math.max(1, niceStep(maxValue / TICK_COUNT)) : 1;
    const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => i * step);
    const yMax = ticks[ticks.length - 1];
    const tickLabels = ticks.map(String);

    // Size the left gutter to the widest Y label so it never collides with the plot
    const longestLabel = Math.max(...tickLabels.map(label => label.length));
    const paddingLeft = longestLabel * AXIS_FONT_SIZE * 0.6 + 10;

    const plotWidth = width - paddingLeft - PADDING_RIGHT;
    const plotHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
    const baseline = PADDING_TOP + plotHeight;

    const groupWidth = plotWidth / data.length;
    const barWidth = Math.min(MAX_BAR_WIDTH, (groupWidth - BAR_GAP) * 0.35);
    const yFor = (value: number) => baseline - (value / yMax) * plotHeight;

    const groups = data.map((d, i) => {
      const center = paddingLeft + groupWidth * (i + 0.5);
      const newTop = yFor(d.newMembers);
      const churnTop = yFor(d.churned);
      return {
        center,
        left: paddingLeft + groupWidth * i,
        newPath: d.newMembers > 0 ? topRoundedBar(center - BAR_GAP / 2 - barWidth, newTop, barWidth, baseline - newTop) : null,
        churnPath: d.churned > 0 ? topRoundedBar(center + BAR_GAP / 2, churnTop, barWidth, baseline - churnTop) : null,
        top: Math.min(newTop, churnTop),
      };
    });

    return { ticks, tickLabels, paddingLeft, plotWidth, groupWidth, baseline, yFor, groups };
  }, [data, width]);

  if (!data || data.length === 0) return null;

  const handleLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const selectGroup = (event: GestureResponderEvent) => {
    if (!chart) return;
    const index = Math.floor((event.nativeEvent.locationX - chart.paddingLeft) / chart.groupWidth);
    setActiveIndex(Math.min(Math.max(index, 0), data.length - 1));
  };

  const activeGroup = chart && activeIndex !== null ? chart.groups[activeIndex] : null;
  const activeDatum = activeIndex !== null ? data[activeIndex] : null;

  // Place the tooltip beside the group, flipping to the other side near the right edge
  let tooltipLeft = 0;
  if (chart && activeGroup) {
    tooltipLeft = activeGroup.left + chart.groupWidth + 4;
    if (tooltipLeft + TOOLTIP_WIDTH > width) tooltipLeft = activeGroup.left - TOOLTIP_WIDTH - 4;
    tooltipLeft = Math.max(0, tooltipLeft);
  }
  const tooltipTop = activeGroup ? Math.min(Math.max(activeGroup.top - 20, 0), CHART_HEIGHT - PADDING_BOTTOM - 76) : 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>New Members vs Churn</Text>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: NEW_COLOR }]} />
          <Text style={styles.legendText}>New members</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: CHURN_COLOR }]} />
          <Text style={styles.legendText}>Churned</Text>
        </View>
      </View>

      <View
        style={styles.chartArea}
        onLayout={handleLayout}
        onStartShouldSetResponder={() => true}
        onResponderGrant={selectGroup}
        onResponderMove={selectGroup}
      >
        {chart && (
          <Svg width={width} height={CHART_HEIGHT} pointerEvents="none">
            {/* Highlight band behind the selected month */}
            {activeGroup && (
              <Rect
                x={activeGroup.left}
                y={PADDING_TOP}
                width={chart.groupWidth}
                height={chart.baseline - PADDING_TOP}
                fill={CURSOR_COLOR}
              />
            )}

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

            {/* Vertical grid between months */}
            {chart.groups.map((group, i) => (
              <Line
                key={`vgrid-${i}`}
                x1={group.left + chart.groupWidth}
                x2={group.left + chart.groupWidth}
                y1={PADDING_TOP}
                y2={chart.baseline}
                stroke={GRID_COLOR}
                strokeDasharray="3 3"
              />
            ))}

            {/* Bars + X axis labels */}
            {chart.groups.map((group, i) => (
              <React.Fragment key={`group-${i}`}>
                {group.newPath && <Path d={group.newPath} fill={NEW_COLOR} />}
                {group.churnPath && <Path d={group.churnPath} fill={CHURN_COLOR} />}
                <SvgText
                  x={group.center}
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
          </Svg>
        )}

        {activeGroup && activeDatum && (
          <View pointerEvents="none" style={[styles.tooltip, { left: tooltipLeft, top: tooltipTop }]}>
            <Text style={styles.tooltipLabel}>{fullMonth(activeDatum.month)}</Text>
            <Text style={[styles.tooltipValue, { color: '#b45309' }]}>New: {activeDatum.newMembers}</Text>
            <Text style={[styles.tooltipValue, { color: CHURN_COLOR }]}>Churned: {activeDatum.churned}</Text>
          </View>
        )}
      </View>

      <Text style={styles.hint}>Tap or drag across the chart to see monthly numbers</Text>
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
    marginBottom: Spacing.two,
  },
  legend: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginBottom: Spacing.three,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    fontSize: TypographyScale.caption,
    color: BrandColors.textSecondary,
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
  },
  hint: {
    fontSize: TypographyScale.caption,
    color: BrandColors.textSecondary,
    marginTop: Spacing.two,
    textAlign: 'center',
  },
});
