import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

interface ClassUtilizationData {
  classType: string;
  utilization: number;
}

interface ClassUtilizationCardProps {
  data: ClassUtilizationData[];
}

import { LinearGradient } from 'expo-linear-gradient';

export function ClassUtilizationCard({ data }: ClassUtilizationCardProps) {
  if (!data || data.length === 0) return null;

  return (
    <LinearGradient colors={['#F5C742', '#F59E0B']} style={styles.card}>
      <Text style={styles.title}>Class Utilization</Text>
      
      {data.map((item, index) => (
        <View key={`${item.classType}-${index}`} style={[styles.row, index < data.length - 1 && styles.borderBottom]}>
          <Text style={styles.className}>{item.classType}</Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${Math.min(item.utilization, 100)}%` }
                ]} 
              />
            </View>
            <Text style={styles.percentageText}>{item.utilization}%</Text>
          </View>
        </View>
      ))}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
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
    color: '#FFF',
    marginBottom: Spacing.four,
  },
  row: {
    paddingVertical: Spacing.three,
  },
  borderBottom: {
    borderBottomWidth: 0, // removed bottom border for cleaner look on gradient
  },
  className: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFF',
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#FFF',
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    width: 36,
    textAlign: 'right',
  },
});
