import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Text as SvgText, Line, G } from 'react-native-svg';
import { BrandColors, Radius, Spacing } from '@/core/theme';

interface MemberChurnData {
  month: string;
  newMembers: number;
  churned: number;
}

interface MemberChurnChartProps {
  data: MemberChurnData[];
}

export function MemberChurnChart({ data }: MemberChurnChartProps) {
  if (!data || data.length === 0) return null;

  const chartHeight = 200;
  const paddingLeft = 30;
  const paddingBottom = 20;
  const paddingTop = 10;
  const paddingRight = 10;
  
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - (Spacing.four * 4); // card padding + screen padding
  
  const graphWidth = chartWidth - paddingLeft - paddingRight;
  const graphHeight = chartHeight - paddingBottom - paddingTop;

  // Find max value for Y scale
  const maxVal = Math.max(
    ...data.map(d => Math.max(d.newMembers, d.churned)),
    100 // default max to at least 100 for decent scale
  );
  
  // Calculate Y ticks (0, 25, 50, 75, 100) or similar based on maxVal
  const numTicks = 4;
  const tickStep = Math.ceil(maxVal / numTicks / 10) * 10; // Round to nearest 10
  const ticks = Array.from({ length: numTicks + 1 }, (_, i) => i * tickStep);
  const actualMax = ticks[ticks.length - 1];

  const groupWidth = graphWidth / data.length;
  const barWidth = Math.min(12, groupWidth / 3);
  const barSpacing = 2;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>New Members vs Churn</Text>
      
      <Svg width={chartWidth} height={chartHeight}>
        {/* Y Axis Ticks and Grid Lines */}
        {ticks.map((tick, i) => {
          const y = paddingTop + graphHeight - (tick / actualMax) * graphHeight;
          return (
            <G key={`grid-${i}`}>
              <Line 
                x1={paddingLeft} 
                y1={y} 
                x2={chartWidth - paddingRight} 
                y2={y} 
                stroke="#f0f0f0" 
                strokeWidth="1" 
                strokeDasharray="4, 4" 
              />
              <SvgText
                x={paddingLeft - 8}
                y={y + 4}
                fontSize="10"
                fill="#666"
                textAnchor="end"
              >
                {tick}
              </SvgText>
            </G>
          );
        })}

        {/* X Axis Line */}
        <Line 
          x1={paddingLeft} 
          y1={paddingTop + graphHeight} 
          x2={chartWidth - paddingRight} 
          y2={paddingTop + graphHeight} 
          stroke="#666" 
          strokeWidth="1" 
        />
        {/* Y Axis Line */}
        <Line 
          x1={paddingLeft} 
          y1={paddingTop} 
          x2={paddingLeft} 
          y2={paddingTop + graphHeight} 
          stroke="#666" 
          strokeWidth="1" 
        />

        {/* Bars and X Axis Labels */}
        {data.map((item, i) => {
          const xCenter = paddingLeft + (i * groupWidth) + (groupWidth / 2);
          
          const newHeight = (item.newMembers / actualMax) * graphHeight;
          const churnHeight = (item.churned / actualMax) * graphHeight;

          const newX = xCenter - barWidth - (barSpacing / 2);
          const churnX = xCenter + (barSpacing / 2);

          return (
            <G key={`group-${i}`}>
              {/* New Members Bar */}
              <Rect
                x={newX}
                y={paddingTop + graphHeight - newHeight}
                width={barWidth}
                height={newHeight}
                fill="#F5C742"
                rx={4}
                ry={4}
              />
              {/* Churned Bar */}
              <Rect
                x={churnX}
                y={paddingTop + graphHeight - churnHeight}
                width={barWidth}
                height={churnHeight}
                fill="#ef4444"
                rx={4}
                ry={4}
              />
              {/* X Axis Label */}
              <SvgText
                x={xCenter}
                y={chartHeight - 2}
                fontSize="10"
                fill="#666"
                textAnchor="middle"
              >
                {item.month}
              </SvgText>
            </G>
          );
        })}
      </Svg>
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
    fontSize: 16,
    fontWeight: '600',
    color: '#111827', // gray-900
    marginBottom: Spacing.four,
  },
});
