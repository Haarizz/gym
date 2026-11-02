import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/shared/components/AppText';
import Feather from '@expo/vector-icons/Feather';
import { FeatherIcon } from '@/shared/components/CurrencyIcon';
import { Radius, Spacing } from '@/core/theme';
import { GlassSurface } from '@/shared/components';
import type { AdminKpiItem, AdminReportType } from '../../domain/AdminDashboardData';

interface AdminKpiGridProps {
  kpis: AdminKpiItem[];
  onSelectKpi: (reportId: AdminReportType) => void;
}

const UP = '#16A34A';
const DOWN = '#DC2626';
const FLAT = '#94A3B8';

/** "+0.0%", "0%", "-0.0%" etc. read as no change and render neutral. */
function isFlat(change: string) {
  return !/[1-9]/.test(change);
}

export function AdminKpiGrid({ kpis, onSelectKpi }: AdminKpiGridProps) {
  return (
    <View style={styles.grid}>
      {kpis.map((kpi) => {
        const flat = isFlat(kpi.change);
        const trendColor = flat ? FLAT : kpi.trend === 'up' ? UP : DOWN;
        const isClickable = kpi.clickable;

        return (
          <Pressable
            key={kpi.id}
            style={({ pressed }) => [
              styles.pressable,
              pressed && isClickable && styles.cardPressed,
            ]}
            onPress={() => isClickable && onSelectKpi(kpi.id as AdminReportType)}
            disabled={!isClickable}
            accessibilityRole={isClickable ? 'button' : 'none'}
            accessibilityLabel={`${kpi.label}, ${kpi.valueText}, ${kpi.change}`}
          >
            <GlassSurface radius={Radius.md} style={styles.card}>
              <View style={styles.labelRow}>
                <FeatherIcon name={kpi.icon as any} size={13} color={kpi.color} />
                <Text style={styles.label} numberOfLines={1}>
                  {kpi.label}
                </Text>
              </View>

              <Text style={styles.value} numberOfLines={1}>
                {kpi.value}
              </Text>

              <View style={styles.trendRow}>
                {!flat && (
                  <Feather
                    name={kpi.trend === 'up' ? 'arrow-up-right' : 'arrow-down-right'}
                    size={11}
                    color={trendColor}
                  />
                )}
                <Text style={[styles.changeText, { color: trendColor }]}>
                  {flat ? '—' : kpi.change}
                </Text>
              </View>
            </GlassSurface>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pressable: {
    width: '48.5%',
  },
  card: {
    paddingVertical: Spacing.two + 4,
    paddingHorizontal: Spacing.three,
    gap: 4,
  },
  cardPressed: {
    opacity: 0.85,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
