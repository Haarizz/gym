import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppBottomSheet, DatePicker, Button } from '@/shared/components';
import { Spacing } from '@/core/theme';

export interface CustomDateRangeSheetProps {
  visible: boolean;
  initialStart?: Date;
  initialEnd?: Date;
  onApply: (start: Date, end: Date) => void;
  onClose: () => void;
}

export function CustomDateRangeSheet({ visible, initialStart, initialEnd, onApply, onClose }: CustomDateRangeSheetProps) {
  const [start, setStart] = useState<Date | null>(initialStart || new Date());
  const [end, setEnd] = useState<Date | null>(initialEnd || new Date());

  useEffect(() => {
    if (visible) {
      setStart(initialStart || new Date());
      setEnd(initialEnd || new Date());
    }
  }, [visible, initialStart, initialEnd]);

  const handleApply = () => {
    if (start && end) {
      onApply(start, end);
    }
  };

  return (
    <AppBottomSheet
      visible={visible}
      title="Select Date Range"
      onClose={onClose}
    >
      <View style={styles.container}>
        <DatePicker
          label="Start Date"
          value={start || undefined}
          onChange={setStart}
        />
        <DatePicker
          label="End Date"
          value={end || undefined}
          onChange={setEnd}
        />
        <View style={styles.actions}>
          <Button title="Apply" onPress={handleApply} style={styles.button} />
        </View>
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
    paddingBottom: Spacing.four,
  },
  actions: {
    marginTop: Spacing.two,
  },
  button: {
    width: '100%',
  },
});
