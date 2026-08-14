import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Typography } from '@/shared/components/Typography';
import { BrandColors, Spacing, Radius } from '@/core/theme';
import Feather from '@expo/vector-icons/Feather';

interface FeedbackRadioGroupProps<T extends string> {
  options: { label: string; value: T }[];
  value: T | null;
  onChange: (value: T) => void;
}

export function FeedbackRadioGroup<T extends string>({ options, value, onChange }: FeedbackRadioGroupProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <Pressable
            key={option.value}
            style={styles.option}
            onPress={() => onChange(option.value)}
          >
            <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
              {isSelected && <View style={styles.radioInner} />}
            </View>
            <Typography variant="body" style={isSelected ? styles.labelSelected : styles.label}>
              {option.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
    marginTop: Spacing.two,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.two,
  },
  radioCircleSelected: {
    borderColor: BrandColors.teal,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: BrandColors.teal,
  },
  label: {
    color: BrandColors.textPrimary,
  },
  labelSelected: {
    color: BrandColors.tealDark,
    fontWeight: '500',
  },
});
