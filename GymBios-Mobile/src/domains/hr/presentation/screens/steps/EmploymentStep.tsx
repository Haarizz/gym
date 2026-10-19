import { format, parseISO } from 'date-fns';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Spacing } from '@/core/theme';
import { Dropdown } from '@/shared/components/Dropdown';
import { DatePicker } from '@/shared/components/DatePicker';
import { FormCard } from '@/domains/members/presentation/components/form/FormCard';
import { useRoles } from '@/domains/roles/hooks/useRoles';
import { useAllBranches } from '@/domains/branch';
import type { StaffStepProps } from './stepTypes';

const DEPARTMENTS = [
  { label: 'Sales', value: 'Sales' },
  { label: 'Fitness', value: 'Fitness' },
  { label: 'Management', value: 'Management' },
  { label: 'HR', value: 'HR' },
];

export function EmploymentStep({ data, updateField, errors }: StaffStepProps) {
  const { t } = useTranslation();
  const { roles } = useRoles();
  const { data: branchData } = useAllBranches();

  const roleOptions = roles.map((r) => ({ label: r.roleName, value: r.roleName }));
  const branchOptions = branchData
    ? branchData.map((b) => ({ label: b.branch_name, value: b.branch_name }))
    : [];

  return (
    <View style={styles.container}>
      <FormCard icon="briefcase" title={t('hr.employment.position')} description={t('hr.employment.positionDesc')}>
        <Dropdown
          label={t('hr.employment.role')}
          required
          value={data.role}
          options={roleOptions}
          onChange={(v) => updateField('role', v)}
          placeholder={t('hr.employment.selectRole')}
          error={errors?.role}
        />
        <Dropdown
          label={t('hr.employment.department')}
          required
          value={data.department}
          options={DEPARTMENTS}
          onChange={(v) => updateField('department', v)}
          placeholder={t('hr.employment.selectDepartment')}
          error={errors?.department}
        />
      </FormCard>

      <FormCard icon="map-pin" title={t('hr.employment.workplace')}>
        <Dropdown
          label={t('hr.employment.branch')}
          required
          value={data.branch}
          options={branchOptions}
          onChange={(v) => updateField('branch', v)}
          placeholder={t('hr.employment.selectBranch')}
          error={errors?.branch}
        />
        <DatePicker
          label={t('hr.joinDate')}
          placeholder={t('hr.employment.selectJoinDate')}
          // Parsed/formatted as local dates so the stored day doesn't shift with the timezone.
          value={data.joinDate ? parseISO(data.joinDate) : undefined}
          onChange={(d) => updateField('joinDate', d ? format(d, 'yyyy-MM-dd') : '')}
          error={errors?.joinDate}
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
