import { View, StyleSheet } from 'react-native';
import { Typography } from '@/shared/components/Typography';
import { Radius, Spacing, BrandColors } from '@/core/theme';
import { MemberStatusBadge } from '../members/MemberStatusBadge';

interface PaymentSummaryCardProps {
  price: number;
  validityText: string;
  isPaid: boolean;
}

export function PaymentSummaryCard({ price, validityText, isPaid }: PaymentSummaryCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View>
          <Typography variant="caption" color="textSecondary">Total Charge</Typography>
          <Typography variant="h3" style={styles.price}>Ð {price}</Typography>
          <Typography variant="caption" color="textSecondary">{validityText}</Typography>
        </View>
        <View style={styles.statusContainer}>
          <MemberStatusBadge isActive={isPaid} statusText={isPaid ? "Paid" : "Pending"} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E6F4EA', // Light green background from UI
    borderRadius: Radius.md,
    padding: Spacing.four,
    marginTop: Spacing.three,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    marginVertical: Spacing.half,
  },
  statusContainer: {
    justifyContent: 'center',
  }
});
