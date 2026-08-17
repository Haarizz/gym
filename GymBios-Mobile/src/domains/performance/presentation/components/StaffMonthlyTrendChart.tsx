import { StyleSheet, Text, View } from 'react-native';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { BarChart } from '@/shared/components/charts';
import type { MonthlyTrendItem } from '../../domain/StaffPerformanceData';

interface StaffMonthlyTrendChartProps {
  data: MonthlyTrendItem[];
}

export function StaffMonthlyTrendChart({ data }: StaffMonthlyTrendChartProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>6-Month Trend</Text>
      <BarChart
        data={data}
        xKey="month"
        series={[
          {
            key: 'conversions',
            label: 'Conversions',
            color: BrandColors.teal,
          },
        ]}
        height={180}
        showLegend={false}
      />
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
    marginBottom: Spacing.three,
  },
});
