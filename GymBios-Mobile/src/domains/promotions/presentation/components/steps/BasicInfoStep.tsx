import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
        label={t('promotions.nameRequired')}
        placeholder={t('promotions.namePlaceholder')}
        value={values.name}
        onChangeText={(val) => onChange('name', val)}
      />

      <Dropdown
        label={t('promotions.promoType')}
        placeholder={t('promotions.selectType')}
        required
        options={TYPE_OPTIONS}
        value={values.type}
        onChange={handleTypeChange}
      />

      <Input
        label={t('promotions.description')}
        placeholder={t('promotions.descriptionPlaceholder')}
        value={values.description}
        onChangeText={(val) => onChange('description', val)}
        multiline
        numberOfLines={3}
      />

      <View style={stepStyles.gridRow}>
        <DatePicker
          style={stepStyles.gridCol}
          label={t('promotions.startDate')}
          value={startDate}
          onChange={handleStartDateChange}
        />
        <DatePicker
          style={stepStyles.gridCol}
          label={t('promotions.endDate')}
          value={endDate}
          minimumDate={startDate ?? undefined}
          onChange={(date) => onChange('endDate', formatFormDate(date))}
        />
      </View>

      <Dropdown
        label={t('promotions.category')}
        placeholder={t('promotions.selectCategory')}
        options={CATEGORY_OPTIONS}
        value={values.category}
        onChange={(val) => onChange('category', val)}
      />

      <Input
        label={t('promotions.codeOptional')}
        placeholder={t('promotions.codePlaceholder')}
        autoCapitalize="characters"
        autoCorrect={false}
        value={values.code}
        onChangeText={(val) => onChange('code', val)}
      />
    </View>
  );
}
