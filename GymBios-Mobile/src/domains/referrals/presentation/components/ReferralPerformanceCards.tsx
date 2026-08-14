import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { useCurrency, CurrencyGlyph } from '@/core/providers/CurrencyProvider';

interface MonthlyPerformanceData {
  thisMonthCount: number;
  monthGrowthPct: number;
  rewardsPaid: number;
  redeemedCount: number;
  avgValue: number;
  redemptionRate: number;
}

interface ReferralPerformanceCardsProps {
  data: MonthlyPerformanceData;
}

export function ReferralPerformanceCards({ data }: ReferralPerformanceCardsProps) {
  const { currencyCode } = useCurrency();
  const {
    thisMonthCount,
    monthGrowthPct,
    rewardsPaid,
    redeemedCount,
    avgValue,
    redemptionRate,
  } = data;

  return (
    <View style={styles.card}>
      <Typography variant="subtitle" style={styles.title}>
        Monthly Performance
      </Typography>
      <Typography variant="caption" color="textSecondary" style={styles.subtitle}>
        Referral program performance metrics
      </Typography>

      <View style={styles.grid}>
        <View style={[styles.box, { backgroundColor: '#dbeafe' }]}>
          <Typography variant="caption" style={{ color: '#1e40af', fontSize: 11 }}>
            This Month
          </Typography>
          <Typography variant="subtitle" style={{ color: '#1d4ed8', fontSize: 20, fontWeight: '700' }}>
            {thisMonthCount}
          </Typography>
          <Typography
            variant="caption"
            style={{ color: monthGrowthPct >= 0 ? '#15803d' : '#b91c1c', fontSize: 10 }}
          >
            {monthGrowthPct >= 0 ? '+' : ''}
            {monthGrowthPct}% from last month
          </Typography>
        </View>

        <View style={[styles.box, { backgroundColor: '#f3e8ff' }]}>
          <Typography variant="caption" style={{ color: '#6b21a8', fontSize: 11 }}>
            Rewards Paid
          </Typography>
          <Typography variant="subtitle" style={{ color: '#7e22ce', fontSize: 18, fontWeight: '700' }}>
            <CurrencyGlyph code={currencyCode} /> {rewardsPaid.toLocaleString()}
          </Typography>
          <Typography variant="caption" style={{ color: '#6b21a8', fontSize: 10 }}>
            {redeemedCount} redeemed
          </Typography>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={[styles.box, { backgroundColor: '#dcfce7' }]}>
          <Typography variant="caption" style={{ color: '#166534', fontSize: 11 }}>
            Avg. Value
          </Typography>
          <Typography variant="subtitle" style={{ color: '#15803d', fontSize: 18, fontWeight: '700' }}>
            <CurrencyGlyph code={currencyCode} /> {avgValue.toLocaleString()}
          </Typography>
          <Typography variant="caption" style={{ color: '#166534', fontSize: 10 }}>
            per successful referral
          </Typography>
        </View>

        <View style={[styles.box, { backgroundColor: '#ffedd5' }]}>
          <Typography variant="caption" style={{ color: '#9a3412', fontSize: 11 }}>
            Redemption Rate
          </Typography>
          <Typography variant="subtitle" style={{ color: '#c2410c', fontSize: 20, fontWeight: '700' }}>
            {redemptionRate}%
          </Typography>
          <Typography variant="caption" style={{ color: '#9a3412', fontSize: 10 }}>
            of successful referrals
          </Typography>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    marginBottom: Spacing.three,
  },
  grid: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  box: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Radius.md,
    alignItems: 'center',
    gap: 2,
  },
});
