import { Switch, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/hooks';
import { Spacing } from '@/core/theme';
import { Input } from '@/shared/components/Input';
import { FormSection } from '@/shared/components/FormSection';
import { Typography } from '@/shared/components/Typography';

interface AppAccessSectionProps {
  username: string;
  password: string;
  appAccessEnabled: boolean;
  onChangeUsername: (value: string) => void;
  onChangePassword: (value: string) => void;
  onChangeAppAccess: (value: boolean) => void;
}

export function AppAccessSection({
  username,
  password,
  appAccessEnabled,
  onChangeUsername,
  onChangePassword,
  onChangeAppAccess,
}: AppAccessSectionProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <FormSection title={t('hr.appAccess.title')}>
      <View style={styles.switchRow}>
        <Typography variant="bodySmallBold">{t('hr.appAccess.enableAppAccess')}</Typography>
        <Switch
          value={appAccessEnabled}
          onValueChange={onChangeAppAccess}
          trackColor={{ false: theme.muted, true: theme.primary }}
          thumbColor={theme.backgroundElement}
        />
      </View>
      {appAccessEnabled && (
        <>
          <Input
            label={t('hr.appAccess.username')}
            value={username}
            onChangeText={onChangeUsername}
            placeholder={t('hr.appAccess.usernamePlaceholder')}
            autoCapitalize="none"
          />
          <Input
            label={t('hr.appAccess.password')}
            value={password}
            onChangeText={onChangePassword}
            placeholder={t('hr.appAccess.passwordPlaceholderCreate')}
            secureTextEntry
          />
        </>
      )}
    </FormSection>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});