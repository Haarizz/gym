import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import Svg, { Circle } from 'react-native-svg';
import { Text } from '@/shared/components/AppText';
import { formatDate } from '@/core/i18n/format';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import type { Kpi } from '../../hooks/useAdminAnalytics';
import { BAD, GOOD, GRID, SERIES, percentChange } from './chartUtils';

// ── Card ──────────────────────────────────────────────────────────────────

export function ChartCard({
  title,
  subtitle,
  empty,
  emptyText,
  children,
}: {
  title: string;
  subtitle?: string;
  empty?: boolean;
  emptyText?: string;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      <View style={styles.cardBody}>
        {empty ? <Text style={styles.empty}>{emptyText ?? t('analytics.noData')}</Text> : children}
      </View>
    </View>
  );
}

// ── KPI tiles ─────────────────────────────────────────────────────────────

/**
 * A headline number with its change against the previous period.
 * `delta: 'points'` compares two percentages (shown as "pts"); `goodWhen: 'down'` flips the colour.
 */
export function KpiTile({
  label,
  value,
  kpi,
  delta = 'percent',
  goodWhen = 'up',
  footnote,
}: {
  label: string;
  value: React.ReactNode;
  kpi?: Kpi;
  delta?: 'percent' | 'points';
  goodWhen?: 'up' | 'down';
  footnote?: string;
}) {
  const { t } = useTranslation();
  let change: number | null = null;
  if (kpi && kpi.value != null && kpi.previous != null) {
    change = delta === 'points' ? kpi.value - kpi.previous : percentChange(kpi.value, kpi.previous);
  }
  const flat = change != null && Math.abs(change) < 0.05;
  const up = change != null && change > 0;
  const good = goodWhen === 'up' ? up : !up;
  const color = change == null || flat ? BrandColors.textSecondary : good ? GOOD : BAD;
  const shown = change == null ? '' : `${up ? '+' : flat ? '' : '−'}${Math.abs(change).toFixed(Math.abs(change) < 10 ? 1 : 0)}${delta === 'points' ? ` ${t('analytics.pts')}` : '%'}`;

  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {change != null ? (
        <View style={styles.kpiDelta}>
          <Feather name={flat ? 'minus' : up ? 'arrow-up-right' : 'arrow-down-right'} size={12} color={color} />
          <Text style={[styles.kpiDeltaText, { color }]}>{shown}</Text>
          <Text style={styles.kpiDeltaHint} numberOfLines={1}>{t('analytics.vsPrevious')}</Text>
        </View>
      ) : (
        <Text style={styles.kpiDeltaHint} numberOfLines={1}>{footnote ?? (kpi ? t('analytics.noComparison') : ' ')}</Text>
      )}
    </View>
  );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.kpiGrid}>{children}</View>;
}

// ── Legend ────────────────────────────────────────────────────────────────

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <View style={styles.legend}>
      {items.map((item) => (
        <View key={item.label} style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: item.color }]} />
          <Text style={styles.legendText}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Ring (single percentage) ──────────────────────────────────────────────

export function RingStat({
  value,
  label,
  caption,
  color = SERIES[0],
  size = 96,
}: {
  value: number | null;
  label: string;
  caption?: string;
  color?: string;
  size?: number;
}) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <View style={styles.ring}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={GRID} strokeWidth={stroke} fill="none" />
          {pct > 0 && (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={color}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${(pct / 100) * c} ${c}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          )}
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.ringCenter]}>
          <Text style={styles.ringValue}>{value == null ? '—' : `${Math.round(pct)}%`}</Text>
        </View>
      </View>
      <View style={styles.ringText}>
        <Text style={styles.ringLabel}>{label}</Text>
        {caption ? <Text style={styles.ringCaption}>{caption}</Text> : null}
      </View>
    </View>
  );
}

// ── 100% segment bar ──────────────────────────────────────────────────────

export function SegmentBar({
  segments,
  renderValue,
}: {
  segments: { label: string; value: number; color: string }[];
  renderValue?: (value: number) => React.ReactNode;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const visible = segments.filter((s) => s.value > 0);
  return (
    <View>
      <View style={styles.segmentTrack}>
        {total > 0 &&
          visible.map((s, i) => (
            <View
              key={s.label}
              style={{
                flex: s.value,
                backgroundColor: s.color,
                marginStart: i === 0 ? 0 : 2,
                borderTopStartRadius: i === 0 ? 4 : 0,
                borderBottomStartRadius: i === 0 ? 4 : 0,
                borderTopEndRadius: i === visible.length - 1 ? 4 : 0,
                borderBottomEndRadius: i === visible.length - 1 ? 4 : 0,
              }}
            />
          ))}
      </View>
      <View style={styles.segmentRows}>
        {segments.map((s) => (
          <View key={s.label} style={styles.segmentRow}>
            <View style={[styles.swatch, { backgroundColor: s.color }]} />
            <Text style={styles.segmentLabel}>{s.label}</Text>
            <Text style={styles.segmentValue}>{renderValue ? renderValue(s.value) : s.value}</Text>
            <Text style={styles.segmentPct}>{total > 0 ? `${Math.round((s.value / total) * 100)}%` : '—'}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Ranked horizontal bars ────────────────────────────────────────────────

export interface RankedRow {
  key: string;
  name: string;
  /** Bar length, relative to `max` (defaults to the largest row). */
  value: number;
  display: React.ReactNode;
  detail?: string;
}

export function RankedBars({ rows, max, color = SERIES[0] }: { rows: RankedRow[]; max?: number; color?: string }) {
  const top = max ?? Math.max(...rows.map((r) => r.value), 0);
  return (
    <View style={styles.ranked}>
      {rows.map((row) => (
        <View key={row.key}>
          <View style={styles.rankedHead}>
            <Text style={styles.rankedName} numberOfLines={1}>{row.name}</Text>
            <Text style={styles.rankedValue}>{row.display}</Text>
          </View>
          <View style={styles.rankedTrack}>
            <View
              style={[
                styles.rankedFill,
                { backgroundColor: color, width: `${top > 0 ? Math.max(2, (row.value / top) * 100) : 0}%` },
              ]}
            />
          </View>
          {row.detail ? <Text style={styles.rankedDetail}>{row.detail}</Text> : null}
        </View>
      ))}
    </View>
  );
}

// ── Day × hour heatmap ────────────────────────────────────────────────────

/** Rows Monday–Sunday, columns from the earliest to the latest hour with bookings. Tap a cell for its count. */
export function Heatmap({ cells }: { cells: { day: number; hour: number; bookings: number }[] }) {
  const { t } = useTranslation();
  const [active, setActive] = useState<{ day: number; hour: number } | null>(null);

  const grid = useMemo(() => {
    const hours = cells.map((c) => c.hour);
    const from = Math.min(...hours);
    const to = Math.max(...hours);
    const max = Math.max(...cells.map((c) => c.bookings), 1);
    const lookup = new Map(cells.map((c) => [c.day * 100 + c.hour, c.bookings]));
    return { hours: Array.from({ length: to - from + 1 }, (_, i) => from + i), max, lookup };
  }, [cells]);

  // 2024-01-01 is a Monday
  const dayName = (day: number, pattern: string) => formatDate(new Date(2024, 0, day), pattern);
  const hourName = (hour: number) => formatDate(new Date(2024, 0, 1, hour), 'ha');
  const labelStep = Math.max(1, Math.ceil(grid.hours.length / 6));
  const activeCount = active ? grid.lookup.get(active.day * 100 + active.hour) ?? 0 : 0;

  return (
    <View>
      {[1, 2, 3, 4, 5, 6, 7].map((day) => (
        <View key={day} style={styles.heatRow}>
          <Text style={styles.heatDay}>{dayName(day, 'EEE')}</Text>
          {grid.hours.map((hour) => {
            const count = grid.lookup.get(day * 100 + hour) ?? 0;
            const isActive = active?.day === day && active?.hour === hour;
            return (
              <Pressable
                key={hour}
                onPress={() => setActive(isActive ? null : { day, hour })}
                style={[
                  styles.heatCell,
                  {
                    backgroundColor: count > 0 ? SERIES[0] : '#f1f5f9',
                    opacity: count > 0 ? 0.18 + 0.82 * (count / grid.max) : 1,
                  },
                  isActive && styles.heatCellActive,
                ]}
                accessibilityLabel={`${dayName(day, 'EEEE')} ${hourName(hour)}: ${count}`}
              />
            );
          })}
        </View>
      ))}
      <View style={styles.heatRow}>
        <Text style={styles.heatDay} />
        {grid.hours.map((hour, i) => (
          <Text key={hour} style={styles.heatHour} numberOfLines={1}>
            {i % labelStep === 0 ? hourName(hour) : ''}
          </Text>
        ))}
      </View>
      <Text style={styles.heatHint}>
        {active
          ? t('analytics.bookings.heatCell', { day: dayName(active.day, 'EEEE'), hour: hourName(active.hour), count: activeCount })
          : t('analytics.bookings.heatHint')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: Spacing.three,
  },
  cardTitle: { fontSize: TypographyScale.subtitle, fontWeight: '600', color: BrandColors.textPrimary },
  cardSubtitle: { fontSize: TypographyScale.small, color: BrandColors.textSecondary, marginTop: 2 },
  cardBody: { marginTop: Spacing.md },
  empty: { fontSize: TypographyScale.body, color: BrandColors.textSecondary, textAlign: 'center', paddingVertical: Spacing.four },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.three },
  kpi: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  kpiLabel: { fontSize: TypographyScale.small, color: BrandColors.textSecondary },
  kpiValue: { fontSize: 22, fontWeight: '700', color: BrandColors.textPrimary, marginVertical: 4 },
  kpiDelta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  kpiDeltaText: { fontSize: TypographyScale.small, fontWeight: '600' },
  kpiDeltaHint: { fontSize: TypographyScale.caption, color: BrandColors.textSecondary, flexShrink: 1 },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.two },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: TypographyScale.small, color: BrandColors.textSecondary },
  swatch: { width: 10, height: 10, borderRadius: 3 },

  ring: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  ringCenter: { alignItems: 'center', justifyContent: 'center' },
  ringValue: { fontSize: 20, fontWeight: '700', color: BrandColors.textPrimary },
  ringText: { flex: 1 },
  ringLabel: { fontSize: TypographyScale.body, fontWeight: '600', color: BrandColors.textPrimary },
  ringCaption: { fontSize: TypographyScale.small, color: BrandColors.textSecondary, marginTop: 2 },

  segmentTrack: { flexDirection: 'row', height: 14, borderRadius: 4, backgroundColor: '#f1f5f9', overflow: 'hidden' },
  segmentRows: { marginTop: Spacing.md, gap: 6 },
  segmentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  segmentLabel: { flex: 1, fontSize: TypographyScale.body, color: BrandColors.textPrimary },
  segmentValue: { fontSize: TypographyScale.body, fontWeight: '600', color: BrandColors.textPrimary },
  segmentPct: { width: 40, textAlign: 'right', fontSize: TypographyScale.small, color: BrandColors.textSecondary },

  ranked: { gap: Spacing.md },
  rankedHead: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two, marginBottom: 4 },
  rankedName: { flex: 1, fontSize: TypographyScale.body, color: BrandColors.textPrimary },
  rankedValue: { fontSize: TypographyScale.body, fontWeight: '600', color: BrandColors.textPrimary },
  rankedTrack: { height: 8, borderRadius: 4, backgroundColor: '#f1f5f9', overflow: 'hidden' },
  rankedFill: { height: 8, borderRadius: 4 },
  rankedDetail: { fontSize: TypographyScale.small, color: BrandColors.textSecondary, marginTop: 3 },

  heatRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 2 },
  heatDay: { width: 34, fontSize: TypographyScale.caption, color: BrandColors.textSecondary },
  heatCell: { flex: 1, height: 20, borderRadius: 3 },
  heatCellActive: { borderWidth: 2, borderColor: BrandColors.textPrimary },
  heatHour: { flex: 1, fontSize: 9, color: BrandColors.textSecondary, overflow: 'visible' },
  heatHint: { fontSize: TypographyScale.small, color: BrandColors.textSecondary, marginTop: Spacing.two, textAlign: 'center' },
});
