import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/core/theme';

interface AttendanceSkeletonProps {
  variant?: 'overview' | 'list';
  count?: number;
}

function SkeletonBlock({
  height,
  width,
  style,
}: {
  height: number;
  width?: number | string;
  style?: object;
}) {
  return (
    <View
      style={[
        {
          height,
          width: width ?? '100%',
          backgroundColor: '#e5e7eb',
          borderRadius: Radius.sm,
        },
        style,
      ]}
    />
  );
}

function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonRow}>
        <SkeletonBlock height={44} width={44} style={{ borderRadius: Radius.full }} />
        <View style={styles.skeletonTextGroup}>
          <SkeletonBlock height={14} width="60%" />
          <SkeletonBlock height={10} width="40%" />
        </View>
      </View>
      <View style={styles.skeletonRow}>
        <SkeletonBlock height={12} width="30%" />
        <SkeletonBlock height={12} width="30%" />
        <SkeletonBlock height={12} width="30%" />
      </View>
    </View>
  );
}

export function AttendanceSkeleton({
  variant = 'list',
  count = 5,
}: AttendanceSkeletonProps) {
  return (
    <View style={styles.container}>
      {variant === 'overview' ? (
        <View style={styles.statRow}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={styles.statCard}>
              <SkeletonBlock height={36} width={36} style={{ borderRadius: Radius.sm }} />
              <SkeletonBlock height={14} width="80%" />
              <SkeletonBlock height={10} width="60%" />
            </View>
          ))}
        </View>
      ) : null}
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  skeletonCard: {
    backgroundColor: '#f9fafe',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  skeletonTextGroup: {
    flex: 1,
    gap: 4,
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9fafe',
    borderRadius: Radius.md,
    padding: Spacing.two,
    alignItems: 'center',
    gap: 4,
  },
});
