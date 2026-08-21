import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { ConfirmationModal } from '@/shared/components/ConfirmationModal/ConfirmationModal';

export interface BookingItemData {
  id: string | number;
  class: string;
  date: string;
  time: string;
  duration?: string;
  trainer: string;
  location: string;
  spotsLeft: number;
  status: string;
}

interface BookingCardProps {
  booking: BookingItemData;
  onCancel: (id: string | number) => void;
  onViewDetails: (booking: BookingItemData) => void;
}

export function BookingCard({ booking, onCancel, onViewDetails }: BookingCardProps) {
  const [isCancelConfirmVisible, setIsCancelConfirmVisible] = useState(false);

  const formattedDate = new Date(booking.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const handleCancelPress = () => {
    setIsCancelConfirmVisible(true);
  };

  const confirmCancel = () => {
    setIsCancelConfirmVisible(false);
    onCancel(booking.id);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleInfo}>
          <Text style={styles.className}>{booking.class}</Text>
          <Text style={styles.trainerName}>with {booking.trainer}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{booking.status.toUpperCase()}</Text>
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
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={({ pressed }) => [styles.detailsButton, pressed && styles.pressed]}
          onPress={() => onViewDetails(booking)}
        >
          <Text style={styles.detailsButtonText}>View Details</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
          onPress={handleCancelPress}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </View>

      <ConfirmationModal
        visible={isCancelConfirmVisible}
        title="Cancel Booking"
        message={`Are you sure you want to cancel your booking for ${booking.class}?`}
        confirmText="Yes, Cancel"
        cancelText="Keep Booking"
        variant="danger"
        icon="x-circle"
        onConfirm={confirmCancel}
        onClose={() => setIsCancelConfirmVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
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
