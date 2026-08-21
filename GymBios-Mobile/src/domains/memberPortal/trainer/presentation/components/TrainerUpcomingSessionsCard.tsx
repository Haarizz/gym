import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

export interface UpcomingSessionData {
  id?: string | number;
  date: string;
  time: string;
  type: string;
  focus: string;
}

const SESSIONS: UpcomingSessionData[] = [
  { id: '1', date: '2026-03-27', time: '07:00 AM', type: 'Personal Training', focus: 'Upper Body Strength' },
  { id: '2', date: '2026-03-29', time: '07:00 AM', type: 'Personal Training', focus: 'Core & Conditioning' },
];

export function TrainerUpcomingSessionsCard() {
  const handleBookSession = () => {
    Alert.alert('Book Session', 'Opening Coach calendar to pick your next session slot.');
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Upcoming Coach Sessions</Text>
      <View style={styles.sessionList}>
        {SESSIONS.map((session, index) => {
          const dateObj = new Date(session.date);
          const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
          const day = dateObj.getDate();

          return (
            <View key={session.id ?? index} style={styles.sessionCard}>
              <View style={styles.dateBox}>
                <Text style={styles.monthText}>{month.toUpperCase()}</Text>
                <Text style={styles.dayText}>{day}</Text>
              </View>

              <View style={styles.sessionInfo}>
                <Text style={styles.sessionType}>{session.type}</Text>
                <Text style={styles.sessionFocus}>{session.focus}</Text>
                <View style={styles.timeRow}>
                  <Feather name="calendar" size={12} color={BrandColors.textSecondary} />
                  <Text style={styles.timeText}>{session.time}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <Pressable
        style={({ pressed }) => [styles.bookButton, pressed && styles.pressed]}
        onPress={handleBookSession}
        accessibilityRole="button"
        accessibilityLabel="Book Another Session"
      >
        <Text style={styles.bookButtonText}>Book Another Session</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: Spacing.three,
  },
  title: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  sessionList: {
    gap: Spacing.two + 2,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.screenBackground,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
  },
  monthText: {
    fontSize: 9,
    fontWeight: '700',
    color: BrandColors.trainerAmber,
  },
  dayText: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.trainerAmber,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionType: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  sessionFocus: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
    marginTop: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    color: BrandColors.textSecondary,
    fontWeight: '500',
  },
  bookButton: {
    backgroundColor: BrandColors.memberGold,
    paddingVertical: Spacing.three + 2,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
