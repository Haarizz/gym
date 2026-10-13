import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps, ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import { FormCard, RequiredLabel } from '@/domains/members/presentation/components/form/FormCard';
import type { StaffStepErrors } from '../../hooks/useStaffWizard';
import type { StaffStepProps } from './stepTypes';

interface AppAccessStepProps extends StaffStepProps {
  mode: 'create' | 'edit';
  /** Editing staff who already have an app login (password can be left blank). */
  hasExistingLogin?: boolean;
  goToStep: (step: number) => void;
  validateStep: (step: number) => StaffStepErrors;
}

const formatDate = (value: string) => (value ? format(parseISO(value), 'd MMM yyyy') : '—');

const formatAmount = (value: string) => {
  const amount = parseFloat(value);
  return Number.isFinite(amount) && amount > 0 ? <CurrencyValue amount={amount} decimals={2} /> : '—';
};

export function AppAccessStep({
  data,
  updateField,
  errors,
  mode,
  hasExistingLogin = false,
  goToStep,
  validateStep,
}: AppAccessStepProps) {
  const theme = useTheme();

  const workingDays = Object.values(data.schedule).filter((slots) => slots?.length).length;
  const certNames = data.certifications.map((c) => c.certName.trim()).filter(Boolean);

  return (
    <View style={styles.container}>
      <FormCard icon="smartphone" title="App access">
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Typography variant="bodySmallBold">Allow mobile app login</Typography>
            <Typography variant="caption" color="textSecondary">
              Staff can sign in with the permissions of their role
            </Typography>
          </View>
          <Switch
            value={data.appAccessEnabled}
            onValueChange={(v) => updateField('appAccessEnabled', v)}
            trackColor={{ false: theme.muted, true: theme.primary }}
            thumbColor={BrandColors.white}
          />
        </View>

        {data.appAccessEnabled ? (
          <View style={styles.fields}>
            <Input
              label={<RequiredLabel>Username</RequiredLabel>}
              value={data.username}
              onChangeText={(v) => updateField('username', v)}
              placeholder="e.g. omar.khalid"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              error={errors?.username}
            />
            <Input
              label={mode === 'create' ? <RequiredLabel>Password</RequiredLabel> : 'New password'}
              value={data.password}
              onChangeText={(v) => updateField('password', v)}
              placeholder={mode === 'create' ? 'At least 6 characters' : 'Leave blank to keep current'}
              secureTextEntry
              textContentType="newPassword"
              autoCapitalize="none"
              error={errors?.password}
            />
            <Input
              label={mode === 'create' ? <RequiredLabel>Confirm password</RequiredLabel> : 'Confirm new password'}
              value={data.confirmPassword}
              onChangeText={(v) => updateField('confirmPassword', v)}
              placeholder="Re-enter password"
              secureTextEntry
              textContentType="newPassword"
              autoCapitalize="none"
              error={errors?.confirmPassword}
            />
            {hasExistingLogin && !data.password ? (
              <Typography variant="caption" color="textSecondary">
                This staff member already has a login. Their current password stays unchanged.
              </Typography>
            ) : null}
          </View>
        ) : null}
      </FormCard>

      <Typography variant="caption" color="textSecondary" style={styles.reviewHeading}>
        REVIEW
      </Typography>

      <ReviewCard
        icon="user"
        title="Personal"
        step={1}
        goToStep={goToStep}
        invalid={Object.keys(validateStep(1)).length > 0}
        rows={[
          ['Name', data.name || '—'],
          ['Email', data.email || '—'],
          ['Phone', data.phone || '—'],
        ]}
      />

      <ReviewCard
        icon="briefcase"
        title="Employment"
        step={2}
        goToStep={goToStep}
        invalid={Object.keys(validateStep(2)).length > 0}
        rows={[
          ['Role', data.role || '—'],
          ['Department', data.department || '—'],
          ['Branch', data.branch || '—'],
          ['Joined', formatDate(data.joinDate)],
        ]}
      />

      <ReviewCard
        icon="dollar-sign"
        title="Compensation"
        step={3}
        goToStep={goToStep}
        invalid={Object.keys(validateStep(3)).length > 0}
        rows={[
          ['Salary', formatAmount(data.salary)],
          ['Target', formatAmount(data.monthlyTarget)],
        ]}
      />

      <ReviewCard
        icon="calendar"
        title="Schedule"
        step={4}
        goToStep={goToStep}
        rows={[
          ['Working days', workingDays ? `${workingDays} per week` : 'Not set'],
          ['Certifications', certNames.length ? certNames.join(', ') : 'None'],
        ]}
      />
    </View>
  );
}

type Row = [string, ReactNode];

interface ReviewCardProps {
  icon: ComponentProps<typeof Feather>['name'];
  title: string;
  step: number;
  rows: Row[];
  goToStep: (step: number) => void;
  invalid?: boolean;
}

function ReviewCard({ icon, title, step, rows, goToStep, invalid }: ReviewCardProps) {
  const theme = useTheme();
  return (
    <FormCard
      icon={icon}
      title={title}
      description={invalid ? 'Needs attention' : undefined}
      action={
        <Pressable
          onPress={() => goToStep(step)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${title}`}
          style={({ pressed }) => [styles.editLink, pressed && { opacity: 0.6 }]}
        >
          <Feather name="edit-2" size={13} color={theme.primary} />
          <Typography variant="caption" style={[styles.editText, { color: theme.primary }]}>
            Edit
          </Typography>
        </Pressable>
      }
    >
      <View style={[styles.rows, invalid && { borderLeftColor: theme.error, borderLeftWidth: 2, paddingLeft: Spacing.two }]}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Typography variant="bodySmall" color="textSecondary" style={styles.rowLabel}>
              {label}
            </Typography>
            <Typography variant="bodySmall" style={styles.rowValue} numberOfLines={2}>
              {value}
            </Typography>
          </View>
        ))}
      </View>
    </FormCard>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchText: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  fields: {
    gap: Spacing.md,
  },
  reviewHeading: {
    marginTop: Spacing.two,
    marginLeft: Spacing.one,
    letterSpacing: 1,
    fontWeight: '700',
  },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.full,
  },
  editText: {
    fontWeight: '700',
  },
  rows: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  rowLabel: {
    width: 104,
  },
  rowValue: {
    flex: 1,
    textAlign: 'right',
  },
});
