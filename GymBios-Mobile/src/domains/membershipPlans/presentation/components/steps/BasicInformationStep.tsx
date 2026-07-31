import { StyleSheet, Switch, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { useTheme } from '@/core/hooks';
import { FormSection } from '@/shared/components/FormSection';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import type { PlanWizardData } from '../../hooks/useMembershipPlanWizard';

const PLAN_TYPES = ['INDIVIDUAL', 'FAMILY'];
const MEMBERSHIP_TYPES = ['Standard', 'Premium', 'VIP', 'Student', 'Corporate'];
const STATUSES = ['ACTIVE', 'INACTIVE', 'DRAFT'];

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
            // @ts-ignore – pressable via onTouchEnd for simplicity
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

interface BasicInformationStepProps {
  values: PlanWizardData;
  errors: Partial<Record<keyof PlanWizardData, string>>;
  onChange: <K extends keyof PlanWizardData>(field: K, value: PlanWizardData[K]) => void;
}

export function BasicInformationStep({ values, errors, onChange }: BasicInformationStepProps) {
  return (
    <View style={styles.container}>
      <FormSection title="Basic Information">
        <Input
          label="Plan Name *"
          value={values.name}
          onChangeText={(v) => onChange('name', v)}
          placeholder="e.g. Monthly Premium"
          error={errors.name}
        />
        <Input
          label="Description"
          value={values.description}
          onChangeText={(v) => onChange('description', v)}
          placeholder="Describe this plan"
          multiline
          numberOfLines={3}
          style={styles.multiline}
        />

        <Typography variant="bodySmallBold" style={styles.label}>
          Plan Type *
        </Typography>
        <OptionRow
          options={PLAN_TYPES}
          selected={values.planType}
          onSelect={(v) => onChange('planType', v)}
        />

        <Typography variant="bodySmallBold" style={styles.label}>
          Membership Type
        </Typography>
        <OptionRow
          options={MEMBERSHIP_TYPES}
          selected={values.type}
          onSelect={(v) => onChange('type', v)}
        />

        <Typography variant="bodySmallBold" style={styles.label}>
          Status
        </Typography>
        <OptionRow
          options={STATUSES}
          selected={values.status}
          onSelect={(v) => onChange('status', v)}
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
  label: {
    marginTop: Spacing.one,
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
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: Spacing.two,
  },
});
