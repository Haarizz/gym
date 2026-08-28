import { StyleSheet, Text, View } from 'react-native';
import { Radius, Spacing } from '@/core/theme';
import type { AdminOperationalHighlight } from '../../domain/AdminDashboardData';

interface AdminOperationalHighlightsCardProps {
  highlights: AdminOperationalHighlight[];
}

export function AdminOperationalHighlightsCard({
  highlights,
}: AdminOperationalHighlightsCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Operational Highlights</Text>
      <View style={styles.list}>
        {highlights.map((item, idx) => (
          <View
            key={idx}
            style={[
              styles.row,
              idx === highlights.length - 1 && styles.lastRow,
            ]}
          >
            <Text style={styles.label}>{item.label}</Text>
            <Text
              style={[
                styles.value,
                item.color ? { color: item.color } : undefined,
              ]}
            >
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: Spacing.two,
  },
  list: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  lastRow: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  label: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
});
