import React from 'react';
import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { Button } from '@/shared/components/Button';

interface EmptyBillingStateProps {
  title: string;
  description: string;
  icon?: keyof typeof Feather.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Billing-domain specific empty state.
 * Uses the billing teal accent colour for consistency.
 */
export function EmptyBillingState({
  title,
  description,
  icon = 'file-text',
  actionLabel,
  onAction,
}: EmptyBillingStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Feather name={icon} size={36} color={BrandColors.teal} />
      </View>

      <Typography variant="bodySmallBold" style={styles.title}>
        {title}
      </Typography>

      <Typography variant="bodySmall" color="textSecondary" style={styles.description}>
        {description}
      </Typography>

      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: BrandColors.screenBackgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  title: {
    textAlign: 'center',
    fontSize: 16,
  },
  description: {
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: Spacing.two,
    minWidth: 160,
  },
});
