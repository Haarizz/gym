import { Switch, StyleSheet, View } from 'react-native';

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
  const theme = useTheme();

  return (
    <FormSection title="App Access">
      <View style={styles.switchRow}>
        <Typography variant="bodySmallBold">Enable App Access</Typography>
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
            label="Username"
            value={username}
            onChangeText={onChangeUsername}
            placeholder="Enter username"
            autoCapitalize="none"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={onChangePassword}
            placeholder="Enter password"
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