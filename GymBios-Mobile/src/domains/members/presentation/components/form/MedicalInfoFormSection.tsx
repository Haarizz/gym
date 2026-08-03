import { Dropdown } from '@/shared/components/Dropdown';
import { Input } from '@/shared/components/Input';
import { FormSection } from '@/shared/components/FormSection';
import { BLOOD_GROUPS } from '@/domains/members/constants';

interface MedicalInfoFormSectionProps {
  bloodGroup: string;
  height: string;
  weight: string;
  medicalConditions: string;
  chronicIllnesses: string;
  allergies: string;
  currentMedications: string;
  healthNotes: string;
  errors?: Partial<Record<string, string>>;
  onChangeBloodGroup: (value: string) => void;
  onChangeHeight: (value: string) => void;
  onChangeWeight: (value: string) => void;
  onChangeMedicalConditions: (value: string) => void;
  onChangeChronicIllnesses: (value: string) => void;
  onChangeAllergies: (value: string) => void;
  onChangeCurrentMedications: (value: string) => void;
  onChangeHealthNotes: (value: string) => void;
}

export function MedicalInfoFormSection({
  bloodGroup,
  height,
  weight,
  medicalConditions,
  chronicIllnesses,
  allergies,
  currentMedications,
  healthNotes,
  errors,
  onChangeBloodGroup,
  onChangeHeight,
  onChangeWeight,
  onChangeMedicalConditions,
  onChangeChronicIllnesses,
  onChangeAllergies,
  onChangeCurrentMedications,
  onChangeHealthNotes,
}: MedicalInfoFormSectionProps) {
  return (
    <FormSection title="Medical Information">
      <Dropdown
        label="Blood Group"
        placeholder="Select blood group"
        value={bloodGroup}
        options={BLOOD_GROUPS}
        onChange={onChangeBloodGroup}
        error={errors?.bloodGroup}
      />
      <Input
        label="Height (cm)"
        value={height}
        onChangeText={onChangeHeight}
        placeholder="e.g. 175"
        keyboardType="decimal-pad"
        error={errors?.height}
      />
      <Input
        label="Weight (kg)"
        value={weight}
        onChangeText={onChangeWeight}
        placeholder="e.g. 70"
        keyboardType="decimal-pad"
        error={errors?.weight}
      />
      <Input
        label="Medical Conditions"
        value={medicalConditions}
        onChangeText={onChangeMedicalConditions}
        placeholder="List any conditions"
        error={errors?.medicalConditions}
      />
      <Input
        label="Chronic Illnesses"
        value={chronicIllnesses}
        onChangeText={onChangeChronicIllnesses}
        placeholder="List any chronic illnesses"
        error={errors?.chronicIllnesses}
      />
      <Input
        label="Allergies"
        value={allergies}
        onChangeText={onChangeAllergies}
        placeholder="List any allergies"
        error={errors?.allergies}
      />
      <Input
        label="Current Medications"
        value={currentMedications}
        onChangeText={onChangeCurrentMedications}
        placeholder="List current medications"
        error={errors?.currentMedications}
      />
      <Input
        label="Health Notes"
        value={healthNotes}
        onChangeText={onChangeHealthNotes}
        placeholder="Additional health notes"
        error={errors?.healthNotes}
      />
    </FormSection>
  );
}