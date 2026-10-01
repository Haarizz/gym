import Feather from '@expo/vector-icons/Feather';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { format, isBefore, startOfDay } from 'date-fns';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { DatePicker } from '@/shared/components/DatePicker';
import { Dropdown } from '@/shared/components/Dropdown';
import { Typography } from '@/shared/components/Typography';
import { MemberTypeSelector } from '@/domains/members/presentation/components/membership/MemberTypeSelector';
import { MembershipPlanSelector } from '@/domains/members/presentation/components/membership/MembershipPlanSelector';
import { MembershipPlanSummary } from '@/domains/members/presentation/components/membership/MembershipPlanSummary';
import { useMembershipPlans, type MembershipPlan } from '@/domains/membershipPlans';
import { useStaff } from '@/domains/hr/presentation/hooks/useStaff';
import { computeEndDate } from '@/domains/members/hooks/useMemberWizard';

import { FormCard } from './FormCard';
import type { MemberStepProps } from './stepTypes';

interface MembershipStepProps extends MemberStepProps {
  /** Show the "Processed By" sale-credit picker (new registrations only). */
  showProcessedBy?: boolean;
  /** New registrations can't be backdated; existing members keep their history. */
  allowPastDates?: boolean;
}

const STAFF_FILTERS = { limit: 500 };

export function MembershipStep({
  data,
  updateField,
  errors,
  showProcessedBy = false,
  allowPastDates = false,
}: MembershipStepProps) {
  const theme = useTheme();
  const { plans, loading, error } = useMembershipPlans();
  const { staff } = useStaff(STAFF_FILTERS);

  const staffOptions = useMemo(
    () => [
      { label: 'None', value: '' },
      ...staff.map((s) => ({
        label: s.role ? `${s.name} (${s.role})` : s.name,
        value: String(s.id),
      })),
    ],
    [staff],
  );

  // A converted lead's sale belongs to the staff member who worked it — preselect them
  // (still changeable) once the staff list arrives.
  useEffect(() => {
    if (!showProcessedBy || data.processedByStaffId || !data.leadAssignedStaff) return;
    const assigned = data.leadAssignedStaff.trim().toLowerCase();
    const match = staff.find((s) => s.name?.trim().toLowerCase() === assigned);
    if (match) updateField('processedByStaffId', String(match.id));
  }, [showProcessedBy, staff, data.processedByStaffId, data.leadAssignedStaff, updateField]);

  const selectedPlan = plans.find((p) => String(p.id) === data.membershipPlanId);
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

  const handlePlanChange = (planId: string, plan: MembershipPlan) => {
    updateField('membershipPlanId', planId);
    // The plan's running offer (if any) applies to staff-added members too.
    updateField('membershipFee', String(plan.effectivePrice ?? plan.price));
    updateField('monthlyFee', String(plan.price));
    applyStartDate(data.startDate ?? data.joinDate ?? today, plan);
  };

  return (
    <View style={styles.container}>
      <FormCard icon="layers" title="Membership type" description="Who this membership covers">
        <MemberTypeSelector
          value={data.membershipType}
          onChange={(v) => updateField('membershipType', v)}
        />
        {errors?.membershipType ? (
          <Typography variant="caption" color="error">
            {errors.membershipType}
          </Typography>
        ) : null}
      </FormCard>

      <FormCard icon="credit-card" title="Plan">
        <MembershipPlanSelector
          value={data.membershipPlanId}
          plans={plans}
          loading={loading}
          error={error}
          onChange={handlePlanChange}
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
        title="Dates"
        description={allowPastDates ? undefined : 'New memberships start today or later'}
      >
        <DatePicker
          label="Joining date"
          placeholder="Select joining date"
          value={data.joinDate}
          onChange={handleJoinDateChange}
          minimumDate={minimumDate}
          required
          error={errors?.joinDate}
        />

        <DatePicker
          label="Membership start date"
          placeholder="Select start date"
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
              Membership ends on{' '}
              <Typography variant="bodySmallBold">{format(data.endDate, 'd MMM yyyy')}</Typography>
            </Typography>
          </View>
        ) : null}
      </FormCard>

      {showProcessedBy && (
        <FormCard icon="award" title="Sale credit" description="Counts toward this staff member's target">
          <Dropdown
            label="Processed by"
            placeholder="Select staff member (optional)"
            value={data.processedByStaffId}
            options={staffOptions}
            onChange={(v) => updateField('processedByStaffId', v)}
          />
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
