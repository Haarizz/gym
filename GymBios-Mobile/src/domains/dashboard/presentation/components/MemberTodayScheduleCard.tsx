import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import type { MemberTodayScheduleItem } from '../../domain/MemberDashboardData';

interface MemberTodayScheduleCardProps {
  schedule: MemberTodayScheduleItem[];
}

export function MemberTodayScheduleCard({ schedule }: MemberTodayScheduleCardProps) {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today&apos;s Schedule</Text>
        <Pressable
          hitSlop={8}
          onPress={() => router.push('/(member)/bookings' as any)}
          accessibilityRole="button"
          accessibilityLabel="View All Bookings"
        >
          <Text style={styles.viewAllText}>View All</Text>
        </Pressable>
      </View>

      {schedule.length > 0 ? (
        <View style={styles.list}>
          {schedule.map((item, index) => {
            const isFull = item.spots.toLowerCase().includes('full');

            return (
              <View key={item.id ?? index} style={styles.itemCard}>
                <View style={styles.timeBadge}>
                  <Feather name="clock" size={12} color={BrandColors.trainerAmber} />
                  <Text style={styles.timeText}>{item.time}</Text>
                </View>

                <View style={styles.infoContainer}>
                  <Text style={styles.className}>{item.class}</Text>
                  <Text style={styles.trainerName}>with {item.trainer}</Text>

                  <View style={styles.itemFooter}>
                    <View
                      style={[
                        styles.spotBadge,
                        isFull ? styles.spotBadgeFull : styles.spotBadgeAvailable,
                      ]}
                    >
                      <Text
                        style={[
                          styles.spotBadgeText,
                          isFull ? styles.spotBadgeTextFull : styles.spotBadgeTextAvailable,
                        ]}
                      >
                        {item.spots}
                      </Text>
                    </View>

                    <Pressable
                      hitSlop={8}
                      onPress={() => router.push('/(member)/bookings' as any)}
                    >
                      <Text style={styles.detailsText}>View Details</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Feather name="calendar" size={24} color="#94A3B8" />
          <Text style={styles.emptyText}>No classes booked for today</Text>
          <Pressable
            style={styles.bookNowButton}
            onPress={() => router.push('/(member)/bookings' as any)}
          >
            <Text style={styles.bookNowText}>Book a Class</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  headerTitle: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  viewAllText: {
    fontSize: TypographyScale.small,
    fontWeight: '600',
    color: BrandColors.memberGold,
  },
  list: {
    gap: Spacing.three,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: BrandColors.screenBackground,
    borderRadius: Radius.md,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: Spacing.three,
  },
  timeBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    minWidth: 70,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.trainerAmber,
    marginTop: 2,
    textAlign: 'center',
  },
  infoContainer: {
    flex: 1,
  },
  className: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  trainerName: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  spotBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  spotBadgeAvailable: {
    backgroundColor: '#DCFCE7',
  },
  spotBadgeFull: {
    backgroundColor: '#FEE2E2',
  },
  spotBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  spotBadgeTextAvailable: {
    color: '#15803D',
  },
  spotBadgeTextFull: {
    color: '#B91C1C',
  },
  detailsText: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.memberGold,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
    gap: Spacing.two,
  },
  emptyText: {
    fontSize: TypographyScale.body,
    color: BrandColors.textSecondary,
  },
  bookNowButton: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    backgroundColor: BrandColors.memberGold,
    borderRadius: Radius.full,
  },
  bookNowText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
