import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { AttendanceStatus } from '../../../domain/Attendance';

interface AttendanceStatusBadgeProps {
  status?: AttendanceStatus | string;
  variant?: 'member' | 'staff';
}

export function AttendanceStatusBadge({
  status,
  variant = 'member',
}: AttendanceStatusBadgeProps) {
  const isActive =
    status === AttendanceStatus.Active || status === 'active' || status === 'working';

  const activeLabel = variant === 'staff' ? 'Working' : 'Active';
  const completedLabel = variant === 'staff' ? 'Done' : 'Completed';

  return (
    <View
      style={[
        styles.badge,
        isActive ? styles.activeBadge : styles.completedBadge,
      ]}
    >
      <Feather
        name={isActive ? 'clock' : 'check-circle'}
        size={11}
        color={isActive ? '#15803d' : '#64748b'}
      />
      <Typography
        variant="caption"
        style={[styles.text, isActive ? styles.activeText : styles.completedText]}
      >
        {isActive ? activeLabel : completedLabel}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  activeBadge: {
    backgroundColor: '#dcfce7',
  },
  completedBadge: {
    backgroundColor: '#f1f5f9',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeText: {
    color: '#15803d',
  },
  completedText: {
    color: '#64748b',
  },
});
