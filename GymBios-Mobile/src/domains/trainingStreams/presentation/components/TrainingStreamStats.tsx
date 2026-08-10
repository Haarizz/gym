import { View, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { Loader } from '@/shared/components/Loader';

import type { TrainingStreamAnalytics } from '../../domain/TrainingStream';

interface TrainingStreamStatsProps {
  stats?: TrainingStreamAnalytics | null;
  loading: boolean;
}

export function TrainingStreamStats({ stats, loading }: TrainingStreamStatsProps) {
  if (loading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <Loader />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.emptyContainer}>
        <Typography variant="bodySmall" color="textSecondary">
          Analytics data is not available.
        </Typography>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Typography variant="subtitle" style={styles.heading}>
        Stream Analytics
      </Typography>
      <Typography variant="bodySmall" color="textSecondary" style={styles.subheading}>
        Performance and visibility summary
      </Typography>

      <View style={styles.grid}>
        <StatCard label="Total Streams" value={stats.totalStreams} icon="video" color={BrandColors.teal} />
        <StatCard label="Total Views" value={stats.totalViews} icon="eye" color="#8b5cf6" />
        <StatCard label="Live Now" value={stats.liveCount} icon="radio" color="#ef4444" />
        <StatCard label="Scheduled" value={stats.scheduledCount} icon="calendar" color="#f59e0b" />
        <StatCard label="Active Viewers" value={stats.activeViewers} icon="users" color="#10b981" />
        <StatCard label="Avg. Views" value={stats.avgViews} icon="bar-chart-2" color="#3b82f6" />
      </View>

      <View style={styles.engagementCard}>
        <View style={styles.engagementHeader}>
          <Typography variant="bodySmallBold">Engagement Rate</Typography>
          <Typography variant="title" style={styles.engagementValue}>
            {stats.engagementRate}%
          </Typography>
        </View>
      </View>
    </View>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ComponentProps<typeof Feather>['name']; color: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.iconBox, { backgroundColor: `${color}1A` }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <View style={styles.statInfo}>
        <Typography variant="caption" color="textSecondary" numberOfLines={1}>
          {label}
        </Typography>
        <Typography variant="bodySmallBold">{value}</Typography>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  loadingContainer: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  heading: {
    marginBottom: Spacing.one,
  },
  subheading: {
    marginBottom: Spacing.three,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: BrandColors.white,
    padding: Spacing.three,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  engagementCard: {
    marginTop: Spacing.two,
    backgroundColor: BrandColors.white,
    padding: Spacing.four,
    borderRadius: Radius.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  engagementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  engagementValue: {
    color: BrandColors.teal,
  },
});
