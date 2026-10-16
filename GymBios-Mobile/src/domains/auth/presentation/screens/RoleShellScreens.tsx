import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { CurrencyValue } from '@/core/providers';
import { BrandColors, Spacing } from '@/core/theme';
import { Button, PlaceholderPanel, StatCard, Typography } from '@/shared/components';
import { ScreenLayout } from '@/shared/layouts';

import type { createUseRestoreSession } from '../hooks/useAuthFlow';

interface RoleShellScreenProps {
  title: string;
  description: string;
  useRestoreSession: ReturnType<typeof createUseRestoreSession>;
  children?: React.ReactNode;
}

function RoleShellScreen({
  title,
  description,
  useRestoreSession,
  children,
}: RoleShellScreenProps) {
  const { t } = useTranslation();
  const { logout, isLoggingOut, session } = useRestoreSession();

  return (
    <ScreenLayout scrollable>
      <View style={styles.content}>
        <Typography variant="title">{title}</Typography>
        <Typography variant="bodySmall" color="textSecondary">
          {t('auth.roleShell.signedInAs', {
            name: session?.user.fullName ?? '',
            username: session?.user.username ?? '',
          })}
        </Typography>
        <PlaceholderPanel title={title} description={description} />
        {children}
        <Button
          label={t('auth.roleShell.signOut')}
          variant="secondary"
          loading={isLoggingOut}
          onPress={() => logout()}
        />
      </View>
    </ScreenLayout>
  );
}

export function createAdminDashboardScreen(useRestoreSession: ReturnType<typeof createUseRestoreSession>) {
  return function AdminDashboardScreen() {
    const { t } = useTranslation();
    return (
      <RoleShellScreen
        title={t('auth.roleShell.adminTitle')}
        description={t('auth.roleShell.adminDesc')}
        useRestoreSession={useRestoreSession}>
        <View style={styles.statsRow}>
          <StatCard label={t('auth.roleShell.collections')} value={<CurrencyValue amount={240000} compact />} iconName="dollar-sign" color="#22c55e" />
          <StatCard label={t('auth.roleShell.members')} value="1,245" iconName="users" color={BrandColors.teal} />
        </View>
      </RoleShellScreen>
    );
  };
}

export function createMemberHomeScreen(useRestoreSession: ReturnType<typeof createUseRestoreSession>) {
  return function MemberHomeScreen() {
    const { t } = useTranslation();
    return (
      <RoleShellScreen
        title={t('auth.roleShell.memberTitle')}
        description={t('auth.roleShell.memberDesc')}
        useRestoreSession={useRestoreSession}>
        <View style={styles.statsRow}>
          <StatCard label={t('auth.roleShell.checkIns')} value="24" iconName="check-circle" color={BrandColors.teal} />
          <StatCard label={t('auth.roleShell.streak')} value={t('memberHome.stats.streakDays', { count: 7 })} iconName="award" color={BrandColors.memberGold} />
        </View>
      </RoleShellScreen>
    );
  };
}

export function createTrainerHomeScreen(useRestoreSession: ReturnType<typeof createUseRestoreSession>) {
  return function TrainerHomeScreen() {
    const { t } = useTranslation();
    return (
      <RoleShellScreen
        title={t('auth.roleShell.trainerTitle')}
        description={t('auth.roleShell.trainerDesc')}
        useRestoreSession={useRestoreSession}
      />
    );
  };
}

export function createStaffHomeScreen(useRestoreSession: ReturnType<typeof createUseRestoreSession>) {
  return function StaffHomeScreen() {
    const { t } = useTranslation();
    return (
      <RoleShellScreen
        title={t('auth.roleShell.staffTitle')}
        description={t('auth.roleShell.staffDesc')}
        useRestoreSession={useRestoreSession}
      />
    );
  };
}

export function createRolePlaceholderScreen(
  title: string,
  useRestoreSession: ReturnType<typeof createUseRestoreSession>,
) {
  return function RolePlaceholderScreen() {
    const { t } = useTranslation();
    return (
      <RoleShellScreen
        title={title}
        description={t('auth.roleShell.placeholderDesc')}
        useRestoreSession={useRestoreSession}
      />
    );
  };
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: Spacing.four,
    paddingTop: Spacing.four,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
});
