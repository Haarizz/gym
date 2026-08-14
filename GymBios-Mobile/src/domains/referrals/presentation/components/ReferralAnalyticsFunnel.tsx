import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface FunnelData {
  total: number;
  successful: number;
  paid: number;
  redeemed: number;
}

interface ReferralAnalyticsFunnelProps {
  data: FunnelData;
}

export function ReferralAnalyticsFunnel({ data }: ReferralAnalyticsFunnelProps) {
  const { total, successful, paid, redeemed } = data;

  const successfulPct = total > 0 ? Math.round((successful / total) * 100) : 0;
  const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;
  const redeemedPct = total > 0 ? Math.round((redeemed / total) * 100) : 0;

  const stages = [
    { label: 'Referrals Created', count: total, pct: 100, color: BrandColors.teal },
    { label: 'Signed Up (Successful)', count: successful, pct: successfulPct, color: '#16a34a' },
    { label: 'Payment Recorded', count: paid, pct: paidPct, color: '#2563eb' },
    { label: 'Reward Redeemed', count: redeemed, pct: redeemedPct, color: '#9333ea' },
  ];

  return (
    <View style={styles.card}>
      <Typography variant="subtitle" style={styles.title}>
        Referral Conversion Funnel
      </Typography>
      <Typography variant="caption" color="textSecondary" style={styles.subtitle}>
        Track referral progress through conversion stages
      </Typography>

      <View style={styles.stagesList}>
        {stages.map((stage, idx) => (
          <View key={idx} style={styles.stageItem}>
            <View style={styles.labelRow}>
              <Typography variant="bodySmall" style={styles.stageLabel}>
                {stage.label}
              </Typography>
              <Typography variant="subtitle" style={[styles.stageCount, { color: stage.color }]}>
                {stage.count} <Typography variant="caption" color="textSecondary">({stage.pct}%)</Typography>
              </Typography>
            </View>

            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.max(5, Math.min(100, stage.pct))}%`, backgroundColor: stage.color },
                ]}
              />
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
  stagesList: {
    gap: Spacing.three,
  },
  stageItem: {
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stageLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  stageCount: {
    fontSize: 14,
    fontWeight: '700',
  },
  track: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
});
