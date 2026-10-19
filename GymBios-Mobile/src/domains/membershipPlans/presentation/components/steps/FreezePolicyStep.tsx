import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { useTheme } from '@/core/hooks';
import { FormSection } from '@/shared/components/FormSection';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import type { PlanWizardData } from '../../hooks/useMembershipPlanWizard';

interface FreezePolicyStepProps {
  values: PlanWizardData;
  errors: Partial<Record<keyof PlanWizardData, string>>;
  onChange: <K extends keyof PlanWizardData>(field: K, value: PlanWizardData[K]) => void;
}

export function FreezePolicyStep({ values, errors, onChange }: FreezePolicyStepProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <FormSection title={t('membershipPlans.form.freezeStep.title')}>
        <Input
          label={t('membershipPlans.form.freezeStep.maxFreezeDaysLabel')}
          value={values.maxFreezeDays}
          onChangeText={(v) => onChange('maxFreezeDays', v)}
          placeholder={t('membershipPlans.form.freezeStep.maxFreezeDaysPlaceholder')}
          keyboardType="numeric"
        />
        <Input
          label={t('membershipPlans.form.freezeStep.maxFreezeOccurrencesLabel')}
          value={values.maxFreezeOccurrences}
          onChangeText={(v) => onChange('maxFreezeOccurrences', v)}
          placeholder={t('membershipPlans.form.freezeStep.maxFreezeOccurrencesPlaceholder')}
          keyboardType="numeric"
        />
        <Input
          label={t('membershipPlans.form.freezeStep.chargePerExtraDayLabel')}
          value={values.chargePerExtraDay}
          onChangeText={(v) => onChange('chargePerExtraDay', v)}
          placeholder={t('membershipPlans.form.freezeStep.chargePerExtraDayPlaceholder')}
          keyboardType="decimal-pad"
        />
        <Input
          label={t('membershipPlans.form.freezeStep.freeDaysAllowedLabel')}
          value={values.freeDaysAllowed}
          onChangeText={(v) => onChange('freeDaysAllowed', v)}
          placeholder={t('membershipPlans.form.freezeStep.freeDaysAllowedPlaceholder')}
          keyboardType="numeric"
        />
        <View style={styles.switchRow}>
          <Typography variant="bodySmallBold">
            {t('membershipPlans.form.freezeStep.autoUnfreezeLabel')}
          </Typography>
          <Switch
            value={values.autoUnfreeze}
            onValueChange={(v) => onChange('autoUnfreeze', v)}
            trackColor={{ false: theme.muted, true: theme.primary }}
            thumbColor={theme.backgroundElement}
          />
        </View>
      </FormSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
