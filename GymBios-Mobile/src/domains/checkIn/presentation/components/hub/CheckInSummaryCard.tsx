import { View, StyleSheet } from 'react-native';
import { BrandColors, Spacing } from '@/core/theme';
import { CheckInStatCard } from '../shared/CheckInStatCard';
import { useRecentCheckIns } from '../../hooks/useRecentCheckIns';

export function CheckInSummaryCard() {
  const { summary, isLoading } = useRecentCheckIns();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.item}>
          <CheckInStatCard
            label="Total visits today"
            value={summary.total}
            iconName="log-in"
            color={BrandColors.primary}
            isLoading={isLoading}
          />
        </View>
        <View style={styles.item}>
          <CheckInStatCard
            label="Members in gym"
            value={summary.active}
            iconName="activity"
            color={BrandColors.success}
            isLoading={isLoading}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.item}>
          <CheckInStatCard
            label="of 150 capacity" // Usually comes from a config or domain
            value="1%" // Hardcoded based on mockup/prompt for UI focus
            iconName="users"
            color={BrandColors.textSecondary}
            isLoading={isLoading}
          />
        </View>
        <View style={styles.item}>
          <CheckInStatCard
            label="Walk-in passes today"
            value={summary.walkIns}
            iconName="user-plus"
            color={BrandColors.info}
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
