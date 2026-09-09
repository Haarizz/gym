import { StyleSheet, Text, View } from 'react-native';
import { Radius, Spacing } from '@/core/theme';
import { GlassSurface } from '@/shared/components';
import type { AdminOperationalHighlight } from '../../domain/AdminDashboardData';

interface AdminOperationalHighlightsCardProps {
  highlights: AdminOperationalHighlight[];
}

export function AdminOperationalHighlightsCard({
  highlights,
}: AdminOperationalHighlightsCardProps) {
  return (
    <GlassSurface radius={Radius.lg} style={styles.container}>
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
