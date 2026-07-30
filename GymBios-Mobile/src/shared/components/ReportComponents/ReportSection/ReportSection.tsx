import React from 'react';
import { Text, View } from 'react-native';

import { styles } from './ReportSection.styles';
import type { ReportSectionProps } from './ReportSection.types';

/**
 * ReportSection
 *
 * A titled section block for use inside any report.
 * Renders a bold heading, a hairline divider, then the provided children.
 *
 * @example
 * ```tsx
 * <ReportSection title="Revenue Breakdown">
 *   <ReportMetric label="Total" value="₹4.2L" />
 * </ReportSection>
 * ```
 */
export function ReportSection({ title, children }: ReportSectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.divider} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}
