import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { TrainerTodaySession } from '../../domain/TrainerDashboardData';

interface TrainerTodayScheduleCardProps {
  sessions: TrainerTodaySession[];
  onViewAll?: () => void;
  onStartSession?: (session: TrainerTodaySession) => void;
  onFinishSession?: (session: TrainerTodaySession) => void;
  onMessageMember?: (session: TrainerTodaySession) => void;
}

export function TrainerTodayScheduleCard({
  sessions,
  onViewAll,
  onStartSession,
  onFinishSession,
  onMessageMember,
}: TrainerTodayScheduleCardProps) {
  const router = useRouter();

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      router.push('/(trainer)/schedule' as any);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Schedule</Text>
        <Pressable onPress={handleViewAll} hitSlop={8}>
          <Text style={styles.viewAllText}>View All</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {sessions.map((session, index) => {
          const isCompleted = session.status === 'completed';
          const isInProgress = session.status === 'in_progress';

          return (
            <View
              key={session.id ?? index}
              style={[
                styles.sessionCard,
                isCompleted ? styles.sessionCompleted : styles.sessionUpcoming,
              ]}
            >
              <View style={styles.sessionRow}>
                {/* Time Badge */}
                <View
                  style={[
                    styles.timeBadge,
                    isCompleted ? styles.timeBadgeCompleted : styles.timeBadgeUpcoming,
                  ]}
                >
                  <Text style={styles.timeText}>{session.time}</Text>
                </View>

                {/* Session Details */}
                <View style={styles.sessionDetails}>
                  <Text style={styles.memberName}>{session.className || session.member || 'No Member'}</Text>
                  <Text style={styles.sessionSubtext}>
                    {session.type} • {session.focus}
                  </Text>

                  {isCompleted ? (
                    <View style={styles.completedBadgeRow}>
                      <Feather name="check-circle" size={12} color="#16A34A" />
                      <Text style={styles.completedBadgeText}>Completed</Text>
                    </View>
                  ) : (
                    <View style={styles.actionsRow}>
                      {isInProgress ? (
                        <Pressable
                          style={[styles.startButton, styles.finishButton]}
                          onPress={() => onFinishSession?.(session)}
                          accessibilityRole="button"
                          accessibilityLabel={`Finish session with ${session.className || session.member}`}
                        >
                          <Feather name="square" size={12} color="#FFFFFF" />
                          <Text style={styles.startButtonText}>Finish Session</Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          style={styles.startButton}
                          onPress={() => onStartSession?.(session)}
                          accessibilityRole="button"
                          accessibilityLabel={`Start session with ${session.className || session.member}`}
                        >
                          <Feather name="play" size={12} color="#FFFFFF" />
                          <Text style={styles.startButtonText}>Start Session</Text>
                        </Pressable>
                      )}

                      <Pressable
                        style={styles.messageButton}
                        onPress={() => onMessageMember?.(session)}
                        accessibilityRole="button"
                        accessibilityLabel={`Message ${session.member}`}
                      >
                        <Feather name="message-circle" size={16} color="#475569" />
                      </Pressable>
                    </View>
                  )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.trainerAmber,
  },
  list: {
    gap: Spacing.two,
  },
  sessionCard: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  sessionCompleted: {
    borderColor: '#DCFCE7',
    backgroundColor: '#F0FDF4',
  },
  sessionUpcoming: {
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  sessionRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  timeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    alignSelf: 'flex-start',
  },
  timeBadgeCompleted: {
    backgroundColor: '#16A34A',
  },
  timeBadgeUpcoming: {
    backgroundColor: BrandColors.trainerAmber,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sessionDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  sessionSubtext: {
    fontSize: 12,
    color: '#64748B',
  },
  completedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  startButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: BrandColors.trainerAmber,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  finishButton: {
    backgroundColor: '#3B82F6', // Blue color for Finish Session
  },
  startButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  messageButton: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
