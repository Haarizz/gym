import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BrandColors, Spacing } from '@/core/theme';
import { CheckInStatCard } from '../shared/CheckInStatCard';
import { useRecentCheckIns } from '../../hooks/useRecentCheckIns';

export function CheckInSummaryCard() {
  const { t } = useTranslation();
  const { summary, isLoading } = useRecentCheckIns();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.item}>
          <CheckInStatCard
            label={t('checkIn.hub.stats.totalVisitsToday')}
            value={summary.total}
            iconName="log-in"
            color={BrandColors.teal}
            isLoading={isLoading}
          />
        </View>
        <View style={styles.item}>
          <CheckInStatCard
            label={t('checkIn.hub.stats.membersInGym')}
            value={summary.active}
            iconName="activity"
            color={BrandColors.teal}
            isLoading={isLoading}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.item}>
          <CheckInStatCard
            label={t('checkIn.hub.stats.capacitySubtitle', { count: 150 })}
            value="1%" // Hardcoded based on mockup/prompt for UI focus
            iconName="users"
            color={BrandColors.textSecondary}
            isLoading={isLoading}
          />
        </View>
        <View style={styles.item}>
          <CheckInStatCard
            label={t('checkIn.hub.stats.walkInPassesToday')}
            value={summary.walkIns}
            iconName="user-plus"
            color={"#3b82f6"}
            isLoading={isLoading}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  item: {
    flex: 1,
  },
});
