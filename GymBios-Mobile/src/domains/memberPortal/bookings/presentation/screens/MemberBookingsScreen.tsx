import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { toast } from '@/shared/components/Toasts/toastStore';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { CurrencyValue, useCurrency } from '@/core/providers';
import { GlassBlob, GlassSurface } from '@/shared/components';
import { BookingStatsHeader } from '../components/BookingStatsHeader';
import { BookingCard, type BookingItemData } from '../components/BookingCard';
import { PastBookingItem, type PastBookingData } from '../components/PastBookingItem';
import { BookClassModal } from '../components/BookClassModal';
import { CancelBookingSheet } from '../components/CancelBookingSheet';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet/AppBottomSheet';
import {
  useUpcomingBookings,
  usePastBookings,
  useBookingStats,
  useCancelBooking
} from '../../hooks/useMemberBookings';
import type { MemberBookingData, RefundMethod } from '../../domain/MemberBookingData';
import { formatRefundDeadline } from '../../domain/refundPolicy';

const isAttendedStatus = (status: string) => {
  const s = (status || '').toUpperCase();
  return s === 'CHECKED-IN' || s === 'ATTENDED';
};

function toBookingItem(b: MemberBookingData): BookingItemData {
  const price = b.price ?? 0;
  return {
    id: String(b.id),
    class: b.className ?? 'Unknown Class',
    date: b.date,
    time: b.startTime ?? '',
    duration: `${b.durationMinutes ?? 0} min`,
    trainer: b.trainerName ?? '',
    location: b.location ?? '',
    spotsLeft: b.availableSpots,
    status: (b.status || '').toLowerCase(),
    price,
    paidAmount: b.paymentStatus === 'paid' ? price : 0,
    partlyPaid: b.paymentStatus === 'partial',
    paymentStatus: b.paymentStatus,
    discountLabel: b.discountLabel,
    walletAmount: b.walletAmount,
    paidWithPass: !!b.discountLabel?.startsWith('Reward Pass'),
    refundDeadline: b.refundDeadline,
    refundableIfCancelledNow: b.refundableIfCancelledNow,
  };
}

const REFUND_NOTES: Record<string, string> = {
  REFUNDED: 'Refunded to wallet',
  NOT_REFUNDABLE: 'Not refunded',
  VOIDED: 'Nothing charged',
};

export function MemberBookingsScreen() {
  const { formatCurrency } = useCurrency();
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
  const [bookingToCancel, setBookingToCancel] = useState<BookingItemData | null>(null);

  const handleConfirmCancel = (booking: BookingItemData, refundMethod: RefundMethod) => {
    cancelMutation.mutate({ bookingId: Number(booking.id), refundMethod }, {
      onSuccess: (result) => {
        setBookingToCancel(null);
        if (result.refundStatus === 'REFUNDED' && result.refundedAmount) {
          toast.success(`${formatCurrency(result.refundedAmount)} has been refunded to your wallet.`, {
            title: 'Booking Cancelled',
          });
        } else if (result.refundStatus === 'NOT_REFUNDABLE') {
          toast.success('Your spot has been released. No refund was given.', { title: 'Booking Cancelled' });
        } else {
          toast.success('Your reservation has been cancelled.');
        }
      },
      // The API client already shows the server's reason.
      onError: () => setBookingToCancel(null),
    });
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
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={BrandColors.memberGold} />
      </View>
    );
  }

  const allUpcomingRaw = upcomingBookings || [];
  const allPastRaw = pastBookings || [];

  const actualUpcomingRaw = allUpcomingRaw.filter((b) => !isAttendedStatus(b.status));
  const checkedInFromUpcoming = allUpcomingRaw.filter((b) => isAttendedStatus(b.status));
  const actualPastRaw = [...allPastRaw, ...checkedInFromUpcoming];

  const mappedUpcoming: BookingItemData[] = actualUpcomingRaw.map(toBookingItem);

  const mappedPast: PastBookingData[] = actualPastRaw.map((b) => ({
    id: String(b.id),
    class: b.className ?? 'Unknown Class',
    date: b.date,
    time: b.startTime ?? '',
    trainer: b.trainerName ?? '',
    attended: isAttendedStatus(b.status),
    cancelled: (b.status || '').toUpperCase() === 'CANCELLED',
    refundNote: b.refundStatus ? REFUND_NOTES[b.refundStatus] : null,
  }));

  const details = selectedBookingForDetails;
  const detailsDeadline = formatRefundDeadline(details?.refundDeadline);

  return (
    <View style={styles.root}>
      <GlassBlob color={BrandColors.memberGold} size={340} opacity={0.42} top={-90} right={-60} />
      <GlassBlob color={BrandColors.teal} size={300} opacity={0.3} top={340} left={-70} />
      <GlassBlob color={BrandColors.memberGold} size={260} opacity={0.24} top={760} right={-80} />
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
        accessibilityLabel="Book a Session"
      >
        <Feather name="plus" size={20} color="#FFFFFF" />
        <Text style={styles.bookButtonText}>Book a Session</Text>
      </Pressable>

      {/* Upcoming Bookings Section */}
      <GlassSurface radius={Radius.lg} style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Upcoming Classes</Text>
        {mappedUpcoming.length > 0 ? (
          <View style={styles.list}>
            {mappedUpcoming.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancel={setBookingToCancel}
                onViewDetails={setSelectedBookingForDetails}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Feather name="calendar" size={24} color="#94A3B8" />
            <Text style={styles.emptyText}>No upcoming classes booked</Text>
          </View>
        )}
      </GlassSurface>

      {/* Past Bookings Section */}
      <GlassSurface radius={Radius.lg} style={styles.sectionCard}>
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
      </GlassSurface>

      {/* Booking Modal */}
      <BookClassModal
        visible={isBookModalVisible}
        onClose={() => setIsBookModalVisible(false)}
      />

      <CancelBookingSheet
        key={bookingToCancel?.id ?? 'none'}
        booking={bookingToCancel}
        loading={cancelMutation.isPending}
        onClose={() => setBookingToCancel(null)}
        onConfirm={handleConfirmCancel}
      />

      <AppBottomSheet
        visible={!!details}
        title={details?.class || 'Class Details'}
        subtitle={details?.trainer ? `with ${details.trainer}` : ''}
        onClose={() => setSelectedBookingForDetails(null)}
      >
        {details && (
          <View style={styles.detailsBody}>
            <View>
              <Text style={styles.detailLabel}>Date & Time</Text>
              <Text style={styles.detailValue}>
                {details.date} at {details.time}
              </Text>
              <Text style={styles.detailMeta}>Duration: {details.duration}</Text>
            </View>

            <View>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{details.location}</Text>
            </View>

            <View>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={[styles.detailValue, styles.capitalize]}>
                {details.status === 'pending_approval' ? 'Awaiting payment approval' : details.status}
              </Text>
            </View>

            {(details.price > 0 || details.paidWithPass) && (
              <View>
                <Text style={styles.detailLabel}>Payment</Text>
                {details.paidWithPass && details.price === 0 ? (
                  <Text style={styles.detailValue}>Paid with Reward Pass</Text>
                ) : (
                  <Text style={styles.detailValue}>
                    <CurrencyValue amount={details.price} />
                    {details.status === 'pending_approval'
                      ? ' · awaiting approval'
                      : details.partlyPaid ? ' · part-paid' : ' · paid'}
                  </Text>
                )}
                {details.discountLabel && !details.paidWithPass ? (
                  <Text style={styles.detailMeta}>Discount: {details.discountLabel}</Text>
                ) : null}
                {details.walletAmount ? (
                  <Text style={styles.detailMeta}>
                    <CurrencyValue amount={details.walletAmount} /> from wallet
                  </Text>
                ) : null}
              </View>
            )}

            {(details.price > 0 || details.paidWithPass) && detailsDeadline && details.status !== 'pending_approval' && (
              <View>
                <Text style={styles.detailLabel}>Cancellation</Text>
                <Text style={styles.detailValue}>
                  {details.refundableIfCancelledNow
                    ? `Full refund if cancelled before ${detailsDeadline}`
                    : 'No refund — the session starts in less than 2 hours'}
                </Text>
              </View>
            )}
          </View>
        )}
      </AppBottomSheet>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  container: {
    flex: 1,
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
    padding: Spacing.four,
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
  detailsBody: {
    gap: Spacing.four,
    paddingBottom: Spacing.four,
  },
  detailLabel: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    color: BrandColors.textPrimary,
    fontWeight: '600',
  },
  detailMeta: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  capitalize: {
    textTransform: 'capitalize',
  },
});
