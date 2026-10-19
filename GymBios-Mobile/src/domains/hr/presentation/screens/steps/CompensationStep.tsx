import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Spacing } from '@/core/theme';
import { Input } from '@/shared/components/Input';
import { FormCard } from '@/domains/members/presentation/components/form/FormCard';
import type { StaffStepProps } from './stepTypes';

export function CompensationStep({ data, updateField, errors }: StaffStepProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <FormCard icon="dollar-sign" title={t('hr.compensation.pay')} description={t('hr.compensation.payDesc')}>
        <Input
          label={t('hr.compensation.baseSalary')}
          value={data.salary}
          onChangeText={(v) => updateField('salary', v)}
          placeholder="0"
          keyboardType="decimal-pad"
          error={errors?.salary}
        />
      </FormCard>

      <FormCard icon="target" title={t('hr.compensation.targets')} description={t('hr.compensation.targetsDesc')}>
        <Input
          label={t('hr.compensation.monthlyTarget')}
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
