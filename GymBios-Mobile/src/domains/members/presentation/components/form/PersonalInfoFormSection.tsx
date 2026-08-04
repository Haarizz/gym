import { AvatarPicker } from '@/shared/components/AvatarPicker';
import { DatePicker } from '@/shared/components/DatePicker';
import { Dropdown } from '@/shared/components/Dropdown';
import { Input } from '@/shared/components/Input';
import { FormSection } from '@/shared/components/FormSection';
import { GENDERS } from '@/domains/members/constants';

interface PersonalInfoFormSectionProps {
  name: string;
  gender: string;
  dateOfBirth: Date | null;
  nationality: string;
  phone: string;
  email: string;
  address: string;
  photoUri?: string;
  photoUrl?: string;
  errors?: Partial<Record<string, string>>;
  onChangeName: (value: string) => void;
  onChangeGender: (value: string) => void;
  onChangeDateOfBirth: (date: Date | null) => void;
  onChangeNationality: (value: string) => void;
  onChangePhone: (value: string) => void;
  onChangeEmail: (value: string) => void;
  onChangeAddress: (value: string) => void;
  onChangePhoto: (uri?: string) => void;
}

export function PersonalInfoFormSection({
  name,
  gender,
  dateOfBirth,
  nationality,
  phone,
  email,
  address,
  photoUri,
  photoUrl,
  errors,
  onChangeName,
  onChangeGender,
  onChangeDateOfBirth,
  onChangeNationality,
  onChangePhone,
  onChangeEmail,
  onChangeAddress,
  onChangePhoto,
}: PersonalInfoFormSectionProps) {
  return (
    <>
      <AvatarPicker
        photoUri={photoUri}
        photoUrl={photoUrl}
        name={name}
        onChangePhoto={onChangePhoto}
      />
      <FormSection title="Personal Information">
        <Input
          label="Full Name *"
          value={name}
          onChangeText={onChangeName}
          placeholder="Enter full name"
          error={errors?.name}
        />
        <Dropdown
          label="Gender"
          placeholder="Select gender"
          value={gender}
          options={GENDERS}
          onChange={onChangeGender}
          error={errors?.gender}
        />
        <DatePicker
          label="Date of Birth"
          placeholder="Select date of birth"
          value={dateOfBirth}
          onChange={onChangeDateOfBirth}
          maximumDate={new Date()}
          error={errors?.dateOfBirth}
        />
        <Input
          label="Nationality"
          value={nationality}
          onChangeText={onChangeNationality}
          placeholder="e.g. UAE"
          error={errors?.nationality}
        />
        <Input
          label="Phone *"
          value={phone}
          onChangeText={onChangePhone}
          placeholder="Enter phone number"
          keyboardType="phone-pad"
          error={errors?.phone}
        />
        <Input
          label="Email"
          value={email}
          onChangeText={onChangeEmail}
          placeholder="Enter email address"
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors?.email}
        />
        <Input
          label="Address"
          value={address}
          onChangeText={onChangeAddress}
          placeholder="Enter address"
          error={errors?.address}
        />
      </FormSection>
    </>
  );
}