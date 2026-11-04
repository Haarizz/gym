import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/components/AppText';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Spacing, TypographyScale } from '@/core/theme';
import type { MembershipAnalytics } from '../../hooks/useAdminAnalytics';
import { ChartCard, KpiGrid, KpiTile, Legend, RankedBars, RingStat } from './ChartPrimitives';
import { BarTrendChart, DonutChart } from './TrendCharts';
import { NEUTRAL, SERIES, bucketLong, bucketShort, sliceColor } from './chartUtils';
import { useServerLabel } from './serverLabels';

export function MembershipTab({ data }: { data: MembershipAnalytics }) {
  const { t } = useTranslation();
  const label = useServerLabel();
  const g = data.range.granularity;
  const series = [
    { label: t('analytics.membership.newJoins'), color: SERIES[0] },
    { label: t('analytics.membership.renewals'), color: SERIES[1] },
  ];
  const lostSeries = { label: t('analytics.membership.lost'), color: NEUTRAL };
  const renewed = data.renewals.value ?? 0;
  const due = renewed + (data.lost.value ?? 0);
  const anyMovement = data.trend.some((p) => p.newJoins + p.renewals + p.lost > 0);

  return (
    <View>
      <KpiGrid>
        <KpiTile label={t('analytics.membership.activeMembers')} value={data.activeMembers} footnote={t('analytics.membership.rightNow')} />
        <KpiTile label={t('analytics.membership.revenue')} value={<CurrencyValue amount={data.membershipRevenue.value} compact />} kpi={data.membershipRevenue} />
        <KpiTile label={t('analytics.membership.newJoins')} value={data.newJoins.value ?? 0} kpi={data.newJoins} />
        <KpiTile label={t('analytics.membership.lost')} value={data.lost.value ?? 0} kpi={data.lost} goodWhen="down" />
      </KpiGrid>

      <ChartCard title={t('analytics.membership.trendTitle')} subtitle={t('analytics.membership.trendSubtitle')} empty={!anyMovement}>
        <BarTrendChart
          buckets={data.trend.map((p) => ({
            label: bucketShort(p.bucket, g),
            title: bucketLong(p.bucket, g),
            values: [p.newJoins, p.renewals],
            below: p.lost,
          }))}
          series={series}
          belowSeries={lostSeries}
        />
        <Legend items={[...series, lostSeries]} />
      </ChartCard>

      <ChartCard title={t('analytics.membership.retentionTitle')}>
        <RingStat
          value={data.renewalRate}
          label={t('analytics.membership.renewalRate')}
          caption={due > 0 ? t('analytics.membership.renewalCaption', { renewed, due }) : t('analytics.membership.nobodyDue')}
        />
        <View style={styles.statRow}>
          <MiniStat label={t('analytics.membership.expiring7')} value={data.expiringIn7Days} emphasis />
          <MiniStat label={t('analytics.membership.expiring30')} value={data.expiringIn30Days} />
          <MiniStat label={t('analytics.membership.frozen')} value={data.frozenNow} />
        </View>
        {data.freezeCharges > 0 && (
          <Text style={styles.note}>
            {t('analytics.membership.freezeCharges')}: <CurrencyValue amount={data.freezeCharges} />
          </Text>
        )}
      </ChartCard>

      <ChartCard title={t('analytics.membership.revenueByPlan')} empty={data.revenueByPlan.length === 0}>
        <DonutChart
          slices={data.revenueByPlan.map((p, i) => ({ label: label(p.name), value: p.value, color: sliceColor(p.name, i) }))}
          renderValue={(v) => <CurrencyValue amount={v} compact />}
          centerLabel={t('analytics.total')}
          centerValue={<CurrencyValue amount={data.membershipRevenue.value} compact />}
        />
      </ChartCard>

      <Text style={styles.section}>{t('analytics.membership.addonsTitle')}</Text>
      <KpiGrid>
        <KpiTile label={t('analytics.membership.addonRevenue')} value={<CurrencyValue amount={data.addonRevenue.value} compact />} kpi={data.addonRevenue} />
        <KpiTile label={t('analytics.membership.addonUnits')} value={data.addonUnits} footnote={' '} />
      </KpiGrid>

      <ChartCard title={t('analytics.membership.topAddons')} empty={data.topAddons.length === 0} emptyText={t('analytics.membership.noAddonSales')}>
        <RankedBars
          rows={data.topAddons.map((a) => ({
            key: a.name,
            name: label(a.name),
            value: a.value,
            display: <CurrencyValue amount={a.value} compact />,
            detail: t('analytics.soldCount', { count: a.count }),
          }))}
        />
      </ChartCard>

      <ChartCard title={t('analytics.membership.addonUptakeTitle')}>
        <RingStat value={data.addonUptake} label={t('analytics.membership.addonUptake')} caption={t('analytics.membership.addonUptakeCaption')} color={SERIES[2]} />
      </ChartCard>
    </View>
  );
}

function MiniStat({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <View style={[styles.mini, emphasis && value > 0 && styles.miniAttention]}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', marginTop: Spacing.three, gap: Spacing.two },
  mini: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, padding: Spacing.two, alignItems: 'center' },
  miniAttention: { backgroundColor: '#fff4ed', borderWidth: 1, borderColor: '#fed7aa' },
  miniValue: { fontSize: 20, fontWeight: '700', color: BrandColors.textPrimary },
  miniLabel: { fontSize: TypographyScale.caption, color: BrandColors.textSecondary, textAlign: 'center', marginTop: 2 },
  note: { fontSize: TypographyScale.small, color: BrandColors.textSecondary, marginTop: Spacing.md },
  section: { fontSize: TypographyScale.subtitle, fontWeight: '700', color: BrandColors.textPrimary, marginTop: Spacing.two, marginBottom: Spacing.md },
});
