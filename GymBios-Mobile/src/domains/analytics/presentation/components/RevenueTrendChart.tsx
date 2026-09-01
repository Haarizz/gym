import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

interface RevenueTrendData {
  month: string;
  revenue: number;
}

interface RevenueTrendChartProps {
  data: RevenueTrendData[];
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  if (!data || data.length === 0) return null;

  const labels = data.map(d => d.month);
  const revenueData = data.map(d => d.revenue);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Revenue Trend</Text>

      <LineChart
        data={{
          labels,
          datasets: [
            {
              data: revenueData,
              color: (opacity = 1) => `rgba(50, 127, 116, ${opacity})`, // #327f74
              strokeWidth: 2
            }
          ]
        }}
        width={Dimensions.get('window').width - Spacing.four * 4}
        height={220}
        yAxisLabel="₹"
        yAxisSuffix="K"
        yAxisInterval={1} // optional, defaults to 1
        formatYLabel={(value) => (parseInt(value) / 1000).toFixed(0)}
        chartConfig={{
          backgroundColor: BrandColors.surface,
          backgroundGradientFrom: BrandColors.surface,
          backgroundGradientTo: BrandColors.surface,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(50, 127, 116, ${opacity})`,
          labelColor: (opacity = 1) => BrandColors.textSecondary,
          style: {
            borderRadius: 16
          },
          propsForDots: {
            r: "0", // Hide dots
          },
          fillShadowGradientFrom: '#327f74',
          fillShadowGradientFromOpacity: 0.3,
          fillShadowGradientTo: '#327f74',
          fillShadowGradientToOpacity: 0,
        }}
        bezier
        withDots={false}
        withShadow={true}
        withInnerLines={true}
        withOuterLines={true}
        style={{
          marginVertical: 8,
          borderRadius: 16
        }}
      />
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
    color: BrandColors.textPrimary,
    marginBottom: Spacing.two,
  },
});
