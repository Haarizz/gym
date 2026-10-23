import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { Member } from '../../../domain/Member';
import type { MemberAppAccount } from '../../../application/access/MemberAccessRepository';
import type { Tone } from '../../utils/memberDisplay';
import { TonePill } from '../TonePill';
import { DetailCard, DetailField, DetailGrid } from './DetailCard';

interface AppAccessSectionProps {
  member: Member;
  /** The member's app account; null while loading. */
  account: MemberAppAccount | null;
  /** Opens the sheet that creates the member's own GymBios account. */
  onCreateAccount: () => void;
  /** Opens the sheet that asks the owner of an existing GymBios account to link it. */
  onLinkAccount: () => void;
  onCancelLink: () => void;
  /** Suspends or resumes this gym's membership. The app account itself is never blocked. */
  onSetSuspended: (suspended: boolean) => void;
  busy?: boolean;
}

type AccountStatus = MemberAppAccount['status'];

export function AppAccessSection({
  member,
  account,
  onCreateAccount,
  onLinkAccount,
  onCancelLink,
  onSetSuspended,
  busy = false,
}: AppAccessSectionProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const status: AccountStatus | null = account?.status ?? null;

  const statusTones: Record<AccountStatus, Tone> = {
    NONE: { label: t('members.appAccessSection.noLoginState'), color: '#6b7280' },
    GYM_LOGIN: { label: t('members.appAccessSection.gymLoginState'), color: '#d97706' },
    LINKED: { label: t('members.appAccessSection.linkedState'), color: '#16a34a' },
    AWAITING_CONFIRMATION: { label: t('members.appAccessSection.awaitingState'), color: '#d97706' },
  };
  const statusHints: Record<AccountStatus, string> = {
    NONE: t('members.appAccessSection.noLoginHint'),
    GYM_LOGIN: t('members.appAccessSection.gymLoginHint'),
    LINKED: t('members.appAccessSection.managedNote'),
    AWAITING_CONFIRMATION: t('members.appAccessSection.awaitingHint'),
  };
  const suspended = member.membershipSuspended === true;
  const membershipTone: Tone = suspended
    ? { label: t('members.appAccessSection.membershipSuspended'), color: '#d97706' }
    : { label: t('members.appAccessSection.membershipActive'), color: '#16a34a' };

  return (
    <DetailCard
      title={t('members.appAccessSection.title')}
      icon="smartphone"
      right={status ? <TonePill tone={statusTones[status]} /> : undefined}
    >
      {status ? (
        <Typography variant="caption" color="textSecondary" style={styles.hint}>
          {statusHints[status]}
        </Typography>
      ) : null}

      {status === 'LINKED' ? (
        <DetailGrid>
          <DetailField label={t('members.appAccessSection.gymBiosAccount')} value={account?.username} />
          <DetailField
            label={t('members.appAccessSection.email')}
            value={account?.email
              ? `${account.email} · ${account.emailVerified
                ? t('members.appAccessSection.emailVerified')
                : t('members.appAccessSection.emailNotVerified')}`
              : t('members.appAccessSection.noEmail')}
          />
        </DetailGrid>
      ) : null}

      {status === 'GYM_LOGIN' ? (
        <DetailGrid>
          <DetailField label={t('members.appAccessSection.username')} value={account?.username} />
        </DetailGrid>
      ) : null}

      {status === 'AWAITING_CONFIRMATION' ? (
        <>
          <DetailGrid>
            <DetailField label={t('members.appAccessSection.requestSentTo')} value={account?.linkRequestedAccount} />
          </DetailGrid>
          <View style={styles.actions}>
            <ActionButton
              icon="x"
              label={t('members.appAccessSection.cancelRequest')}
              color={theme.text}
              disabled={busy}
              onPress={onCancelLink}
            />
          </View>
        </>
      ) : null}

      {status === 'NONE' || status === 'GYM_LOGIN' ? (
        <View style={styles.actions}>
          <ActionButton
            icon="user-plus"
            label={t('members.appAccessSection.createAccount')}
            primary
            disabled={busy}
            onPress={onCreateAccount}
          />
          <ActionButton
            icon="link"
            label={t('members.appAccessSection.linkAccount')}
            color={theme.text}
            disabled={busy}
            onPress={onLinkAccount}
          />
        </View>
      ) : null}

      <View style={[styles.membership, { borderTopColor: theme.backgroundSelected }]}>
        <View style={styles.membershipHeader}>
          <Typography variant="bodySmallBold">{t('members.appAccessSection.membershipTitle')}</Typography>
          <TonePill tone={membershipTone} />
        </View>
        <Typography variant="caption" color="textSecondary">
          {suspended
            ? t('members.appAccessSection.membershipSuspendedHint')
            : t('members.appAccessSection.membershipActiveHint')}
        </Typography>
        {suspended && member.suspendedReason ? (
          <DetailGrid>
            <DetailField label={t('members.appAccessSection.suspendedReason')} value={member.suspendedReason} />
          </DetailGrid>
        ) : null}
        <View style={styles.actions}>
          {suspended ? (
            <ActionButton
              icon="play-circle"
              label={t('members.appAccessSection.resumeMembership')}
              primary
              disabled={busy}
              onPress={() => onSetSuspended(false)}
            />
          ) : (
            <ActionButton
              icon="pause-circle"
              label={t('members.appAccessSection.suspendMembership')}
              color={BrandColors.danger}
              disabled={busy}
              onPress={() => onSetSuspended(true)}
            />
          )}
        </View>
      </View>
    </DetailCard>
  );
}

interface ActionButtonProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
  color?: string;
  disabled?: boolean;
}

function ActionButton({ icon, label, onPress, primary, color, disabled }: ActionButtonProps) {
  const theme = useTheme();
  const fg = primary ? theme.primaryText : (color ?? theme.text);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: primary ? theme.primary : theme.backgroundSelected },
        (pressed || disabled) && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      <Feather name={icon} size={14} color={fg} />
      <Typography variant="bodySmallBold" style={{ color: fg }}>
        {label}
      </Typography>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hint: {
    marginBottom: Spacing.md,
  },
  membership: {
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  membershipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
  },
  pressed: {
    opacity: 0.7,
  },
});
