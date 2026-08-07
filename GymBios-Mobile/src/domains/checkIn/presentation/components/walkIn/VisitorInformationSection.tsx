import { View, StyleSheet } from 'react-native';
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
  return (
    <FormSection title="Visitor Information">
      <View style={styles.row}>
        <View style={styles.inputContainer}>
          <Input 
            label="Full Name *" 
            value={fullName} 
            onChangeText={onChangeFullName} 
            placeholder="e.g. John Doe"
          />
        </View>
        <View style={styles.inputContainer}>
          <Input 
            label="Mobile Number *" 
            value={phone} 
            onChangeText={onChangePhone} 
            placeholder="+1 (000) 000-0000"
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
