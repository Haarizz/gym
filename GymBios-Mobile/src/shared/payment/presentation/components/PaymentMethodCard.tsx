import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { FeatherIcon } from '@/shared/components/CurrencyIcon';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { PaymentMethodOption } from '@/shared/payment/constants';

interface PaymentMethodCardProps {
  option: PaymentMethodOption;
  title: string;
  subtitle: string;
  /** Why the tile can't be used right now; the tile is disabled when set. */
  unavailableReason?: string;
  onSelect: () => void;
}

export function PaymentMethodCard({
  option,
  title,
  subtitle,
  unavailableReason,
  onSelect,
}: PaymentMethodCardProps) {
  const theme = useTheme();
  const disabled = !!unavailableReason;

  return (
    <Pressable
      onPress={onSelect}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={title}
      accessibilityHint={unavailableReason ?? subtitle}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}
    >
      <View style={[styles.iconWrapper, { backgroundColor: theme.primary + '18' }]}>
        <FeatherIcon name={option.iconName as any} size={20} color={theme.primary} />
      </View>
      <Typography variant="bodySmallBold" style={{ color: theme.text }} numberOfLines={1}>
        {title}
      </Typography>
      <Typography variant="caption" style={{ color: theme.textSecondary }} numberOfLines={2}>
        {unavailableReason ?? subtitle}
      </Typography>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 2,
    minHeight: 118,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
});
