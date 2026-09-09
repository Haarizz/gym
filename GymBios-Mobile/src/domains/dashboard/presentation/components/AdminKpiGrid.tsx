import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Radius, Spacing } from '@/core/theme';
import { GlassSurface } from '@/shared/components';
import type { AdminKpiItem, AdminReportType } from '../../domain/AdminDashboardData';

interface AdminKpiGridProps {
  kpis: AdminKpiItem[];
  onSelectKpi: (reportId: AdminReportType) => void;
}

export function AdminKpiGrid({ kpis, onSelectKpi }: AdminKpiGridProps) {
  return (
    <View style={styles.grid}>
      {kpis.map((kpi) => {
        const isUp = kpi.trend === 'up';
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
            accessibilityLabel={`${kpi.label}, ${kpi.value}, ${kpi.change}`}
          >
            <GlassSurface radius={Radius.lg} style={styles.card}>
              {/* Icon Box */}
              <View style={[styles.iconBox, { backgroundColor: kpi.color }]}>
                <Feather name={kpi.icon as any} size={18} color="#FFFFFF" />
              </View>

              {/* Label */}
              <Text style={styles.label} numberOfLines={1}>
                {kpi.label}
              </Text>

              {/* Value & Trend Row */}
              <View style={styles.valueRow}>
                <Text style={styles.value} numberOfLines={1}>
                  {kpi.value}
                </Text>
                <View style={styles.trendBox}>
                  <Feather
                    name={isUp ? 'arrow-up-right' : 'arrow-down-right'}
                    size={14}
                    color={isUp ? '#16A34A' : '#DC2626'}
                  />
                  <Text
                    style={[
                      styles.changeText,
                      { color: isUp ? '#16A34A' : '#DC2626' },
                    ]}
                  >
                    {kpi.change}
                  </Text>
                </View>
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
    padding: Spacing.three + 2,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two + 2,
  },
  label: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '500',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  trendBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
