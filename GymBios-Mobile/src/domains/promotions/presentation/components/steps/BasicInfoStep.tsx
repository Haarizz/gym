import React from 'react';
import { View } from 'react-native';

import { DatePicker } from '@/shared/components/DatePicker';
import { Dropdown } from '@/shared/components/Dropdown';
import { Input } from '@/shared/components/Input';
import { PROMO_ACCESS_DAYS } from '../../hooks/usePromotionWizard';
import {
  formatFormDate,
  parseFormDate,
  stepStyles,
  type Option,
  type StepProps,
} from './formControls';

// Option lists mirror the web promotion form (Gym-frontend promotions-campaign.tsx).
const TYPE_OPTIONS: Option[] = [
  { label: 'Discount', value: 'discount' },
  { label: 'Voucher', value: 'voucher' },
  { label: 'Combo', value: 'combo' },
  { label: 'BOGO', value: 'bogo' },
  { label: 'Seasonal', value: 'seasonal' },
  { label: 'Loyalty', value: 'loyalty' },
  { label: 'Promotional Access Days', value: PROMO_ACCESS_DAYS },
];

const CATEGORY_OPTIONS: Option[] = [
  { label: 'Membership', value: 'membership' },
  { label: 'Services', value: 'services' },
  { label: 'Special Events', value: 'special-events' },
  { label: 'Loyalty', value: 'loyalty' },
  { label: 'Demographics', value: 'demographics' },
];

export function BasicInfoStep({ values, onChange }: StepProps) {
  const startDate = parseFormDate(values.startDate);
  const endDate = parseFormDate(values.endDate);

  const handleTypeChange = (type: string) => {
    onChange('type', type);
    if (type === PROMO_ACCESS_DAYS) {
      onChange('discountType', PROMO_ACCESS_DAYS);
    }
  };

  const handleStartDateChange = (date: Date | null) => {
    onChange('startDate', formatFormDate(date));
    // Keep the range valid instead of silently leaving an end date before the start.
    if (date && endDate && endDate < date) {
      onChange('endDate', '');
    }
  };

  return (
    <View style={stepStyles.container}>
      <Input
        label="Promotion Name *"
        placeholder="Enter promotion name"
        value={values.name}
        onChangeText={(val) => onChange('name', val)}
      />

      <Dropdown
        label="Promotion Type"
        placeholder="Select type"
        required
        options={TYPE_OPTIONS}
        value={values.type}
        onChange={handleTypeChange}
      />

      <Input
        label="Description"
        placeholder="Describe your promotion"
        value={values.description}
        onChangeText={(val) => onChange('description', val)}
        multiline
        numberOfLines={3}
      />

      <View style={stepStyles.gridRow}>
        <DatePicker
          style={stepStyles.gridCol}
          label="Start Date"
          value={startDate}
          onChange={handleStartDateChange}
        />
        <DatePicker
          style={stepStyles.gridCol}
          label="End Date"
          value={endDate}
          minimumDate={startDate ?? undefined}
          onChange={(date) => onChange('endDate', formatFormDate(date))}
        />
      </View>

      <Dropdown
        label="Category"
        placeholder="Select category"
        options={CATEGORY_OPTIONS}
        value={values.category}
        onChange={(val) => onChange('category', val)}
      />

      <Input
        label="Promotion Code (Optional)"
        placeholder="e.g., NEWYEAR2024"
        autoCapitalize="characters"
        autoCorrect={false}
        value={values.code}
        onChangeText={(val) => onChange('code', val)}
      />
    </View>
  );
}
