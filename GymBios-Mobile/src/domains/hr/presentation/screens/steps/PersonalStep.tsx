import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { Input } from '@/shared/components/Input';
import { FormCard, RequiredLabel } from '@/domains/members/presentation/components/form/FormCard';
import { MemberPhotoCard } from '@/domains/members/presentation/components/form/MemberPhotoCard';
import type { StaffStepProps } from './stepTypes';

export function PersonalStep({ data, updateField, errors }: StaffStepProps) {
  return (
    <View style={styles.container}>
      <MemberPhotoCard
        data={data}
        updateField={updateField}
        errors={errors}
        hint="Optional · shown on the staff profile and schedules"
      />

      <FormCard icon="user" title="Basic details">
        <Input
          label={<RequiredLabel>Full name</RequiredLabel>}
          value={data.name}
          onChangeText={(v) => updateField('name', v)}
          placeholder="e.g. Omar Khalid"
          autoCapitalize="words"
          textContentType="name"
          error={errors?.name}
        />
      </FormCard>

      <FormCard icon="phone" title="Contact" description="Used for payroll, alerts and login recovery">
        <Input
          label={<RequiredLabel>Email</RequiredLabel>}
          value={data.email}
          onChangeText={(v) => updateField('email', v)}
          placeholder="name@example.com"
          keyboardType="email-address"
          textContentType="emailAddress"
          autoCapitalize="none"
          autoCorrect={false}
          error={errors?.email}
        />
        <Input
          label={<RequiredLabel>Phone</RequiredLabel>}
          value={data.phone}
          onChangeText={(v) => updateField('phone', v)}
          placeholder="e.g. +971 50 123 4567"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          error={errors?.phone}
        />
        <Input
          label="Address"
          value={data.address}
          onChangeText={(v) => updateField('address', v)}
          placeholder="Street, area, city"
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
  multiline: {
    minHeight: 72,
    paddingTop: Spacing.md,
    textAlignVertical: 'top',
  },
});
