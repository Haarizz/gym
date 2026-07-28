import { StyleSheet, View } from 'react-native';

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
  const { logout, isLoggingOut, session } = useRestoreSession();

  return (
    <ScreenLayout scrollable>
      <View style={styles.content}>
        <Typography variant="title">{title}</Typography>
        <Typography variant="bodySmall" color="textSecondary">
          Signed in as {session?.user.fullName} ({session?.user.username})
        </Typography>
        <PlaceholderPanel title={title} description={description} />
        {children}
        <Button
          label="Sign Out"
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
    return (
      <RoleShellScreen
        title="Admin Dashboard"
        description="KPI overview, collections, and operational alerts will appear here."
        useRestoreSession={useRestoreSession}>
        <View style={styles.statsRow}>
          <StatCard label="Collections" value="₹2.4L" iconName="dollar-sign" color="#22c55e" />
          <StatCard label="Members" value="1,245" iconName="users" color={BrandColors.teal} />
        </View>
      </RoleShellScreen>
    );
  };
}

export function createMemberHomeScreen(useRestoreSession: ReturnType<typeof createUseRestoreSession>) {
  return function MemberHomeScreen() {
    return (
      <RoleShellScreen
        title="Member Home"
        description="Welcome card, membership status, check-in, and today's schedule will appear here."
        useRestoreSession={useRestoreSession}>
        <View style={styles.statsRow}>
          <StatCard label="Check-ins" value="24" iconName="check-circle" color={BrandColors.teal} />
          <StatCard label="Streak" value="7 days" iconName="award" color={BrandColors.memberGold} />
        </View>
      </RoleShellScreen>
    );
  };
}

export function createTrainerHomeScreen(useRestoreSession: ReturnType<typeof createUseRestoreSession>) {
  return function TrainerHomeScreen() {
    return (
      <RoleShellScreen
        title="Trainer Home"
        description="Today's sessions, quick actions, and performance snapshot will appear here."
        useRestoreSession={useRestoreSession}
      />
    );
  };
}

export function createStaffHomeScreen(useRestoreSession: ReturnType<typeof createUseRestoreSession>) {
  return function StaffHomeScreen() {
    return (
      <RoleShellScreen
        title="Staff Home"
        description="Lead queue, follow-ups, and front desk actions will appear here."
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
    return (
      <RoleShellScreen
        title={title}
        description="This screen will be migrated from Gym-app in the next phase."
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
