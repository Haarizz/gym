import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { useCurrency, CurrencyGlyph } from '@/core/providers/CurrencyProvider';
import { useReferralStats } from '../../hooks/useReferrals';
import { useRewardStats } from '@/domains/rewards';

export function ReferralStatsSummary() {
  const { data: stats, isLoading: isStatsLoading } = useReferralStats();
  const { data: rewardStats, isLoading: isRewardsLoading } = useRewardStats();
  const { currencyCode } = useCurrency();

  if (isStatsLoading || isRewardsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={BrandColors.teal} />
      </View>
    );
  }

  const totalReferrals = stats?.totalReferrals ?? 0;
  const successfulReferrals = stats?.successfulReferrals ?? 0;
  const conversionRate = stats?.conversionRate ?? 0;
  const totalRewards = Number(stats?.totalRewards ?? 0);
  const activePrograms = stats?.activeRules ?? 0;
  const avgReward =
    successfulReferrals > 0 ? Math.round((totalRewards / successfulReferrals) * 100) / 100 : 0;

  const kpis = [
    {
      label: 'Total Referrals',
      value: `${totalReferrals}`,
      subtext: 'All referrals recorded',
      icon: 'users' as const,
      iconColor: '#3b82f6',
      iconBg: '#dbeafe',
    },
    {
      label: 'Successful',
      value: `${successfulReferrals}`,
      subtext: 'Converted referrals',
      icon: 'check-circle' as const,
      iconColor: '#16a34a',
      iconBg: '#dcfce7',
    },
    {
      label: 'Conversion',
      value: `${conversionRate}%`,
      subtext: 'Referral success rate',
      icon: 'trending-up' as const,
      iconColor: '#9333ea',
      iconBg: '#f3e8ff',
    },
    {
      label: 'Total Rewards',
      value: totalRewards,
      isCurrency: true,
      subtext: 'Rewards distributed',
      icon: 'gift' as const,
      iconColor: '#ea580c',
      iconBg: '#ffedd5',
    },
    {
      label: 'Active Programs',
      value: `${activePrograms}`,
      subtext: 'Running rules',
      icon: 'zap' as const,
      iconColor: '#0284c7',
      iconBg: '#e0f2fe',
    },
    {
      label: 'Avg Reward',
      value: avgReward,
      isCurrency: true,
      subtext: 'Average per referral',
      icon: 'dollar-sign' as const,
      iconColor: BrandColors.teal,
      iconBg: '#ccfbf1',
    },
  ];

  return (
    <View style={styles.grid}>
      {kpis.map((kpi, idx) => (
        <View key={idx} style={styles.card}>
          <View style={styles.cardHeader}>
            <Typography variant="caption" style={styles.label} numberOfLines={1}>
              {kpi.label}
            </Typography>
            <View style={[styles.iconBox, { backgroundColor: kpi.iconBg }]}>
              <Feather name={kpi.icon} size={14} color={kpi.iconColor} />
            </View>
          </View>
          <View style={styles.valueRow}>
            {kpi.isCurrency ? (
              <Typography variant="subtitle" style={[styles.valueText, { color: kpi.iconColor }]}>
                <CurrencyGlyph code={currencyCode} /> {kpi.value.toLocaleString()}
              </Typography>
            ) : (
              <Typography variant="subtitle" style={[styles.valueText, { color: kpi.iconColor }]}>
                {kpi.value}
              </Typography>
            )}
          </View>
          <Typography variant="caption" color="textSecondary" style={styles.subtext}>
            {kpi.subtext}
          </Typography>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: Spacing.four,
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.three,
  },
  card: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.textSecondary,
    flex: 1,
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueRow: {
    marginVertical: Spacing.half,
  },
  valueText: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtext: {
    fontSize: 10,
  },
});
