import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { CurrencyValue } from '@/core/providers';
import { GlassSurface } from '@/shared/components';
import { formatRefundDeadline } from '../../domain/refundPolicy';

export interface BookingItemData {
  id: string | number;
  class: string;
  date: string;
  time: string;
  duration?: string;
  trainer: string;
  location: string;
  /** null = unlimited seats. */
  spotsLeft: number | null;
  /** Lower-case backend status: confirmed | pending_approval | ... */
  status: string;
  /** What was charged (after discounts); 0 for free sessions. */
  price: number;
  /** Amount paid — refunded in full if cancelled in time. 0 while awaiting approval. */
  paidAmount: number;
  /** A Credit/part payment: only part of the price has been paid. */
  partlyPaid: boolean;
  paymentStatus: string | null;
  discountLabel: string | null;
  walletAmount: number | null;
  paidWithPass: boolean;
  refundDeadline: string | null;
  refundableIfCancelledNow: boolean;
}

interface BookingCardProps {
  booking: BookingItemData;
  onCancel: (booking: BookingItemData) => void;
  onViewDetails: (booking: BookingItemData) => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending_approval: 'AWAITING APPROVAL',
};

export function BookingCard({ booking, onCancel, onViewDetails }: BookingCardProps) {
  const formattedDate = new Date(booking.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const awaitingApproval = booking.status === 'pending_approval';
  const deadline = formatRefundDeadline(booking.refundDeadline);
  const isPaid = booking.price > 0 || booking.paidWithPass;

  return (
    <GlassSurface radius={Radius.lg} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleInfo}>
          <Text style={styles.className}>{booking.class}</Text>
          <Text style={styles.trainerName}>with {booking.trainer}</Text>
        </View>
        <View style={[styles.statusBadge, awaitingApproval && styles.statusBadgePending]}>
          <Text style={[styles.statusText, awaitingApproval && styles.statusTextPending]}>
            {STATUS_LABELS[booking.status] ?? booking.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
            <Feather name="calendar" size={14} color={BrandColors.trainerAmber} />
          </View>
          <View>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>{formattedDate}</Text>
          </View>
        </View>

        <View style={styles.metaItem}>
          <View style={[styles.iconCircle, { backgroundColor: '#CCFBF1' }]}>
            <Feather name="clock" size={14} color={BrandColors.teal} />
          </View>
          <View>
            <Text style={styles.metaLabel}>Time</Text>
            <Text style={styles.metaValue}>{booking.time}</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.locationGroup}>
          <Feather name="map-pin" size={13} color={BrandColors.textSecondary} />
          <Text style={styles.locationText}>{booking.location}</Text>
        </View>
        {booking.spotsLeft != null && (
          <View style={styles.spotsGroup}>
            <Feather name="users" size={13} color={BrandColors.textSecondary} />
            <Text
              style={[
                styles.spotsText,
                booking.spotsLeft === 0 && styles.spotsTextFull,
              ]}
            >
              {booking.spotsLeft > 0 ? `${booking.spotsLeft} spots left` : 'Full'}
            </Text>
          </View>
        )}
      </View>

      {isPaid && (
        <View style={styles.paymentRow}>
          <Text style={styles.paymentText}>
            {booking.paidWithPass && booking.price === 0 ? (
              'Paid with Reward Pass'
            ) : awaitingApproval ? (
              <>Payment of <CurrencyValue amount={booking.price} /> awaiting gym approval</>
            ) : booking.partlyPaid ? (
              <>Part-paid · <CurrencyValue amount={booking.price} /> total</>
            ) : (
              <>Paid <CurrencyValue amount={booking.price} /></>
            )}
          </Text>
          {!awaitingApproval && deadline && (
            <Text style={[styles.refundText, !booking.refundableIfCancelledNow && styles.refundTextClosed]}>
              {booking.refundableIfCancelledNow ? `Refundable until ${deadline}` : 'No longer refundable'}
            </Text>
          )}
        </View>
      )}

      <View style={styles.actionRow}>
        <Pressable
          style={({ pressed }) => [styles.detailsButton, pressed && styles.pressed]}
          onPress={() => onViewDetails(booking)}
        >
          <Text style={styles.detailsButtonText}>View Details</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
          onPress={() => onCancel(booking)}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleInfo: {
    flex: 1,
    paddingRight: Spacing.two,
  },
  className: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  trainerName: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
    letterSpacing: 0.4,
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  statusTextPending: {
    color: '#B45309',
  },
  paymentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  paymentText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  refundText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.teal,
  },
  refundTextClosed: {
    color: BrandColors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaLabel: {
    fontSize: 10,
    color: BrandColors.textSecondary,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  locationGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
  },
  spotsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spotsText: {
    fontSize: TypographyScale.small,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  spotsTextFull: {
    color: '#DC2626',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  detailsButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  detailsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
