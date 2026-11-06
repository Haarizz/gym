import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { tOr } from '@/core/i18n/format';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

export interface ChipOption {
  value: string;
  label: string;
}

/** Wraps plain option values ("Per Day", "ACTIVE", …) with their translated labels. */
export function planOptions(values: readonly string[]): ChipOption[] {
  return values.map(value => ({
    value,
    label: tOr(`membershipPlans.misc2.options.${value.toLowerCase().replace(/[\s-]+/g, '_')}`, value),
  }));
}

interface OptionChipsProps {
  label?: string;
  options: ChipOption[];
  selected: string;
  onSelect: (value: string) => void;
  error?: string;
}

/** Single-select pill group used across the plan wizard steps. */
export function OptionChips({ label, options, selected, onSelect, error }: OptionChipsProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Typography variant="bodySmallBold" style={{ color: theme.text }}>
          {label}
        </Typography>
      ) : null}
      <View style={styles.row}>
        {options.map(opt => {
          const active = opt.value === selected;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onSelect(opt.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: active ? `${BrandColors.teal}1f` : theme.backgroundElement,
                  borderColor: active ? BrandColors.teal : error ? theme.error : theme.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <Typography
                variant="caption"
                style={[
                  styles.chipText,
                  { color: active ? BrandColors.teal : theme.textSecondary, fontWeight: active ? '700' : '500' },
                ]}
              >
                {opt.label}
              </Typography>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Typography variant="caption" style={{ color: theme.error }}>
          {error}
        </Typography>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  pressed: {
    opacity: 0.7,
  },
});
