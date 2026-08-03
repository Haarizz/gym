// src/shared/components/DatePicker/DatePicker.tsx

import React, { useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

import { DatePickerModal } from './DatePickerModal';
import { formatDate, DEFAULT_DATE_FORMAT } from './utils';
import type { DatePickerProps } from './types';

export function DatePicker({
  label,
  placeholder = 'Select date',
  value,
  onChange,
  minimumDate,
  maximumDate,
  mode = 'date',
  required = false,
  disabled = false,
  error,
  format = DEFAULT_DATE_FORMAT,
  leftIcon,
  rightIcon,
  style,
}: DatePickerProps & { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const openModal = useCallback(() => {
    if (!disabled) setModalVisible(true);
  }, [disabled]);

  const handleClose = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleConfirm = useCallback(
    (date: Date) => {
      onChange(date);
      setModalVisible(false);
    },
    [onChange],
  );

  const displayValue = formatDate(value, format);
  const hasValue = !!displayValue;

  return (
    <View style={style}>
      {/* ── Label ── */}
      {label ? (
        <Typography variant="bodySmallBold" style={styles.label}>
          {label}
          {required ? (
            <Typography
              variant="bodySmallBold"
              style={{ color: theme.error }}
            >
              {' *'}
            </Typography>
          ) : null}
        </Typography>
      ) : null}

      {/* ── Tappable field — styled like Input.tsx ── */}
      <Pressable
        onPress={openModal}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label ?? 'Date picker'}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: error
              ? theme.error
              : pressed && !disabled
                ? theme.primary
                : theme.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {/* Optional left icon */}
        {leftIcon ? (
          <View style={styles.leftIcon}>{leftIcon}</View>
        ) : (
          /* Default calendar icon when no leftIcon is supplied */
          <Feather
            name="calendar"
            size={18}
            color={theme.textSecondary}
            style={styles.defaultIcon}
          />
        )}

        {/* Date text or placeholder */}
        <Typography
          variant="bodySmall"
          numberOfLines={1}
          style={[
            styles.valueText,
            { color: hasValue ? theme.text : theme.textSecondary },
          ]}
        >
          {hasValue ? displayValue : placeholder}
        </Typography>

        {/* Optional right icon — defaults to a chevron */}
        {rightIcon ?? (
          <Feather
            name="chevron-down"
            size={18}
            color={theme.textSecondary}
          />
        )}
      </Pressable>

      {/* ── Validation error ── */}
      {error ? (
        <Typography variant="caption" style={[styles.error, { color: theme.error }]}>
          {error}
        </Typography>
      ) : null}

      {/* ── Picker modal ── */}
      <DatePickerModal
        visible={modalVisible}
        value={value ?? null}
        mode={mode}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: Spacing.one,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  defaultIcon: {
    // Matches left padding of Input.tsx for visual consistency
  },
  leftIcon: {
    // Wrapper so custom icons don't need their own spacing
  },
  valueText: {
    flex: 1,
  },
  error: {
    marginTop: Spacing.one,
  },
});
