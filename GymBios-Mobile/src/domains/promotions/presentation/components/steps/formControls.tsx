import Feather from '@expo/vector-icons/Feather';
import { parseISO, format, isValid } from 'date-fns';
import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { PromotionFormData } from '../../hooks/usePromotionWizard';

export interface StepProps {
  values: PromotionFormData;
  onChange: <K extends keyof PromotionFormData>(field: K, value: PromotionFormData[K]) => void;
}

export interface Option {
  label: string;
  value: string;
}

/** The form stores dates as the API's `yyyy-MM-dd`; the DatePicker works in Date. */
export function parseFormDate(value: string): Date | null {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? date : null;
}

export function formatFormDate(date: Date | null): string {
  return date ? format(date, 'yyyy-MM-dd') : '';
}

interface CheckboxGroupProps {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
}

export function CheckboxGroup({ label, options, selected, onChange }: CheckboxGroupProps) {
  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  };

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.checkboxGrid}>
        {options.map((opt) => {
          const checked = selected.includes(opt.value);
          return (
            <Pressable
              key={opt.value}
              style={styles.checkboxItem}
              onPress={() => toggle(opt.value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
            >
              <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                {checked ? <Feather name="check" size={14} color={BrandColors.white} /> : null}
              </View>
              <Text style={styles.checkboxLabel}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

interface ToggleRowProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function ToggleRow({ label, value, onChange }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#CBD5E1', true: BrandColors.teal }}
        thumbColor={BrandColors.white}
      />
    </View>
  );
}

export const stepStyles = StyleSheet.create({
  container: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  gridCol: {
    flex: 1,
  },
  note: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
  },
});

const styles = StyleSheet.create({
  fieldGroup: {
    gap: Spacing.two,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.two,
  },
  checkboxItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: BrandColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: BrandColors.teal,
    borderColor: BrandColors.teal,
  },
  checkboxLabel: {
    flexShrink: 1,
    fontSize: 14,
    color: BrandColors.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.one,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
});
