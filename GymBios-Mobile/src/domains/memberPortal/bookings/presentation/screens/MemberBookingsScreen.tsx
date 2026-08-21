import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { BookingStatsHeader } from '../components/BookingStatsHeader';
import { BookingCard, type BookingItemData } from '../components/BookingCard';
import { PastBookingItem, type PastBookingData } from '../components/PastBookingItem';
import { BookClassModal } from '../components/BookClassModal';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet/AppBottomSheet';
import { 
  useUpcomingBookings, 
  usePastBookings, 
  useBookingStats, 
  useCancelBooking 
} from '../../hooks/useMemberBookings';

export function MemberBookingsScreen() {
  const { 
    data: upcomingBookings, 
    isLoading: isLoadingUpcoming, 
    refetch: refetchUpcoming, 
    isRefetching: isRefetchingUpcoming 
  } = useUpcomingBookings();
  
  const { 
    data: pastBookings, 
    isLoading: isLoadingPast, 
    refetch: refetchPast, 
    isRefetching: isRefetchingPast 
  } = usePastBookings();
  
  const { 
    data: stats, 
    isLoading: isLoadingStats, 
    refetch: refetchStats, 
    isRefetching: isRefetchingStats 
  } = useBookingStats();

  const cancelMutation = useCancelBooking();

  const [isBookModalVisible, setIsBookModalVisible] = useState(false);
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<BookingItemData | null>(null);

  const handleCancelBooking = (id: string | number) => {
    cancelMutation.mutate(Number(id), {
      onSuccess: () => Alert.alert('Success', 'Your reservation has been cancelled.'),
      onError: () => Alert.alert('Error', 'Failed to cancel the booking.'),
    });
  };

  const handleViewDetails = (booking: BookingItemData) => {
    setSelectedBookingForDetails(booking);
  };



  const onRefresh = () => {
    refetchUpcoming();
    refetchPast();
    refetchStats();
  };

  const isLoading = isLoadingUpcoming || isLoadingPast || isLoadingStats;
  const isRefetching = isRefetchingUpcoming || isRefetchingPast || isRefetchingStats;

  if (isLoading && !isRefetching) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={BrandColors.memberGold} />
      </View>
    );
  }

  const allUpcomingRaw = upcomingBookings || [];
  const allPastRaw = pastBookings || [];

  const actualUpcomingRaw = allUpcomingRaw.filter(b => {
    const status = ((b as any).status || '').toUpperCase();
    return status !== 'CHECKED-IN' && status !== 'ATTENDED';
  });

  const checkedInFromUpcoming = allUpcomingRaw.filter(b => {
    const status = ((b as any).status || '').toUpperCase();
    return status === 'CHECKED-IN' || status === 'ATTENDED';
  });

  const actualPastRaw = [...allPastRaw, ...checkedInFromUpcoming];

  const mappedUpcoming: BookingItemData[] = actualUpcomingRaw.map(b => {
    const bData: any = b;
    return {
      id: String(bData.id),
      class: bData.class_name ?? bData.className ?? 'Unknown Class',
      date: bData.date,
      time: bData.start_time ?? bData.startTime ?? '',
      duration: `${bData.duration_minutes ?? bData.durationMinutes ?? 0} min`,
      trainer: bData.trainer_name ?? bData.trainerName ?? '',
      location: bData.location ?? '',
      spotsLeft: bData.available_spots ?? bData.availableSpots ?? 0,
      status: (bData.status || '').toLowerCase() as any,
    };
  });

  const mappedPast: PastBookingData[] = actualPastRaw.map(b => {
    const bData: any = b;
    const status = (bData.status || '').toUpperCase();
    return {
      id: String(bData.id),
      class: bData.class_name ?? bData.className ?? 'Unknown Class',
      date: bData.date,
      time: bData.start_time ?? bData.startTime ?? '',
      trainer: bData.trainer_name ?? bData.trainerName ?? '',
      attended: status === 'ATTENDED' || status === 'CHECKED-IN',
    };
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          tintColor={BrandColors.memberGold}
          colors={[BrandColors.memberGold]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header Stats */}
      <BookingStatsHeader
        upcomingCount={stats?.upcoming || 0}
        thisWeekCount={stats?.thisWeek || 0}
        attendedCount={stats?.attended || 0}
      />

      {/* Book New Class Button */}
      <Pressable
        style={({ pressed }) => [styles.bookButton, pressed && styles.bookButtonPressed]}
        onPress={() => setIsBookModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Book a New Class"
      >
        <Feather name="plus" size={20} color="#FFFFFF" />
        <Text style={styles.bookButtonText}>Book a New Class</Text>
      </Pressable>

      {/* Upcoming Bookings Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Upcoming Classes</Text>
        {mappedUpcoming.length > 0 ? (
          <View style={styles.list}>
            {mappedUpcoming.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancel={handleCancelBooking}
                onViewDetails={handleViewDetails}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Feather name="calendar" size={24} color="#94A3B8" />
            <Text style={styles.emptyText}>No upcoming classes booked</Text>
          </View>
        )}
      </View>

      {/* Past Bookings Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Past Classes</Text>
        {mappedPast.length > 0 ? (
          <View style={styles.list}>
            {mappedPast.map((booking) => (
              <PastBookingItem key={booking.id} booking={booking} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No past classes</Text>
          </View>
        )}
      </View>

      {/* Booking Modal */}
      <BookClassModal
        visible={isBookModalVisible}
        onClose={() => setIsBookModalVisible(false)}
      />

      <AppBottomSheet
        visible={!!selectedBookingForDetails}
        title={selectedBookingForDetails?.class || 'Class Details'}
        subtitle={selectedBookingForDetails?.trainer ? `with ${selectedBookingForDetails.trainer}` : ''}
        onClose={() => setSelectedBookingForDetails(null)}
      >
        {selectedBookingForDetails && (
          <View style={{ gap: Spacing.four, paddingBottom: Spacing.four }}>
            <View>
              <Text style={{ fontSize: 13, color: BrandColors.textSecondary, marginBottom: 2 }}>Date & Time</Text>
              <Text style={{ fontSize: 15, color: BrandColors.textPrimary, fontWeight: '600' }}>
                {selectedBookingForDetails.date} at {selectedBookingForDetails.time}
              </Text>
              <Text style={{ fontSize: 13, color: BrandColors.textSecondary, marginTop: 2 }}>
                Duration: {selectedBookingForDetails.duration}
              </Text>
            </View>

            <View>
              <Text style={{ fontSize: 13, color: BrandColors.textSecondary, marginBottom: 2 }}>Location</Text>
              <Text style={{ fontSize: 15, color: BrandColors.textPrimary, fontWeight: '600' }}>
                {selectedBookingForDetails.location}
              </Text>
            </View>

            <View>
              <Text style={{ fontSize: 13, color: BrandColors.textSecondary, marginBottom: 2 }}>Status</Text>
              <Text style={{ fontSize: 15, color: BrandColors.textPrimary, fontWeight: '600', textTransform: 'capitalize' }}>
                {selectedBookingForDetails.status}
              </Text>
            </View>
          </View>
        )}
      </AppBottomSheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: Spacing.four,
    paddingBottom: Spacing.six + 50,
    gap: Spacing.four,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: BrandColors.memberGold,
    paddingVertical: Spacing.four,
    borderRadius: Radius.lg,
    shadowColor: '#F59E0B',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  bookButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  bookButtonText: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionCard: {
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
  sectionTitle: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.three,
  },
  list: {
    gap: Spacing.three,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.two,
  },
  emptyText: {
    fontSize: TypographyScale.body,
    color: BrandColors.textSecondary,
  },
});
