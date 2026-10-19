import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { FormSection } from '@/shared/components/FormSection';
import { Typography } from '@/shared/components/Typography';
import type { PlanWizardData } from '../../hooks/useMembershipPlanWizard';

interface AssignmentsStepProps {
  values: PlanWizardData;
  errors: Partial<Record<keyof PlanWizardData, string>>;
  onChange: <K extends keyof PlanWizardData>(field: K, value: PlanWizardData[K]) => void;
}

interface InfoRowProps {
  label: string;
  count: number;
}

function InfoRow({ label, count }: InfoRowProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.infoRow}>
      <Typography variant="bodySmall" color="textSecondary">{label}</Typography>
      <Typography variant="bodySmallBold">
        {count > 0
          ? t('membershipPlans.form.assignmentsStep.selectedCount', { count })
          : t('membershipPlans.form.assignmentsStep.none')}
      </Typography>
    </View>
  );
}

export function AssignmentsStep({ values }: AssignmentsStepProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <FormSection title={t('membershipPlans.form.assignmentsStep.title')}>
        <Typography variant="caption" color="textSecondary" style={styles.note}>
          {t('membershipPlans.form.assignmentsStep.description')}
        </Typography>

        <InfoRow
          label={t('membershipPlans.form.assignmentsStep.assignableTrainers')}
          count={values.assignableTrainers.length}
        />
        <InfoRow
          label={t('membershipPlans.form.assignmentsStep.trainingStreams')}
          count={values.trainingStreams.length}
        />
        <InfoRow
          label={t('membershipPlans.form.assignmentsStep.facilities')}
          count={values.selectedFacilities.length}
        />
        <InfoRow
          label={t('membershipPlans.form.assignmentsStep.promotions')}
          count={values.selectedPromotions.length}
        />
        <InfoRow
          label={t('membershipPlans.form.assignmentsStep.campaigns')}
          count={values.selectedCampaigns.length}
        />
      </FormSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  note: {
    marginBottom: Spacing.two,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
});
