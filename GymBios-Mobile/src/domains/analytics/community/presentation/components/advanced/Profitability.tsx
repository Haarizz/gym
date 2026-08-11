import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { PieChart, Surface, Typography } from '@/shared/components';
import type {
  CostBreakdownItem,
  ProfitabilityData,
} from '../../../domain/communityAdvancedAnalyticsData.types';

interface ProfitabilityProps {
  profitabilityData?: ProfitabilityData;
}

export function Profitability({ profitabilityData }: ProfitabilityProps) {
  if (!profitabilityData) {
    return (
      <Surface background="backgroundElement" style={styles.emptyCard}>
        <Typography variant="caption" color="textSecondary">
          No profitability data available.
        </Typography>
      </Surface>
    );
  }

  const {
    totalRevenue,
    totalExpenses,
    netProfit,
    profitMargin,
    costBreakdown = [],
    revenuePerMember,
    lifetimeValue,
    churnRate,
  } = profitabilityData;

  const pieData = costBreakdown.map((item: CostBreakdownItem, idx: number) => ({
    name: item.name,
    amount: item.amount,
  }));

  return (
    <View style={styles.container}>
      {/* Overview Financial KPI Cards */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiRow}>
          <Surface background="backgroundElement" style={styles.kpiCard}>
            <Typography variant="caption" color="textSecondary">
              Net Profit
            </Typography>
            <Typography
              variant="subtitle"
              style={[styles.kpiValue, netProfit >= 0 ? styles.positiveText : styles.negativeText]}
            >
              ₹{netProfit.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Margin: {profitMargin.toFixed(1)}%
            </Typography>
          </Surface>

          <Surface background="backgroundElement" style={styles.kpiCard}>
            <Typography variant="caption" color="textSecondary">
              Total Revenue
            </Typography>
            <Typography variant="subtitle" style={styles.kpiValue}>
              ₹{totalRevenue.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Expenses: ₹{totalExpenses.toLocaleString()}
            </Typography>
          </Surface>
        </View>

        <View style={styles.kpiRow}>
          <Surface background="backgroundElement" style={styles.kpiCard}>
            <Typography variant="caption" color="textSecondary">
              Rev / Member
            </Typography>
            <Typography variant="subtitle" style={styles.kpiValue}>
              ₹{Math.round(revenuePerMember).toLocaleString()}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              LTV: ₹{Math.round(lifetimeValue).toLocaleString()}
            </Typography>
          </Surface>

          <Surface background="backgroundElement" style={styles.kpiCard}>
            <Typography variant="caption" color="textSecondary">
              Churn Rate
            </Typography>
            <Typography variant="subtitle" style={styles.kpiValue}>
              {churnRate.toFixed(1)}%
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Monthly estimate
            </Typography>
          </Surface>
        </View>
      </View>

      {/* Cost Breakdown */}
      {costBreakdown.length > 0 && (
        <Surface background="backgroundElement" style={styles.card}>
          <Typography variant="bodySmallBold" style={styles.title}>
            Expense Breakdown
          </Typography>

          <PieChart
            data={pieData}
            nameKey="name"
            valueKey="amount"
            variant="donut"
            height={200}
            valueFormatter={(v: number) => `₹${v.toLocaleString()}`}
          />

          <View style={styles.costList}>
            {costBreakdown.map((item: CostBreakdownItem, idx: number) => (
              <View key={`${item.name}-${idx}`} style={styles.costRow}>
                <Typography variant="bodySmall" style={styles.costName}>
                  {item.name}
                </Typography>
                <View style={styles.costRight}>
                  <Typography variant="bodySmallBold" style={styles.costAmount}>
                    ₹{item.amount.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" style={styles.costPct}>
                    ({item.percentage.toFixed(1)}%)
                  </Typography>
                </View>
              </View>
            ))}
          </View>
        </Surface>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  emptyCard: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    alignItems: 'center',
  },
  kpiGrid: {
    gap: Spacing.two,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  kpiCard: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginTop: 2,
  },
  positiveText: {
    color: '#10B981',
  },
  negativeText: {
    color: '#EF4444',
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 15,
    color: BrandColors.textPrimary,
  },
  costList: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  costName: {
    fontSize: 13,
    color: BrandColors.textPrimary,
  },
  costRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  costAmount: {
    fontSize: 13,
    color: BrandColors.textPrimary,
  },
  costPct: {
    fontSize: 11,
  },
});
