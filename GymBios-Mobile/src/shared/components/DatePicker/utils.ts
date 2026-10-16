// src/shared/components/DatePicker/utils.ts

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

import { formatDate as formatAppDate } from '@/core/i18n';

/**
 * Default display format.
 */
export const DEFAULT_DATE_FORMAT = 'dd MMM yyyy';

/**
 * Format a date for display.
 */
export function formatDate(
  date: Date | null | undefined,
  dateFormat = DEFAULT_DATE_FORMAT,
) {
  if (!date) {
    return '';
  }

  return formatAppDate(date, dateFormat);
}

/**
 * Returns all visible calendar days
 * including leading/trailing dates.
 */
export function getCalendarDays(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), {
    weekStartsOn: 0,
  });

  const end = endOfWeek(endOfMonth(month), {
    weekStartsOn: 0,
  });

  return eachDayOfInterval({
    start,
    end,
  });
}

/**
 * Check whether a date is outside
 * the current visible month.
 */
export function isOutsideMonth(
  date: Date,
  currentMonth: Date,
) {
  return !isSameMonth(date, currentMonth);
}

/**
 * Check if date should be disabled.
 */
export function isDateDisabled(
  date: Date,
  minimumDate?: Date,
  maximumDate?: Date,
) {
  if (minimumDate && isBefore(date, minimumDate)) {
    return true;
  }

  if (maximumDate && isAfter(date, maximumDate)) {
    return true;
  }

  return false;
}

/**
 * Check if date is currently selected.
 */
export function isSelectedDate(
  date: Date,
  selectedDate?: Date | null,
) {
  if (!selectedDate) {
    return false;
  }

  return isSameDay(date, selectedDate);
}

/** Month names in the app language, for MonthSelector. */
export function getMonthNames(): string[] {
  return MONTHS.map((_, i) => formatAppDate(new Date(2021, i, 1), 'LLLL'));
}

/** Short weekday labels in the app language, Sunday first. */
export function getWeekDayNames(): string[] {
  // 2021-01-03 was a Sunday.
  return WEEK_DAYS.map((_, i) => formatAppDate(new Date(2021, 0, 3 + i), 'EEEEEE'));
}

/** English month names (see getMonthNames for the app language). */
export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Weekday labels.
 */
export const WEEK_DAYS = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
];

/**
 * Navigate calendar.
 */
export function previousMonth(date: Date) {
  return addMonths(date, -1);
}

export function nextMonth(date: Date) {
  return addMonths(date, 1);
}