import React from 'react';
import { Text, View } from 'react-native';

import { styles } from './ReportListItem.styles';
import type { ReportListItemProps } from './ReportListItem.types';

/**
 * ReportListItem
 *
 * A single row for use inside a report list.  Renders an optional subtitle
 * below the title and an optional trailing value on the right edge.
 *
 * A hairline divider is rendered at the bottom of the row by default.
 * Pass `hideDivider` on the last item in a list to suppress it.
 *
 * @example
 * ```tsx
 * <ReportListItem
 *   title="Premium Membership"
 *   subtitle="Today"
 *   value="₹1,499"
 * />
 * ```
 */
export function ReportListItem({
  title,
  subtitle,
  value,
  hideDivider = false,
}: ReportListItemProps) {
  return (
    <>
      <View style={styles.row}>
        {/* Left: title + optional subtitle */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>

          {!!subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Right: optional trailing value */}
        {!!value && (
          <Text style={styles.value} numberOfLines={1}>
            {value}
          </Text>
        )}
      </View>

      {!hideDivider && <View style={styles.divider} />}
    </>
  );
}
