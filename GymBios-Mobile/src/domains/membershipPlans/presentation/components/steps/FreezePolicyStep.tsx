import { StyleSheet, Switch, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { useTheme } from '@/core/hooks';
import { FormSection } from '@/shared/components/FormSection';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import type { PlanWizardData } from '../../hooks/useMembershipPlanWizard';

interface FreezePolicyStepProps {
  values: PlanWizardData;
  errors: Partial<Record<keyof PlanWizardData, string>>;
  onChange: <K extends keyof PlanWizardData>(field: K, value: PlanWizardData[K]) => void;
}

export function FreezePolicyStep({ values, errors, onChange }: FreezePolicyStepProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <FormSection title="Freeze Policy">
        <Input
          label="Max Freeze Days"
          value={values.maxFreezeDays}
          onChangeText={(v) => onChange('maxFreezeDays', v)}
          placeholder="e.g. 30"
          keyboardType="numeric"
        />
        <Input
          label="Max Freeze Occurrences"
          value={values.maxFreezeOccurrences}
          onChangeText={(v) => onChange('maxFreezeOccurrences', v)}
          placeholder="e.g. 2"
          keyboardType="numeric"
        />
        <Input
          label="Charge Per Extra Day"
          value={values.chargePerExtraDay}
          onChangeText={(v) => onChange('chargePerExtraDay', v)}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
        <Input
          label="Free Days Allowed"
          value={values.freeDaysAllowed}
          onChangeText={(v) => onChange('freeDaysAllowed', v)}
          placeholder="e.g. 7"
          keyboardType="numeric"
        />
        <View style={styles.switchRow}>
          <Typography variant="bodySmallBold">Auto Unfreeze</Typography>
          <Switch
            value={values.autoUnfreeze}
            onValueChange={(v) => onChange('autoUnfreeze', v)}
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
