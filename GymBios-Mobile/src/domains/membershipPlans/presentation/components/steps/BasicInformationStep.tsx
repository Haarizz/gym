import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { FormCard } from '@/shared/components/FormCard';
import { OptionChips, planOptions } from '../OptionChips';
import { Input } from '@/shared/components/Input';
import { PLAN_TYPES, type PlanWizardData } from '../../hooks/useMembershipPlanWizard';

const MEMBERSHIP_TYPES = ['Standard', 'Premium', 'VIP', 'Student', 'Corporate'];
const STATUSES = ['ACTIVE', 'INACTIVE', 'DRAFT'];



interface BasicInformationStepProps {
  values: PlanWizardData;
  errors: Partial<Record<keyof PlanWizardData, string>>;
  onChange: <K extends keyof PlanWizardData>(field: K, value: PlanWizardData[K]) => void;
}

export function BasicInformationStep({ values, errors, onChange }: BasicInformationStepProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <FormCard icon="file-text" title={t('membershipPlans.form.basicStep.title')}>
        <Input
          label={t('membershipPlans.form.basicStep.nameLabel')}
          value={values.name}
          onChangeText={(v) => onChange('name', v)}
          placeholder={t('membershipPlans.form.basicStep.namePlaceholder')}
          error={errors.name}
        />
        <Input
          label={t('membershipPlans.form.basicStep.descriptionLabel')}
          value={values.description}
          onChangeText={(v) => onChange('description', v)}
          placeholder={t('membershipPlans.form.basicStep.descriptionPlaceholder')}
          multiline
          numberOfLines={3}
          style={styles.multiline}
        />

        <OptionChips
          label={t('membershipPlans.form.basicStep.planTypeLabel')}
          options={planOptions(PLAN_TYPES)}
          selected={values.planType}
          error={errors.planType}
          onSelect={(v) => onChange('planType', v)}
        />

        <OptionChips
          label={t('membershipPlans.form.basicStep.membershipTypeLabel')}
          options={planOptions(MEMBERSHIP_TYPES)}
          selected={values.type}
          onSelect={(v) => onChange('type', v)}
        />

        <OptionChips
          label={t('membershipPlans.form.basicStep.statusLabel')}
          options={planOptions(STATUSES)}
          selected={values.status}
          onSelect={(v) => onChange('status', v)}
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
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: Spacing.two,
  },
});
