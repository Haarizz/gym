import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Card } from '@/shared/components/Card';
import { Typography } from '@/shared/components/Typography';
import {
  AttendanceAvatar,
  AttendanceStatusBadge,
  formatTime,
} from '../shared';
import type { StaffAttendanceRecord } from '../../hooks/useStaffAttendance';

interface StaffAttendanceCardProps {
  record: StaffAttendanceRecord;
}

export const StaffAttendanceCard = memo(function StaffAttendanceCard({
  record,
}: StaffAttendanceCardProps) {
  const theme = useTheme();

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <AttendanceAvatar name={record.staffName} photoUrl={record.photoUrl} />
        <View style={styles.info}>
          <Typography variant="bodySmallBold" numberOfLines={1}>
            {record.staffName}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {record.staffBizId}
          </Typography>
        </View>
        <AttendanceStatusBadge status={record.status} variant="staff" />
      </View>

      <View style={styles.roleBadge}>
        <Typography variant="caption" style={styles.roleText}>
          {record.staffRole}
        </Typography>
      </View>

      <View style={styles.metrics}>
        <View style={[styles.metricBox, { backgroundColor: theme.backgroundElement }]}>
          <Feather name="log-in" size={12} color="#16a34a" />
          <Typography variant="caption" color="textSecondary">
            Clock In
          </Typography>
          <Typography variant="bodySmallBold">{formatTime(record.clockInTime)}</Typography>
        </View>
        <View style={[styles.metricBox, { backgroundColor: theme.backgroundElement }]}>
          <Feather name="log-out" size={12} color="#dc2626" />
          <Typography variant="caption" color="textSecondary">
            Clock Out
          </Typography>
          <Typography variant="bodySmallBold">
            {record.clockOutTime ? formatTime(record.clockOutTime) : 'Still working'}
          </Typography>
        </View>
        <View style={[styles.metricBox, { backgroundColor: theme.backgroundElement }]}>
          <Feather name="clock" size={12} color={BrandColors.teal} />
          <Typography variant="caption" color="textSecondary">
            Duration
          </Typography>
          <Typography variant="bodySmallBold">
            {record.formattedDuration || '—'}
          </Typography>
        </View>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: BrandColors.screenBackgroundAlt,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  roleText: {
    color: BrandColors.teal,
    fontWeight: '600',
  },
  metrics: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  metricBox: {
    flex: 1,
    borderRadius: Radius.sm,
    padding: Spacing.two,
    alignItems: 'center',
    gap: 2,
  },
});
