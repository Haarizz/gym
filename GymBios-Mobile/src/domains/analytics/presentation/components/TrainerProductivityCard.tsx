import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { CurrencyValue } from '@/core/providers';

interface TrainerProductivityData {
  averageSessionsPerTrainer: number;
  memberSatisfaction: number;
  ptPackageSales: number;
}

interface TrainerProductivityCardProps {
  data?: TrainerProductivityData;
}

export function TrainerProductivityCard({ data }: TrainerProductivityCardProps) {
  const averageSessions = data?.averageSessionsPerTrainer ?? 0;
  const satisfaction = data?.memberSatisfaction ?? 0;
  const ptSales = data?.ptPackageSales ?? 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Trainer Productivity</Text>
      
      <View style={styles.list}>
        <View style={[styles.row, styles.borderBottom]}>
          <Text style={styles.label}>Avg. Sessions per Trainer</Text>
          <Text style={styles.value}>{averageSessions}</Text>
        </View>
        
        <View style={[styles.row, styles.borderBottom]}>
          <Text style={styles.label}>Member Satisfaction</Text>
          <Text style={[styles.value, { color: '#16A34A' }]}>{satisfaction.toFixed(1)}/5.0</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>PT Package Sales</Text>
          <Text style={styles.value}><CurrencyValue amount={ptSales} options={{ maximumFractionDigits: 0 }} /></Text>
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
