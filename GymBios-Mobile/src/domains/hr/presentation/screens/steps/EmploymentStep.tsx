import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { Dropdown } from '@/shared/components/Dropdown';
import { DatePicker } from '@/shared/components/DatePicker';
import { FormSection } from '@/shared/components/FormSection';
import { useRoles } from '@/domains/roles/hooks/useRoles';
import type { StaffWizardData } from '../../hooks/useStaffWizard';

interface EmploymentStepProps {
  data: StaffWizardData;
  updateField: <K extends keyof StaffWizardData>(
    field: K,
    value: StaffWizardData[K],
  ) => void;
}

const DEPARTMENTS = [
  { label: 'Sales', value: 'Sales' },
  { label: 'Fitness', value: 'Fitness' },
  { label: 'Management', value: 'Management' },
  { label: 'HR', value: 'HR' },
];

const BRANCHES = [
  { label: 'Main Branch', value: 'Main Branch' },
  { label: 'Downtown', value: 'Downtown' },
  { label: 'Westside', value: 'Westside' },
];

export function EmploymentStep({ data, updateField }: EmploymentStepProps) {
  const { roles } = useRoles();
  const roleOptions = roles.map((r) => ({ label: r.roleName, value: r.roleName }));

  return (
    <View style={styles.container}>
      <FormSection title="Employment">
        <Dropdown
          label="Role *"
          value={data.role}
          options={roleOptions}
          onChange={(v) => updateField('role', v)}
          placeholder="Select Role"
        />
        <Dropdown
          label="Department *"
          value={data.department}
          options={DEPARTMENTS}
          onChange={(v) => updateField('department', v)}
          placeholder="Select Department"
        />
        <Dropdown
          label="Branch *"
          value={data.branch}
          options={BRANCHES}
          onChange={(v) => updateField('branch', v)}
          placeholder="Select Branch"
        />
        <DatePicker
          label="Join Date"
          value={data.joinDate ? new Date(data.joinDate) : undefined}
          onChange={(d) => d && updateField('joinDate', d.toISOString().split('T')[0])}
          placeholder="YYYY-MM-DD"
        />
      </FormSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
});