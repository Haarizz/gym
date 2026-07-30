import { Input } from '@/shared/components/Input';
import { FormSection } from '@/shared/components/FormSection';

interface PersonalInfoSectionProps {
  name: string;
  email: string;
  phone: string;
  address: string;
  photoUrl: string;
  onChangeName: (value: string) => void;
  onChangeEmail: (value: string) => void;
  onChangePhone: (value: string) => void;
  onChangeAddress: (value: string) => void;
  onChangePhotoUrl: (value: string) => void;
}

export function PersonalInfoSection({
  name,
  email,
  phone,
  address,
  photoUrl,
  onChangeName,
  onChangeEmail,
  onChangePhone,
  onChangeAddress,
  onChangePhotoUrl,
}: PersonalInfoSectionProps) {
  return (
    <FormSection title="Personal Information">
      <Input label="Full Name" value={name} onChangeText={onChangeName} placeholder="Enter full name" />
      <Input label="Email" value={email} onChangeText={onChangeEmail} placeholder="Enter email address" keyboardType="email-address" autoCapitalize="none" />
      <Input label="Phone" value={phone} onChangeText={onChangePhone} placeholder="Enter phone number" keyboardType="phone-pad" />
      <Input label="Address" value={address} onChangeText={onChangeAddress} placeholder="Enter address" />
      <Input label="Photo URL" value={photoUrl} onChangeText={onChangePhotoUrl} placeholder="Enter photo URL" autoCapitalize="none" />
    </FormSection>
  );
}