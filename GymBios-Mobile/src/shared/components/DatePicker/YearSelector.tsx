// src/shared/components/DatePicker/YearSelector.tsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface YearSelectorProps {
  selectedYear: number;
  /** Defaults to 1900 when omitted. */
  minimumYear?: number;
  /** Defaults to current year + 10 when omitted. */
  maximumYear?: number;
  onSelectYear: (year: number) => void;
}

/** Build an inclusive array of years from min to max. */
function buildYearRange(min: number, max: number): number[] {
  const years: number[] = [];
  for (let y = min; y <= max; y++) {
    years.push(y);
  }
  return years;
}

const ITEM_HEIGHT = 44;
// How many rows are visible in the wheel viewport (must be odd so there's a true center row).
const VISIBLE_ROWS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
// Padding so the first and last year can still be scrolled to the centered position.
const VERTICAL_PADDING = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;

export function YearSelector({
  selectedYear,
  minimumYear = 1900,
  maximumYear = new Date().getFullYear() + 10,
  onSelectYear,
}: YearSelectorProps) {
  const theme = useTheme();
  const listRef = useRef<FlatList<number>>(null);
  const years = buildYearRange(minimumYear, maximumYear);

  // Tracks the year currently centered in the wheel while scrolling, so the
  // highlighted row can update live rather than only on scroll-end.
  const [focusedYear, setFocusedYear] = useState(selectedYear);

  const indexForYear = useCallback(
    (year: number) => {
      const index = years.indexOf(year);
      return index >= 0 ? index : 0;
    },
    [years],
  );

  // Scroll to the selected year on mount so the user immediately sees context.
  useEffect(() => {
    const index = indexForYear(selectedYear);
    // Small delay to let the list finish its initial layout pass.
    setTimeout(() => {
      listRef.current?.scrollToOffset({
        offset: index * ITEM_HEIGHT,
        animated: false,
      });
    }, 50);
    // We only want this on initial mount, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commitIndex = useCallback(
    (index: number) => {
      const clamped = Math.min(Math.max(index, 0), years.length - 1);
      const year = years[clamped];
      setFocusedYear(year);
      onSelectYear(year);
    },
    [years, onSelectYear],
  );

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
      commitIndex(index);
    },
    [commitIndex],
  );

  const handlePressYear = useCallback(
    (year: number) => {
      const index = indexForYear(year);
      listRef.current?.scrollToOffset({
        offset: index * ITEM_HEIGHT,
        animated: true,
      });
      setFocusedYear(year);
      onSelectYear(year);
    },
    [indexForYear, onSelectYear],
  );

  const renderItem = useCallback(
    ({ item: year }: { item: number }) => {
      const isFocused = year === focusedYear;

      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={String(year)}
          accessibilityState={{ selected: isFocused }}
          onPress={() => handlePressYear(year)}
          style={styles.cell}
        >
          <Typography
            variant={isFocused ? 'body' : 'bodySmall'}
            style={{
              color: isFocused ? theme.primary : theme.text,
              fontWeight: isFocused ? '700' : '500',
              opacity: isFocused ? 1 : 0.5,
            }}
          >
            {year}
          </Typography>
        </Pressable>
      );
    },
    [focusedYear, handlePressYear, theme],
  );

  const keyExtractor = useCallback((year: number) => String(year), []);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  return (
    <View style={[styles.container, { height: WHEEL_HEIGHT }]}>
      {/* Center highlight band sits behind the list, indicating the "active" row. */}
      <View
        pointerEvents="none"
        style={[
          styles.centerBand,
          {
            top: VERTICAL_PADDING,
            height: ITEM_HEIGHT,
            backgroundColor: theme.backgroundSelected,
            borderRadius: Radius.md,
          },
        ]}
      />
      <FlatList
        ref={listRef}
        data={years}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: VERTICAL_PADDING }}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollToIndexFailed={() => {
          /* Swallow — offset-based scrolling doesn't hit this, kept for safety. */
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
  centerBand: {
    position: 'absolute',
    left: Spacing.two,
    right: Spacing.two,
  },
  cell: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});