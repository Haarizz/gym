import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { MemberConsistencyRow } from '../../../domain/AttendanceReport';
import { AttendanceSection } from '../shared';

interface MemberTrendsListProps {
  rows: MemberConsistencyRow[];
  title?: string;
}

export function MemberTrendsList({
  rows,
  title,
}: MemberTrendsListProps) {
  const { t } = useTranslation();
  const displayTitle = title ?? t('attendance.reports.topConsistent');

  // Already pre-sorted by the backend; still cap at 5 for display safety.
  const topRows = rows.slice(0, 5);

  if (topRows.length === 0) {
    return null;
  }

  return (
    <AttendanceSection title={displayTitle}>
      <View style={styles.list}>
        {topRows.map((row, index) => (
          <View key={`${row.id}-${index}`} style={styles.row}>
            <View style={styles.rank}>
              <Typography variant="caption" style={styles.rankText}>
                {index + 1}
              </Typography>
            </View>
            <View style={styles.info}>
              <Typography variant="bodySmallBold" numberOfLines={1}>
                {row.name || 'Unknown'}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {`${row.visits ?? 0} `}{t('attendance.reports.visits')}
              </Typography>
            </View>
            <View style={styles.stats}>
              <Typography variant="bodySmallBold" style={styles.rate}>
                {row.attendanceRate != null ? `${row.attendanceRate}%` : '—'}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {t('attendance.reports.rate')}
              </Typography>
            </View>
          </View>
        ))}
      </View>
    </AttendanceSection>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rank: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.screenBackgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontWeight: '700',
    color: BrandColors.teal,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  stats: {
    alignItems: 'flex-end',
    gap: 2,
  },
  rate: {
    color: BrandColors.teal,
  },
});
