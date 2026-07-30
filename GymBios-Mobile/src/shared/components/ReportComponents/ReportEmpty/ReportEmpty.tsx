import React from 'react';
import { Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors } from '@/core/theme';
import { styles } from './ReportEmpty.styles';
import type { ReportEmptyProps } from './ReportEmpty.types';

/**
 * ReportEmpty
 *
 * A centred, consistent empty-state block for use inside any report.
 * Contains no external image assets; the illustration is a teal circle
 * with an inbox icon sourced from the existing Feather icon set.
 *
 * @example
 * ```tsx
 * <ReportEmpty
 *   title="No transactions yet"
 *   description="Transactions will appear here once recorded."
 * />
 * ```
 */
export function ReportEmpty({ title, description }: ReportEmptyProps) {
  return (
    <View style={styles.container}>
      {/* Illustration placeholder – uses a tinted circle with an icon */}
      <View style={styles.illustration}>
        <Feather name="inbox" size={32} color={BrandColors.teal} />
      </View>

      <Text style={styles.title}>{title}</Text>

      {!!description && (
        <Text style={styles.description}>{description}</Text>
      )}
    </View>
  );
}
