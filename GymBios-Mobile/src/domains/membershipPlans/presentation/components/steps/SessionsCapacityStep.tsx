import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { FormCard } from '@/shared/components/FormCard';
import { OptionChips, planOptions } from '../OptionChips';
import { Input } from '@/shared/components/Input';
import type { PlanWizardData } from '../../hooks/useMembershipPlanWizard';

const CAPACITY_OPTIONS = ['Unlimited', 'Limited'];
const ATTENDANCE_LIMITS = ['None', 'Per Day', 'Per Week', 'Per Month'];
const ATTENDANCE_PERIODS = ['Day', 'Week', 'Month'];



interface SessionsCapacityStepProps {
  values: PlanWizardData;
  errors: Partial<Record<keyof PlanWizardData, string>>;
  onChange: <K extends keyof PlanWizardData>(field: K, value: PlanWizardData[K]) => void;
}

export function SessionsCapacityStep({ values, errors, onChange }: SessionsCapacityStepProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <FormCard icon="activity" title={t('membershipPlans.form.capacityStep.sessionsSection')}>
        <Input
          label={t('membershipPlans.form.capacityStep.maxSessionsLabel')}
          value={values.maxSessions}
          onChangeText={(v) => onChange('maxSessions', v)}
          placeholder={t('membershipPlans.form.capacityStep.maxSessionsPlaceholder')}
          keyboardType="numeric"
        />
      </FormCard>

      <FormCard icon="users" title={t('membershipPlans.form.capacityStep.capacitySection')}>
        <OptionChips
          label={t('membershipPlans.form.capacityStep.capacityTypeLabel')}
          options={planOptions(CAPACITY_OPTIONS)}
          selected={values.membershipCapacity || 'Unlimited'}
          onSelect={(v) => onChange('membershipCapacity', v)}
        />
        {values.membershipCapacity === 'Limited' && (
          <Input
            label={t('membershipPlans.form.capacityStep.maxCapacityLabel')}
            value={values.maxCapacity}
            onChangeText={(v) => onChange('maxCapacity', v)}
            placeholder={t('membershipPlans.form.capacityStep.maxCapacityPlaceholder')}
            keyboardType="numeric"
          />
        )}
      </FormCard>

      <FormCard icon="calendar" title={t('membershipPlans.form.capacityStep.attendanceSection')}>
        <OptionChips
          label={t('membershipPlans.form.capacityStep.attendanceLimitLabel')}
          options={planOptions(ATTENDANCE_LIMITS)}
          selected={values.attendanceLimit || 'None'}
          onSelect={(v) => onChange('attendanceLimit', v)}
        />
        {values.attendanceLimit && values.attendanceLimit !== 'None' && (
          <>
            <Input
              label={t('membershipPlans.form.capacityStep.attendanceValueLabel')}
              value={values.attendanceValue}
              onChangeText={(v) => onChange('attendanceValue', v)}
              placeholder={t('membershipPlans.form.capacityStep.attendanceValuePlaceholder')}
              keyboardType="numeric"
            />
            <OptionChips
          label={t('membershipPlans.form.capacityStep.attendancePeriodLabel')}
          options={planOptions(ATTENDANCE_PERIODS)}
          selected={values.attendancePeriod || 'Day'}
          onSelect={(v) => onChange('attendancePeriod', v)}
        />
          </>
        )}
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
