import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { GlassSurface } from '@/shared/components';
import type { UserPerformance } from '../../domain';

interface PerformanceOverviewCardProps {
  performance: UserPerformance;
}

interface Tile {
  value: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  dark: boolean;
}

interface Kpi {
  label: string;
  value: string;
  subtitle: string;
  trend: 'up' | 'down' | 'flat';
}

const percent = (value: number | null) => (value == null ? '—' : `${value}%`);

function growthKpi(label: string, growth: number | null, t: TFunction): Kpi {
  if (growth == null) {
    return { label, value: '—', subtitle: t('performance.noDataLastMonth'), trend: 'flat' };
  }
  return {
    label,
    value: `${growth > 0 ? '+' : ''}${growth}%`,
    subtitle: t('performance.vsLastMonth'),
    trend: growth > 0 ? 'up' : growth < 0 ? 'down' : 'flat',
  };
}

function rateKpi(label: string, value: number | null, subtitle: string): Kpi {
  return { label, value: percent(value), subtitle, trend: 'flat' };
}

/** Trainers are measured on sessions delivered, staff on lead conversions. */
function buildTiles(p: UserPerformance, t: TFunction): Tile[] {
  const score: Tile = { value: percent(p.performanceScore), label: t('performance.score'), icon: 'trending-up', dark: false };
  const hours: Tile = { value: `${p.hoursWorked}`, label: t('performance.hoursWorked'), icon: 'clock', dark: true };

  if (p.role === 'trainer') {
    return [
      score,
      { value: `${p.classesCompleted ?? 0}`, label: t('performance.classesCompleted'), icon: 'activity', dark: true },
      hours,
      { value: percent(p.sessionTargetPercentage), label: t('performance.sessionTarget'), icon: 'target', dark: false },
    ];
  }
  return [
    score,
    { value: `${p.leadsConverted ?? 0}`, label: t('performance.leadsConverted'), icon: 'user-check', dark: true },
    hours,
    { value: percent(p.conversionRate), label: t('performance.conversionRate'), icon: 'percent', dark: false },
  ];
}

function buildKpis(p: UserPerformance, t: TFunction): Kpi[] {
  if (p.role === 'trainer') {
    return [
      growthKpi(t('performance.sessionGrowth'), p.sessionGrowth, t),
      growthKpi(t('performance.revenueGrowth'), p.revenueGrowth, t),
      rateKpi(
        t('performance.attendance'),
        p.attendanceRate,
        p.daysScheduled > 0
          ? t('performance.daysOfTotal', { present: p.daysPresent, total: p.daysScheduled })
          : t('performance.noScheduleSet')
      ),
    ];
  }
  return [
    growthKpi(t('performance.conversionGrowth'), p.conversionGrowth, t),
    growthKpi(t('performance.revenueGrowth'), p.revenueGrowth, t),
    rateKpi(t('performance.followUps'), p.followUpCompletion, t('performance.completed')),
  ];
}

const TREND_ICON: Record<Kpi['trend'], keyof typeof Feather.glyphMap> = {
  up: 'arrow-up-right',
  down: 'arrow-down-right',
  flat: 'minus',
};

const TREND_COLOR: Record<Kpi['trend'], string> = {
  up: '#16a34a',
  down: '#dc2626',
  flat: BrandColors.teal,
};

export function PerformanceOverviewCard({ performance }: PerformanceOverviewCardProps) {
  const { t } = useTranslation();
  const tiles = buildTiles(performance, t);
  const kpis = buildKpis(performance, t);

  return (
    <View style={styles.container}>
      {/* 4 Overview Metric Cards */}
      <View style={styles.grid}>
        {tiles.map((tile) => (
          <View key={tile.label} style={[styles.tile, tile.dark ? styles.tealDarkTile : styles.tealTile]}>
            <View style={styles.tileHeader}>
              <Typography variant="title" style={styles.tileNumber}>
                {tile.value}
              </Typography>
              <Feather name={tile.icon} size={20} color="rgba(255,255,255,0.85)" />
            </View>
            <Typography variant="caption" style={styles.tileLabel}>
              {tile.label}
            </Typography>
          </View>
        ))}
      </View>

      {/* KPI Trends Section */}
      <GlassSurface radius={Radius.lg} style={styles.kpiContainer}>
        <Typography variant="subtitle" style={styles.kpiHeader}>
          {t('performance.kpiHeader')}
        </Typography>

        <View style={styles.kpiList}>
          {kpis.map((kpi) => (
            <View key={kpi.label} style={styles.kpiCard}>
              <View style={styles.kpiValueRow}>
                <Feather name={TREND_ICON[kpi.trend]} size={18} color={TREND_COLOR[kpi.trend]} />
                <Typography variant="subtitle" style={[styles.kpiValue, { color: TREND_COLOR[kpi.trend] }]}>
                  {kpi.value}
                </Typography>
              </View>
              <Typography variant="bodySmall" style={styles.kpiLabel}>
                {kpi.label}
              </Typography>
              <Typography variant="caption" color="textSecondary" style={styles.kpiSubtitle}>
                {kpi.subtitle}
              </Typography>
            </View>
          ))}
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tile: {
    width: '48.5%',
    borderRadius: Radius.lg,
    padding: Spacing.three,
    justifyContent: 'space-between',
    minHeight: 90,
  },
  tealTile: {
    backgroundColor: BrandColors.teal,
  },
  tealDarkTile: {
    backgroundColor: BrandColors.tealDark,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileNumber: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  tileLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: Spacing.one,
  },
  kpiContainer: {
    padding: Spacing.four,
  },
  kpiHeader: {
    color: BrandColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.three,
  },
  kpiList: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: Radius.md,
    padding: Spacing.three,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  kpiValue: {
    fontWeight: '800',
    fontSize: 16,
    marginStart: 2,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    color: BrandColors.textPrimary,
    marginBottom: 2,
  },
  kpiSubtitle: {
    textAlign: 'center',
  },
});
