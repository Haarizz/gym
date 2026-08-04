// src/shared/components/DatePicker/MonthSelector.tsx

import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

import { MONTHS } from './utils';

interface MonthSelectorProps {
  /** 0-based month index that is currently selected. */
  selectedMonth: number;
  onSelectMonth: (monthIndex: number) => void;
}

export function MonthSelector({
  selectedMonth,
  onSelectMonth,
}: MonthSelectorProps) {
  const theme = useTheme();

  const renderMonth = useCallback(
    (name: string, index: number) => {
      const isSelected = index === selectedMonth;

      return (
        <Pressable
          key={index}
          accessibilityRole="button"
          accessibilityLabel={name}
          accessibilityState={{ selected: isSelected }}
          onPress={() => onSelectMonth(index)}
          style={({ pressed }) => [
            styles.cell,
            {
              backgroundColor: isSelected
                ? theme.primary
                : pressed
                  ? theme.backgroundSelected
                  : 'transparent',
            },
          ]}
        >
          <Typography
            variant="bodySmall"
            style={{
              color: isSelected ? theme.primaryText : theme.text,
              fontWeight: isSelected ? '700' : '500',
            }}
          >
            {/* Abbreviated month label (e.g. Jan) keeps cells compact */}
            {name.slice(0, 3)}
          </Typography>
        </Pressable>
      );
    },
    [selectedMonth, onSelectMonth, theme],
  );

  return (
    <View style={styles.grid}>
      {MONTHS.map((name, index) => renderMonth(name, index))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.three,
  },
  cell: {
    // 3-column layout: each cell takes 1/3 of available width
    width: '33.333%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
  },
});
