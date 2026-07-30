import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { Input } from '@/shared/components/Input';
import { FormSection } from '@/shared/components/FormSection';
import type { StaffWizardData } from '../../hooks/useStaffWizard';

interface EmploymentStepProps {
  data: StaffWizardData;
  updateField: <K extends keyof StaffWizardData>(
    field: K,
    value: StaffWizardData[K],
  ) => void;
}

export function EmploymentStep({ data, updateField }: EmploymentStepProps) {
  return (
    <View style={styles.container}>
      <FormSection title="Employment">
        <Input
          label="Role *"
          value={data.role}
          onChangeText={(v) => updateField('role', v)}
          placeholder="e.g. Sales Manager"
        />
        <Input
          label="Department *"
          value={data.department}
          onChangeText={(v) => updateField('department', v)}
          placeholder="e.g. Sales"
        />
        <Input
          label="Branch *"
          value={data.branch}
          onChangeText={(v) => updateField('branch', v)}
          placeholder="e.g. Main Branch"
        />
        <Input
          label="Join Date"
          value={data.joinDate}
          onChangeText={(v) => updateField('joinDate', v)}
          placeholder="YYYY-MM-DD"
        />
        <Input
          label="Status"
          value={data.status}
          onChangeText={(v) => updateField('status', v)}
          placeholder="e.g. ACTIVE"
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