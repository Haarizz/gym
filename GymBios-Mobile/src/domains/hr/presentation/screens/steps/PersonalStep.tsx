import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { Input } from '@/shared/components/Input';
import { FormSection } from '@/shared/components/FormSection';
import type { StaffWizardData } from '../../hooks/useStaffWizard';

interface PersonalStepProps {
  data: StaffWizardData;
  updateField: <K extends keyof StaffWizardData>(
    field: K,
    value: StaffWizardData[K],
  ) => void;
}

export function PersonalStep({ data, updateField }: PersonalStepProps) {
  return (
    <View style={styles.container}>
      <FormSection title="Personal Information">
        <Input
          label="Full Name *"
          value={data.name}
          onChangeText={(v) => updateField('name', v)}
          placeholder="Enter full name"
        />
        <Input
          label="Email *"
          value={data.email}
          onChangeText={(v) => updateField('email', v)}
          placeholder="Enter email address"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label="Phone *"
          value={data.phone}
          onChangeText={(v) => updateField('phone', v)}
          placeholder="Enter phone number"
          keyboardType="phone-pad"
        />
        <Input
          label="Address"
          value={data.address}
          onChangeText={(v) => updateField('address', v)}
          placeholder="Enter address"
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