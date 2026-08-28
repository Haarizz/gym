import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

interface AddOnPerformanceData {
  name: string;
  revenue: number;
}

interface AddOnPerformanceCardProps {
  data: AddOnPerformanceData[];
}

export function AddOnPerformanceCard({ data }: AddOnPerformanceCardProps) {
  if (!data || data.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Add-on Performance</Text>
      
      {data.map((item, index) => (
        <View key={item.name} style={[styles.row, index < data.length - 1 && styles.borderBottom]}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.revenue}>₹{(item.revenue / 1000).toFixed(0)}K</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: Spacing.four,
  },
  title: {
    fontSize: TypographyScale.body,
    fontWeight: '600',
    color: '#111827',
    marginBottom: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  name: {
    fontSize: 13,
    color: '#4B5563',
  },
  revenue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});
