import React from 'react';
import { Text, View } from 'react-native';

import { styles } from './ReportRow.styles';
import { ReportRowProps } from './ReportRow.types';

export function ReportRow({
  title,
  subtitle,
  value,
  trend,
  hideDivider = false,
}: ReportRowProps) {
  return (
    <View
      style={[
        styles.container,
        hideDivider && styles.noDivider,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.title}>{title}</Text>

          {subtitle && (
            <Text style={styles.subtitle}>
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.right}>
          <Text style={styles.value}>{value}</Text>

          {trend && (
            <Text style={styles.trend}>
              {trend}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}