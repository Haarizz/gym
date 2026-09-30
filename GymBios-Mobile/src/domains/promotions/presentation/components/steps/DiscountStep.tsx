import Feather from '@expo/vector-icons/Feather';
import React from 'react';
import { Text, View } from 'react-native';

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
  const { currencyCode } = useCurrency();
  const accessDays = isAccessDaysPromotion(values);

  return (
    <View style={stepStyles.container}>
      <Dropdown
        label="Discount Type"
        placeholder="Select discount type"
        options={DISCOUNT_TYPE_OPTIONS}
        value={values.discountType}
        onChange={(val) => onChange('discountType', val)}
      />

      {!accessDays && (
        <Input
          label="Discount Value"
          placeholder="Enter value"
          keyboardType="decimal-pad"
          value={values.discountValue}
          onChangeText={(val) => onChange('discountValue', val)}
        />
      )}

      <View style={stepStyles.gridRow}>
        <View style={stepStyles.gridCol}>
          <Input
            label={`Minimum Purchase (${currencyCode})`}
            placeholder="Optional"
            keyboardType="decimal-pad"
            value={values.minimumPurchase}
            onChangeText={(val) => onChange('minimumPurchase', val)}
          />
        </View>
        <View style={stepStyles.gridCol}>
          <Input
            label={`Maximum Discount (${currencyCode})`}
            placeholder="Optional"
            keyboardType="decimal-pad"
            value={values.maximumDiscount}
            onChangeText={(val) => onChange('maximumDiscount', val)}
          />
        </View>
      </View>

      <View style={stepStyles.gridRow}>
        <View style={stepStyles.gridCol}>
          <Input
            label="Total Usage Limit"
            placeholder="Unlimited"
            keyboardType="number-pad"
            value={values.usageLimit}
            onChangeText={(val) => onChange('usageLimit', val)}
          />
        </View>
        <View style={stepStyles.gridCol}>
          <Input
            label="Usage Limit Per Member"
            placeholder="Unlimited"
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
            Access-day eligibility rules are configured from the web dashboard. Any rules
            already set on this promotion are kept when you save.
          </Text>
        </View>
      )}
    </View>
  );
}
