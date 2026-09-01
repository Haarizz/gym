import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Radius, Spacing } from '@/core/theme';

interface AdminTopControlsProps {
  branch?: string;
  dateText?: string;
  hasAlerts?: boolean;
  onSelectBranch?: () => void;
  onCalendarPress?: () => void;
  onRefreshPress?: () => void;
  onBellPress?: () => void;
}

export function AdminTopControls({
  branch = 'All Branches',
  dateText = 'Today: March 26, 2026',
  hasAlerts = true,
  onSelectBranch,
  onCalendarPress,
  onRefreshPress,
  onBellPress,
}: AdminTopControlsProps) {
  return (
    <View style={styles.container}>
      {/* Top Filter Row */}
      <View style={styles.filterRow}>
        <Pressable
          style={styles.dropdown}
          onPress={onSelectBranch}
          accessibilityRole="button"
          accessibilityLabel={`Select branch, currently ${branch}`}
        >
          <Text style={styles.dropdownText}>{branch}</Text>
          <Feather name="chevron-down" size={16} color="#6B7280" />
        </Pressable>

        <Pressable
          style={styles.iconButton}
          onPress={onCalendarPress}
          accessibilityRole="button"
          accessibilityLabel="Open calendar"
        >
          <Feather name="calendar" size={18} color="#4B5563" />
        </Pressable>

        <Pressable
          style={styles.iconButton}
          onPress={onRefreshPress}
          accessibilityRole="button"
          accessibilityLabel="Refresh dashboard"
        >
          <Feather name="refresh-cw" size={18} color="#4B5563" />
        </Pressable>
      </View>

      {/* Date & Alerts Header */}
      <View style={styles.dateHeader}>
        <Text style={styles.dateText}>{dateText}</Text>
        <Pressable
          style={styles.bellButton}
          onPress={onBellPress}
          accessibilityRole="button"
          accessibilityLabel="View alerts"
        >
          <Feather name="bell" size={18} color="#4B5563" />
          {hasAlerts && <View style={styles.alertDot} />}
        </Pressable>
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
  dropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  iconButton: {
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dateText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  bellButton: {
    padding: 4,
    position: 'relative',
  },
  alertDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
});
