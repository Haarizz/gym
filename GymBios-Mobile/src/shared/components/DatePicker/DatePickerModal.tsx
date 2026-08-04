// src/shared/components/DatePicker/DatePickerModal.tsx

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

import { Calendar } from './Calendar';
import { MonthSelector } from './MonthSelector';
import { YearSelector } from './YearSelector';
import { formatDate, nextMonth, previousMonth } from './utils';
import type { DatePickerModalProps } from './types';

/**
 * Which "panel" is currently visible inside the modal.
 * - 'calendar' → the day-level Calendar grid
 * - 'month'    → MonthSelector grid
 * - 'year'     → YearSelector scrollable list
 */
type Panel = 'calendar' | 'month' | 'year';

export function DatePickerModal({
  visible,
  value,
  minimumDate,
  maximumDate,
  onClose,
  onConfirm,
}: DatePickerModalProps) {
  const theme = useTheme();

  // ─── Animation ────────────────────────────────────────────────────────────
  const translateY = useMemo(() => new Animated.Value(600), []);
  const [isMounted, setIsMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 600,
        duration: 220,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setIsMounted(false);
      });
    }
  }, [visible, translateY]);

  // ─── Internal state ────────────────────────────────────────────────────────
  /** The month currently being displayed in the calendar header. */
  const [displayMonth, setDisplayMonth] = useState<Date>(
    () => value ?? new Date(),
  );

  /** Temporary selection held until the user presses "Done". */
  const [tempDate, setTempDate] = useState<Date | null>(value ?? null);

  /** Which panel is currently active. */
  const [panel, setPanel] = useState<Panel>('calendar');

  // Re-sync internal state whenever the modal re-opens.
  useEffect(() => {
    if (visible) {
      const initial = value ?? new Date();
      setDisplayMonth(initial);
      setTempDate(value ?? null);
      setPanel('calendar');
    }
  }, [visible, value]);

  // ─── Derived values ────────────────────────────────────────────────────────
  const headerLabel = useMemo(
    () => formatDate(displayMonth, 'MMMM yyyy'),
    [displayMonth],
  );

  const canGoPrev = useMemo(() => {
    if (!minimumDate) return true;
    const prevM = previousMonth(displayMonth);
    // Allow navigation as long as the prev month isn't entirely before minimumDate
    return prevM.getFullYear() > minimumDate.getFullYear() ||
      (prevM.getFullYear() === minimumDate.getFullYear() &&
        prevM.getMonth() >= minimumDate.getMonth());
  }, [displayMonth, minimumDate]);

  const canGoNext = useMemo(() => {
    if (!maximumDate) return true;
    const nextM = nextMonth(displayMonth);
    return nextM.getFullYear() < maximumDate.getFullYear() ||
      (nextM.getFullYear() === maximumDate.getFullYear() &&
        nextM.getMonth() <= maximumDate.getMonth());
  }, [displayMonth, maximumDate]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handlePrevMonth = useCallback(() => {
    if (canGoPrev) setDisplayMonth((d) => previousMonth(d));
  }, [canGoPrev]);

  const handleNextMonth = useCallback(() => {
    if (canGoNext) setDisplayMonth((d) => nextMonth(d));
  }, [canGoNext]);

  const handleSelectDate = useCallback((date: Date) => {
    setTempDate(date);
    setDisplayMonth(date);
  }, []);

  const handleSelectMonth = useCallback((monthIndex: number) => {
    setDisplayMonth((prev) => {
      const updated = new Date(prev);
      updated.setMonth(monthIndex);
      return updated;
    });
    setPanel('calendar');
  }, []);

  const handleSelectYear = useCallback((year: number) => {
    setDisplayMonth((prev) => {
      const updated = new Date(prev);
      updated.setFullYear(year);
      return updated;
    });
    setPanel('calendar');
  }, []);

  const handleToggleMonthPanel = useCallback(() => {
    setPanel((p) => (p === 'month' ? 'calendar' : 'month'));
  }, []);

  const handleToggleYearPanel = useCallback(() => {
    setPanel((p) => (p === 'year' ? 'calendar' : 'year'));
  }, []);

  const handleConfirm = useCallback(() => {
    if (tempDate) {
      onConfirm(tempDate);
    }
  }, [tempDate, onConfirm]);

  if (!isMounted) return null;

  return (
    <Modal
      transparent
      visible={isMounted}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Tapping the dim area cancels the picker */}
        <Pressable style={styles.backdropPressable} onPress={onClose} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <SafeAreaView edges={['bottom']} style={styles.safeArea}>
            {/* Drag handle */}
            <View style={styles.handle} />

            {/* ── Modal header ── */}
            <View
              style={[
                styles.sheetHeader,
                { borderBottomColor: theme.border },
              ]}
            >
              {/* Previous month */}
              <Pressable
                onPress={handlePrevMonth}
                disabled={!canGoPrev}
                hitSlop={12}
                style={[styles.navButton, { opacity: canGoPrev ? 1 : 0.3 }]}
                accessibilityLabel="Previous month"
              >
                <Feather
                  name="chevron-left"
                  size={22}
                  color={theme.text}
                />
              </Pressable>

              {/* Month / Year labels — tappable to switch panels */}
              <View style={styles.headerCenter}>
                <Pressable
                  onPress={handleToggleMonthPanel}
                  hitSlop={8}
                  accessibilityLabel="Select month"
                >
                  <Typography
                    variant="bodySmallBold"
                    style={{ color: panel === 'month' ? theme.primary : theme.text }}
                  >
                    {formatDate(displayMonth, 'MMMM')}
                  </Typography>
                </Pressable>

                <Typography
                  variant="bodySmall"
                  style={{ color: theme.textSecondary, marginHorizontal: 4 }}
                >
                  {' '}
                </Typography>

                <Pressable
                  onPress={handleToggleYearPanel}
                  hitSlop={8}
                  accessibilityLabel="Select year"
                >
                  <Typography
                    variant="bodySmallBold"
                    style={{ color: panel === 'year' ? theme.primary : theme.text }}
                  >
                    {formatDate(displayMonth, 'yyyy')}
                  </Typography>
                </Pressable>
              </View>

              {/* Next month */}
              <Pressable
                onPress={handleNextMonth}
                disabled={!canGoNext}
                hitSlop={12}
                style={[styles.navButton, { opacity: canGoNext ? 1 : 0.3 }]}
                accessibilityLabel="Next month"
              >
                <Feather
                  name="chevron-right"
                  size={22}
                  color={theme.text}
                />
              </Pressable>
            </View>

            {/* ── Panel content ── */}
            <View style={styles.body}>
              {panel === 'calendar' && (
                <Calendar
                  displayMonth={displayMonth}
                  selectedDate={tempDate}
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  onSelectDate={handleSelectDate}
                />
              )}

              {panel === 'month' && (
                <MonthSelector
                  selectedMonth={displayMonth.getMonth()}
                  onSelectMonth={handleSelectMonth}
                />
              )}

              {panel === 'year' && (
                <YearSelector
                  selectedYear={displayMonth.getFullYear()}
                  minimumYear={minimumDate?.getFullYear()}
                  maximumYear={maximumDate?.getFullYear()}
                  onSelectYear={handleSelectYear}
                />
              )}
            </View>

            {/* ── Action row ── */}
            <View
              style={[
                styles.actions,
                { borderTopColor: theme.border },
              ]}
            >
              <Pressable
                onPress={onClose}
                style={[
                  styles.actionButton,
                  { backgroundColor: theme.backgroundElement },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Typography variant="bodySmallBold" style={{ color: theme.text }}>
                  Cancel
                </Typography>
              </Pressable>

              <Pressable
                onPress={handleConfirm}
                disabled={!tempDate}
                style={[
                  styles.actionButton,
                  styles.confirmButton,
                  {
                    backgroundColor: theme.primary,
                    opacity: tempDate ? 1 : 0.5,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Confirm date"
              >
                <Typography
                  variant="bodySmallBold"
                  style={{ color: theme.primaryText }}
                >
                  Done
                </Typography>
              </Pressable>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: BrandColors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  safeArea: {
    flex: 1,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.neutral[200],
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navButton: {
    padding: Spacing.two,
    borderRadius: Radius.full,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    flex: 2,
  },
});
