import { StyleSheet, Text, View } from 'react-native';
import { Radius, Spacing } from '@/core/theme';
import { GlassSurface } from '@/shared/components';
import type { AdminPaymentMixItem } from '../../domain/AdminDashboardData';

interface AdminPaymentMixCardProps {
  paymentMix: AdminPaymentMixItem[];
}

export function AdminPaymentMixCard({ paymentMix }: AdminPaymentMixCardProps) {
  return (
    <GlassSurface radius={16} style={styles.container}>
      <Text style={styles.title}>Payment Mix</Text>
      <View style={styles.list}>
        {paymentMix.map((payment, idx) => (
          <View key={idx} style={styles.item}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemMode}>{payment.mode}</Text>
              <Text style={styles.itemAmount}>{payment.amount}</Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${payment.percentage}%`,
                    backgroundColor: payment.color,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: Spacing.three,
  },
  list: {
    gap: Spacing.three,
  },
  item: {},
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  itemMode: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  barTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
});
