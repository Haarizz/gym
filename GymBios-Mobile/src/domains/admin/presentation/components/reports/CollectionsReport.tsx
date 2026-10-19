import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { CurrencyValue } from '@/core/providers';
import { Spacing } from '@/core/theme';
import {
  ReportSection,
  ReportMetric,
  ReportListItem,
  ReportRow,
  ReportFooterAction,
} from '@/shared/components/ReportComponents';

export function CollectionsReport() {
  const { t } = useTranslation();

  const summary = [
    {
      label: t('reports.labels.collected'),
      value: <CurrencyValue amount={218000} compact />,
      change: '+12%',
      changeType: 'positive' as const,
    },
    {
      label: t('reports.labels.outstanding'),
      value: <CurrencyValue amount={34500} />,
      change: '-5%',
      changeType: 'negative' as const,
    },
  ];

  const branches = [
    {
      title: 'Downtown',
      subtitle: t('reports.labels.transactions', { count: 145 }),
      value: <CurrencyValue amount={120000} compact />,
      trend: '+15%',
    },
    {
      title: 'Uptown',
      subtitle: t('reports.labels.transactions', { count: 98 }),
      value: <CurrencyValue amount={85000} compact />,
      trend: '+8%',
    },
    {
      title: 'Central',
      subtitle: t('reports.labels.transactions', { count: 67 }),
      value: <CurrencyValue amount={55000} compact />,
      trend: '+12%',
    },
  ];

  const payments = [
    {
      title: 'Premium Membership',
      subtitle: 'UPI • Today',
      value: <CurrencyValue amount={1499} />,
    },
    {
      title: 'Annual Membership',
      subtitle: 'Card • Yesterday',
      value: <CurrencyValue amount={9999} />,
    },
    {
      title: 'Monthly Basic',
      subtitle: 'Cash • Jul 27',
      value: <CurrencyValue amount={699} />,
    },
  ];

  const channels = [
    {
      title: 'UPI',
      value: <CurrencyValue amount={112000} compact />,
    },
    {
      title: 'Cash',
      value: <CurrencyValue amount={54200} />,
    },
    {
      title: 'Card',
      value: <CurrencyValue amount={51600} />,
    },
  ];

  return (
    <View style={styles.container}>
      <ReportSection title={t('reports.sections.revenueSummary')}>
        <View style={styles.metrics}>
          {summary.map((metric) => (
            <ReportMetric
              key={metric.label}
              {...metric}
            />
          ))}
        </View>
      </ReportSection>

      <ReportSection title={t('reports.sections.branchPerformance')}>
        {branches.map((branch, index) => (
          <ReportRow
            key={branch.title}
            title={branch.title}
            subtitle={branch.subtitle}
            value={branch.value}
            trend={branch.trend}
            hideDivider={index === branches.length - 1}
          />
        ))}
      </ReportSection>

      <ReportSection title={t('reports.sections.recentPayments')}>
        {payments.map((payment, index) => (
          <ReportListItem
            key={payment.title}
            title={payment.title}
            subtitle={payment.subtitle}
            value={payment.value}
            hideDivider={index === payments.length - 1}
          />
        ))}
      </ReportSection>

      <ReportSection title={t('reports.sections.paymentChannels')}>
        {channels.map((channel, index) => (
          <ReportRow
            key={channel.title}
            title={channel.title}
            value={channel.value}
            hideDivider={index === channels.length - 1}
          />
        ))}
      </ReportSection>

      <ReportFooterAction
        label={t('reports.actions.viewFullReport')}
        onPress={() => { }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },

  metrics: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
});