import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface ReceiptActionBarProps {
  onDownload?: () => void;
  onShare?: () => void;
  /** Which action is currently generating its PDF — shows a spinner on it and disables both. */
  busyAction?: 'download' | 'share' | null;
}

/**
 * Sticky action bar for the Receipt Details screen.
 * Buttons are disabled gracefully (not hidden) when handlers are absent or while a PDF is being generated.
 * No API calls — callbacks are provided by the screen.
 */
export function ReceiptActionBar({
  onDownload,
  onShare,
  busyAction = null,
}: ReceiptActionBarProps) {
  const busy = busyAction !== null;
  return (
    <View style={styles.bar}>
      <ActionButton
        iconName="download"
        label="Download"
        onPress={onDownload}
        disabled={!onDownload || busy}
        loading={busyAction === 'download'}
      />
      <View style={styles.divider} />
      <ActionButton
        iconName="share-2"
        label="Share"
        onPress={onShare}
        disabled={!onShare || busy}
        loading={busyAction === 'share'}
      />
    </View>
  );
}

interface ActionButtonProps {
  iconName: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

function ActionButton({ iconName, label, onPress, disabled, loading }: ActionButtonProps) {
  // A spinning button stays full-strength so it reads as "working", not "unavailable".
  const dimmed = disabled && !loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: loading }}
      style={({ pressed }) => [styles.actionBtn, dimmed && styles.actionBtnDisabled, pressed && styles.actionBtnPressed]}
    >
      {loading ? (
        <ActivityIndicator size={18} color={BrandColors.teal} />
      ) : (
        <Feather
          name={iconName}
          size={18}
          color={dimmed ? BrandColors.textSecondary : BrandColors.teal}
        />
      )}
      <Typography
        variant="caption"
        style={[styles.actionLabel, dimmed && styles.actionLabelDisabled]}
      >
        {label}
      </Typography>
    </Pressable>
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
  actionBtnPressed: {
    opacity: 0.6,
  },
  actionLabel: {
    color: BrandColors.teal,
    fontWeight: '600',
  },
  actionLabelDisabled: {
    color: BrandColors.textSecondary,
  },
});
