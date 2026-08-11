import React from 'react';

import { BrandColors } from '@/core/theme';
import { ChartContainer, LineChart } from '@/shared/components';
import type { DailyRevenueTrendPoint } from '../../domain/communityAnalyticsData.types';

interface CommunityDailyRevenueProps {
  dailyData?: DailyRevenueTrendPoint[];
}

export function CommunityDailyRevenue({ dailyData = [] }: CommunityDailyRevenueProps) {
  const chartData = dailyData.map(item => ({
    x: item.date,
    Revenue: item.revenue,
  }));

  const isEmpty = chartData.length === 0;

  return (
    <ChartContainer
      title="Daily Revenue Trend"
      description="Last 7 days revenue progression"
      empty={isEmpty}
      emptyTitle="No daily revenue data"
      emptyDescription="Revenue trends will display once receipts are processed."
      height={220}
    >
      <LineChart
        data={chartData}
        xKey="x"
        series={[
          {
            key: 'Revenue',
            label: 'Revenue',
            color: BrandColors.teal,
          },
        ]}
        height={180}
        yAxisFormatter={(val: number) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
      />
    </ChartContainer>
  );
}
