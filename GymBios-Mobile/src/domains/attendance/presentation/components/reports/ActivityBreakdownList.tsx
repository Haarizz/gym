import { StyleSheet, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { ActivityBreakdown } from '../../../domain/AttendanceReport';
import { AttendanceSection } from '../shared';

interface ActivityBreakdownListProps {
  items: ActivityBreakdown[];
}

export function ActivityBreakdownList({ items }: ActivityBreakdownListProps) {
  const total = items.reduce((sum, item) => sum + (item.count ?? 0), 0);

  if (items.length === 0) {
    return null;
  }

  return (
    <AttendanceSection title="Activity Breakdown">
      <View style={styles.list}>
        {items.map((item, index) => {
          const count = item.count ?? 0;
          // Use backend-provided percentage when available; fall back to computing it.
          const pct = item.percentage != null
            ? item.percentage
            : (total > 0 ? Math.round((count / total) * 100) : 0);
          return (
            <View key={`${item.type}-${index}`} style={styles.item}>
              <View style={styles.header}>
                <Typography variant="bodySmallBold">{item.type || 'Other'}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {count} · {pct}%
                </Typography>
              </View>
              <View style={styles.track}>
                <View style={[styles.bar, { width: `${Math.max(pct, 2)}%` }]} />
              </View>
            </View>
          );
        })}
      </View>
    </AttendanceSection>
  );
}


const styles = StyleSheet.create({
  list: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  item: {
    gap: Spacing.one,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  track: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: BrandColors.teal,
    borderRadius: Radius.full,
  },
});
