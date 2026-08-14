import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Card } from '@/shared/components/Card';
import { Typography } from '@/shared/components/Typography';
import type { Attendance } from '../../../domain/Attendance';
import { AttendanceStatus, AttendanceType } from '../../../domain/Attendance';
import {
  AttendanceAvatar,
  AttendanceStatusBadge,
  formatTime,
  getDisplayName,
  WalkInBadge,
} from '../shared';

interface AttendanceCardProps {
  record: Attendance;
  onCheckout?: (record: Attendance) => void;
  checkingOut?: boolean;
  compact?: boolean;
}

export const AttendanceCard = memo(function AttendanceCard({
  record,
  onCheckout,
  checkingOut = false,
  compact = false,
}: AttendanceCardProps) {
  const theme = useTheme();
  const name = getDisplayName(record);
  const isActive = record.status === AttendanceStatus.Active;
  const isWalkIn = record.type === AttendanceType.WalkIn;

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <AttendanceAvatar name={name} photoUrl={record.photoUrl} size={compact ? 40 : 44} />
        <View style={styles.info}>
          <Typography variant="bodySmallBold" numberOfLines={1}>
            {name}
          </Typography>
          <View style={styles.metaRow}>
            {record.memberBizId ? (
              <Typography variant="caption" color="textSecondary">
                {record.memberBizId}
              </Typography>
            ) : null}
            {isWalkIn ? <WalkInBadge /> : null}
          </View>
        </View>
        <AttendanceStatusBadge status={record.status} />
      </View>

      <View style={styles.metrics}>
        <View style={[styles.metricBox, { backgroundColor: theme.backgroundElement }]}>
          <Feather name="log-in" size={12} color="#16a34a" />
          <Typography variant="caption" color="textSecondary">
            In
          </Typography>
          <Typography variant="bodySmallBold">{formatTime(record.checkInTime)}</Typography>
        </View>
        <View style={[styles.metricBox, { backgroundColor: theme.backgroundElement }]}>
          <Feather name="log-out" size={12} color="#dc2626" />
          <Typography variant="caption" color="textSecondary">
            Out
          </Typography>
          <Typography variant="bodySmallBold">
            {record.checkOutTime ? formatTime(record.checkOutTime) : 'In progress'}
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

      {!compact && record.activityType ? (
        <View style={styles.activityRow}>
          <Typography variant="caption" color="textSecondary">
            Activity
          </Typography>
          <View style={styles.activityBadge}>
            <Typography variant="caption" style={styles.activityText}>
              {record.activityType}
            </Typography>
          </View>
        </View>
      ) : null}

      {isActive && onCheckout ? (
        <Pressable
          onPress={() => onCheckout(record)}
          disabled={checkingOut}
          style={[styles.checkoutBtn, checkingOut && styles.checkoutBtnDisabled]}
          accessibilityRole="button"
        >
          {checkingOut ? (
            <Feather name="loader" size={14} color="#dc2626" />
          ) : (
            <Feather name="log-out" size={14} color="#dc2626" />
          )}
          <Typography variant="caption" style={styles.checkoutText}>
            {checkingOut ? 'Checking out…' : 'Check Out'}
          </Typography>
        </Pressable>
      ) : null}
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexWrap: 'wrap',
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
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityBadge: {
    backgroundColor: BrandColors.screenBackgroundAlt,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  activityText: {
    color: BrandColors.teal,
    fontWeight: '600',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: Radius.sm,
    paddingVertical: Spacing.two,
  },
  checkoutBtnDisabled: {
    opacity: 0.6,
  },
  checkoutText: {
    color: '#dc2626',
    fontWeight: '700',
  },
});
