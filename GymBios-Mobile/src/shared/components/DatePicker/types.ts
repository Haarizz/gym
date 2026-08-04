// src/shared/components/DatePicker/types.ts

import type { ReactNode } from 'react';

export type DatePickerMode = 'date' | 'month-year' | 'year';

export interface DatePickerProps {
  /**
   * Optional field label.
   */
  label?: string;

  /**
   * Placeholder shown when no date is selected.
   */
  placeholder?: string;

  /**
   * Selected value.
   */
  value?: Date | null;

  /**
   * Fired when the user confirms a new value.
   */
  onChange: (date: Date | null) => void;

  /**
   * Minimum selectable date.
   */
  minimumDate?: Date;

  /**
   * Maximum selectable date.
   */
  maximumDate?: Date;

  /**
   * Picker mode.
   */
  mode?: DatePickerMode;

  /**
   * Marks the field as required.
   */
  required?: boolean;

  /**
   * Disables interaction.
   */
  disabled?: boolean;

  /**
   * Validation error.
   */
  error?: string;

  /**
   * Display format.
   * Example:
   * dd MMM yyyy
   */
  format?: string;

  /**
   * Optional custom icons.
   */
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export interface DatePickerModalProps {
  visible: boolean;
  value: Date | null;

  mode: DatePickerMode;

  minimumDate?: Date;
  maximumDate?: Date;

  onClose: () => void;
  onConfirm: (date: Date) => void;
}

export interface CalendarProps {
  displayMonth: Date;
  selectedDate: Date | null;
  minimumDate?: Date;
  maximumDate?: Date;

  onSelectDate: (date: Date) => void;
}

export interface MonthSelectorProps {
  selectedMonth: number;
  onSelectMonth: (month: number) => void;
}

export interface YearSelectorProps {
  selectedYear: number;
  minimumYear?: number;
  maximumYear?: number;

  onSelectYear: (year: number) => void;
}