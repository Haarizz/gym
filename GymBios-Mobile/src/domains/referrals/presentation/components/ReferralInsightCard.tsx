import React from 'react';
import { View, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface InsightData {
  conversionRate: number;
  successfulCount: number;
  totalCount: number;
  topRuleName?: string;
  topRuleCount: number;
  redemptionRate: number;
  redeemedCount: number;
}

interface ReferralInsightCardProps {
  data: InsightData;
}

export function ReferralInsightCard({ data }: ReferralInsightCardProps) {
  const {
    conversionRate,
    successfulCount,
    totalCount,
    topRuleName,
    topRuleCount,
    redemptionRate,
    redeemedCount,
  } = data;

  const insights = [
    {
      title: 'Conversion Rate',
      text: `${conversionRate}% of referrals become successful signups (${successfulCount} of ${totalCount}).`,
      icon: 'trending-up' as const,
      color: '#2563eb',
      bg: '#eff6ff',
    },
    {
      title: 'Most-Used Rule',
      text: topRuleName
        ? `"${topRuleName}" has been applied to ${topRuleCount} referral${topRuleCount === 1 ? '' : 's'}.`
        : 'No reward rules have been applied to any referral yet.',
      icon: 'users' as const,
      color: '#9333ea',
      bg: '#faf5ff',
    },
    {
      title: 'Reward Redemption',
      text: `${redemptionRate}% of successful referrals have redeemed their reward (${redeemedCount} of ${successfulCount}).`,
      icon: 'gift' as const,
      color: '#ea580c',
      bg: '#fff7ed',
    },
  ];

  return (
    <View style={styles.card}>
      <Typography variant="subtitle" style={styles.title}>
        Performance Insights
      </Typography>
      <Typography variant="caption" color="textSecondary" style={styles.subtitle}>
        Program insights and recommendations
      </Typography>

      <View style={styles.list}>
        {insights.map((item, idx) => (
          <View key={idx} style={[styles.item, { backgroundColor: item.bg }]}>
            <View style={styles.iconCircle}>
              <Feather name={item.icon} size={16} color={item.color} />
            </View>
            <View style={styles.textCol}>
              <Typography variant="bodySmall" style={[styles.itemTitle, { color: item.color }]}>
                {item.title}
              </Typography>
              <Typography variant="caption" color="textSecondary" style={styles.itemText}>
                {item.text}
              </Typography>
            </View>
          </View>
        ))}
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
  list: {
    gap: Spacing.two,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.two,
    marginTop: 2,
  },
  textCol: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  itemText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
