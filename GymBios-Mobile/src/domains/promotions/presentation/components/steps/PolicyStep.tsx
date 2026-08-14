import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BrandColors, Spacing } from '@/core/theme';
import { Input } from '@/shared/components/Input';
import type { PromotionFormData } from '../../hooks/usePromotionWizard';

interface StepProps {
  values: PromotionFormData;
  onChange: (field: keyof PromotionFormData, value: any) => void;
}

export function PolicyStep({ values, onChange }: StepProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionSubtitle}>
        Define legal terms and optional automated policy rule configs.
      </Text>

      <Input
        label="Terms & Conditions"
        placeholder="Enter terms and conditions for this offer..."
        value={values.termsAndConditions}
        onChangeText={(val) => onChange('termsAndConditions', val)}
        multiline
        numberOfLines={4}
      />

      <Input
        label="Policy Rules (JSON optional)"
        placeholder="[]"
        value={values.policyRulesJson}
        onChangeText={(val) => onChange('policyRulesJson', val)}
        multiline
        numberOfLines={3}
      />

      <Input
        label="Policy Config (JSON optional)"
        placeholder="{}"
        value={values.policyConfigJson}
        onChangeText={(val) => onChange('policyConfigJson', val)}
        multiline
        numberOfLines={3}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginBottom: Spacing.one,
  },
});
