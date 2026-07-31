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

/**
 * Step 6 – Assignments
 *
 * In a real app these would be rendered as multi-select pickers against
 * actual API data (trainers, streams, facilities, promotions, campaigns).
 * For now we render an informational section that shows the current
 * selected counts and a placeholder note, so the screen is complete without
 * requiring data sources that aren't yet available.
 *
 * When the relevant data hooks are wired up, replace each <InfoRow> with
 * the project's standard multi-select / picker component.
 */

interface InfoRowProps {
  label: string;
  count: number;
}

function InfoRow({ label, count }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Typography variant="bodySmall" color="textSecondary">{label}</Typography>
      <Typography variant="bodySmallBold">{count > 0 ? `${count} selected` : 'None'}</Typography>
    </View>
  );
}

export function AssignmentsStep({ values }: AssignmentsStepProps) {
  return (
    <View style={styles.container}>
      <FormSection title="Assignments">
        <Typography variant="caption" color="textSecondary" style={styles.note}>
          Assign trainers, streams, facilities, promotions, and campaigns to this plan.
          These can also be configured after creating the plan.
        </Typography>

        <InfoRow label="Assignable Trainers" count={values.assignableTrainers.length} />
        <InfoRow label="Training Streams" count={values.trainingStreams.length} />
        <InfoRow label="Facilities" count={values.selectedFacilities.length} />
        <InfoRow label="Promotions" count={values.selectedPromotions.length} />
        <InfoRow label="Campaigns" count={values.selectedCampaigns.length} />
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
