import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { AvatarPicker } from '@/shared/components/AvatarPicker';
import { DatePicker } from '@/shared/components/DatePicker';
import { Dropdown } from '@/shared/components/Dropdown';
import { Input } from '@/shared/components/Input';
import { FormSection } from '@/shared/components/FormSection';
import { GENDERS } from '@/domains/members/constants';
import type { MemberWizardData } from '@/domains/members/hooks/useMemberWizard';

interface PersonalStepProps {
  data: MemberWizardData;
  updateField: (field: keyof MemberWizardData, value: any) => void;
}

export function PersonalStep({ data, updateField }: PersonalStepProps) {
  return (
    <View style={styles.container}>
      <AvatarPicker
        photoUri={data.photoUri}
        photoUrl={data.photoUrl}
        name={data.name}
        onChangePhoto={(uri) => {
          updateField('photoUri', uri);
          updateField('photoUrl', uri || '');
        }}
      />

      <FormSection title="Personal Information">
        <Input
          label="Full Name *"
          value={data.name}
          onChangeText={(v) => updateField('name', v)}
          placeholder="Enter full name"
        />
        <Dropdown
          label="Gender"
          placeholder="Select gender"
          value={data.gender}
          options={GENDERS}
          onChange={(v) => updateField('gender', v)}
        />
        <DatePicker
          label="Date of Birth"
          placeholder="Select date of birth"
          value={data.dateOfBirth}
          onChange={(d) => updateField('dateOfBirth', d)}
          maximumDate={new Date()}
        />
        <Input
          label="Nationality"
          value={data.nationality}
          onChangeText={(v) => updateField('nationality', v)}
          placeholder="e.g. UAE"
        />
        <Input
          label="Phone *"
          value={data.phone}
          onChangeText={(v) => updateField('phone', v)}
          placeholder="Enter phone number"
          keyboardType="phone-pad"
        />
        <Input
          label="Email"
          value={data.email}
          onChangeText={(v) => updateField('email', v)}
          placeholder="Enter email address"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label="Address"
          value={data.address}
          onChangeText={(v) => updateField('address', v)}
          placeholder="Enter address"
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
