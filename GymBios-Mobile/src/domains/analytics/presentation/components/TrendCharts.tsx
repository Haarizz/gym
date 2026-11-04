import React, { useMemo, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { Text } from '@/shared/components/AppText';
import { BrandColors, Spacing, TypographyScale } from '@/core/theme';
import { AXIS, GRID, SERIES, barPath, labelEvery, monotonePath, niceTicks } from './chartUtils';

const HEIGHT = 200;
const PAD_TOP = 10;
const PAD_BOTTOM = 22;
const PAD_END = 8;
const FONT = 10;
const TOOLTIP_W = 150;

interface Series {
  label: string;
  color: string;
}

/** Shared touch handling: tap or drag picks the nearest column; the tooltip flips near the edge. */
function useScrub(count: number, xFor: (i: number) => number) {
  const [active, setActive] = useState<number | null>(null);
  const pick = (e: GestureResponderEvent) => {
    if (count === 0) return;
    const x = e.nativeEvent.locationX;
    let best = 0;
    for (let i = 1; i < count; i++) if (Math.abs(xFor(i) - x) < Math.abs(xFor(best) - x)) best = i;
    setActive(best);
  };
  return {
    active,
    responder: {
      onStartShouldSetResponder: () => true,
      onMoveShouldSetResponder: () => true,
      onResponderGrant: pick,
      onResponderMove: pick,
      onResponderTerminationRequest: () => true,
    },
  };
}

function Tooltip({ x, width, title, rows }: { x: number; width: number; title: string; rows: { label: string; color?: string; value: React.ReactNode }[] }) {
  let left = x + 10;
  if (left + TOOLTIP_W > width) left = x - TOOLTIP_W - 10;
  return (
    <View pointerEvents="none" style={[styles.tooltip, { left: Math.max(0, left) }]}>
      <Text style={styles.tooltipTitle}>{title}</Text>
      {rows.map((r) => (
        <View key={r.label} style={styles.tooltipRow}>
          {r.color ? <View style={[styles.tooltipSwatch, { backgroundColor: r.color }]} /> : null}
          <Text style={styles.tooltipLabel} numberOfLines={1}>{r.label}</Text>
          <Text style={styles.tooltipValue}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Stacked bars with an optional below-axis series ──────────────────────

export interface BarBucket {
  label: string;
  title: string;
  /** One value per entry in `series`, stacked upwards. */
  values: number[];
  /** Drawn below the axis (e.g. members lost). */
  below?: number;
}

export function BarTrendChart({
  buckets,
  series,
  belowSeries,
}: {
  buckets: BarBucket[];
  series: Series[];
  belowSeries?: Series;
}) {
  const [width, setWidth] = useState(0);
  const chart = useMemo(() => {
    if (width === 0 || buckets.length === 0) return null;
    const maxUp = Math.max(...buckets.map((b) => b.values.reduce((s, v) => s + v, 0)), 0);
    const maxDown = belowSeries ? Math.max(...buckets.map((b) => b.below ?? 0), 0) : 0;
    const upTicks = niceTicks(Math.max(maxUp, 1), 3);
    const step = upTicks[1];
    const downTicks = maxDown > 0 ? Array.from({ length: Math.ceil(maxDown / step) }, (_, i) => -(i + 1) * step) : [];
    const top = upTicks[upTicks.length - 1];
    const bottom = downTicks.length ? downTicks[downTicks.length - 1] : 0;
    const longest = Math.max(...[...upTicks, ...downTicks].map((t) => String(Math.abs(t)).length));
    const padStart = longest * FONT * 0.6 + 8;
    const plotW = width - padStart - PAD_END;
    const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
    const yFor = (v: number) => PAD_TOP + ((top - v) / (top - bottom)) * plotH;
    const slot = plotW / buckets.length;
    const barW = Math.max(2, Math.min(28, slot - 2));
    const xFor = (i: number) => padStart + slot * i + slot / 2;
    return { ticks: [...upTicks, ...downTicks], padStart, plotW, yFor, barW, xFor, baseline: yFor(0) };
  }, [width, buckets, belowSeries]);

  const scrub = useScrub(buckets.length, (i) => chart?.xFor(i) ?? 0);
  const showLabel = labelEvery(buckets.length);
  const active = scrub.active != null ? buckets[scrub.active] : null;

  return (
    <View>
      <View style={{ height: HEIGHT }} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} {...scrub.responder}>
        {chart && (
          <Svg width={width} height={HEIGHT} pointerEvents="none">
            {chart.ticks.map((tick) => (
              <G key={tick}>
                <Line x1={chart.padStart} x2={chart.padStart + chart.plotW} y1={chart.yFor(tick)} y2={chart.yFor(tick)} stroke={tick === 0 ? AXIS : GRID} strokeDasharray={tick === 0 ? undefined : '3 3'} />
                <SvgText x={chart.padStart - 5} y={chart.yFor(tick) + 3} fontSize={FONT} fill={BrandColors.textSecondary} textAnchor="end">
                  {String(Math.abs(tick))}
                </SvgText>
              </G>
            ))}
            {buckets.map((b, i) => {
              const x = chart.xFor(i) - chart.barW / 2;
              const dim = scrub.active != null && scrub.active !== i ? 0.45 : 1;
              const lastSeg = b.values.reduce((last, v, s) => (v > 0 ? s : last), -1);
              let base = 0;
              let drawn = 0;
              const stack = b.values.map((v, s) => {
                if (v <= 0) return null;
                // 2px surface gap above any segment already drawn below this one
                const bottom = chart.yFor(base) - (drawn > 0 ? 2 : 0);
                base += v;
                drawn++;
                const top = Math.min(chart.yFor(base), bottom - 1);
                const w = chart.barW;
                const d = s === lastSeg
                  ? barPath(x, w, bottom, top)
                  : `M${x},${bottom} L${x},${top} L${x + w},${top} L${x + w},${bottom} Z`;
                return <Path key={s} d={d} fill={series[s].color} opacity={dim} />;
              });
              return (
                <G key={b.label + i}>
                  {stack}
                  {belowSeries && (b.below ?? 0) > 0 && (
                    <Path d={barPath(x, chart.barW, chart.baseline + 1, chart.yFor(-(b.below ?? 0)))} fill={belowSeries.color} opacity={dim} />
                  )}
                  {showLabel(i) && (
                    <SvgText x={chart.xFor(i)} y={HEIGHT - 6} fontSize={FONT} fill={BrandColors.textSecondary} textAnchor="middle">
                      {b.label}
                    </SvgText>
                  )}
                </G>
              );
            })}
          </Svg>
        )}
        {chart && active && scrub.active != null && (
          <Tooltip
            x={chart.xFor(scrub.active)}
            width={width}
            title={active.title}
            rows={[
              ...series.map((s, i) => ({ label: s.label, color: s.color, value: active.values[i] ?? 0 })),
              ...(belowSeries ? [{ label: belowSeries.label, color: belowSeries.color, value: active.below ?? 0 }] : []),
            ]}
          />
        )}
      </View>
    </View>
  );
}

// ── Area line ─────────────────────────────────────────────────────────────

export interface LinePoint {
  label: string;
  title: string;
  value: number;
}

export function LineTrendChart({
  points,
  formatTick,
  tooltipRows,
  color = SERIES[0],
}: {
  points: LinePoint[];
  formatTick: (v: number) => string;
  tooltipRows: (index: number) => { label: string; value: React.ReactNode }[];
  color?: string;
}) {
  const [width, setWidth] = useState(0);
  const chart = useMemo(() => {
    if (width === 0 || points.length === 0) return null;
    const ticks = niceTicks(Math.max(...points.map((p) => p.value), 0), 3);
    const labels = ticks.map(formatTick);
    const padStart = Math.max(...labels.map((l) => l.length)) * FONT * 0.6 + 8;
    const plotW = width - padStart - PAD_END;
    const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
    const top = ticks[ticks.length - 1] || 1;
    const baseline = PAD_TOP + plotH;
    const xFor = (i: number) => (points.length === 1 ? padStart + plotW / 2 : padStart + (i / (points.length - 1)) * plotW);
    const yFor = (v: number) => baseline - (v / top) * plotH;
    const xy = points.map((p, i) => ({ x: xFor(i), y: yFor(p.value) }));
    const line = monotonePath(xy);
    const area = `${line} L${xy[xy.length - 1].x},${baseline} L${xy[0].x},${baseline} Z`;
    return { ticks, labels, padStart, plotW, baseline, xFor, yFor, xy, line, area };
  }, [width, points, formatTick]);

  const scrub = useScrub(points.length, (i) => chart?.xFor(i) ?? 0);
  const showLabel = labelEvery(points.length);
  const activeXY = chart && scrub.active != null ? chart.xy[scrub.active] : null;

  return (
    <View style={{ height: HEIGHT }} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} {...scrub.responder}>
      {chart && (
        <Svg width={width} height={HEIGHT} pointerEvents="none">
          <Defs>
            <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <Stop offset="100%" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {chart.ticks.map((tick, i) => (
            <G key={tick}>
              <Line x1={chart.padStart} x2={chart.padStart + chart.plotW} y1={chart.yFor(tick)} y2={chart.yFor(tick)} stroke={i === 0 ? AXIS : GRID} strokeDasharray={i === 0 ? undefined : '3 3'} />
              <SvgText x={chart.padStart - 5} y={chart.yFor(tick) + 3} fontSize={FONT} fill={BrandColors.textSecondary} textAnchor="end">
                {chart.labels[i]}
              </SvgText>
            </G>
          ))}
          {points.map((p, i) =>
            showLabel(i) ? (
              <SvgText key={i} x={chart.xFor(i)} y={HEIGHT - 6} fontSize={FONT} fill={BrandColors.textSecondary} textAnchor="middle">
                {p.label}
              </SvgText>
            ) : null,
          )}
          <Path d={chart.area} fill="url(#trendFill)" />
          <Path d={chart.line} fill="none" stroke={color} strokeWidth={2} />
          {activeXY && (
            <>
              <Line x1={activeXY.x} x2={activeXY.x} y1={PAD_TOP} y2={chart.baseline} stroke={AXIS} />
              <Circle cx={activeXY.x} cy={activeXY.y} r={4.5} fill={color} stroke={BrandColors.surface} strokeWidth={2} />
            </>
          )}
        </Svg>
      )}
      {chart && activeXY && scrub.active != null && (
        <Tooltip x={activeXY.x} width={width} title={points[scrub.active].title} rows={tooltipRows(scrub.active)} />
      )}
    </View>
  );
}

// ── Donut with a value legend ─────────────────────────────────────────────

export function DonutChart({
  slices,
  renderValue,
  centerLabel,
  centerValue,
}: {
  slices: { label: string; value: number; color: string }[];
  renderValue: (value: number) => React.ReactNode;
  centerLabel: string;
  centerValue: React.ReactNode;
}) {
  const size = 132;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + x.value, 0);
  const visible = slices.filter((s) => s.value > 0);
  // 2px surface gap between slices (skipped for a single slice)
  const gap = visible.length > 1 ? 2 : 0;
  // Each slice starts where the previous ones end
  const arcs = visible.map((s, i) => ({
    ...s,
    len: total > 0 ? (s.value / total) * c : 0,
    start: visible.slice(0, i).reduce((sum, p) => sum + (p.value / total) * c, 0),
  }));

  return (
    <View style={styles.donutWrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {total === 0 && <Circle cx={size / 2} cy={size / 2} r={r} stroke={GRID} strokeWidth={stroke} fill="none" />}
            {arcs.map((s) => (
              <Circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={s.color}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${Math.max(0, s.len - gap)} ${c}`}
                strokeDashoffset={-s.start}
              />
            ))}
          </G>
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.donutCenter]}>
          <Text style={styles.donutCenterValue} numberOfLines={1} adjustsFontSizeToFit>{centerValue}</Text>
          <Text style={styles.donutCenterLabel}>{centerLabel}</Text>
        </View>
      </View>
      <View style={styles.donutLegend}>
        {slices.map((s) => (
          <View key={s.label} style={styles.donutRow}>
            <View style={[styles.tooltipSwatch, { backgroundColor: s.color }]} />
            <Text style={styles.donutName} numberOfLines={1}>{s.label}</Text>
            <View style={styles.donutNums}>
              <Text style={styles.donutValue}>{renderValue(s.value)}</Text>
              <Text style={styles.donutPct}>{total > 0 ? `${Math.round((s.value / total) * 100)}%` : '—'}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    top: 0,
    width: TOOLTIP_W,
    backgroundColor: BrandColors.surface,
    borderWidth: 1,
    borderColor: GRID,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    gap: 2,
  },
  tooltipTitle: { fontSize: TypographyScale.small, fontWeight: '600', color: BrandColors.textPrimary, marginBottom: 2 },
  tooltipRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tooltipSwatch: { width: 8, height: 8, borderRadius: 2 },
  tooltipLabel: { flex: 1, fontSize: TypographyScale.small, color: BrandColors.textSecondary },
  tooltipValue: { fontSize: TypographyScale.small, fontWeight: '600', color: BrandColors.textPrimary },

  donutWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  donutCenter: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  donutCenterValue: { fontSize: TypographyScale.subtitle, fontWeight: '700', color: BrandColors.textPrimary },
  donutCenterLabel: { fontSize: TypographyScale.caption, color: BrandColors.textSecondary },
  donutLegend: { flex: 1, gap: 8 },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  donutName: { flex: 1, fontSize: TypographyScale.small, color: BrandColors.textPrimary },
  donutNums: { alignItems: 'flex-end' },
  donutValue: { fontSize: TypographyScale.small, fontWeight: '600', color: BrandColors.textPrimary },
  donutPct: { fontSize: TypographyScale.caption, color: BrandColors.textSecondary },
});
