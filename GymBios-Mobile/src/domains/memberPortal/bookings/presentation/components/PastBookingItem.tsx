import { StyleSheet, Text, View } from 'react-native';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

export interface PastBookingData {
  id?: string | number;
  class: string;
  date: string;
  time: string;
  trainer: string;
  attended: boolean;
}

interface PastBookingItemProps {
  booking: PastBookingData;
}

export function PastBookingItem({ booking }: PastBookingItemProps) {
  const formattedDate = new Date(booking.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.className}>{booking.class}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{formattedDate}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.metaText}>{booking.time}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.metaText}>{booking.trainer}</Text>
        </View>
      </View>

      {booking.attended && (
        <View style={styles.attendedBadge}>
          <Text style={styles.attendedText}>✓ Attended</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  info: {
    flex: 1,
    paddingRight: Spacing.two,
  },
  className: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metaText: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
  },
  dot: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
  },
  attendedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  attendedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
});
