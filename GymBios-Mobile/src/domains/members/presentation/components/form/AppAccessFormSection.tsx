import { useCallback, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Switch, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Spacing } from '@/core/theme';
import { Input } from '@/shared/components/Input';
import { FormSection } from '@/shared/components/FormSection';
import { Typography } from '@/shared/components/Typography';

const EXPANDED_HEIGHT = 212; // approximate height of the three fields + gaps

interface AppAccessFormSectionProps {
  username: string;
  password: string;
  confirmPassword: string;
  appAccessEnabled: boolean;
  errors?: Partial<Record<string, string>>;
  onChangeUsername: (value: string) => void;
  onChangePassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onChangeAppAccess: (value: boolean) => void;
}

export function AppAccessFormSection({
  username,
  password,
  confirmPassword,
  appAccessEnabled,
  errors,
  onChangeUsername,
  onChangePassword,
  onChangeConfirmPassword,
  onChangeAppAccess,
}: AppAccessFormSectionProps) {
  const theme = useTheme();
  const animatedHeight = useRef(
    new Animated.Value(appAccessEnabled ? EXPANDED_HEIGHT : 0),
  ).current;

  useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: appAccessEnabled ? EXPANDED_HEIGHT : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [appAccessEnabled, animatedHeight]);

  const handleToggle = useCallback(
    (value: boolean) => {
      onChangeAppAccess(value);
    },
    [onChangeAppAccess],
  );

  return (
    <FormSection title="App Access">
      <View style={styles.switchRow}>
        <Typography variant="bodySmallBold">Enable Member Login</Typography>
        <Switch
          value={appAccessEnabled}
          onValueChange={handleToggle}
          trackColor={{ false: theme.muted, true: theme.primary }}
          thumbColor={theme.backgroundElement}
        />
      </View>

      <Animated.View style={[styles.expandable, { height: animatedHeight }]}>
        <View style={styles.fields}>
          <Input
            label="Username"
            value={username}
            onChangeText={onChangeUsername}
            placeholder="Enter app username"
            autoCapitalize="none"
            error={errors?.username}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={onChangePassword}
            placeholder="Enter password"
            secureTextEntry
            error={errors?.password}
          />
          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={onChangeConfirmPassword}
            placeholder="Re-enter password"
            secureTextEntry
            error={errors?.confirmPassword}
          />
        </View>
      </Animated.View>
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
  expandable: {
    overflow: 'hidden',
  },
  fields: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
});