import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from './Typography';

const HAIRLINE = 'rgba(30,42,58,0.07)';

export interface InfoRowProps {
  icon?: keyof typeof Feather.glyphMap;
  iconColor?: string;
  iconBackground?: string;
  label: string;
  /** Plain value renders through the label/value text style; pass a node for custom content (e.g. a progress bar). */
  value?: ReactNode;
  /** Shown, muted and italic, when value is empty. */
  emptyText?: string;
  /** Top hairline separating this row from the one above it — pass false on the first row in a group. */
  divider?: boolean;
  /** Trailing content, e.g. an amount, a chevron, or a Switch. */
  right?: ReactNode;
  onPress?: () => void;
}

export function InfoRow({
  icon,
  iconColor = BrandColors.tealDark,
  iconBackground = 'rgba(50,127,116,0.1)',
  label,
  value,
  emptyText = 'Not added',
  divider = true,
  right,
  onPress,
}: InfoRowProps) {
  const Wrapper = onPress ? Pressable : View;
  const isPlainValue = typeof value === 'string' || typeof value === 'number';
  const isEmpty = value === undefined || value === null || value === '';

  return (
    <Wrapper onPress={onPress} style={[styles.row, divider && styles.divider]}>
      {icon ? (
        <View style={[styles.iconChip, { backgroundColor: iconBackground }]}>
          <Feather name={icon} size={16} color={iconColor} />
        </View>
      ) : null}
      <View style={styles.textWrap}>
        <Typography variant="caption" color="textSecondary" style={styles.label}>
          {label}
        </Typography>
        {isPlainValue || isEmpty ? (
          <Typography
            variant="body"
            numberOfLines={2}
            style={[styles.value, isEmpty && styles.emptyValue]}
          >
            {isEmpty ? emptyText : value}
          </Typography>
        ) : (
          value
        )}
      </View>
      {right}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 13,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontWeight: '700',
    marginBottom: 2,
  },
  value: {
    fontWeight: '700',
    color: BrandColors.textPrimary,
    fontSize: 14.5,
  },
  emptyValue: {
    color: 'rgba(30,42,58,0.35)',
    fontStyle: 'italic',
    fontWeight: '600',
  },
});
