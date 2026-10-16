import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/components/AppText';
import Feather from '@expo/vector-icons/Feather';
import { Radius, Spacing } from '@/core/theme';
import type { PerformanceTargets } from '../../domain/StaffPerformanceData';

interface StaffKeyMetricsGridProps {
  targets: PerformanceTargets;
}

export function StaffKeyMetricsGrid({ targets }: StaffKeyMetricsGridProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {/* Rating */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Feather name="star" size={14} color="#EAB308" />
          <Text style={styles.label}>{t('staffPerformance.rating')}</Text>
        </View>
        <Text style={styles.value}>{targets.rating}</Text>
      </View>

      {/* Growth */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Feather name="trending-up" size={14} color="#16A34A" />
          <Text style={styles.label}>{t('staffPerformance.growth')}</Text>
        </View>
        <Text style={[styles.value, { color: '#16A34A' }]}>{targets.growth}</Text>
      </View>

      {/* Leads */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Feather name="users" size={14} color="#9333EA" />
          <Text style={styles.label}>{t('staffPerformance.leads')}</Text>
        </View>
        <Text style={styles.value}>{targets.leads}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
});
