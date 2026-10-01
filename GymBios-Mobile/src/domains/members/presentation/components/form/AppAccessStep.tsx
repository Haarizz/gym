import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { format } from 'date-fns';

import { useTheme } from '@/core/hooks';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import { useMembershipPlans } from '@/domains/membershipPlans';
import { GENDERS, MEMBERSHIP_TYPES, RELATIONSHIPS } from '@/domains/members/constants';
import type { StepErrors } from '@/domains/members/hooks/useMemberWizard';

import { FormCard, RequiredLabel } from './FormCard';
import type { MemberStepProps } from './stepTypes';

interface AppAccessStepProps extends MemberStepProps {
  mode: 'create' | 'edit';
  /** Editing a member who already has an app login (password can be left blank). */
  hasExistingLogin?: boolean;
  goToStep: (step: number) => void;
  validateStep: (step: number) => StepErrors;
}

const labelOf = (options: readonly { value: string; label: string }[], value: string) =>
  options.find((o) => o.value === value)?.label ?? value;

const formatDate = (d: Date | null) => (d ? format(d, 'd MMM yyyy') : '—');

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
  const { plans } = useMembershipPlans();
  const plan = plans.find((p) => String(p.id) === data.membershipPlanId);

  const isFamily = data.membershipType?.toUpperCase() === 'FAMILY';
  const fee = parseFloat(data.membershipFee || '');
  const bodyStats = [
    data.bloodGroup && `Blood ${data.bloodGroup}`,
    data.height && `${data.height} cm`,
    data.weight && `${data.weight} kg`,
  ].filter(Boolean);
  const healthNotesCount = [
    data.medicalConditions,
    data.chronicIllnesses,
    data.allergies,
    data.currentMedications,
    data.healthNotes,
  ].filter((v) => v.trim()).length;

  return (
    <View style={styles.container}>
      <FormCard icon="smartphone" title="App access">
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Typography variant="bodySmallBold">Allow mobile app login</Typography>
            <Typography variant="caption" color="textSecondary">
              Member can book classes, check in and view their plan
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
              placeholder="e.g. sara.ahmed"
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
                This member already has a login. Their current password stays unchanged.
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
          ['Phone', data.phone || '—'],
          ['Email', data.email || '—'],
          ['Gender', data.gender ? labelOf(GENDERS, data.gender) : '—'],
          ['Date of birth', formatDate(data.dateOfBirth)],
        ]}
      />

      <ReviewCard
        icon="credit-card"
        title="Membership"
        step={2}
        goToStep={goToStep}
        invalid={Object.keys(validateStep(2)).length > 0}
        rows={[
          ['Type', data.membershipType ? labelOf(MEMBERSHIP_TYPES, data.membershipType) : '—'],
          ['Plan', plan?.name ?? '—'],
          ['Joining', formatDate(data.joinDate)],
          ['Period', `${formatDate(data.startDate)} → ${formatDate(data.endDate)}`],
          ['Fee', Number.isFinite(fee) ? <CurrencyValue amount={fee} decimals={2} /> : '—'],
        ]}
      />

      <ReviewCard
        icon="heart"
        title="Health"
        step={3}
        goToStep={goToStep}
        rows={[
          ['Body', bodyStats.length ? bodyStats.join(' · ') : 'Not provided'],
          ['History', healthNotesCount ? `${healthNotesCount} note${healthNotesCount > 1 ? 's' : ''} added` : 'None'],
        ]}
      />

      <ReviewCard
        icon="users"
        title="Family"
        step={4}
        goToStep={goToStep}
        rows={
          isFamily
            ? [
                ['Role', data.isFamilyHead ? 'Family head' : labelOf(RELATIONSHIPS, data.relationshipToHead)],
                ...(data.isFamilyHead
                  ? [['Members', data.familyMembers.length ? data.familyMembers.map((m) => m.name).join(', ') : 'None added'] as Row]
                  : []),
              ]
            : [['Status', 'Not a family membership']]
        }
      />
    </View>
  );
}

type Row = [string, React.ReactNode];

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
    width: 96,
  },
  rowValue: {
    flex: 1,
    textAlign: 'right',
  },
});
