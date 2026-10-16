import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Typography } from '@/shared/components/Typography';
import { CurrencyValue } from '@/core/providers';
import { Radius, Spacing, BrandColors } from '@/core/theme';
import { MemberStatusBadge } from '../members/MemberStatusBadge';

interface PaymentSummaryCardProps {
  price: number;
  validityText: string;
  isPaid: boolean;
}

export function PaymentSummaryCard({ price, validityText, isPaid }: PaymentSummaryCardProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View>
          <Typography variant="caption" color="textSecondary">
            {t('checkIn.walkIn.totalCharge')}
          </Typography>
          <Typography variant="subtitle" style={styles.price}>
            <CurrencyValue amount={price} />
          </Typography>
          <Typography variant="caption" color="textSecondary">{validityText}</Typography>
        </View>
        <View style={styles.statusContainer}>
          <MemberStatusBadge
            isActive={isPaid}
            statusText={isPaid ? t('checkIn.status.paid') : t('checkIn.status.pending')}
          />
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
