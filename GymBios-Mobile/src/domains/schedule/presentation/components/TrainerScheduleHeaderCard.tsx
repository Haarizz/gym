import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Radius, Spacing } from '@/core/theme';

import { Dropdown } from '@/shared/components';

interface TrainerScheduleHeaderCardProps {
  dateRange: string;
  totalSessions: number;
  filterValue: string;
  onFilterChange: (value: string) => void;
  onFilterPress?: () => void;
}

const FILTER_OPTIONS = [
  { label: 'This Week', value: 'this_week' },
  { label: 'Next Week', value: 'next_week' },
  { label: 'Custom Range', value: 'custom' },
];

export function TrainerScheduleHeaderCard({
  dateRange,
  totalSessions,
  filterValue,
  onFilterChange,
  onFilterPress,
}: TrainerScheduleHeaderCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <View style={styles.dropdownContainer}>
          <Dropdown
            value={filterValue}
            options={FILTER_OPTIONS}
            onChange={onFilterChange}
            placeholder="Select range"
          />
        </View>

        <Pressable
          style={styles.filterBtn}
          onPress={onFilterPress}
          accessibilityRole="button"
          accessibilityLabel="Filter schedule"
        >
          <Feather name="filter" size={18} color="#475569" />
        </Pressable>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.dateRangeText}>{dateRange}</Text>
        <Text style={styles.totalSessionsText}>{totalSessions} Sessions</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.three,
  },
  dropdownContainer: {
    flex: 1,
  },
  filterBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.sm,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dateRangeText: {
    fontSize: 13,
    color: '#64748B',
  },
  totalSessionsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
});
