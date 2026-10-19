import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/hooks';
import { formatDate } from '@/core/i18n';
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

const formatD = (d: Date | null) => (d ? formatDate(d, 'd MMM yyyy') : '—');

export function AppAccessStep({
  data,
  updateField,
  errors,
  mode,
  hasExistingLogin = false,
  goToStep,
  validateStep,
}: AppAccessStepProps) {
  const { t } = useTranslation();
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
      <FormCard icon="smartphone" title={t('members.form.appAccessStep.title')}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Typography variant="bodySmallBold">{t('members.form.appAccessStep.allowLoginTitle')}</Typography>
            <Typography variant="caption" color="textSecondary">
              {t('members.form.appAccessStep.allowLoginSubtitle')}
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
              label={<RequiredLabel>{t('members.form.appAccessStep.usernameReq')}</RequiredLabel>}
              value={data.username}
              onChangeText={(v) => updateField('username', v)}
              placeholder={t('members.form.appAccessStep.usernamePlaceholder')}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              error={errors?.username}
            />
            <Input
              label={
                mode === 'create' ? (
                  <RequiredLabel>{t('members.form.appAccessStep.passwordReq')}</RequiredLabel>
                ) : (
                  t('members.form.appAccessStep.newPassword')
                )
              }
              value={data.password}
              onChangeText={(v) => updateField('password', v)}
              placeholder={
                mode === 'create'
                  ? t('members.form.appAccessStep.passwordPlaceholderCreate')
                  : t('members.form.appAccessStep.passwordPlaceholderEdit')
              }
              secureTextEntry
              textContentType="newPassword"
              autoCapitalize="none"
              error={errors?.password}
            />
            <Input
              label={
                mode === 'create' ? (
                  <RequiredLabel>{t('members.form.appAccessStep.confirmPasswordReq')}</RequiredLabel>
                ) : (
                  t('members.form.appAccessStep.confirmNewPassword')
                )
              }
              value={data.confirmPassword}
              onChangeText={(v) => updateField('confirmPassword', v)}
              placeholder={t('members.form.appAccessStep.confirmPasswordPlaceholder')}
              secureTextEntry
              textContentType="newPassword"
              autoCapitalize="none"
              error={errors?.confirmPassword}
            />
            {hasExistingLogin && !data.password ? (
              <Typography variant="caption" color="textSecondary">
                {t('members.form.appAccessStep.existingLoginNote')}
              </Typography>
            ) : null}
          </View>
        ) : null}
      </FormCard>

      <Typography variant="caption" color="textSecondary" style={styles.reviewHeading}>
        {t('members.form.appAccessStep.reviewHeading')}
      </Typography>

      <ReviewCard
        icon="user"
        title="Personal"
        step={1}
        goToStep={goToStep}
        invalid={Object.keys(validateStep(1)).length > 0}
        rows={[
          [t('members.form.appAccessStep.nameRow'), data.name || '—'],
          [t('members.form.appAccessStep.phoneRow'), data.phone || '—'],
          [t('members.form.appAccessStep.emailRow'), data.email || '—'],
          [t('members.form.appAccessStep.genderRow'), data.gender ? labelOf(GENDERS, data.gender) : '—'],
          [t('members.form.appAccessStep.dobRow'), formatD(data.dateOfBirth)],
        ]}
      />

      <ReviewCard
        icon="credit-card"
        title="Membership"
        step={2}
        goToStep={goToStep}
        invalid={Object.keys(validateStep(2)).length > 0}
        rows={[
          [t('members.form.appAccessStep.typeRow'), data.membershipType ? labelOf(MEMBERSHIP_TYPES, data.membershipType) : '—'],
          [t('members.form.appAccessStep.planRow'), plan?.name ?? '—'],
          [t('members.form.appAccessStep.joiningRow'), formatD(data.joinDate)],
          [t('members.form.appAccessStep.periodRow'), `${formatD(data.startDate)} → ${formatD(data.endDate)}`],
          [t('members.form.appAccessStep.feeRow'), Number.isFinite(fee) ? <CurrencyValue amount={fee} decimals={2} /> : '—'],
        ]}
      />

      <ReviewCard
        icon="heart"
        title="Health"
        step={3}
        goToStep={goToStep}
        rows={[
          [t('members.form.appAccessStep.bodyRow'), bodyStats.length ? bodyStats.join(' · ') : t('members.form.appAccessStep.notProvided')],
          [
            t('members.form.appAccessStep.historyRow'),
            healthNotesCount
              ? t('members.form.appAccessStep.notesCount', { count: healthNotesCount })
              : t('members.form.appAccessStep.none'),
          ],
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
                [
                  t('members.form.appAccessStep.roleRow'),
                  data.isFamilyHead ? 'Family head' : labelOf(RELATIONSHIPS, data.relationshipToHead),
                ],
                ...(data.isFamilyHead
                  ? [
                      [
                        t('members.form.appAccessStep.membersRow'),
                        data.familyMembers.length ? data.familyMembers.map((m) => m.name).join(', ') : t('members.form.appAccessStep.noneAdded'),
                      ] as Row,
                    ]
                  : []),
              ]
            : [[t('members.form.appAccessStep.statusRow'), t('members.form.appAccessStep.notFamilyStatus')]]
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
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <FormCard
      icon={icon}
      title={title}
      description={invalid ? t('members.form.appAccessStep.needsAttention') : undefined}
      action={
        <Pressable
          onPress={() => goToStep(step)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('members.form.appAccessStep.editA11y', { title })}
          style={({ pressed }) => [styles.editLink, pressed && { opacity: 0.6 }]}
        >
          <Feather name="edit-2" size={13} color={theme.primary} />
          <Typography variant="caption" style={[styles.editText, { color: theme.primary }]}>
            {t('members.form.appAccessStep.edit')}
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
