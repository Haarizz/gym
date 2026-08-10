import { StyleSheet, View } from 'react-native';
import { StatCard } from '@/shared/components/StatCard';
import { BrandColors, Spacing } from '@/core/theme';
import type { Facility } from '../../domain/Facility';

interface FacilityStatsProps {
  facilities: Facility[];
}

export function FacilityStats({ facilities }: FacilityStatsProps) {
  const total = facilities.length;
  const active = facilities.filter(f => f.status === 'Active').length;
  
  const totalBookings = facilities.reduce((sum, f) => sum + (f.bookingsThisMonth || 0), 0);
  
  const facilitiesWithOccupancy = facilities.filter(f => f.occupancyLimit !== undefined && f.occupancyLimit > 0);
  const avgOccupancy = facilitiesWithOccupancy.length > 0
    ? Math.round(facilitiesWithOccupancy.reduce((sum, f) => sum + (f.occupancyLimit || 0), 0) / facilitiesWithOccupancy.length)
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <StatCard
          label="Total Facilities"
          value={String(total)}
          iconName="box"
          color={BrandColors.teal}
        />
        <StatCard
          label="Active"
          value={String(active)}
          iconName="check-circle"
          color="#10b981"
        />
      </View>
      <View style={styles.row}>
        <StatCard
          label="Bookings (Month)"
          value={String(totalBookings)}
          iconName="calendar"
          color="#3b82f6"
        />
        <StatCard
          label="Avg Occupancy"
          value={avgOccupancy > 0 ? String(avgOccupancy) : '-'}
          iconName="users"
          color="#f59e0b"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
