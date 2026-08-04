import React from 'react';
import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { Button } from '@/shared/components/Button';

interface ReceiptActionBarProps {
  onDownload?: () => void;
  onShare?: () => void;
  onEmail?: () => void;
  loading?: boolean;
}

/**
 * Sticky action bar for the Receipt Details screen.
 * Buttons are disabled gracefully (not hidden) when handlers are absent.
 * No API calls — callbacks are provided by the screen.
 */
export function ReceiptActionBar({
  onDownload,
  onShare,
  onEmail,
  loading = false,
}: ReceiptActionBarProps) {
  return (
    <View style={styles.bar}>
      <ActionButton
        iconName="download"
        label="Download"
        onPress={onDownload}
        disabled={!onDownload || loading}
      />
      <View style={styles.divider} />
      <ActionButton
        iconName="share-2"
        label="Share"
        onPress={onShare}
        disabled={!onShare || loading}
      />
      <View style={styles.divider} />
      <ActionButton
        iconName="mail"
        label="Email"
        onPress={onEmail}
        disabled={!onEmail || loading}
      />
    </View>
  );
}

interface ActionButtonProps {
  iconName: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}

function ActionButton({ iconName, label, onPress, disabled }: ActionButtonProps) {
  return (
    <View style={[styles.actionBtn, disabled && styles.actionBtnDisabled]}>
      <Feather
        name={iconName}
        size={18}
        color={disabled ? BrandColors.textSecondary : BrandColors.teal}
        onPress={disabled ? undefined : onPress}
      />
      <Typography
        variant="caption"
        style={[styles.actionLabel, disabled && styles.actionLabelDisabled]}
      >
        {label}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: '#e5e7eb',
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.one,
  },
  actionBtnDisabled: {
    opacity: 0.4,
  },
  actionLabel: {
    color: BrandColors.teal,
    fontWeight: '600',
  },
  actionLabelDisabled: {
    color: BrandColors.textSecondary,
  },
});
