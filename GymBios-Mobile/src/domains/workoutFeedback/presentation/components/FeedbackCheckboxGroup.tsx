import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Typography } from '@/shared/components/Typography';
import { BrandColors, Spacing, Radius } from '@/core/theme';
import Feather from '@expo/vector-icons/Feather';

interface FeedbackCheckboxGroupProps {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}

export function FeedbackCheckboxGroup({ options, selected, onToggle }: FeedbackCheckboxGroupProps) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <Pressable
            key={option}
            style={styles.option}
            onPress={() => onToggle(option)}
          >
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Feather name="check" size={16} color={BrandColors.white} />}
            </View>
            <Typography variant="body" style={styles.label}>
              {/* Capitalize first letter */}
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.two,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '45%', // simple grid layout
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.two,
  },
  checkboxSelected: {
    backgroundColor: BrandColors.teal,
    borderColor: BrandColors.teal,
  },
  label: {
    color: BrandColors.textPrimary,
  },
});
