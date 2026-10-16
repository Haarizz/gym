import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/shared/components/AppText';
import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';
import { Radius, Spacing } from '@/core/theme';

import { Dropdown } from '@/shared/components';

interface TrainerScheduleHeaderCardProps {
  dateRange: string;
  totalSessions: number;
  filterValue: string;
  onFilterChange: (value: string) => void;
  onFilterPress?: () => void;
}

export function TrainerScheduleHeaderCard({
  dateRange,
  totalSessions,
  filterValue,
  onFilterChange,
  onFilterPress,
}: TrainerScheduleHeaderCardProps) {
  const { t } = useTranslation();

  const filterOptions = useMemo(() => [
    { label: t('schedule.trainer.filterThisWeek'), value: 'this_week' },
    { label: t('schedule.trainer.filterNextWeek'), value: 'next_week' },
    { label: t('schedule.trainer.filterCustomRange'), value: 'custom' },
  ], [t]);

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <View style={styles.dropdownContainer}>
          <Dropdown
            value={filterValue}
            options={filterOptions}
            onChange={onFilterChange}
            placeholder={t('schedule.trainer.selectRangePlaceholder')}
          />
        </View>

        <Pressable
          style={styles.filterBtn}
          onPress={onFilterPress}
          accessibilityRole="button"
          accessibilityLabel={t('schedule.trainer.filterScheduleAccessibility')}
        >
          <Feather name="filter" size={18} color="#475569" />
        </Pressable>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.dateRangeText}>{dateRange}</Text>
        <Text style={styles.totalSessionsText}>
          {t('schedule.trainer.sessionsCount', { count: totalSessions })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.three,
  },
  dropdownContainer: {
    flex: 1,
  },
  filterBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.sm,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dateRangeText: {
    fontSize: 13,
    color: '#64748B',
  },
  totalSessionsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
});
