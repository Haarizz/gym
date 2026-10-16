import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import Feather from '@expo/vector-icons/Feather';
import { CurrencyIcon } from '@/shared/components/CurrencyIcon';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { GlassSurface } from '@/shared/components';
import type { TrainerTodayStats } from '../../domain/TrainerDashboardData';

interface TrainerStatsGridProps {
  stats: TrainerTodayStats;
}

export function TrainerStatsGrid({ stats }: TrainerStatsGridProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.grid}>
      {/* Sessions Today */}
      <GlassSurface radius={Radius.md} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(50, 127, 116, 0.15)' }]}>
            <Feather name="calendar" size={16} color={BrandColors.teal} />
          </View>
          <Text style={styles.cardLabel}>{t('dashboard.trainer.stats.sessionsToday')}</Text>
        </View>
        <Text style={styles.cardValue}>
          {stats.sessionsCompleted}/{stats.sessionsScheduled}
        </Text>
      </GlassSurface>

      {/* Today's Earnings */}
      <GlassSurface radius={Radius.md} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 199, 66, 0.15)' }]}>
            <CurrencyIcon size={16} color={BrandColors.memberGold} />
          </View>
          <Text style={styles.cardLabel}>{t('dashboard.trainer.stats.todayEarnings')}</Text>
        </View>
        <Text style={[styles.cardValue, { color: BrandColors.memberGold }]}>
          <CurrencyValue amount={stats.todayEarnings} />
        </Text>
      </GlassSurface>

      {/* Active Members */}
      <GlassSurface radius={Radius.md} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}>
            <Feather name="users" size={16} color="#9333EA" />
          </View>
          <Text style={styles.cardLabel}>{t('dashboard.trainer.stats.activeMembers')}</Text>
        </View>
        <Text style={styles.cardValue}>{stats.activeMembers}</Text>
      </GlassSurface>

      {/* Monthly Target */}
      <GlassSurface radius={Radius.md} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
            <Feather name="target" size={16} color="#16A34A" />
          </View>
          <Text style={styles.cardLabel}>{t('dashboard.trainer.stats.monthlyTarget')}</Text>
        </View>
        <Text style={[styles.cardValue, { color: '#16A34A' }]}>
          {stats.monthlyTargetPercentage}%
        </Text>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  card: {
    width: '48.5%',
    padding: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
});
