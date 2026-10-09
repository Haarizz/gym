import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View } from 'react-native';

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

const STATE_TONES: Record<AccessState, Tone> = {
  none: { label: 'No login', color: '#6b7280' },
  enabled: { label: 'Enabled', color: '#16a34a' },
  blocked: { label: 'Blocked', color: '#dc2626' },
};

const STATE_HINTS: Record<AccessState, string> = {
  none: "This member hasn't got an app login yet.",
  enabled: 'Member can sign in to the app.',
  blocked: 'Member is blocked from signing in to the app.',
};

/**
 * A member has a login when they own a local account (userId) or signed up in the app
 * with a GymBios account (globalUserId). Only an explicit appAccessEnabled === false
 * blocks them — TenantContextFilter treats null as allowed.
 */
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
  const theme = useTheme();
  const state = getAccessState(member);
  // GymBios accounts manage their own password; only local logins can be reset here.
  const isGlobalAccount = member.globalUserId !== undefined && member.userId === undefined;

  const username = member.appUsername ?? (isGlobalAccount ? member.email : undefined);

  return (
    <DetailCard title="App access" icon="smartphone" right={<TonePill tone={STATE_TONES[state]} />}>
      <Typography variant="caption" color="textSecondary" style={styles.hint}>
        {STATE_HINTS[state]}
      </Typography>

      {state !== 'none' ? (
        <DetailGrid>
          <DetailField label={isGlobalAccount ? 'GymBios account' : 'Username'} value={username} />
          <DetailField label="Login type" value={isGlobalAccount ? 'Self sign-up' : 'Created by gym'} />
        </DetailGrid>
      ) : null}

      {state !== 'none' && isGlobalAccount ? (
        <View style={[styles.note, { backgroundColor: theme.backgroundSelected }]}>
          <Feather name="info" size={14} color={theme.textSecondary} />
          <Typography variant="caption" color="textSecondary" style={styles.noteText}>
            This member manages their own GymBios password, so it can't be reset by the gym.
          </Typography>
        </View>
      ) : null}

      <View style={styles.actions}>
        {state === 'none' ? (
          <ActionButton
            icon="user-plus"
            label="Create login"
            primary
            disabled={busy}
            onPress={onSetCredentials}
          />
        ) : (
          <>
            {state === 'enabled' ? (
              <ActionButton
                icon="slash"
                label="Block access"
                color={BrandColors.danger}
                disabled={busy}
                onPress={() => onToggleAccess(false)}
              />
            ) : (
              <ActionButton
                icon="unlock"
                label="Restore access"
                primary
                disabled={busy}
                onPress={() => onToggleAccess(true)}
              />
            )}
            {!isGlobalAccount ? (
              <ActionButton
                icon="key"
                label="Reset password"
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
