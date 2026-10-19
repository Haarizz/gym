import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  return (
    <FormSection title={t('hr.step.personalTitle')}>
      <Input label={t('hr.personal.fullName')} value={name} onChangeText={onChangeName} placeholder={t('hr.personal.fullNamePlaceholder')} />
      <Input label={t('hr.email')} value={email} onChangeText={onChangeEmail} placeholder={t('hr.personal.emailPlaceholder')} keyboardType="email-address" autoCapitalize="none" />
      <Input label={t('hr.phone')} value={phone} onChangeText={onChangePhone} placeholder={t('hr.personal.phonePlaceholder')} keyboardType="phone-pad" />
      <Input label={t('hr.address')} value={address} onChangeText={onChangeAddress} placeholder={t('hr.personal.addressPlaceholder')} />
      <Input label={t('hr.personal.photoUrl')} value={photoUrl} onChangeText={onChangePhotoUrl} placeholder={t('hr.personal.photoUrlPlaceholder')} autoCapitalize="none" />
    </FormSection>
  );
}