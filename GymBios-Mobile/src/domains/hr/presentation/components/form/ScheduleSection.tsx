import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { FormSection } from '@/shared/components/FormSection';
import { Typography } from '@/shared/components/Typography';
import type { WeeklySchedule } from '@/domains/hr/domain/Staff';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface ScheduleSectionProps {
  schedule: WeeklySchedule;
  onChange: (schedule: WeeklySchedule) => void;
}

export function ScheduleSection({ schedule, onChange }: ScheduleSectionProps) {
  const theme = useTheme();

  const addTimeRange = (day: string) => {
    const current = schedule[day] ?? [];
    onChange({ ...schedule, [day]: [...current, ''] });
  };

  const removeTimeRange = (day: string, index: number) => {
    const current = schedule[day] ?? [];
    const updated = current.filter((_, i) => i !== index);
    const newSchedule = { ...schedule };
    if (updated.length === 0) {
      delete newSchedule[day];
    } else {
      newSchedule[day] = updated;
    }
    onChange(newSchedule);
  };

  const updateTimeRange = (day: string, index: number, value: string) => {
    const current = schedule[day] ?? [];
    const updated = [...current];
    updated[index] = value;
    onChange({ ...schedule, [day]: updated });
  };

  return (
    <FormSection title="Weekly Schedule">
      {DAYS.map((day) => {
        const timeRanges = schedule[day] ?? [];
        return (
          <View key={day} style={[styles.dayCard, { backgroundColor: theme.backgroundElement }]}>
            <Typography variant="bodySmallBold" style={styles.dayLabel}>
              {day}
            </Typography>
            {timeRanges.map((range, index) => (
              <View key={index} style={styles.timeRow}>
                <Input
                  value={range}
                  onChangeText={(value) => updateTimeRange(day, index, value)}
                  placeholder="e.g. 09:00-12:00"
                  style={styles.timeInput}
                />
                <Pressable
                  hitSlop={8}
                  onPress={() => removeTimeRange(day, index)}
                  style={styles.removeTime}
                >
                  <Feather name="x" size={16} color={theme.error} />
                </Pressable>
              </View>
            ))}
            <Button
              label="+ Add Time Range"
              variant="ghost"
              onPress={() => addTimeRange(day)}
            />
          </View>
        );
      })}
    </FormSection>
  );
}

const styles = StyleSheet.create({
  dayCard: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  dayLabel: {
    marginBottom: Spacing.one,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  timeInput: {
    flex: 1,
  },
  removeTime: {
    padding: Spacing.half,
  },
});