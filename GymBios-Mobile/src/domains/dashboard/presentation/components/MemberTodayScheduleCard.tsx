import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Glass, Radius, Spacing, TypographyScale } from '@/core/theme';
import { GlassSurface } from '@/shared/components';
import type { MemberTodayScheduleItem } from '../../domain/MemberDashboardData';

interface MemberTodayScheduleCardProps {
  schedule: MemberTodayScheduleItem[];
}

export function MemberTodayScheduleCard({ schedule }: MemberTodayScheduleCardProps) {
  const router = useRouter();

  return (
    <GlassSurface radius={18} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today's Schedule</Text>
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
                {/* Time badge — amber glass */}
                <View style={styles.timeBadge}>
                  <Feather name="clock" size={11} color="#C9821E" />
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
          {/* Glass icon box matching reference .empty-icon */}
          <View style={styles.emptyIconBox}>
            <Feather name="calendar" size={20} color={BrandColors.textSecondary} />
          </View>
          <Text style={styles.emptyText}>No classes booked for today</Text>
          <Pressable
            style={styles.bookNowButton}
            onPress={() => router.push('/(member)/bookings' as any)}
          >
            <Text style={styles.bookNowText}>Book a Class</Text>
          </Pressable>
        </View>
      )}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  headerTitle: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    letterSpacing: -0.2,
  },
  viewAllText: {
    fontSize: TypographyScale.small,
    fontWeight: '700',
    color: '#C9821E',
  },
  list: {
    gap: Spacing.two + 2,
  },
  // Item rows — white glass surface instead of plain #f9fafe
  itemCard: {
    flexDirection: 'row',
    backgroundColor: Glass.fill,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Glass.border,
    gap: Spacing.three,
    overflow: 'hidden',
  },
  // Amber glass time badge
  timeBadge: {
    backgroundColor: 'rgba(242,187,61,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(242,187,61,0.4)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    minWidth: 68,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C9821E',
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
    letterSpacing: -0.1,
  },
  trainerName: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
    fontWeight: '500',
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
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  spotBadgeAvailable: {
    backgroundColor: 'rgba(21,128,61,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(21,128,61,0.28)',
  },
  spotBadgeFull: {
    backgroundColor: 'rgba(185,28,28,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(185,28,28,0.25)',
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
    fontWeight: '700',
    color: '#C9821E',
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
    gap: Spacing.two,
  },
  // Glass icon box — matching reference .empty-icon
  emptyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Glass.fill,
    borderWidth: 1,
    borderColor: Glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  emptyText: {
    fontSize: TypographyScale.body,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  bookNowButton: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    backgroundColor: BrandColors.memberGold,
    borderRadius: Radius.full,
  },
  bookNowText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4a3200',
  },
});
