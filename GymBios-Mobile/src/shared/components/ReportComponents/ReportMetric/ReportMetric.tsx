import React from 'react';
import { Text, View } from 'react-native';

import {
  NEGATIVE_COLOR,
  NEUTRAL_COLOR,
  POSITIVE_COLOR,
  styles,
  toneStyles,
  toneTextStyles,
} from './ReportMetric.styles';
import type { ReportMetricProps } from './ReportMetric.types';

/**
 * Maps a changeType semantic to a display colour.
 */
function resolveChangeColor(changeType: ReportMetricProps['changeType']): string {
  switch (changeType) {
    case 'positive':
      return POSITIVE_COLOR;
    case 'negative':
      return NEGATIVE_COLOR;
    default:
      return NEUTRAL_COLOR;
  }
}

/**
 * Maps a changeType to a simple ASCII trend indicator.
 * Kept minimal – no external icon dependency.
 */
function resolveTrendIndicator(changeType: ReportMetricProps['changeType']): string {
  switch (changeType) {
    case 'positive':
      return '↑';
    case 'negative':
      return '↓';
    default:
      return '→';
  }
}

/**
 * ReportMetric
 *
 * A single KPI card displaying a label, a prominent value, and an optional
 * trend indicator.  Designed to be composed inside a ReportSection.
 *
 * Supports single-column, two-column grid, and horizontal stack layouts –
 * the parent is responsible for flex configuration.
 *
 * @example
 * ```tsx
 * <ReportMetric
 *   label="Today's Revenue"
 *   value="₹4,250"
 *   change="+8%"
 *   changeType="positive"
 * />
 * ```
 */
// ReportMetric.tsx
export function ReportMetric({ label, value, change, changeType = 'neutral', tone = 'default' }: ReportMetricProps) {
  const isColored = tone !== 'default';
  return (
    <View style={[styles.card, isColored && toneStyles[tone]]}>
      <Text style={[styles.label, isColored && toneTextStyles.onColor]}>{label}</Text>
      <Text style={[styles.value, isColored && toneTextStyles.onColorValue]}>{value}</Text>
      {!!change && (
        <Text style={[styles.changeText, { color: isColored ? '#fff' : resolveChangeColor(changeType) }]}>
          {resolveTrendIndicator(changeType)} {change}
        </Text>
      )}
    </View>
  );
}
