import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

export interface ChipOption<T extends string> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
}

interface ChoiceChipsProps<T extends string> {
  options: ChipOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
}

/** A row of pill buttons — quick amounts, or which online method pays a part. */
export function ChoiceChips<T extends string>({ options, value, onChange }: ChoiceChipsProps<T>) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            disabled={option.disabled}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: option.disabled }}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: selected ? theme.primary : theme.backgroundSelected,
                borderColor: selected ? theme.primary : theme.border,
                opacity: option.disabled ? 0.4 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Typography
              variant="bodySmallBold"
              style={{ color: selected ? theme.primaryText : theme.text }}
              numberOfLines={1}
            >
              {option.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    flex: 1,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingVertical: Spacing.two + 1,
    paddingHorizontal: Spacing.one,
    alignItems: 'center',
  },
});
