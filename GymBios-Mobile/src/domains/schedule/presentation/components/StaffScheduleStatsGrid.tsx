import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/components/AppText';
import { useTranslation } from 'react-i18next';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { ScheduleStats } from '../../domain/StaffScheduleData';

interface StaffScheduleStatsGridProps {
  stats: ScheduleStats;
}

export function StaffScheduleStatsGrid({ stats }: StaffScheduleStatsGridProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {/* Today */}
      <View style={styles.card}>
        <Text style={styles.label}>{t('schedule.stats.today')}</Text>
        <Text style={[styles.value, { color: BrandColors.teal }]}>{stats.today}</Text>
      </View>

      {/* This Week */}
      <View style={styles.card}>
        <Text style={styles.label}>{t('schedule.stats.thisWeek')}</Text>
        <Text style={[styles.value, { color: BrandColors.memberGold }]}>{stats.thisWeek}</Text>
      </View>

      {/* Pending */}
      <View style={styles.card}>
        <Text style={styles.label}>{t('schedule.stats.pending')}</Text>
        <Text style={[styles.value, { color: '#EF4444' }]}>{stats.pending}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  label: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '500',
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
  },
});
