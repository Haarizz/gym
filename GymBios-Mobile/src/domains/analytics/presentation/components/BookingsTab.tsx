import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Text } from '@/shared/components/AppText';
import { CurrencyValue } from '@/core/providers';
import { Radius, Spacing, TypographyScale } from '@/core/theme';
import type { BookingsAnalytics } from '../../hooks/useAdminAnalytics';
import { ChartCard, Heatmap, KpiGrid, KpiTile, RankedBars, SegmentBar } from './ChartPrimitives';
import { NEUTRAL, SERIES } from './chartUtils';
import { useServerLabel } from './serverLabels';

export function BookingsTab({ data }: { data: BookingsAnalytics }) {
  const { t } = useTranslation();
  const label = useServerLabel();
  const o = data.outcomes;
  const totalOutcomes = o.attended + o.noShow + o.cancelled + o.upcoming;
  // One measure for every bar: revenue when any trainer earned some, otherwise bookings
  const trainersByRevenue = data.topTrainers.some((tr) => tr.revenue > 0);

  return (
    <View>
      {data.pendingApprovals > 0 && (
        <View style={styles.banner}>
          <Feather name="clock" size={16} color="#9a3412" />
          <Text style={styles.bannerText}>{t('analytics.bookings.pendingApprovals', { count: data.pendingApprovals })}</Text>
        </View>
      )}

      <KpiGrid>
        <KpiTile label={t('analytics.bookings.bookings')} value={data.bookings.value ?? 0} kpi={data.bookings} />
        <KpiTile label={t('analytics.bookings.revenue')} value={<CurrencyValue amount={data.revenue.value} compact />} kpi={data.revenue} />
        <KpiTile
          label={t('analytics.bookings.fillRate')}
          value={data.fillRate.value == null ? '—' : `${Math.round(data.fillRate.value)}%`}
          kpi={data.fillRate}
          delta="points"
        />
        <KpiTile label={t('analytics.bookings.cancellations')} value={data.cancellations.value ?? 0} kpi={data.cancellations} goodWhen="down" />
      </KpiGrid>

      <ChartCard title={t('analytics.bookings.outcomesTitle')} subtitle={t('analytics.bookings.outcomesSubtitle')} empty={totalOutcomes === 0}>
        <SegmentBar
          segments={[
            { label: t('analytics.bookings.attended'), value: o.attended, color: SERIES[0] },
            { label: t('analytics.bookings.upcoming'), value: o.upcoming, color: SERIES[2] },
            { label: t('analytics.bookings.noShow'), value: o.noShow, color: SERIES[1] },
            { label: t('analytics.bookings.cancelled'), value: o.cancelled, color: NEUTRAL },
          ]}
        />
      </ChartCard>

      <ChartCard
        title={t('analytics.bookings.classFillTitle')}
        subtitle={t('analytics.bookings.classFillSubtitle')}
        empty={data.classFill.length === 0}
        emptyText={t('analytics.bookings.noClasses')}
      >
        <RankedBars
          max={100}
          rows={data.classFill.map((c) => ({
            key: c.name,
            name: label(c.name),
            value: c.fillRate,
            display: `${Math.round(c.fillRate)}%`,
            detail: t('analytics.bookings.classFillDetail', { booked: c.booked, capacity: c.capacity, count: c.sessions }),
          }))}
        />
      </ChartCard>

      <ChartCard title={t('analytics.bookings.heatTitle')} subtitle={t('analytics.bookings.heatSubtitle')} empty={data.heatmap.length === 0}>
        <Heatmap cells={data.heatmap} />
      </ChartCard>

      <ChartCard title={t('analytics.bookings.revenueSplitTitle')} empty={data.ptRevenue + data.classRevenue === 0}>
        <SegmentBar
          segments={[
            { label: t('analytics.bookings.pt'), value: data.ptRevenue, color: SERIES[0] },
            { label: t('analytics.bookings.classes'), value: data.classRevenue, color: SERIES[1] },
          ]}
          renderValue={(v) => <CurrencyValue amount={v} compact />}
        />
      </ChartCard>

      <ChartCard title={t('analytics.bookings.trainersTitle')} empty={data.topTrainers.length === 0}>
        <RankedBars
          rows={data.topTrainers.map((tr) => ({
            key: tr.name,
            name: tr.name,
            value: trainersByRevenue ? tr.revenue : tr.bookings,
            display: trainersByRevenue ? <CurrencyValue amount={tr.revenue} compact /> : tr.bookings,
            detail: t('analytics.bookings.trainerDetail', { sessions: tr.sessions, bookings: tr.bookings }),
          }))}
        />
      </ChartCard>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  bannerText: { flex: 1, fontSize: TypographyScale.small, color: '#9a3412', fontWeight: '500' },
});
