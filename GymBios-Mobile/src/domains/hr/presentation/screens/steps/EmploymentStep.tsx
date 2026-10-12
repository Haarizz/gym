import { format, parseISO } from 'date-fns';
import { StyleSheet, View } from 'react-native';

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
  const { roles } = useRoles();
  const { data: branchData } = useAllBranches();

  const roleOptions = roles.map((r) => ({ label: r.roleName, value: r.roleName }));
  const branchOptions = branchData
    ? branchData.map((b) => ({ label: b.branch_name, value: b.branch_name }))
    : [];

  return (
    <View style={styles.container}>
      <FormCard icon="briefcase" title="Position" description="Role controls what this person can access">
        <Dropdown
          label="Role"
          required
          value={data.role}
          options={roleOptions}
          onChange={(v) => updateField('role', v)}
          placeholder="Select role"
          error={errors?.role}
        />
        <Dropdown
          label="Department"
          required
          value={data.department}
          options={DEPARTMENTS}
          onChange={(v) => updateField('department', v)}
          placeholder="Select department"
          error={errors?.department}
        />
      </FormCard>

      <FormCard icon="map-pin" title="Workplace">
        <Dropdown
          label="Branch"
          required
          value={data.branch}
          options={branchOptions}
          onChange={(v) => updateField('branch', v)}
          placeholder="Select branch"
          error={errors?.branch}
        />
        <DatePicker
          label="Join date"
          placeholder="Select join date"
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
