import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import { formatDate } from '@/core/i18n';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { CurrencyValue } from '@/core/providers';
import type { MemberBookingData } from '../../domain/MemberBookingData';

interface RejectedBookingItemProps {
  booking: MemberBookingData;
  onBookAgain: () => void;
}

/** A booking cancelled because staff rejected its Cash/Credit/Mixed payment. */
export function RejectedBookingItem({ booking, onBookAgain }: RejectedBookingItemProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.info}>
          <Text style={styles.className}>{booking.className ?? t('bookings.unknownClass')}</Text>
          <Text style={styles.metaText}>
            {formatDate(booking.date, 'MMM d')} • {booking.startTime}
            {booking.trainerName ? ` • ${booking.trainerName}` : ''}
          </Text>
        </View>
        {booking.price ? (
          <Text style={styles.amount}>
            <CurrencyValue amount={booking.price} />
          </Text>
        ) : null}
      </View>

      <View style={styles.reasonBox}>
        <Text style={styles.reasonLabel}>{t('bookings.rejected.reasonLabel')}</Text>
        <Text style={styles.reasonText}>{booking.rejectionReason}</Text>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.hint}>{t('bookings.rejected.notCharged')}</Text>
        <Pressable
          style={({ pressed }) => [styles.bookAgainButton, pressed && styles.pressed]}
          onPress={onBookAgain}
          accessibilityRole="button"
        >
          <Text style={styles.bookAgainText}>{t('bookings.rejected.bookAgain')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  info: {
    flex: 1,
  },
  className: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  metaText: {
    fontSize: 12,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.textSecondary,
  },
  reasonBox: {
    padding: Spacing.two,
    borderRadius: Radius.sm,
    backgroundColor: '#FFFFFF',
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  reasonText: {
    fontSize: 13,
    color: BrandColors.textPrimary,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  hint: {
    flex: 1,
    fontSize: 12,
    color: BrandColors.textSecondary,
  },
  bookAgainButton: {
    backgroundColor: BrandColors.memberGold,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
  },
  bookAgainText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
});
