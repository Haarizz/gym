import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Avatar } from '@/shared/components/Avatar';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
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
      <Card style={styles.container}>
        <View style={styles.header}>
          <Avatar
            initials={initials}
            imageUrl={staff.photoUrl}
            size={48}
          />
          <View style={styles.info}>
            <Typography variant="bodySmallBold" style={styles.name}>
              {staff.name}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {staff.role}
            </Typography>
          </View>
          <StatusBadge status={staff.status} />
        </View>

        <View style={styles.metrics}>
          <View style={[styles.metricBox, { backgroundColor: theme.backgroundElement }]}>
            <Typography variant="caption" color="textSecondary">
              Monthly Target
            </Typography>
            <Typography variant="bodySmallBold">
              ${staff.monthlyTarget.toLocaleString()}
            </Typography>
          </View>
          <View style={[styles.metricBox, { backgroundColor: theme.backgroundElement }]}>
            <Typography variant="caption" color="textSecondary">
              Base Salary
            </Typography>
            <Typography variant="bodySmallBold">
              ${staff.baseSalary.toLocaleString()}
            </Typography>
          </View>
        </View>

        <Button
          label="View Details"
          onPress={() => onPress?.(staff)}
        />
      </Card>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  info: {
    flex: 1,
  },
  name: {
    marginBottom: 2,
  },
  metrics: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  metricBox: {
    flex: 1,
    borderRadius: Radius.sm,
    padding: Spacing.two,
    gap: Spacing.half,
  },
});