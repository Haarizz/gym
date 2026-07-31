import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { useTheme } from '@/core/hooks';
import { FormSection } from '@/shared/components/FormSection';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import type { PlanWizardData } from '../../hooks/useMembershipPlanWizard';

const CAPACITY_OPTIONS = ['Unlimited', 'Limited'];
const ATTENDANCE_LIMITS = ['None', 'Per Day', 'Per Week', 'Per Month'];
const ATTENDANCE_PERIODS = ['Day', 'Week', 'Month'];

interface OptionRowProps {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}

function OptionRow({ options, selected, onSelect }: OptionRowProps) {
  const theme = useTheme();
  return (
    <View style={styles.optionRow}>
      {options.map((opt) => {
        const isActive = opt === selected;
        return (
          <View
            key={opt}
            style={[
              styles.optionChip,
              {
                backgroundColor: isActive ? theme.primary : theme.backgroundElement,
                borderColor: isActive ? theme.primary : theme.border,
              },
            ]}
            onTouchEnd={() => onSelect(opt)}
          >
            <Typography
              variant="caption"
              style={[styles.optionText, { color: isActive ? '#ffffff' : theme.textSecondary }]}
            >
              {opt}
            </Typography>
          </View>
        );
      })}
    </View>
  );
}

interface SessionsCapacityStepProps {
  values: PlanWizardData;
  errors: Partial<Record<keyof PlanWizardData, string>>;
  onChange: <K extends keyof PlanWizardData>(field: K, value: PlanWizardData[K]) => void;
}

export function SessionsCapacityStep({ values, errors, onChange }: SessionsCapacityStepProps) {
  return (
    <View style={styles.container}>
      <FormSection title="Sessions">
        <Input
          label="Max Sessions (leave blank for unlimited)"
          value={values.maxSessions}
          onChangeText={(v) => onChange('maxSessions', v)}
          placeholder="e.g. 20"
          keyboardType="numeric"
        />
      </FormSection>

      <FormSection title="Membership Capacity">
        <Typography variant="bodySmallBold">Capacity Type</Typography>
        <OptionRow
          options={CAPACITY_OPTIONS}
          selected={values.membershipCapacity || 'Unlimited'}
          onSelect={(v) => onChange('membershipCapacity', v)}
        />
        {values.membershipCapacity === 'Limited' && (
          <Input
            label="Max Capacity"
            value={values.maxCapacity}
            onChangeText={(v) => onChange('maxCapacity', v)}
            placeholder="e.g. 100"
            keyboardType="numeric"
          />
        )}
      </FormSection>

      <FormSection title="Attendance Limit">
        <Typography variant="bodySmallBold">Attendance Limit</Typography>
        <OptionRow
          options={ATTENDANCE_LIMITS}
          selected={values.attendanceLimit || 'None'}
          onSelect={(v) => onChange('attendanceLimit', v)}
        />
        {values.attendanceLimit && values.attendanceLimit !== 'None' && (
          <>
            <Input
              label="Attendance Value"
              value={values.attendanceValue}
              onChangeText={(v) => onChange('attendanceValue', v)}
              placeholder="e.g. 2"
              keyboardType="numeric"
            />
            <Typography variant="bodySmallBold">Attendance Period</Typography>
            <OptionRow
              options={ATTENDANCE_PERIODS}
              selected={values.attendancePeriod || 'Day'}
              onSelect={(v) => onChange('attendancePeriod', v)}
            />
          </>
        )}
      </FormSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  optionChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 20,
    borderWidth: 1,
  },
  optionText: {
    fontWeight: '600',
    fontSize: 12,
  },
});
