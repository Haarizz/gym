import Feather from '@expo/vector-icons/Feather';
import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';

import { useCurrency } from '@/core/providers';
import { Dropdown } from '@/shared/components/Dropdown';
import { Input } from '@/shared/components/Input';
import { isAccessDaysPromotion, PROMO_ACCESS_DAYS } from '../../hooks/usePromotionWizard';
import { stepStyles, type Option, type StepProps } from './formControls';

const DISCOUNT_TYPE_OPTIONS: Option[] = [
  { label: 'Percentage', value: 'percentage' },
  { label: 'Fixed Amount', value: 'fixed' },
  { label: 'Free/BOGO', value: 'free' },
  { label: 'Promotional Access Days', value: PROMO_ACCESS_DAYS },
];

export function DiscountStep({ values, onChange }: StepProps) {
  const { t } = useTranslation();
  const { currencyCode } = useCurrency();
  const accessDays = isAccessDaysPromotion(values);

  return (
    <View style={stepStyles.container}>
      <Dropdown
        label={t('promotions.discountType')}
        placeholder={t('promotions.selectDiscountType')}
        options={DISCOUNT_TYPE_OPTIONS}
        value={values.discountType}
        onChange={(val) => onChange('discountType', val)}
      />

      {!accessDays && (
        <Input
          label={t('promotions.discountValue')}
          placeholder={t('promotions.enterValue')}
          keyboardType="decimal-pad"
          value={values.discountValue}
          onChangeText={(val) => onChange('discountValue', val)}
        />
      )}

      <View style={stepStyles.gridRow}>
        <View style={stepStyles.gridCol}>
          <Input
            label={`${t('promotions.minPurchase')} (${currencyCode})`}
            placeholder={t('promotions.optional')}
            keyboardType="decimal-pad"
            value={values.minimumPurchase}
            onChangeText={(val) => onChange('minimumPurchase', val)}
          />
        </View>
        <View style={stepStyles.gridCol}>
          <Input
            label={`Maximum Discount (${currencyCode})`}
            placeholder={t('promotions.optional')}
            keyboardType="decimal-pad"
            value={values.maximumDiscount}
            onChangeText={(val) => onChange('maximumDiscount', val)}
          />
        </View>
      </View>

      <View style={stepStyles.gridRow}>
        <View style={stepStyles.gridCol}>
          <Input
            label={t('promotions.totalUsageLimit')}
            placeholder={t('promotions.unlimited')}
            keyboardType="number-pad"
            value={values.usageLimit}
            onChangeText={(val) => onChange('usageLimit', val)}
          />
        </View>
        <View style={stepStyles.gridCol}>
          <Input
            label={t('promotions.usageLimitPerMember')}
            placeholder={t('promotions.unlimited')}
            keyboardType="number-pad"
            value={values.usageLimitPerMember}
            onChangeText={(val) => onChange('usageLimitPerMember', val)}
          />
        </View>
      </View>

      {accessDays && (
        <View style={stepStyles.note}>
          <Feather name="info" size={16} color="#92400E" />
          <Text style={stepStyles.noteText}>
            {t('promotions.accessDayRulesNote')}
          </Text>
        </View>
      )}
    </View>
  );
}
