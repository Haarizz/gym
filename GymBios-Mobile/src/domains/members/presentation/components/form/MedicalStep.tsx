import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Spacing } from '@/core/theme';
import { Dropdown } from '@/shared/components/Dropdown';
import { Input } from '@/shared/components/Input';
import { BLOOD_GROUPS } from '@/domains/members/constants';

import { FormCard } from './FormCard';
import type { MemberStepProps } from './stepTypes';

export function MedicalStep({ data, updateField }: MemberStepProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <FormCard
        icon="activity"
        title={t('members.form.medicalStep.bodyTitle')}
        description={t('members.form.medicalStep.bodyDescription')}
      >
        <Dropdown
          label={t('members.form.medicalStep.bloodGroup')}
          placeholder={t('members.form.medicalStep.selectBloodGroup')}
          value={data.bloodGroup}
          options={BLOOD_GROUPS}
          onChange={(v) => updateField('bloodGroup', v)}
        />
        <View style={styles.row}>
          <Input
            label={t('members.form.medicalStep.height')}
            value={data.height}
            onChangeText={(v) => updateField('height', v)}
            placeholder="175"
            keyboardType="decimal-pad"
            containerStyle={styles.half}
          />
          <Input
            label={t('members.form.medicalStep.weight')}
            value={data.weight}
            onChangeText={(v) => updateField('weight', v)}
            placeholder="70"
            keyboardType="decimal-pad"
            containerStyle={styles.half}
          />
        </View>
      </FormCard>

      <FormCard
        icon="heart"
        title={t('members.form.medicalStep.historyTitle')}
        description={t('members.form.medicalStep.historyDescription')}
      >
        <Input
          label={t('members.form.medicalStep.medicalConditions')}
          value={data.medicalConditions}
          onChangeText={(v) => updateField('medicalConditions', v)}
          placeholder={t('members.form.medicalStep.conditionsPlaceholder')}
          multiline
          style={styles.multiline}
        />
        <Input
          label={t('members.form.medicalStep.chronicIllnesses')}
          value={data.chronicIllnesses}
          onChangeText={(v) => updateField('chronicIllnesses', v)}
          placeholder={t('members.form.medicalStep.illnessesPlaceholder')}
          multiline
          style={styles.multiline}
        />
        <Input
          label={t('members.form.medicalStep.allergies')}
          value={data.allergies}
          onChangeText={(v) => updateField('allergies', v)}
          placeholder={t('members.form.medicalStep.allergiesPlaceholder')}
          multiline
          style={styles.multiline}
        />
        <Input
          label={t('members.form.medicalStep.currentMedications')}
          value={data.currentMedications}
          onChangeText={(v) => updateField('currentMedications', v)}
          placeholder={t('members.form.medicalStep.medicationsPlaceholder')}
          multiline
          style={styles.multiline}
        />
        <Input
          label={t('members.form.medicalStep.notes')}
          value={data.healthNotes}
          onChangeText={(v) => updateField('healthNotes', v)}
          placeholder={t('members.form.medicalStep.notesPlaceholder')}
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
