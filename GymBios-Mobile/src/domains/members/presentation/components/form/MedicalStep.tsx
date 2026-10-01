import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { Dropdown } from '@/shared/components/Dropdown';
import { Input } from '@/shared/components/Input';
import { BLOOD_GROUPS } from '@/domains/members/constants';

import { FormCard } from './FormCard';
import type { MemberStepProps } from './stepTypes';

export function MedicalStep({ data, updateField }: MemberStepProps) {
  return (
    <View style={styles.container}>
      <FormCard icon="activity" title="Body" description="All fields on this step are optional">
        <Dropdown
          label="Blood group"
          placeholder="Select blood group"
          value={data.bloodGroup}
          options={BLOOD_GROUPS}
          onChange={(v) => updateField('bloodGroup', v)}
        />
        <View style={styles.row}>
          <Input
            label="Height (cm)"
            value={data.height}
            onChangeText={(v) => updateField('height', v)}
            placeholder="175"
            keyboardType="decimal-pad"
            containerStyle={styles.half}
          />
          <Input
            label="Weight (kg)"
            value={data.weight}
            onChangeText={(v) => updateField('weight', v)}
            placeholder="70"
            keyboardType="decimal-pad"
            containerStyle={styles.half}
          />
        </View>
      </FormCard>

      <FormCard icon="heart" title="Health history" description="Shared with trainers to keep sessions safe">
        <Input
          label="Medical conditions"
          value={data.medicalConditions}
          onChangeText={(v) => updateField('medicalConditions', v)}
          placeholder="e.g. Asthma, past knee injury"
          multiline
          style={styles.multiline}
        />
        <Input
          label="Chronic illnesses"
          value={data.chronicIllnesses}
          onChangeText={(v) => updateField('chronicIllnesses', v)}
          placeholder="e.g. Diabetes, hypertension"
          multiline
          style={styles.multiline}
        />
        <Input
          label="Allergies"
          value={data.allergies}
          onChangeText={(v) => updateField('allergies', v)}
          placeholder="e.g. Peanuts, latex"
          multiline
          style={styles.multiline}
        />
        <Input
          label="Current medications"
          value={data.currentMedications}
          onChangeText={(v) => updateField('currentMedications', v)}
          placeholder="Name and dosage"
          multiline
          style={styles.multiline}
        />
        <Input
          label="Notes"
          value={data.healthNotes}
          onChangeText={(v) => updateField('healthNotes', v)}
          placeholder="Anything else trainers should know"
          multiline
          style={styles.multiline}
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
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  half: {
    flex: 1,
  },
  multiline: {
    minHeight: 64,
    paddingTop: Spacing.md,
    textAlignVertical: 'top',
  },
});
