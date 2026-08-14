import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BrandColors, Spacing, Radius } from '@/core/theme';

interface RatingSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
  midLabel?: string;
}

export function RatingSlider({
  value,
  onValueChange,
  min,
  max,
  minLabel,
  maxLabel,
  midLabel,
}: RatingSliderProps) {
  const steps = [];
  for (let i = min; i <= max; i++) {
    steps.push(i);
  }

  return (
    <View style={styles.container}>
      <View style={styles.trackContainer}>
        {steps.map((step, index) => {
          const isSelected = step === value;
          const isPast = step <= value;
          
          return (
            <Pressable
              key={step}
              style={styles.stepPressable}
              onPress={() => onValueChange(step)}
            >
              <View style={[styles.trackSegment, isPast && styles.trackSegmentActive]} />
              <View
                style={[
                  styles.thumb,
                  isSelected && styles.thumbSelected,
                  !isSelected && isPast && styles.thumbPast,
                ]}
              >
                {isSelected && <View style={styles.thumbInner} />}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.labelsContainer}>
        <Text style={styles.labelText}>{minLabel}</Text>
        {midLabel && <Text style={styles.labelText}>{midLabel}</Text>}
        <Text style={styles.labelText}>{maxLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
  },
  trackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  stepPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
  },
  trackSegment: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#E5E7EB',
  },
  trackSegmentActive: {
    backgroundColor: BrandColors.teal,
  },
  thumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  thumbPast: {
    backgroundColor: BrandColors.teal,
  },
  thumbSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BrandColors.teal,
  },
  thumbInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BrandColors.white,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  labelText: {
    fontSize: 12,
    color: BrandColors.textSecondary,
  },
});
