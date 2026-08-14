import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BrandColors, Spacing } from '@/core/theme';
import { Input } from '@/shared/components/Input';
import type { PromotionFormData } from '../../hooks/usePromotionWizard';

interface StepProps {
  values: PromotionFormData;
  onChange: (field: keyof PromotionFormData, value: any) => void;
}

export function ScheduleStep({ values, onChange }: StepProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionSubtitle}>
        Set the campaign validity dates and execution priority.
      </Text>

      <Input
        label="Start Date (YYYY-MM-DD)"
        placeholder="2026-08-01"
        value={values.startDate}
        onChangeText={(val) => onChange('startDate', val)}
      />

      <Input
        label="End Date (YYYY-MM-DD)"
        placeholder="2026-12-31"
        value={values.endDate}
        onChangeText={(val) => onChange('endDate', val)}
      />

      <Input
        label="Priority (1 = Highest, 5 = Lowest)"
        placeholder="2"
        keyboardType="numeric"
        value={values.priority}
        onChangeText={(val) => onChange('priority', val)}
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
