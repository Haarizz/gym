import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { getLanguage, useLanguageStore } from '@/core/i18n';
import { BrandColors, Spacing } from '@/core/theme';
import { GlassBlob, GlassHeader } from '@/shared/components';

import { useMySettings } from '../../hooks/useMySettings';
import { useProfileMutations } from '../../hooks/useProfileMutations';
import {
  LinkedAccountRow,
  SettingNavRow,
  SettingsCard,
  SettingSwitchRow,
} from '../components/SettingsSection';

interface SettingsScreenProps {
  onBack: () => void;
  onNavigateToLanguage: () => void;
}

export function SettingsScreen({ onBack, onNavigateToLanguage }: SettingsScreenProps) {
  const { t } = useTranslation();
  const { settings } = useMySettings();
  const { updateSettings } = useProfileMutations();
  const language = useLanguageStore((s) => s.language);

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
      <GlassBlob color={BrandColors.teal} size={320} opacity={0.34} top={-40} right={-70} />
      <GlassBlob color={BrandColors.memberGold} size={280} opacity={0.26} top={380} left={-80} />
      <GlassBlob color={BrandColors.tealDark} size={240} opacity={0.2} top={800} right={-70} />
      <GlassHeader
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Language */}
        <SettingsCard title={t('settings.languageCard')} icon="globe">
          <SettingNavRow
            label={t('settings.appLanguage')}
            description={t('settings.appLanguageDescription')}
            value={getLanguage(language).nativeName}
            onPress={onNavigateToLanguage}
            divider={false}
          />
        </SettingsCard>

        {/* Notification Preferences */}
        <SettingsCard title={t('settings.notificationsCard')} icon="bell">
          <SettingSwitchRow
            label={t('settings.emailNotifications')}
            description={t('settings.emailNotificationsDescription')}
            value={notifications.email}
            onValueChange={(val) => handleToggleNotification('email', val)}
            divider={false}
          />
          <SettingSwitchRow
            label={t('settings.pushNotifications')}
            description={t('settings.pushNotificationsDescription')}
            value={notifications.push}
            onValueChange={(val) => handleToggleNotification('push', val)}
          />
          <SettingSwitchRow
            label={t('settings.smsNotifications')}
            description={t('settings.smsNotificationsDescription')}
            value={notifications.sms}
            onValueChange={(val) => handleToggleNotification('sms', val)}
          />
          <SettingSwitchRow
            label={t('settings.performanceUpdates')}
            description={t('settings.performanceUpdatesDescription')}
            value={notifications.performance}
            onValueChange={(val) => handleToggleNotification('performance', val)}
          />
          <SettingSwitchRow
            label={t('settings.targetReminders')}
            description={t('settings.targetRemindersDescription')}
            value={notifications.targets}
            onValueChange={(val) => handleToggleNotification('targets', val)}
          />
          <SettingSwitchRow
            label={t('settings.payrollEarnings')}
            description={t('settings.payrollEarningsDescription')}
            value={notifications.payroll}
            onValueChange={(val) => handleToggleNotification('payroll', val)}
          />
        </SettingsCard>

        {/* Linked Accounts */}
        <SettingsCard title={t('settings.linkedAccountsCard')} icon="link">
          {settings.linkedAccounts.map((account, index) => (
            <LinkedAccountRow key={account.id} account={account} divider={index > 0} />
          ))}
        </SettingsCard>

        {/* Privacy Settings */}
        <SettingsCard title={t('settings.privacyCard')} icon="shield">
          <SettingSwitchRow
            label={t('settings.profileVisibility')}
            description={t('settings.profileVisibilityDescription')}
            value={privacy.profileVisibility}
            onValueChange={(val) => handleTogglePrivacy('profileVisibility', val)}
            divider={false}
          />
          <SettingSwitchRow
            label={t('settings.performanceVisibility')}
            description={t('settings.performanceVisibilityDescription')}
            value={privacy.performanceVisibility}
            onValueChange={(val) => handleTogglePrivacy('performanceVisibility', val)}
          />
          <SettingSwitchRow
            label={t('settings.activityStatus')}
            description={t('settings.activityStatusDescription')}
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
