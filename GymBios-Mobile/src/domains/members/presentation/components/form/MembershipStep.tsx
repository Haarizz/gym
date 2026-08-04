import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { DatePicker } from '@/shared/components/DatePicker';
import { Input } from '@/shared/components/Input';
import { FormSection } from '@/shared/components/FormSection';
import { MemberTypeSelector } from '@/domains/members/presentation/components/membership/MemberTypeSelector';
import { MembershipPlanSelector } from '@/domains/members/presentation/components/membership/MembershipPlanSelector';
import { MembershipPlanSummary } from '@/domains/members/presentation/components/membership/MembershipPlanSummary';
import { useMembershipPlans } from '@/domains/membershipPlans';
import type { MemberWizardData } from '@/domains/members/hooks/useMemberWizard';

interface MembershipStepProps {
  data: MemberWizardData;
  updateField: (field: keyof MemberWizardData, value: any) => void;
}

export function MembershipStep({ data, updateField }: MembershipStepProps) {
  const { plans, loading, error } = useMembershipPlans();

  const selectedPlan = plans.find(
    (p) => String(p.id) === data.membershipPlanId,
  );

  return (
    <View style={styles.container}>
      <FormSection title="Membership Information">
        <MemberTypeSelector
          value={data.membershipType}
          onChange={(v) => updateField('membershipType', v)}
        />

        <DatePicker
          label="Joining Date"
          placeholder="Select join date"
          value={data.joinDate}
          onChange={(d) => updateField('joinDate', d)}
          required
        />

        <DatePicker
          label="Membership Start Date"
          placeholder="Select start date"
          value={data.startDate}
          onChange={(d) => updateField('startDate', d)}
          required
        />

        <MembershipPlanSelector
          value={data.membershipPlanId}
          plans={plans}
          loading={loading}
          error={error}
          onChange={(planId, plan) => {
            updateField('membershipPlanId', planId);
            updateField('membershipFee', String(plan.price));
            updateField('monthlyFee', String(plan.price));
            const startDate =
              data.startDate ?? data.joinDate ?? new Date();
            const endDate = new Date(startDate);
            const durationValue = parseInt(plan.durationValue, 10);
            if (!isNaN(durationValue)) {
              const type = plan.durationType?.toLowerCase() ?? '';
              if (type === 'month' || type === 'months') {
                endDate.setMonth(endDate.getMonth() + durationValue);
              } else if (type === 'year' || type === 'years') {
                endDate.setFullYear(endDate.getFullYear() + durationValue);
              } else if (type === 'day' || type === 'days') {
                endDate.setDate(endDate.getDate() + durationValue);
              }
              updateField('endDate', endDate);
            }
          }}
        />

        {selectedPlan && <MembershipPlanSummary plan={selectedPlan} />}

      </FormSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
});