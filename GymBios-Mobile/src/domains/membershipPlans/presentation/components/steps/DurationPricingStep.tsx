import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { useTheme } from '@/core/hooks';
import { FormSection } from '@/shared/components/FormSection';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import type { PlanWizardData } from '../../hooks/useMembershipPlanWizard';

const DURATION_TYPES = ['Day', 'Week', 'Month', 'Year'];

interface OptionRowProps {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}

function OptionRow({ options, selected, onSelect }: OptionRowProps) {
  const theme = useTheme();
  return (
    <View style={styles.optionRow}>
      {options.map((opt) => {
        const isActive = opt === selected;
        return (
          <View
            key={opt}
            style={[
              styles.optionChip,
              {
                backgroundColor: isActive ? theme.primary : theme.backgroundElement,
                borderColor: isActive ? theme.primary : theme.border,
              },
            ]}
            onTouchEnd={() => onSelect(opt)}
          >
            <Typography
              variant="caption"
              style={[
                styles.optionText,
                { color: isActive ? '#ffffff' : theme.textSecondary },
              ]}
            >
              {opt}
            </Typography>
          </View>
        );
      })}
    </View>
  );
}

interface DurationPricingStepProps {
  values: PlanWizardData;
  errors: Partial<Record<keyof PlanWizardData, string>>;
  onChange: <K extends keyof PlanWizardData>(field: K, value: PlanWizardData[K]) => void;
}

export function DurationPricingStep({ values, errors, onChange }: DurationPricingStepProps) {
  return (
    <View style={styles.container}>
      <FormSection title="Duration">
        <Typography variant="bodySmallBold">Duration Type *</Typography>
        <OptionRow
          options={DURATION_TYPES}
          selected={values.durationType}
          onSelect={(v) => onChange('durationType', v)}
        />
        <Input
          label="Duration Value *"
          value={values.durationValue}
          onChangeText={(v) => onChange('durationValue', v)}
          placeholder="e.g. 1, 3, 12"
          keyboardType="numeric"
          error={errors.durationValue}
        />
      </FormSection>

      <FormSection title="Pricing">
        <Input
          label="Price *"
          value={values.price}
          onChangeText={(v) => onChange('price', v)}
          placeholder="0.00"
          keyboardType="decimal-pad"
          error={errors.price}
        />
        <Input
          label="Discount (%)"
          value={values.discount}
          onChangeText={(v) => onChange('discount', v)}
          placeholder="0"
          keyboardType="numeric"
        />
      </FormSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  optionChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 20,
    borderWidth: 1,
  },
  optionText: {
    fontWeight: '600',
    fontSize: 12,
  },
});
