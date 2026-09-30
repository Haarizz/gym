import React from 'react';
import { View } from 'react-native';

import { Dropdown } from '@/shared/components/Dropdown';
import { CheckboxGroup, stepStyles, type Option, type StepProps } from './formControls';

const AUDIENCE_OPTIONS: Option[] = [
  { label: 'All Members', value: 'all' },
  { label: 'New Members', value: 'new-members' },
  { label: 'Existing Members', value: 'existing-members' },
  { label: 'VIP Members', value: 'vip' },
  { label: 'Specific Members', value: 'specific' },
];

const CHANNEL_OPTIONS: Option[] = [
  { label: 'Website', value: 'website' },
  { label: 'Mobile App', value: 'app' },
  { label: 'Email', value: 'email' },
  { label: 'SMS', value: 'sms' },
  { label: 'In-Person', value: 'in-person' },
];

const PLAN_OPTIONS: Option[] = [
  { label: 'Standard Monthly', value: 'Standard Monthly' },
  { label: 'Standard Annual', value: 'Standard Annual' },
  { label: 'Premium Monthly', value: 'Premium Monthly' },
  { label: 'Premium Annual', value: 'Premium Annual' },
];

export function TargetingStep({ values, onChange }: StepProps) {
  return (
    <View style={stepStyles.container}>
      <Dropdown
        label="Target Audience"
        placeholder="Select target audience"
        options={AUDIENCE_OPTIONS}
        value={values.targetAudience}
        onChange={(val) => onChange('targetAudience', val)}
      />

      <CheckboxGroup
        label="Distribution Channels"
        options={CHANNEL_OPTIONS}
        selected={values.channels}
        onChange={(next) => onChange('channels', next)}
      />

      <CheckboxGroup
        label="Applicable Subscriptions"
        options={PLAN_OPTIONS}
        selected={values.applicablePlans}
        onChange={(next) => onChange('applicablePlans', next)}
      />
    </View>
  );
}
