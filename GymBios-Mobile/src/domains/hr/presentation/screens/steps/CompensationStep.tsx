import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { Input } from '@/shared/components/Input';
import { FormCard } from '@/domains/members/presentation/components/form/FormCard';
import type { StaffStepProps } from './stepTypes';

export function CompensationStep({ data, updateField, errors }: StaffStepProps) {
  return (
    <View style={styles.container}>
      <FormCard icon="dollar-sign" title="Pay" description="Monthly base salary before commissions">
        <Input
          label="Base salary"
          value={data.salary}
          onChangeText={(v) => updateField('salary', v)}
          placeholder="0"
          keyboardType="decimal-pad"
          error={errors?.salary}
        />
      </FormCard>

      <FormCard icon="target" title="Targets" description="Sales target used in performance reports">
        <Input
          label="Monthly target"
          value={data.monthlyTarget}
          onChangeText={(v) => updateField('monthlyTarget', v)}
          placeholder="0"
          keyboardType="decimal-pad"
          error={errors?.monthlyTarget}
        />
      </FormCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.md,
  },
});
