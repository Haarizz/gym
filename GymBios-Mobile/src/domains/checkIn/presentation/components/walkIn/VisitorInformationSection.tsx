import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/components/Input';
import { Spacing } from '@/core/theme';
import { VisitorPhotoPicker } from './VisitorPhotoPicker';
import { FormSection } from '@/shared/components/FormSection';

interface VisitorInformationSectionProps {
  fullName: string;
  onChangeFullName: (name: string) => void;
  phone: string;
  onChangePhone: (phone: string) => void;
  photoUri: string | null;
  onPhotoChange: (uri: string | null) => void;
}

export function VisitorInformationSection({
  fullName,
  onChangeFullName,
  phone,
  onChangePhone,
  photoUri,
  onPhotoChange
}: VisitorInformationSectionProps) {
  const { t } = useTranslation();
  return (
    <FormSection title={t('checkIn.walkIn.visitorInfoTitle')}>
      <View style={styles.row}>
        <View style={styles.inputContainer}>
          <Input 
            label={t('checkIn.walkIn.fullNameLabel')} 
            value={fullName} 
            onChangeText={onChangeFullName} 
            placeholder={t('checkIn.walkIn.fullNamePlaceholder')}
          />
        </View>
        <View style={styles.inputContainer}>
          <Input 
            label={t('checkIn.walkIn.mobileNumberLabel')} 
            value={phone} 
            onChangeText={onChangePhone} 
            placeholder={t('checkIn.walkIn.mobileNumberPlaceholder')}
            keyboardType="phone-pad"
          />
        </View>
      </View>
      
      <VisitorPhotoPicker photoUri={photoUri} onPhotoChange={onPhotoChange} />
    </FormSection>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginBottom: Spacing.four,
  },
  inputContainer: {
    flex: 1,
  },
});
