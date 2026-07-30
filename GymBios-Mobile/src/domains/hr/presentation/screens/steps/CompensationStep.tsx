import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { Input } from '@/shared/components/Input';
import { FormSection } from '@/shared/components/FormSection';
import type { StaffWizardData } from '../../hooks/useStaffWizard';

interface CompensationStepProps {
  data: StaffWizardData;
  updateField: <K extends keyof StaffWizardData>(
    field: K,
    value: StaffWizardData[K],
  ) => void;
}

export function CompensationStep({ data, updateField }: CompensationStepProps) {
  return (
    <View style={styles.container}>
      <FormSection title="Compensation">
        <Input
          label="Base Salary"
          value={data.salary}
          onChangeText={(v) => updateField('salary', v)}
          placeholder="0"
          keyboardType="numeric"
        />
        <Input
          label="Monthly Target"
          value={data.monthlyTarget}
          onChangeText={(v) => updateField('monthlyTarget', v)}
          placeholder="0"
          keyboardType="numeric"
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
});