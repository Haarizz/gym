import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

interface TrainerProductivityData {
  averageSessionsPerTrainer: number;
  memberSatisfaction: number;
  ptPackageSales: number;
}

interface TrainerProductivityCardProps {
  data: TrainerProductivityData;
}

export function TrainerProductivityCard({ data }: TrainerProductivityCardProps) {
  if (!data) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Trainer Productivity</Text>
      
      <View style={styles.list}>
        <View style={[styles.row, styles.borderBottom]}>
          <Text style={styles.label}>Avg. Sessions per Trainer</Text>
          <Text style={styles.value}>{data.averageSessionsPerTrainer}</Text>
        </View>
        
        <View style={[styles.row, styles.borderBottom]}>
          <Text style={styles.label}>Member Satisfaction</Text>
          <Text style={[styles.value, { color: '#16A34A' }]}>{data.memberSatisfaction}/5.0</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>PT Package Sales</Text>
          <Text style={styles.value}>₹{(data.ptPackageSales / 1000).toFixed(1)}k</Text>
        </View>
      </View>
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
    marginBottom: Spacing.three,
  },
  list: {
    gap: 0,
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
  label: {
    fontSize: 13,
    color: '#4B5563',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});
