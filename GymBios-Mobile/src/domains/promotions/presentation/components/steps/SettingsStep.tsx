import React from 'react';
import { View } from 'react-native';

import { Dropdown } from '@/shared/components/Dropdown';
import { Input } from '@/shared/components/Input';
import { stepStyles, ToggleRow, type Option, type StepProps } from './formControls';

const PRIORITY_OPTIONS: Option[] = [
  { label: 'High (1)', value: '1' },
  { label: 'Medium (2)', value: '2' },
  { label: 'Low (3)', value: '3' },
];

export function SettingsStep({ values, onChange }: StepProps) {
  return (
    <View style={stepStyles.container}>
      <Dropdown
        label="Priority Level"
        placeholder="Select priority"
        options={PRIORITY_OPTIONS}
        value={values.priority}
        onChange={(val) => onChange('priority', val)}
      />

      <View>
        <ToggleRow
          label="Auto-apply at checkout"
          value={values.autoApply}
          onChange={(val) => onChange('autoApply', val)}
        />
        <ToggleRow
          label="Can be combined with other promotions"
          value={values.stackable}
          onChange={(val) => onChange('stackable', val)}
        />
        <ToggleRow
          label="Publicly visible"
          value={values.isPublic}
          onChange={(val) => onChange('isPublic', val)}
        />
      </View>

      <Input
        label="Terms & Conditions"
        placeholder="Enter terms and conditions..."
        value={values.termsAndConditions}
        onChangeText={(val) => onChange('termsAndConditions', val)}
        multiline
        numberOfLines={4}
      />

      <Input
        label="Tags (comma-separated)"
        placeholder="e.g., new-year, discount, annual"
        autoCapitalize="none"
        value={values.tags}
        onChangeText={(val) => onChange('tags', val)}
      />
    </View>
  );
}
