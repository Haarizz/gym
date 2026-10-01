import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';

interface StaffScheduleHeaderCardProps {
  dateText: string;
  tasksCount: number;
  urgentCount?: number;
  title?: string;
  onCalendarPress?: () => void;
}

export function StaffScheduleHeaderCard({
  dateText,
  tasksCount,
  urgentCount = 3,
  title = "Today's Schedule",
  onCalendarPress,
}: StaffScheduleHeaderCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.titleInfo}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.date}>{dateText}</Text>
        </View>
        <Pressable
          onPress={onCalendarPress}
          disabled={!onCalendarPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Pick a date"
          style={({ pressed }) => [styles.calendarButton, pressed && { opacity: 0.6 }]}
        >
          <Feather name="calendar" size={24} color={BrandColors.teal} />
        </Pressable>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.tasksText}>Tasks: {tasksCount}</Text>
        <Text style={styles.urgentText}>{urgentCount} High Priority</Text>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  calendarButton: {
    padding: Spacing.one,
  },
  titleInfo: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  date: {
    fontSize: 13,
    color: '#64748B',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  tasksText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  urgentText: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.teal,
  },
});
