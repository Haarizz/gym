import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { DatePicker } from '@/shared/components/DatePicker';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import { GENDERS } from '@/domains/members/constants';

import { FormCard, RequiredLabel } from './FormCard';
import { MemberPhotoCard } from './MemberPhotoCard';
import type { MemberStepProps } from './stepTypes';

export function PersonalStep({ data, updateField, errors }: MemberStepProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <MemberPhotoCard data={data} updateField={updateField} errors={errors} />

      <FormCard icon="user" title="Basic details">
        <Input
          label={<RequiredLabel>Full name</RequiredLabel>}
          value={data.name}
          onChangeText={(v) => updateField('name', v)}
          placeholder="e.g. Sara Ahmed"
          autoCapitalize="words"
          textContentType="name"
          returnKeyType="next"
          error={errors?.name}
        />

        <View>
          <Typography variant="bodySmallBold" style={styles.label}>
            Gender
          </Typography>
          <View style={styles.chips}>
            {GENDERS.map((option) => {
              const selected = data.gender === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => updateField('gender', selected ? '' : option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      borderColor: selected ? theme.primary : theme.border,
                      backgroundColor: selected ? 'rgba(50,127,116,0.10)' : theme.backgroundElement,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <Typography
                    variant="bodySmallBold"
                    style={{ color: selected ? theme.primary : theme.textSecondary }}
                  >
                    {option.label}
                  </Typography>
                </Pressable>
              );
            })}
          </View>
        </View>

        <DatePicker
          label="Date of birth"
          placeholder="Select date of birth"
          value={data.dateOfBirth}
          onChange={(d) => updateField('dateOfBirth', d)}
          maximumDate={new Date()}
          error={errors?.dateOfBirth}
        />

        <Input
          label="Nationality"
          value={data.nationality}
          onChangeText={(v) => updateField('nationality', v)}
          placeholder="e.g. UAE"
          autoCapitalize="words"
        />
      </FormCard>

      <FormCard icon="phone" title="Contact" description="Used for reminders, receipts and login recovery">
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
          label="Email"
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
  label: {
    marginBottom: Spacing.one,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  multiline: {
    minHeight: 72,
    paddingTop: Spacing.md,
    textAlignVertical: 'top',
  },
});
