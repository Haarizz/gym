import { Feather } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Spacing } from '@/core/theme';
import { Avatar } from '@/shared/components/Avatar';
import { Typography } from '@/shared/components/Typography';
import { StatusBadge } from '@/shared/components/StatusBadge';
import type { Staff } from '../../domain/Staff';

interface StaffCardProps {
  staff: Staff;
  onPress?: (staff: Staff) => void;
}

export const StaffCard = memo(function StaffCard({ staff, onPress }: StaffCardProps) {
  const theme = useTheme();

  const initials = staff.name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Pressable onPress={() => onPress?.(staff)}>
      <View style={[styles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <View style={styles.topSection}>
          <View style={styles.userRow}>
            <Avatar
              initials={initials}
              imageUrl={staff.photoUrl}
              size={38}
            />
            <View style={styles.info}>
              <Typography variant="bodySmallBold" style={styles.name}>
                {staff.name}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {staff.role}{staff.branch ? ` · ${staff.branch}` : ''}
              </Typography>
            </View>
          </View>
          <StatusBadge status={staff.status} />
        </View>

        <View style={[styles.bottomSection, { borderTopColor: theme.border }]}>
          <View style={styles.metricItem}>
            <Typography variant="caption" color="textSecondary" style={styles.metricLabel}>
              Target
            </Typography>
            <Typography variant="bodySmallBold">
              ${staff.monthlyTarget.toLocaleString()}
            </Typography>
          </View>
          <View style={styles.metricItem}>
            <Typography variant="caption" color="textSecondary" style={styles.metricLabel}>
              Base Salary
            </Typography>
            <Typography variant="bodySmallBold">
              ${staff.baseSalary.toLocaleString()}
            </Typography>
          </View>
          <Pressable hitSlop={8} style={styles.dotsButton}>
            <Feather name="more-vertical" size={18} color={theme.textSecondary} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 0.5,
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 14,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
    paddingRight: Spacing.two,
  },
  info: {
    flex: 1,
  },
  name: {
    marginBottom: 2,
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.5,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    marginBottom: 2,
  },
  dotsButton: {
    alignSelf: 'center',
  },
});