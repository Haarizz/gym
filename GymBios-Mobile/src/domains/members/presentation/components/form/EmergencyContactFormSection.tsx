import { Input } from '@/shared/components/Input';
import { FormSection } from '@/shared/components/FormSection';

interface EmergencyContactFormSectionProps {
  contactName: string;
  contactPhone: string;
  onChangeContactName: (value: string) => void;
  onChangeContactPhone: (value: string) => void;
}

export function EmergencyContactFormSection({
  contactName,
  contactPhone,
  onChangeContactName,
  onChangeContactPhone,
}: EmergencyContactFormSectionProps) {
  return (
    <FormSection title="Emergency Contact">
      <Input label="Contact Name" value={contactName} onChangeText={onChangeContactName} placeholder="Enter emergency contact name" />
      <Input label="Contact Phone" value={contactPhone} onChangeText={onChangeContactPhone} placeholder="Enter emergency contact phone" keyboardType="phone-pad" />
    </FormSection>
  );
}