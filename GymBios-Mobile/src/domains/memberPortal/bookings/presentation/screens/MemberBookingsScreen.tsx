import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trans, useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import { formatDate, i18n, tOr } from '@/core/i18n';
import { toast } from '@/shared/components/Toasts/toastStore';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { CurrencyValue, useCurrency } from '@/core/providers';
import { GlassBlob, GlassSurface } from '@/shared/components';
import { BookingStatsHeader } from '../components/BookingStatsHeader';
import { BookingCard, type BookingItemData } from '../components/BookingCard';
import { PastBookingItem, type PastBookingData } from '../components/PastBookingItem';
import { RejectedBookingItem } from '../components/RejectedBookingItem';
import { BookClassModal } from '../components/BookClassModal';
import { CancelBookingSheet } from '../components/CancelBookingSheet';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet/AppBottomSheet';
import {
  useUpcomingBookings,
  usePastBookings,
  useRejectedBookings,
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
    class: b.className ?? i18n.t('bookings.unknownClass'),
    date: b.date,
    time: b.startTime ?? '',
    duration: i18n.t('bookings.minutes', { count: b.durationMinutes ?? 0 }),
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

export function MemberBookingsScreen() {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const { t } = useTranslation();
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

  // Separate from upcoming: payments staff rejected, with their reason, until the session starts.
  const { data: rejectedBookings, refetch: refetchRejected } = useRejectedBookings();

  const cancelMutation = useCancelBooking();

  const [isBookModalVisible, setIsBookModalVisible] = useState(false);
  // The dashboard's offer opens booking with its code (?promoCode=PT20) until the modal is closed
  const { promoCode } = useLocalSearchParams<{ promoCode?: string }>();
  const closeBookModal = () => {
    setIsBookModalVisible(false);
    if (promoCode) router.setParams({ promoCode: undefined });
  };
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<BookingItemData | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<BookingItemData | null>(null);

  const handleConfirmCancel = (booking: BookingItemData, refundMethod: RefundMethod) => {
    cancelMutation.mutate({ bookingId: Number(booking.id), refundMethod }, {
      onSuccess: (result) => {
        setBookingToCancel(null);
        if (result.refundStatus === 'REFUNDED' && result.refundedAmount) {
          toast.success(t('bookings.refundedToast', { amount: formatCurrency(result.refundedAmount) }), {
            title: t('bookings.cancelledToastTitle'),
          });
        } else if (result.refundStatus === 'NOT_REFUNDABLE') {
          toast.success(t('bookings.releasedNoRefundToast'), { title: t('bookings.cancelledToastTitle') });
        } else {
          toast.success(t('bookings.reservationCancelledToast'));
        }
      },
      // The API client already shows the server's reason.
      onError: () => setBookingToCancel(null),
    });
  };

  const onRefresh = () => {
    refetchUpcoming();
    refetchPast();
    refetchRejected();
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
    class: b.className ?? t('bookings.unknownClass'),
    date: b.date,
    time: b.startTime ?? '',
    trainer: b.trainerName ?? '',
    attended: isAttendedStatus(b.status),
    cancelled: (b.status || '').toUpperCase() === 'CANCELLED',
    refundNote: b.rejectionReason
      ? t('bookings.refundNote.rejected', { reason: b.rejectionReason })
      : b.refundStatus ? tOr(`bookings.refundNote.${b.refundStatus}`, '') || null : null,
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
        accessibilityLabel={t('bookings.bookSession')}
      >
        <Feather name="plus" size={20} color="#FFFFFF" />
        <Text style={styles.bookButtonText}>{t('bookings.bookSession')}</Text>
      </Pressable>

      {/* Rejected payments — kept out of Upcoming since these bookings were cancelled */}
      {rejectedBookings && rejectedBookings.length > 0 && (
        <GlassSurface radius={Radius.lg} style={[styles.sectionCard, styles.rejectedSection]}>
          <View style={styles.rejectedHeader}>
            <Feather name="alert-circle" size={18} color="#DC2626" />
            <Text style={[styles.sectionTitle, styles.rejectedTitle]}>{t('bookings.rejected.title')}</Text>
          </View>
          <Text style={styles.rejectedSubtitle}>{t('bookings.rejected.subtitle')}</Text>
          <View style={styles.list}>
            {rejectedBookings.map((booking) => (
              <RejectedBookingItem
                key={booking.id}
                booking={booking}
                onBookAgain={() => setIsBookModalVisible(true)}
              />
            ))}
          </View>
        </GlassSurface>
      )}

      {/* Upcoming Bookings Section */}
      <GlassSurface radius={Radius.lg} style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t('bookings.upcomingTitle')}</Text>
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
            <Text style={styles.emptyText}>{t('bookings.upcomingEmpty')}</Text>
          </View>
        )}
      </GlassSurface>

      {/* Past Bookings Section */}
      <GlassSurface radius={Radius.lg} style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t('bookings.pastTitle')}</Text>
        {mappedPast.length > 0 ? (
          <View style={styles.list}>
            {mappedPast.map((booking) => (
              <PastBookingItem key={booking.id} booking={booking} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('bookings.pastEmpty')}</Text>
          </View>
        )}
      </GlassSurface>

      {/* Booking Modal */}
      <BookClassModal
        visible={isBookModalVisible || !!promoCode}
        onClose={closeBookModal}
        promoCode={promoCode}
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
        title={details?.class || t('bookings.details.fallbackTitle')}
        subtitle={details?.trainer ? t('bookings.withTrainer', { name: details.trainer }) : ''}
        onClose={() => setSelectedBookingForDetails(null)}
      >
        {details && (
          <View style={styles.detailsBody}>
            <View>
              <Text style={styles.detailLabel}>{t('bookings.details.dateTime')}</Text>
              <Text style={styles.detailValue}>
                {t('bookings.details.dateAtTime', { date: formatDate(details.date, 'PP'), time: details.time })}
              </Text>
              <Text style={styles.detailMeta}>{t('bookings.details.duration', { duration: details.duration })}</Text>
            </View>

            <View>
              <Text style={styles.detailLabel}>{t('bookings.details.location')}</Text>
              <Text style={styles.detailValue}>{details.location}</Text>
            </View>

            <View>
              <Text style={styles.detailLabel}>{t('bookings.details.status')}</Text>
              <Text style={[styles.detailValue, styles.capitalize]}>
                {tOr(`bookings.status.${details.status}`, details.status)}
              </Text>
            </View>

            {(details.price > 0 || details.paidWithPass) && (
              <View>
                <Text style={styles.detailLabel}>{t('bookings.details.payment')}</Text>
                {details.paidWithPass && details.price === 0 ? (
                  <Text style={styles.detailValue}>{t('bookings.details.paidWithPass')}</Text>
                ) : (
                  <Text style={styles.detailValue}>
                    <CurrencyValue amount={details.price} />
                    {' · '}
                    {details.status === 'pending_approval'
                      ? t('bookings.details.awaitingApprovalSuffix')
                      : details.partlyPaid
                        ? t('bookings.details.partPaidSuffix')
                        : t('bookings.details.paidSuffix')}
                  </Text>
                )}
                {details.discountLabel && !details.paidWithPass ? (
                  <Text style={styles.detailMeta}>{t('bookings.details.discount', { label: details.discountLabel })}</Text>
                ) : null}
                {details.walletAmount ? (
                  <Text style={styles.detailMeta}>
                    <Trans
                      i18nKey="bookings.details.fromWallet"
                      components={{ amount: <CurrencyValue amount={details.walletAmount} /> }}
                    />
                  </Text>
                ) : null}
              </View>
            )}

            {(details.price > 0 || details.paidWithPass) && detailsDeadline && details.status !== 'pending_approval' && (
              <View>
                <Text style={styles.detailLabel}>{t('bookings.details.cancellation')}</Text>
                <Text style={styles.detailValue}>
                  {details.refundableIfCancelledNow
                    ? t('bookings.details.fullRefundBefore', { deadline: detailsDeadline })
                    : t('bookings.details.noRefundSoon')}
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
  rejectedSection: {
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rejectedTitle: {
    marginBottom: 0,
    color: '#B91C1C',
  },
  rejectedSubtitle: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginTop: 2,
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
