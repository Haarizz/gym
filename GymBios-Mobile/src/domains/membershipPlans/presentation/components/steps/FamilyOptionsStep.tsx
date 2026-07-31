import { StyleSheet, Switch, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { useTheme } from '@/core/hooks';
import { FormSection } from '@/shared/components/FormSection';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import type { PlanWizardData } from '../../hooks/useMembershipPlanWizard';

const BILLING_MODES = ['Per Family', 'Per Member', 'Flat Rate'];

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
              style={[styles.optionText, { color: isActive ? '#ffffff' : theme.textSecondary }]}
            >
              {opt}
            </Typography>
          </View>
        );
      })}
    </View>
  );
}

interface FamilyOptionsStepProps {
  values: PlanWizardData;
  errors: Partial<Record<keyof PlanWizardData, string>>;
  onChange: <K extends keyof PlanWizardData>(field: K, value: PlanWizardData[K]) => void;
}

export function FamilyOptionsStep({ values, errors, onChange }: FamilyOptionsStepProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <FormSection title="Family Billing">
        <Typography variant="bodySmallBold">Billing Mode</Typography>
        <OptionRow
          options={BILLING_MODES}
          selected={values.familyBillingMode}
          onSelect={(v) => onChange('familyBillingMode', v)}
        />
        <Input
          label="Price Per Member"
          value={values.pricePerMember}
          onChangeText={(v) => onChange('pricePerMember', v)}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
      </FormSection>

      <FormSection title="Family Members">
        <Input
          label="Max Family Members"
          value={values.maxFamilyMembers}
          onChangeText={(v) => onChange('maxFamilyMembers', v)}
          placeholder="e.g. 5"
          keyboardType="numeric"
        />
        <Input
          label="Max Adult Members"
          value={values.maxAdultMembers}
          onChangeText={(v) => onChange('maxAdultMembers', v)}
          placeholder="e.g. 2"
          keyboardType="numeric"
        />
        <Input
          label="Max Child Members"
          value={values.maxChildMembers}
          onChangeText={(v) => onChange('maxChildMembers', v)}
          placeholder="e.g. 3"
          keyboardType="numeric"
        />
      </FormSection>

      <FormSection title="Additional Members">
        <View style={styles.switchRow}>
          <Typography variant="bodySmallBold">Allow Additional Members</Typography>
          <Switch
            value={values.allowAdditionalMembers}
            onValueChange={(v) => onChange('allowAdditionalMembers', v)}
            trackColor={{ false: theme.muted, true: theme.primary }}
            thumbColor={theme.backgroundElement}
          />
        </View>
        {values.allowAdditionalMembers && (
          <Input
            label="Additional Member Price"
            value={values.additionalMemberPrice}
            onChangeText={(v) => onChange('additionalMemberPrice', v)}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
        )}
        <View style={styles.switchRow}>
          <Typography variant="bodySmallBold">Auto Calculate Total</Typography>
          <Switch
            value={values.autoCalculateTotal}
            onValueChange={(v) => onChange('autoCalculateTotal', v)}
            trackColor={{ false: theme.muted, true: theme.primary }}
            thumbColor={theme.backgroundElement}
          />
        </View>
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
