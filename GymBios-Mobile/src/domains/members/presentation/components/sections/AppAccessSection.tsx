import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { Member } from '../../../domain/Member';
import type { Tone } from '../../utils/memberDisplay';
import { TonePill } from '../TonePill';
import { DetailCard, DetailField, DetailGrid } from './DetailCard';

interface AppAccessSectionProps {
  member: Member;
  /** Opens the credentials sheet — creates a login, or resets the password of an existing one. */
  onSetCredentials: () => void;
  onToggleAccess: (enabled: boolean) => void;
  busy?: boolean;
}

type AccessState = 'none' | 'enabled' | 'blocked';

function getAccessState(member: Member): AccessState {
  const hasLogin = member.userId !== undefined || member.globalUserId !== undefined;
  if (!hasLogin) return 'none';
  return member.appAccessEnabled === false ? 'blocked' : 'enabled';
}

export function AppAccessSection({
  member,
  onSetCredentials,
  onToggleAccess,
  busy = false,
}: AppAccessSectionProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const state = getAccessState(member);
  // GymBios accounts manage their own password; only local logins can be reset here.
  const isGlobalAccount = member.globalUserId !== undefined && member.userId === undefined;

  const username = member.appUsername ?? (isGlobalAccount ? member.email : undefined);

  const stateTones: Record<AccessState, Tone> = {
    none: { label: t('members.appAccessSection.noLoginState'), color: '#6b7280' },
    enabled: { label: t('members.appAccessSection.enabledState'), color: '#16a34a' },
    blocked: { label: t('members.appAccessSection.blockedState'), color: '#dc2626' },
  };

  const stateHints: Record<AccessState, string> = {
    none: t('members.appAccessSection.noLoginHint'),
    enabled: t('members.appAccessSection.enabledHint'),
    blocked: t('members.appAccessSection.blockedHint'),
  };

  return (
    <DetailCard title={t('members.appAccessSection.title')} icon="smartphone" right={<TonePill tone={stateTones[state]} />}>
      <Typography variant="caption" color="textSecondary" style={styles.hint}>
        {stateHints[state]}
      </Typography>

      {state !== 'none' ? (
        <DetailGrid>
          <DetailField
            label={isGlobalAccount ? t('members.appAccessSection.gymBiosAccount') : t('members.appAccessSection.username')}
            value={username}
          />
          <DetailField
            label={t('members.appAccessSection.loginType')}
            value={isGlobalAccount ? t('members.appAccessSection.selfSignUp') : t('members.appAccessSection.createdByGym')}
          />
        </DetailGrid>
      ) : null}

      {state !== 'none' && isGlobalAccount ? (
        <View style={[styles.note, { backgroundColor: theme.backgroundSelected }]}>
          <Feather name="info" size={14} color={theme.textSecondary} />
          <Typography variant="caption" color="textSecondary" style={styles.noteText}>
            {t('members.appAccessSection.managedNote')}
          </Typography>
        </View>
      ) : null}

      <View style={styles.actions}>
        {state === 'none' ? (
          <ActionButton
            icon="user-plus"
            label={t('members.appAccessSection.createLogin')}
            primary
            disabled={busy}
            onPress={onSetCredentials}
          />
        ) : (
          <>
            {state === 'enabled' ? (
              <ActionButton
                icon="slash"
                label={t('members.appAccessSection.blockAccess')}
                color={BrandColors.danger}
                disabled={busy}
                onPress={() => onToggleAccess(false)}
              />
            ) : (
              <ActionButton
                icon="unlock"
                label={t('members.appAccessSection.restoreAccess')}
                primary
                disabled={busy}
                onPress={() => onToggleAccess(true)}
              />
            )}
            {!isGlobalAccount ? (
              <ActionButton
                icon="key"
                label={t('members.appAccessSection.resetPassword')}
                color={theme.text}
                disabled={busy}
                onPress={onSetCredentials}
              />
            ) : null}
          </>
        )}
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
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    marginTop: Spacing.three,
    padding: Spacing.two,
    borderRadius: Radius.sm,
  },
  noteText: {
    flex: 1,
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
