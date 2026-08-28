import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Typography } from './Typography';

interface TrafficLightSelectorProps {
  label?: string;
  value?: 'low' | 'medium' | 'high' | '';
  onChange: (value: 'low' | 'medium' | 'high') => void;
  required?: boolean;
}

export function TrafficLightSelector({
  label,
  value,
  onChange,
  required,
}: TrafficLightSelectorProps) {
  const theme = useTheme();

  const options = [
    { value: 'low' as const, label: 'Low', color: '#2f9e6e', bg: '#e7f6ef' },
    { value: 'medium' as const, label: 'Med', color: '#e0a530', bg: '#fdf3e0' },
    { value: 'high' as const, label: 'High', color: '#e0574f', bg: '#fbeceb' },
  ];

  return (
    <View style={styles.container}>
      {label && (
        <Typography variant="bodySmallBold" style={styles.label}>
          {label}
          {required && (
            <Typography variant="bodySmallBold" style={{ color: theme.error }}>
              {' *'}
            </Typography>
          )}
        </Typography>
      )}
      <View style={styles.optionsContainer}>
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[
                styles.option,
                { backgroundColor: isSelected ? option.bg : theme.backgroundElement },
                { borderColor: isSelected ? option.color : theme.border },
                isSelected && { borderWidth: 1.5 },
              ]}
            >
              {isSelected && (
                <View style={[styles.checkMark, { backgroundColor: theme.primary }]}>
                  <Feather name="check" size={10} color="#FFF" />
                </View>
              )}
              <View style={[styles.bulb, { backgroundColor: option.color }]} />
              <Text
                style={[
                  styles.optionText,
                  { color: isSelected ? (option.value === 'medium' ? '#b3791f' : option.color) : theme.textSecondary },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.two,
  },
  label: {
    marginBottom: Spacing.one,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  option: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    position: 'relative',
  },
  bulb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    opacity: 0.8,
  },
  optionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  checkMark: {
    position: 'absolute',
    top: 5,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
