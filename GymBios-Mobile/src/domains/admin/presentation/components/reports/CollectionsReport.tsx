import React from 'react';
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

// -----------------------------------------------------------------------------
// Mock Data
// -----------------------------------------------------------------------------

const summary = [
  {
    label: 'Collected',
    value: <CurrencyValue amount={218000} compact />,
    change: '+12%',
    changeType: 'positive',
  },
  {
    label: 'Outstanding',
    value: <CurrencyValue amount={34500} />,
    change: '-5%',
    changeType: 'negative',
  },
] as const;

const branches = [
  {
    title: 'Downtown',
    subtitle: '145 Transactions',
    value: <CurrencyValue amount={120000} compact />,
    trend: '+15%',
  },
  {
    title: 'Uptown',
    subtitle: '98 Transactions',
    value: <CurrencyValue amount={85000} compact />,
    trend: '+8%',
  },
  {
    title: 'Central',
    subtitle: '67 Transactions',
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

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function CollectionsReport() {
  return (
    <View style={styles.container}>
      <ReportSection title="Revenue Summary">
        <View style={styles.metrics}>
          {summary.map((metric) => (
            <ReportMetric
              key={metric.label}
              {...metric}
            />
          ))}
        </View>
      </ReportSection>

      <ReportSection title="Branch Performance">
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

      <ReportSection title="Recent Payments">
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

      <ReportSection title="Payment Channels">
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
        label="View Full Report"
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