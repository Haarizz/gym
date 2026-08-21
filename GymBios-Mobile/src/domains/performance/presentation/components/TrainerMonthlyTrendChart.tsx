import { StyleSheet, Text, View } from 'react-native';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { BarChart } from '@/shared/components/charts';
import type { TrainerSessionTrendDTO } from '../../domain/TrainerPerformanceData';

interface TrainerMonthlyTrendChartProps {
  trend: TrainerSessionTrendDTO[];
}

export function TrainerMonthlyTrendChart({ trend }: TrainerMonthlyTrendChartProps) {
  // Format '2026-03' into 'Mar'
  const formattedData = trend.map((t) => {
    const [year, month] = t.month.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return {
      ...t,
      displayMonth: date.toLocaleDateString('en-US', { month: 'short' }),
    };
  }).reverse(); // Reverse to chronological order (oldest to newest)

  return (
    <View style={styles.container}>
      <Text style={styles.title}>6-Month Trend</Text>
      <BarChart
        data={formattedData}
        xKey="displayMonth"
        series={[
          {
            key: 'sessions',
            label: 'Sessions',
            color: BrandColors.trainerAmber,
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
