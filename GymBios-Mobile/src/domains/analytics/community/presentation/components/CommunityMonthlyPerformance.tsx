import React from 'react';

import { BrandColors } from '@/core/theme';
import { BarChart, ChartContainer } from '@/shared/components';
import type { MonthlyPerformancePoint } from '../../domain/communityAnalyticsData.types';

interface CommunityMonthlyPerformanceProps {
  monthlyData?: MonthlyPerformancePoint[];
}

export function CommunityMonthlyPerformance({
  monthlyData = [],
}: CommunityMonthlyPerformanceProps) {
  const chartData = monthlyData.map(item => ({
    x: item.month,
    Target: item.target,
    Actual: item.revenue,
  }));

  const isEmpty = chartData.length === 0;

  return (
    <ChartContainer
      title="Monthly Performance"
      description="Target vs Actual revenue by month"
      empty={isEmpty}
      emptyTitle="No monthly performance data"
      emptyDescription="Monthly comparisons will appear as history accumulates."
      height={240}
    >
      <BarChart
        data={chartData}
        xKey="x"
        series={[
          {
            key: 'Target',
            label: 'Target',
            color: '#94A3B8',
          },
          {
            key: 'Actual',
            label: 'Actual',
            color: BrandColors.teal,
          },
        ]}
        height={200}
        yAxisFormatter={(val: number) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
      />
    </ChartContainer>
  );
}
