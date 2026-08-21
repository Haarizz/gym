import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Radius, Spacing } from '@/core/theme';
import type { ActiveClientsDTO } from '../../domain/TrainerPerformanceData';

interface TrainerKeyMetricsGridProps {
  activeClients: ActiveClientsDTO;
}

export function TrainerKeyMetricsGrid({ activeClients }: TrainerKeyMetricsGridProps) {
  return (
    <View style={styles.container}>
      {/* Active Clients */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}>
            <Feather name="users" size={16} color="#9333EA" />
          </View>
          <Text style={styles.label}>Active Clients</Text>
        </View>
        <Text style={styles.value}>{activeClients.count}</Text>
        <Text style={[styles.subtext, { color: activeClients.monthlyChange >= 0 ? '#16A34A' : '#DC2626' }]}>
          {activeClients.monthlyChange >= 0 ? '+' : ''}{activeClients.monthlyChange} this month
        </Text>
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
    gap: 8,
    marginBottom: 6,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
});
