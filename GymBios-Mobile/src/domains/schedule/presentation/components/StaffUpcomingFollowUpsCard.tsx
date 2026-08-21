import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { UpcomingFollowUp } from '../../domain/StaffScheduleData';

interface StaffUpcomingFollowUpsCardProps {
  followUps: UpcomingFollowUp[];
}

export function StaffUpcomingFollowUpsCard({
  followUps,
}: StaffUpcomingFollowUpsCardProps) {
  const getMonthAndDay = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const day = d.getDate();
      return { month, day };
    } catch {
      return { month: 'MAR', day: 26 };
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upcoming Follow-ups</Text>

      <View style={styles.list}>
        {followUps.map((item, idx) => {
          const { month, day } = getMonthAndDay(item.date);
          return (
            <View key={item.id ?? idx} style={styles.itemRow}>
              <View style={styles.dateBadge}>
                <Text style={styles.monthText}>{month}</Text>
                <Text style={styles.dayText}>{day}</Text>
              </View>

              <View style={styles.itemInfo}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.type}>{item.type}</Text>
                <View style={styles.timeRow}>
                  <Feather name="clock" size={11} color="#64748B" />
                  <Text style={styles.timeText}>{item.time}</Text>
                </View>
              </View>
            </View>
          );
        })}
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
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: Spacing.three,
  },
  list: {
    gap: Spacing.two,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  dateBadge: {
    backgroundColor: 'rgba(245, 199, 66, 0.15)',
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
  },
  monthText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.memberGold,
  },
  itemInfo: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  type: {
    fontSize: 11,
    color: '#64748B',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
});
