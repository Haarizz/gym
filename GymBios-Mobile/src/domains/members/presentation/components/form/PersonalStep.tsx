import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { DatePicker } from '@/shared/components/DatePicker';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import { GENDERS } from '@/domains/members/constants';
import { getMaxBirthDate, getMinBirthDate } from '@/domains/profile/domain/dateOfBirthRules';

import { FormCard, RequiredLabel } from './FormCard';
import { MemberPhotoCard } from './MemberPhotoCard';
import type { MemberStepProps } from './stepTypes';

export function PersonalStep({ data, updateField, errors }: MemberStepProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <MemberPhotoCard data={data} updateField={updateField} errors={errors} />

      <FormCard icon="user" title={t('members.form.personalStep.basicDetails')}>
        <Input
          label={<RequiredLabel>{t('members.form.personalStep.fullName')}</RequiredLabel>}
          value={data.name}
          onChangeText={(v) => updateField('name', v)}
          placeholder={t('members.form.personalStep.fullNamePlaceholder')}
          autoCapitalize="words"
          textContentType="name"
          returnKeyType="next"
          error={errors?.name}
        />

        <View>
          <Typography variant="bodySmallBold" style={styles.label}>
            {t('members.form.personalStep.gender')}
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
          label={t('members.form.personalStep.dob')}
          placeholder={t('members.form.personalStep.dobPlaceholder')}
          value={data.dateOfBirth}
          onChange={(d) => updateField('dateOfBirth', d)}
          initialView="year"
          minimumDate={getMinBirthDate()}
          maximumDate={getMaxBirthDate()}
          error={errors?.dateOfBirth}
        />

        <Input
          label={t('members.form.personalStep.nationality')}
          value={data.nationality}
          onChangeText={(v) => updateField('nationality', v)}
          placeholder={t('members.form.personalStep.nationalityPlaceholder')}
          autoCapitalize="words"
        />
      </FormCard>

      <FormCard
        icon="phone"
        title={t('members.form.personalStep.contact')}
        description={t('members.form.personalStep.contactDescription')}
      >
        <Input
          label={<RequiredLabel>{t('members.form.personalStep.phone')}</RequiredLabel>}
          value={data.phone}
          onChangeText={(v) => updateField('phone', v)}
          placeholder={t('members.form.personalStep.phonePlaceholder')}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          error={errors?.phone}
        />
        <Input
          label={t('members.form.personalStep.email')}
          value={data.email}
          onChangeText={(v) => updateField('email', v)}
          placeholder={t('members.form.personalStep.emailPlaceholder')}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoCapitalize="none"
          autoCorrect={false}
          error={errors?.email}
        />
        <Input
          label={t('members.form.personalStep.address')}
          value={data.address}
          onChangeText={(v) => updateField('address', v)}
          placeholder={t('members.form.personalStep.addressPlaceholder')}
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
