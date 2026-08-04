import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Typography } from '@/shared/components/Typography';

import { dropdownStyles as styles } from './Dropdown.styles';
import type { DropdownProps } from './Dropdown.types';

export function Dropdown({
  label,
  placeholder = 'Select an option',
  value,
  options,
  onChange,
  required = false,
  disabled = false,
  error,
}: DropdownProps) {
  const theme = useTheme();
  const [sheetVisible, setSheetVisible] = useState(false);

  const selectedOption = options.find((o) => o.value === value);
  const hasValue = !!selectedOption;

  const openSheet = useCallback(() => {
    if (!disabled) setSheetVisible(true);
  }, [disabled]);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
  }, []);

  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setSheetVisible(false);
    },
    [onChange],
  );

  return (
    <View>
      {/* ── Label ── */}
      {label ? (
        <Typography variant="bodySmallBold" style={styles.label}>
          {label}
          {required ? (
            <Typography variant="bodySmallBold" style={{ color: theme.error }}>
              {' *'}
            </Typography>
          ) : null}
        </Typography>
      ) : null}

      {/* ── Trigger field — styled identically to DatePicker ── */}
      <Pressable
        onPress={openSheet}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label ?? 'Dropdown'}
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
        <Typography
          variant="bodySmall"
          numberOfLines={1}
          style={[
            styles.valueText,
            { color: hasValue ? theme.text : theme.textSecondary },
          ]}
        >
          {hasValue ? selectedOption!.label : placeholder}
        </Typography>
        <Feather name="chevron-down" size={18} color={theme.textSecondary} />
      </Pressable>

      {/* ── Validation error ── */}
      {error ? (
        <Typography
          variant="caption"
          style={[styles.error, { color: theme.error }]}
        >
          {error}
        </Typography>
      ) : null}

      {/* ── Options bottom sheet ── */}
      <AppBottomSheet
        visible={sheetVisible}
        title={label ?? 'Select an option'}
        onClose={closeSheet}
      >
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => handleSelect(option.value)}
              style={({ pressed }) => [
                styles.optionRow,
                pressed && { opacity: 0.6 },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <Typography
                variant="body"
                style={[
                  styles.optionLabel,
                  { color: isSelected ? theme.primary : theme.text },
                ]}
              >
                {option.label}
              </Typography>
              {isSelected ? (
                <Feather name="check" size={18} color={theme.primary} />
              ) : null}
            </Pressable>
          );
        })}
      </AppBottomSheet>
    </View>
  );
}
