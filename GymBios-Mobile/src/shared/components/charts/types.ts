import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/** Generic data row representation for charts */
export type ChartDataRow = Record<string, unknown>;
export type ChartData = ChartDataRow[];

/** Configuration for a data series in line/bar charts */
export interface ChartSeries {
  key: string;
  label: string;
  color?: string;
}

/** Props for ChartContainer wrapper */
export interface ChartContainerProps {
  title?: string;
  description?: string;
  headerRight?: ReactNode;
  loading?: boolean;
  empty?: boolean;
  error?: Error | string | boolean | null;
  emptyTitle?: string;
  emptyDescription?: string;
  errorMessage?: string;
  onRetry?: () => void;
  height?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/** Props for generic LineChart component */
export interface LineChartProps {
  data: ChartData;
  xKey: string;
  series: ChartSeries[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  yAxisFormatter?: (value: number) => string;
  xAxisFormatter?: (value: unknown) => string;
  emptyText?: string;
  style?: StyleProp<ViewStyle>;
}

/** Props for generic BarChart component */
export interface BarChartProps {
  data: ChartData;
  xKey: string;
  series: ChartSeries[];
  height?: number;
  orientation?: 'vertical' | 'horizontal';
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  yAxisFormatter?: (value: number) => string;
  xAxisFormatter?: (value: unknown) => string;
  emptyText?: string;
  style?: StyleProp<ViewStyle>;
}

/** Normalized slice data for PieChart */
export interface PieChartSlice {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

/** Props for generic PieChart component */
export interface PieChartProps {
  data: ChartData;
  nameKey: string;
  valueKey: string;
  variant?: 'pie' | 'donut';
  height?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  valueFormatter?: (value: number) => string;
  colors?: string[];
  emptyText?: string;
  style?: StyleProp<ViewStyle>;
}
