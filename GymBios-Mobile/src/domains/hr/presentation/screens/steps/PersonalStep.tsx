import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Spacing } from '@/core/theme';
import { Input } from '@/shared/components/Input';
import { FormCard, RequiredLabel } from '@/domains/members/presentation/components/form/FormCard';
import { MemberPhotoCard } from '@/domains/members/presentation/components/form/MemberPhotoCard';
import type { StaffStepProps } from './stepTypes';

export function PersonalStep({ data, updateField, errors }: StaffStepProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <MemberPhotoCard
        data={data}
        updateField={updateField}
        errors={errors}
        hint={t('hr.personal.photoHint')}
      />

      <FormCard icon="user" title={t('hr.personal.basicDetails')}>
        <Input
          label={<RequiredLabel>{t('hr.personal.fullName')}</RequiredLabel>}
          value={data.name}
          onChangeText={(v) => updateField('name', v)}
          placeholder={t('hr.personal.fullNamePlaceholder')}
          autoCapitalize="words"
          textContentType="name"
          error={errors?.name}
        />
      </FormCard>

      <FormCard icon="phone" title={t('hr.personal.contact')} description={t('hr.personal.contactDesc')}>
        <Input
          label={<RequiredLabel>{t('hr.email')}</RequiredLabel>}
          value={data.email}
          onChangeText={(v) => updateField('email', v)}
          placeholder={t('hr.personal.emailPlaceholder')}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoCapitalize="none"
          autoCorrect={false}
          error={errors?.email}
        />
        <Input
          label={<RequiredLabel>{t('hr.phone')}</RequiredLabel>}
          value={data.phone}
          onChangeText={(v) => updateField('phone', v)}
          placeholder={t('hr.personal.phonePlaceholder')}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          error={errors?.phone}
        />
        <Input
          label={t('hr.address')}
          value={data.address}
          onChangeText={(v) => updateField('address', v)}
          placeholder={t('hr.personal.addressPlaceholder')}
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
