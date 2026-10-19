import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Dropdown } from '@/shared/components/Dropdown';
import { Input } from '@/shared/components/Input';
import { stepStyles, ToggleRow, type Option, type StepProps } from './formControls';

const PRIORITY_OPTIONS: Option[] = [
  { label: 'High (1)', value: '1' },
  { label: 'Medium (2)', value: '2' },
  { label: 'Low (3)', value: '3' },
];

export function SettingsStep({ values, onChange }: StepProps) {
  const { t } = useTranslation();

  return (
    <View style={stepStyles.container}>
      <Dropdown
        label={t('promotions.priorityLevel')}
        placeholder={t('promotions.selectPriority')}
        options={PRIORITY_OPTIONS}
        value={values.priority}
        onChange={(val) => onChange('priority', val)}
      />

      <View>
        <ToggleRow
          label={t('promotions.autoApply')}
          value={values.autoApply}
          onChange={(val) => onChange('autoApply', val)}
        />
        <ToggleRow
          label={t('promotions.combinable')}
          value={values.stackable}
          onChange={(val) => onChange('stackable', val)}
        />
        <ToggleRow
          label={t('promotions.publiclyVisible')}
          value={values.isPublic}
          onChange={(val) => onChange('isPublic', val)}
        />
      </View>

      <Input
        label={t('promotions.terms')}
        placeholder={t('promotions.termsPlaceholder')}
        value={values.termsAndConditions}
        onChangeText={(val) => onChange('termsAndConditions', val)}
        multiline
        numberOfLines={4}
      />

      <Input
        label={t('promotions.tags')}
        placeholder={t('promotions.tagsPlaceholder')}
        autoCapitalize="none"
        value={values.tags}
        onChangeText={(val) => onChange('tags', val)}
      />
    </View>
  );
}
