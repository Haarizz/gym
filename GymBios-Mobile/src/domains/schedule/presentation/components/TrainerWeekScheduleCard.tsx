import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { TrainerDaySchedule } from '../../domain/TrainerScheduleData';

const EXPAND_TIMING = { duration: 260, easing: Easing.out(Easing.cubic) };

// Animates its height between 0 and the measured height of its children.
function Collapsible({ expanded, children }: { expanded: boolean; children: ReactNode }) {
  const contentHeight = useSharedValue(0);
  const progress = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, EXPAND_TIMING);
  }, [expanded, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: contentHeight.value * progress.value,
    opacity: progress.value,
  }));

  return (
    <Animated.View
      style={[styles.collapsible, animatedStyle]}
      pointerEvents={expanded ? 'auto' : 'none'}
      accessibilityElementsHidden={!expanded}
      importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
    >
      <View
        style={styles.collapsibleContent}
        onLayout={(e) => {
          contentHeight.value = e.nativeEvent.layout.height;
        }}
      >
        {children}
      </View>
    </Animated.View>
  );
}

function DayChevron({ expanded }: { expanded: boolean }) {
  const rotation = useSharedValue(expanded ? 180 : 0);

  useEffect(() => {
    rotation.value = withTiming(expanded ? 180 : 0, EXPAND_TIMING);
  }, [expanded, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Feather name="chevron-down" size={20} color={BrandColors.trainerAmber} />
    </Animated.View>
  );
}

interface TrainerWeekScheduleCardProps {
  weekSchedule: TrainerDaySchedule[];
  onSessionPress?: (session: any) => void;
}

export function TrainerWeekScheduleCard({
  weekSchedule,
  onSessionPress,
}: TrainerWeekScheduleCardProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // Default to today's card, falling back to the first day that has sessions.
  useEffect(() => {
    const todayIdx = weekSchedule.findIndex((d) => d.isToday);
    const firstBusyIdx = weekSchedule.findIndex((d) => d.sessions.length > 0);
    const idx = todayIdx !== -1 ? todayIdx : firstBusyIdx;
    setExpandedIdx(idx === -1 ? null : idx);
  }, [weekSchedule]);

  const toggleDay = (idx: number) => {
    setExpandedIdx((current) => (current === idx ? null : idx));
  };

  return (
    <View style={styles.container}>
      {weekSchedule.map((day, dayIdx) => {
        const isExpanded = expandedIdx === dayIdx;
        return (
          <View key={dayIdx} style={styles.dayCard}>
            {/* Day Header */}
            <Pressable
              style={styles.dayHeader}
              onPress={() => toggleDay(dayIdx)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isExpanded }}
              accessibilityLabel={`${day.dayName} ${day.date}, ${day.sessions.length} sessions`}
            >
              <View style={styles.dayInfoRow}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>{day.day}</Text>
                  <Text style={styles.dateBadgeText}>{day.date}</Text>
                </View>
                <View>
                  <Text style={styles.dayName}>{day.dayName}</Text>
                  <Text style={styles.sessionCountText}>
                    {day.sessions.length} {day.sessions.length === 1 ? 'session' : 'sessions'}
                  </Text>
                </View>
              </View>
              <DayChevron expanded={isExpanded} />
            </Pressable>

            {/* Sessions List */}
            <Collapsible expanded={isExpanded}>
              <View style={styles.sessionsList}>
                {day.sessions.length === 0 && (
                  <Text style={styles.emptyText}>No sessions scheduled</Text>
                )}
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
            </Collapsible>
          </View>
        );
      })}
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
  },
  collapsible: {
    overflow: 'hidden',
  },
  collapsibleContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: Spacing.two,
  },
  sessionsList: {
    gap: Spacing.two,
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
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
