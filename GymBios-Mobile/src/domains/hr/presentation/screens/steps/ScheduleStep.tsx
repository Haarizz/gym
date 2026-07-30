import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { FormSection } from '@/shared/components/FormSection';
import { Typography } from '@/shared/components/Typography';
import type { StaffCertification } from '@/domains/hr/domain/Staff';
import type { StaffWizardData } from '../../hooks/useStaffWizard';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface ScheduleStepProps {
  data: StaffWizardData;
  updateField: <K extends keyof StaffWizardData>(
    field: K,
    value: StaffWizardData[K],
  ) => void;
  addCertification: () => void;
  removeCertification: (index: number) => void;
  onChangeCert: (index: number, field: keyof StaffCertification, value: string) => void;
}

export function ScheduleStep({
  data,
  updateField,
  addCertification,
  removeCertification,
  onChangeCert,
}: ScheduleStepProps) {
  const theme = useTheme();

  const addTimeRange = (day: string) => {
    const current = data.schedule[day] ?? [];
    updateField('schedule', { ...data.schedule, [day]: [...current, ''] });
  };

  const removeTimeRange = (day: string, index: number) => {
    const current = data.schedule[day] ?? [];
    const updated = current.filter((_, i) => i !== index);
    const newSchedule = { ...data.schedule };
    if (updated.length === 0) {
      delete newSchedule[day];
    } else {
      newSchedule[day] = updated;
    }
    updateField('schedule', newSchedule);
  };

  const updateTimeRange = (day: string, index: number, value: string) => {
    const current = data.schedule[day] ?? [];
    const updated = [...current];
    updated[index] = value;
    updateField('schedule', { ...data.schedule, [day]: updated });
  };

  return (
    <View style={styles.container}>
      <FormSection title="Weekly Schedule">
        {DAYS.map((day) => {
          const timeRanges = data.schedule[day] ?? [];
          return (
            <View
              key={day}
              style={[styles.dayCard, { backgroundColor: theme.backgroundElement }]}
            >
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

      <FormSection title="Certifications">
        {data.certifications.map((cert, index) => (
          <View
            key={index}
            style={[styles.certCard, { backgroundColor: theme.backgroundElement }]}
          >
            <View style={styles.certHeader}>
              <Typography variant="bodySmallBold">
                Certification {index + 1}
              </Typography>
              <Pressable
                hitSlop={8}
                onPress={() => removeCertification(index)}
                style={styles.removeButton}
              >
                <Feather name="x" size={16} color={theme.error} />
              </Pressable>
            </View>
            <Input
              label="Certification Name"
              value={cert.certName}
              onChangeText={(value) => onChangeCert(index, 'certName', value)}
              placeholder="e.g. CPT"
            />
            <Input
              label="Issuer"
              value={cert.issuer}
              onChangeText={(value) => onChangeCert(index, 'issuer', value)}
              placeholder="e.g. ACE"
            />
            <Input
              label="Issue Date"
              value={cert.issueDate}
              onChangeText={(value) => onChangeCert(index, 'issueDate', value)}
              placeholder="YYYY-MM-DD"
            />
            <Input
              label="Expiry Date"
              value={cert.expiryDate}
              onChangeText={(value) => onChangeCert(index, 'expiryDate', value)}
              placeholder="YYYY-MM-DD"
            />
            <Input
              label="Document URL"
              value={cert.documentUrl}
              onChangeText={(value) => onChangeCert(index, 'documentUrl', value)}
              placeholder="URL to certificate"
              autoCapitalize="none"
            />
          </View>
        ))}
        <Button
          label="+ Add Certification"
          variant="secondary"
          onPress={addCertification}
        />
      </FormSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
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
  certCard: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  certHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  removeButton: {
    padding: Spacing.half,
  },
});