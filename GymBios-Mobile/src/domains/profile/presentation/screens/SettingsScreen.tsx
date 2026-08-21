import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';

import { useMySettings } from '../../hooks/useMySettings';
import { useProfileMutations } from '../../hooks/useProfileMutations';
import {
  LinkedAccountRow,
  SettingsCard,
  SettingSwitchRow,
} from '../components/SettingsSection';

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { settings } = useMySettings();
  const { updateSettings } = useProfileMutations();

  // Local state initialized with query data
  const [notifications, setNotifications] = useState(settings.notifications);
  const [privacy, setPrivacy] = useState(settings.privacy);

  const handleToggleNotification = (key: keyof typeof notifications, val: boolean) => {
    const updated = { ...notifications, [key]: val };
    setNotifications(updated);
    updateSettings({ notifications: { [key]: val } });
  };

  const handleTogglePrivacy = (key: keyof typeof privacy, val: boolean) => {
    const updated = { ...privacy, [key]: val };
    setPrivacy(updated);
    updateSettings({ privacy: { [key]: val } });
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <AppHeader
        title="Settings"
        subtitle="Notifications, linked accounts & privacy"
        colors={[BrandColors.teal, BrandColors.tealDark]}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Notification Preferences */}
        <SettingsCard title="Notification Preferences" icon="bell">
          <SettingSwitchRow
            label="Email Notifications"
            description="Receive summaries and account updates via email"
            value={notifications.email}
            onValueChange={(val) => handleToggleNotification('email', val)}
          />
          <SettingSwitchRow
            label="Push Notifications"
            description="Real-time alert notifications on this device"
            value={notifications.push}
            onValueChange={(val) => handleToggleNotification('push', val)}
          />
          <SettingSwitchRow
            label="SMS Notifications"
            description="Urgent security and payroll notifications via SMS"
            value={notifications.sms}
            onValueChange={(val) => handleToggleNotification('sms', val)}
          />
          <SettingSwitchRow
            label="Performance Updates"
            description="Quarterly and monthly KPI score notifications"
            value={notifications.performance}
            onValueChange={(val) => handleToggleNotification('performance', val)}
          />
          <SettingSwitchRow
            label="Target Reminders"
            description="Alerts when target deadlines are approaching"
            value={notifications.targets}
            onValueChange={(val) => handleToggleNotification('targets', val)}
          />
          <SettingSwitchRow
            label="Payroll & Earnings"
            description="Notifications when salaries and bonuses are processed"
            value={notifications.payroll}
            onValueChange={(val) => handleToggleNotification('payroll', val)}
          />
        </SettingsCard>

        {/* Linked Accounts */}
        <SettingsCard title="Linked Accounts" icon="link">
          {settings.linkedAccounts.map((account) => (
            <LinkedAccountRow key={account.id} account={account} />
          ))}
        </SettingsCard>

        {/* Privacy Settings */}
        <SettingsCard title="Privacy Settings" icon="shield">
          <SettingSwitchRow
            label="Profile Visibility"
            description="Allow team members and staff to view your profile details"
            value={privacy.profileVisibility}
            onValueChange={(val) => handleTogglePrivacy('profileVisibility', val)}
          />
          <SettingSwitchRow
            label="Performance Visibility"
            description="Share your performance achievements and score on leaderboard"
            value={privacy.performanceVisibility}
            onValueChange={(val) => handleTogglePrivacy('performanceVisibility', val)}
          />
          <SettingSwitchRow
            label="Activity Status"
            description="Show active indicators when you are signed in"
            value={privacy.activityStatus}
            onValueChange={(val) => handleTogglePrivacy('activityStatus', val)}
          />
        </SettingsCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
});
