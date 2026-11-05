import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';
import { format, isBefore, startOfDay } from 'date-fns';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { DatePicker } from '@/shared/components/DatePicker';
import { Typography } from '@/shared/components/Typography';
import { MemberTypeSelector } from '@/domains/members/presentation/components/membership/MemberTypeSelector';
import { MembershipPlanSelector } from '@/domains/members/presentation/components/membership/MembershipPlanSelector';
import { MembershipPlanSummary } from '@/domains/members/presentation/components/membership/MembershipPlanSummary';
import { useMembershipPlans, type MembershipPlan } from '@/domains/membershipPlans';
import { computeEndDate } from '@/domains/members/hooks/useMemberWizard';

import { FormCard } from './FormCard';
import { ExtrasList, ExtrasPicker } from '../extras/ExtrasPicker';
import type { MemberStepProps } from './stepTypes';

// No "Processed By" picker: the server credits the sale to whoever registers the member
// (Admin for admins, the staff member or trainer themselves otherwise) or, for a converted
// lead, to the lead's staff.
const normalizeType = (type?: string) => (type ?? '').toLowerCase().replace(/[^a-z]/g, '');

/**
 * Plan types (Individual | Couple | Family | Corporate | Walk-In) that suit a member type
 * (INDIVIDUAL | COUPLE | FAMILY | CORPORATE). Walk-In passes are single-person, so they
 * sit under Individual.
 */
export function planMatchesMembershipType(plan: MembershipPlan, membershipType: string): boolean {
  const member = normalizeType(membershipType);
  const planType = normalizeType(plan.planType);
  if (!member) return false;
  if (member === 'individual') return planType === 'individual' || planType === 'walkin';
  return planType === member;
}

interface MembershipStepProps extends MemberStepProps {
  /** New registrations can't be backdated; existing members keep their history. */
  allowPastDates?: boolean;
}

export function MembershipStep({
  data,
  updateField,
  errors,
  allowPastDates = false,
}: MembershipStepProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { plans, loading, error } = useMembershipPlans();
  const selectedPlan = plans.find((p) => String(p.id) === data.membershipPlanId);
  const hasType = !!data.membershipType.trim();
  const typePlans = hasType ? plans.filter((p) => planMatchesMembershipType(p, data.membershipType)) : [];
  const today = startOfDay(new Date());
  const minimumDate = allowPastDates ? undefined : today;

  const applyStartDate = (start: Date | null, plan: MembershipPlan | undefined = selectedPlan) => {
    updateField('startDate', start);
    if (start && plan) {
      updateField('endDate', computeEndDate(start, plan.durationValue, plan.durationType));
    }
  };

  const handleJoinDateChange = (join: Date | null) => {
    updateField('joinDate', join);
    // Membership can't start before the member joins — carry the start date forward.
    if (join && (!data.startDate || isBefore(startOfDay(data.startDate), startOfDay(join)))) {
      applyStartDate(join);
    }
  };

  const handleTypeChange = (type: string) => {
    updateField('membershipType', type);
    // A plan picked for another type no longer applies — make staff choose again.
    if (selectedPlan && !planMatchesMembershipType(selectedPlan, type)) {
      updateField('membershipPlanId', '');
      updateField('membershipFee', '');
      updateField('monthlyFee', '');
      updateField('endDate', null);
    }
  };

  const handlePlanChange = (planId: string, plan: MembershipPlan) => {
    updateField('membershipPlanId', planId);
    // The plan's running offer (if any) applies to staff-added members too.
    updateField('membershipFee', String(plan.effectivePrice ?? plan.price));
    updateField('monthlyFee', String(plan.price));
    applyStartDate(data.startDate ?? data.joinDate ?? today, plan);
  };

  return (
    <View style={styles.container}>
      <FormCard
        icon="layers"
        title={t('members.form.membershipStep.typeTitle')}
        description={t('members.form.membershipStep.typeDescription')}
      >
        <MemberTypeSelector
          value={data.membershipType}
          onChange={handleTypeChange}
        />
        {errors?.membershipType ? (
          <Typography variant="caption" color="error">
            {errors.membershipType}
          </Typography>
        ) : null}
      </FormCard>

      <FormCard icon="credit-card" title={t('members.form.membershipStep.planTitle')}>
        <MembershipPlanSelector
          value={data.membershipPlanId}
          plans={typePlans}
          loading={loading}
          error={error}
          onChange={handlePlanChange}
          disabled={!hasType}
          placeholder={hasType ? undefined : t('members.form.membershipStep.chooseTypeFirst')}
          emptyMessage={t('members.form.membershipStep.noPlansForType')}
        />
        {errors?.membershipPlanId ? (
          <Typography variant="caption" color="error">
            {errors.membershipPlanId}
          </Typography>
        ) : null}
        {selectedPlan && <MembershipPlanSummary plan={selectedPlan} />}
      </FormCard>

      <FormCard
        icon="calendar"
        title={t('members.form.membershipStep.datesTitle')}
        description={allowPastDates ? undefined : t('members.form.membershipStep.datesDescriptionNew')}
      >
        <DatePicker
          label={t('members.form.membershipStep.joiningDate')}
          placeholder={t('members.form.membershipStep.joiningDatePlaceholder')}
          value={data.joinDate}
          onChange={handleJoinDateChange}
          minimumDate={minimumDate}
          required
          error={errors?.joinDate}
        />

        <DatePicker
          label={t('members.form.membershipStep.startDate')}
          placeholder={t('members.form.membershipStep.startDatePlaceholder')}
          value={data.startDate}
          onChange={(d) => applyStartDate(d)}
          minimumDate={data.joinDate && !allowPastDates ? startOfDay(data.joinDate) : minimumDate}
          required
          error={errors?.startDate}
        />

        {data.endDate ? (
          <View style={[styles.endDateRow, { backgroundColor: theme.backgroundSelected }]}>
            <Feather name="flag" size={14} color={theme.textSecondary} />
            <Typography variant="bodySmall" color="textSecondary">
              {t('members.form.membershipStep.endsOn')}{' '}
              <Typography variant="bodySmallBold">{format(data.endDate, 'd MMM yyyy')}</Typography>
            </Typography>
          </View>
        ) : null}
      </FormCard>

      {/* New registrations only: add-ons and facility access sold with the membership, on its receipt. */}
      {data.allowExtras && (
        <FormCard icon="package" title={t('members.extras.title')} description={t('members.extras.subtitle')}>
          <ExtrasPicker chosen={data.extras} onPick={(extra) => updateField('extras', [...data.extras, extra])} />
          <ExtrasList extras={data.extras} onRemove={(key) => updateField('extras', data.extras.filter((e) => e.key !== key))} />
        </FormCard>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.md,
  },
  endDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
});
