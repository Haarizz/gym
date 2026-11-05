import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';

import { FeatherIcon } from '@/shared/components/CurrencyIcon';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { CurrencyValue } from '@/core/providers';
import { useReferralStats } from '../../hooks/useReferrals';
import { useRewardStats } from '@/domains/rewards';

/**
 * Referral hub KPIs: a teal headline card (total, successful, conversion with a
 * progress bar) followed by a compact row of reward/program tiles.
 */
export function ReferralStatsSummary() {
  const { t } = useTranslation();
  const { data: stats, isLoading: isStatsLoading } = useReferralStats();
  const { isLoading: isRewardsLoading } = useRewardStats();

  if (isStatsLoading || isRewardsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={BrandColors.teal} />
      </View>
    );
  }

  const totalReferrals = stats?.totalReferrals ?? 0;
  const successfulReferrals = stats?.successfulReferrals ?? 0;
  const conversionRate = Number(stats?.conversionRate ?? 0);
  const totalRewards = Number(stats?.totalRewards ?? 0);
  const activePrograms = stats?.activeRules ?? 0;
  const avgReward =
    successfulReferrals > 0 ? Math.round((totalRewards / successfulReferrals) * 100) / 100 : 0;
  const barWidth = Math.max(0, Math.min(conversionRate, 100));

  return (
    <View style={styles.container}>
      {/* ── Headline card ─────────────────────────────────────── */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroMain}>
            <View style={styles.heroIcon}>
              <Feather name="users" size={18} color="#ffffff" />
            </View>
            <View style={styles.heroTextGroup}>
              <Typography variant="caption" style={styles.heroLabel} numberOfLines={1}>
                {t('adminReferrals.stats.total')}
              </Typography>
              <Typography variant="title" style={styles.heroValue}>
                {totalReferrals}
              </Typography>
            </View>
          </View>

          <View style={styles.heroSide}>
            <Typography variant="caption" style={styles.heroLabel} numberOfLines={1}>
              {t('adminReferrals.stats.conversion')}
            </Typography>
            <Typography variant="subtitle" style={styles.heroSideValue}>
              {`${conversionRate}%`}
            </Typography>
          </View>
        </View>

        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${barWidth}%` }]} />
        </View>

        <View style={styles.heroFooter}>
          <Feather name="check-circle" size={13} color="rgba(255,255,255,0.9)" />
          <Typography variant="caption" style={styles.heroFooterText} numberOfLines={1}>
            {t('adminReferrals.stats.successful')}: {successfulReferrals} / {totalReferrals}
          </Typography>
        </View>
      </View>

      {/* ── Secondary tiles ───────────────────────────────────── */}
      <View style={styles.tilesRow}>
        <StatTile
          icon={<Feather name="gift" size={15} color="#ea580c" />}
          iconBg="#ffedd5"
          label={t('adminReferrals.stats.rewards')}
          value={<CurrencyValue amount={totalRewards} />}
          valueColor="#ea580c"
        />
        <StatTile
          icon={<FeatherIcon name="dollar-sign" size={15} color={BrandColors.teal} />}
          iconBg="#ccfbf1"
          label={t('adminReferrals.stats.avgReward')}
          value={<CurrencyValue amount={avgReward} />}
          valueColor={BrandColors.teal}
        />
        <StatTile
          icon={<Feather name="zap" size={15} color="#0284c7" />}
          iconBg="#e0f2fe"
          label={t('adminReferrals.stats.programs')}
          value={`${activePrograms}`}
          valueColor="#0284c7"
        />
      </View>
    </View>
  );
}

function StatTile({
  icon,
  iconBg,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: React.ReactNode;
  valueColor: string;
}) {
  return (
    <View style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <Typography
        variant="bodySmallBold"
        style={[styles.tileValue, { color: valueColor }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Typography>
      <Typography variant="caption" color="textSecondary" style={styles.tileLabel} numberOfLines={2}>
        {label}
      </Typography>
    </View>
  );
}

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.04,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
} as const;

const styles = StyleSheet.create({
  loadingContainer: {
    padding: Spacing.four,
    alignItems: 'center',
  },
  container: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.md,
  },

  // Headline
  hero: {
    backgroundColor: BrandColors.teal,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.md,
    shadowColor: BrandColors.teal,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  heroMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
  heroValue: {
    color: '#ffffff',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  heroSide: {
    alignItems: 'flex-end',
  },
  heroSideValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroFooterText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
  },

  // Tiles
  tilesRow: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
  },
  tile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.one + 2,
    ...CARD_SHADOW,
  },
  tileIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  tileLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
});
