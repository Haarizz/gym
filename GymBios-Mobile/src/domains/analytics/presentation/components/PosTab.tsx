import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/components/AppText';
import { CurrencyValue, formatAmount } from '@/core/providers';
import { BrandColors, Spacing, TypographyScale } from '@/core/theme';
import type { PosAnalytics } from '../../hooks/useAdminAnalytics';
import { ChartCard, KpiGrid, KpiTile, RankedBars } from './ChartPrimitives';
import { DonutChart, LineTrendChart } from './TrendCharts';
import { bucketLong, bucketShort, sliceColor } from './chartUtils';
import { useServerLabel } from './serverLabels';

export function PosTab({ data }: { data: PosAnalytics }) {
  const { t } = useTranslation();
  const label = useServerLabel();
  const g = data.range.granularity;
  // SVG text can't draw the currency glyph font, so axis ticks are bare compact numbers.
  const formatTick = useCallback((v: number) => formatAmount(v, { compact: true }), []);
  const hasSales = data.trend.some((p) => p.netSales > 0);

  return (
    <View>
      <KpiGrid>
        <KpiTile label={t('analytics.pos.netSales')} value={<CurrencyValue amount={data.netSales.value} compact />} kpi={data.netSales} />
        <KpiTile label={t('analytics.pos.transactions')} value={data.transactions.value ?? 0} kpi={data.transactions} />
        <KpiTile label={t('analytics.pos.avgBill')} value={<CurrencyValue amount={data.averageBill.value} />} kpi={data.averageBill} />
        <KpiTile
          label={t('analytics.pos.margin')}
          value={data.grossMargin.value == null ? '—' : `${data.grossMargin.value.toFixed(1)}%`}
          kpi={data.grossMargin}
          delta="points"
          footnote={data.grossMargin.value == null ? t('analytics.pos.noCosts') : undefined}
        />
      </KpiGrid>

      <ChartCard title={t('analytics.pos.trendTitle')} subtitle={t(`analytics.pos.trendSubtitle.${g}`)} empty={!hasSales}>
        <LineTrendChart
          points={data.trend.map((p) => ({ label: bucketShort(p.bucket, g), title: bucketLong(p.bucket, g), value: p.netSales }))}
          formatTick={formatTick}
          tooltipRows={(i) => [
            { label: t('analytics.pos.netSales'), value: <CurrencyValue amount={data.trend[i].netSales} /> },
            { label: t('analytics.pos.transactions'), value: data.trend[i].transactions },
          ]}
        />
      </ChartCard>

      <ChartCard title={t('analytics.pos.topProducts')} empty={data.topProducts.length === 0}>
        <RankedBars
          rows={data.topProducts.map((p) => ({
            key: p.name,
            name: label(p.name),
            value: p.value,
            display: <CurrencyValue amount={p.value} compact />,
            detail: t('analytics.soldCount', { count: p.count }),
          }))}
        />
      </ChartCard>

      <ChartCard title={t('analytics.pos.byCategory')} empty={data.byCategory.length === 0}>
        <DonutChart
          slices={data.byCategory.map((c, i) => ({ label: label(c.name), value: c.value, color: sliceColor(c.name, i) }))}
          renderValue={(v) => <CurrencyValue amount={v} compact />}
          centerLabel={t('analytics.total')}
          centerValue={<CurrencyValue amount={data.byCategory.reduce((s, c) => s + c.value, 0)} compact />}
        />
      </ChartCard>

      <ChartCard title={t('analytics.pos.paymentMix')} subtitle={t('analytics.pos.paymentMixSubtitle')} empty={data.paymentMix.length === 0}>
        <DonutChart
          slices={data.paymentMix.map((m, i) => ({ label: label(m.name), value: m.value, color: sliceColor(m.name === 'OTHER' ? 'Other' : m.name, i) }))}
          renderValue={(v) => <CurrencyValue amount={v} compact />}
          centerLabel={t('analytics.total')}
          centerValue={<CurrencyValue amount={data.paymentMix.reduce((s, m) => s + m.value, 0)} compact />}
        />
      </ChartCard>

      <ChartCard title={t('analytics.pos.extrasTitle')}>
        <Row label={t('analytics.pos.discounts')} value={<CurrencyValue amount={data.discounts} />} />
        <Row
          label={t('analytics.pos.returns')}
          detail={t('analytics.pos.returnsCount', { count: data.returnsCount })}
          value={<CurrencyValue amount={data.returnsAmount} />}
        />
        <Row label={t('analytics.pos.outstandingCredit')} detail={t('analytics.pos.outstandingCreditHint')} value={<CurrencyValue amount={data.outstandingCredit} />} last />
      </ChartCard>
    </View>
  );
}

function Row({ label, detail, value, last }: { label: string; detail?: string; value: React.ReactNode; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.two },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  rowText: { flex: 1 },
  rowLabel: { fontSize: TypographyScale.body, color: BrandColors.textPrimary },
  rowDetail: { fontSize: TypographyScale.small, color: BrandColors.textSecondary, marginTop: 2 },
  rowValue: { fontSize: TypographyScale.body, fontWeight: '600', color: BrandColors.textPrimary },
});
