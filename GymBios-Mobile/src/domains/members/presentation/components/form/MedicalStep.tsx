import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { Dropdown } from '@/shared/components/Dropdown';
import { Input } from '@/shared/components/Input';
import { FormSection } from '@/shared/components/FormSection';
import { BLOOD_GROUPS } from '@/domains/members/constants';
import type { MemberWizardData } from '@/domains/members/hooks/useMemberWizard';

interface MedicalStepProps {
  data: MemberWizardData;
  updateField: (field: keyof MemberWizardData, value: any) => void;
}

export function MedicalStep({ data, updateField }: MedicalStepProps) {
  return (
    <View style={styles.container}>
      <FormSection title="Medical Information">
        <Dropdown
          label="Blood Group"
          placeholder="Select blood group"
          value={data.bloodGroup}
          options={BLOOD_GROUPS}
          onChange={(v) => updateField('bloodGroup', v)}
        />
        <Input
          label="Height (cm)"
          value={data.height}
          onChangeText={(v) => updateField('height', v)}
          placeholder="e.g. 175"
          keyboardType="decimal-pad"
        />
        <Input
          label="Weight (kg)"
          value={data.weight}
          onChangeText={(v) => updateField('weight', v)}
          placeholder="e.g. 70"
          keyboardType="decimal-pad"
        />
        <Input
          label="Medical Conditions"
          value={data.medicalConditions}
          onChangeText={(v) => updateField('medicalConditions', v)}
          placeholder="List any medical conditions"
        />
        <Input
          label="Chronic Illnesses"
          value={data.chronicIllnesses}
          onChangeText={(v) => updateField('chronicIllnesses', v)}
          placeholder="List any chronic illnesses"
        />
        <Input
          label="Allergies"
          value={data.allergies}
          onChangeText={(v) => updateField('allergies', v)}
          placeholder="List any allergies"
        />
        <Input
          label="Current Medications"
          value={data.currentMedications}
          onChangeText={(v) => updateField('currentMedications', v)}
          placeholder="List current medications"
        />
        <Input
          label="Health Notes"
          value={data.healthNotes}
          onChangeText={(v) => updateField('healthNotes', v)}
          placeholder="Additional health notes"
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
});
