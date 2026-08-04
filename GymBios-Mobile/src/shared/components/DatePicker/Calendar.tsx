import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

import type { CalendarProps } from './types';
import {
  getCalendarDays,
  isDateDisabled,
  isOutsideMonth,
  isSelectedDate,
  WEEK_DAYS,
} from './utils';

export function Calendar({
  displayMonth,
  selectedDate,
  minimumDate,
  maximumDate,
  onSelectDate,
}: CalendarProps) {
  const theme = useTheme();

  const days = getCalendarDays(displayMonth);

  return (
    <View>
      <View style={styles.weekHeader}>
        {WEEK_DAYS.map((day) => (
          <View key={day} style={styles.weekDay}>
            <Typography
              variant="caption"
              color="textSecondary"
              style={styles.weekDayText}
            >
              {day}
            </Typography>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const disabled = isDateDisabled(
            day,
            minimumDate,
            maximumDate,
          );

          const outsideMonth = isOutsideMonth(
            day,
            displayMonth,
          );

          const selected = isSelectedDate(
            day,
            selectedDate,
          );

          return (
            <Pressable
              key={day.toISOString()}
              disabled={disabled}
              onPress={() => onSelectDate(day)}
              style={({ pressed }) => [
                styles.day,
                selected && {
                  backgroundColor: theme.primary,
                },
                pressed &&
                  !disabled && {
                    opacity: 0.7,
                  },
              ]}
            >
              <Typography
                variant="bodySmall"
                color={
                  disabled
                    ? 'textSecondary'
                    : selected
                      ? 'primaryText'
                      : outsideMonth
                        ? 'textSecondary'
                        : 'text'
                }
                style={styles.dayText}
              >
                {day.getDate()}
              </Typography>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.two,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.one,
  },
  weekDayText: {
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  day: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    marginBottom: Spacing.one,
  },
  dayText: {
    textAlign: 'center',
  },
});