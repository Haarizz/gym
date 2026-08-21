import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { TrainerDaySchedule } from '../../domain/TrainerScheduleData';

interface TrainerWeekScheduleCardProps {
  weekSchedule: TrainerDaySchedule[];
  onSessionPress?: (session: any) => void;
}

export function TrainerWeekScheduleCard({
  weekSchedule,
  onSessionPress,
}: TrainerWeekScheduleCardProps) {
  return (
    <View style={styles.container}>
      {weekSchedule.map((day, dayIdx) => (
        <View key={dayIdx} style={styles.dayCard}>
          {/* Day Header */}
          <View style={styles.dayHeader}>
            <View style={styles.dayInfoRow}>
              <View style={styles.dayBadge}>
                <Text style={styles.dayBadgeText}>{day.day}</Text>
                <Text style={styles.dateBadgeText}>{day.date}</Text>
              </View>
              <View>
                <Text style={styles.dayName}>{day.day}day</Text>
                <Text style={styles.sessionCountText}>
                  {day.sessions.length} sessions
                </Text>
              </View>
            </View>
            <Pressable hitSlop={8}>
              <Text style={styles.detailsText}>Details</Text>
            </Pressable>
          </View>

          {/* Sessions List */}
          <View style={styles.sessionsList}>
            {day.sessions.map((session, sIdx) => (
              <Pressable
                key={session.id ?? sIdx}
                style={styles.sessionItem}
                onPress={() => onSessionPress?.(session)}
                accessibilityRole="button"
                accessibilityLabel={`${session.member}, ${session.time}`}
              >
                <View style={styles.timeBadge}>
                  <Text style={styles.timeText}>{session.time}</Text>
                </View>
                <View style={styles.sessionInfo}>
                  <Text style={styles.memberName}>{session.member}</Text>
                  <Text style={styles.sessionMeta}>
                    {session.type} • {session.duration}
                  </Text>
                </View>
                <Feather
                  name={
                    session.type === 'CLASS'
                      ? 'users'
                      : session.type === 'FACILITY'
                        ? 'map-pin'
                        : 'user'
                  }
                  size={16}
                  color="#94A3B8"
                />
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: Spacing.three,
  },
  dayInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayBadge: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  dateBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.trainerAmber,
  },
  dayName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  sessionCountText: {
    fontSize: 12,
    color: '#64748B',
  },
  detailsText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.trainerAmber,
  },
  sessionsList: {
    gap: Spacing.two,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  timeBadge: {
    backgroundColor: BrandColors.trainerAmber,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sessionInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  sessionMeta: {
    fontSize: 11,
    color: '#64748B',
  },
});
