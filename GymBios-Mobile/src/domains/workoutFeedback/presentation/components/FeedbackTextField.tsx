import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { BrandColors, Spacing, Radius } from '@/core/theme';

interface FeedbackTextFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function FeedbackTextField({ value, onChangeText, placeholder }: FeedbackTextFieldProps) {
  return (
    <TextInput
      style={styles.input}
      value={value || ''}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      multiline
      numberOfLines={4}
      textAlignVertical="top"
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 14,
    color: BrandColors.textPrimary,
    minHeight: 100,
    marginTop: Spacing.two,
    backgroundColor: BrandColors.white,
  },
});
