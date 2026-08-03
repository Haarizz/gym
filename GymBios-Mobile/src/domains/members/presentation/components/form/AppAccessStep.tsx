import { useCallback, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Switch, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Spacing } from '@/core/theme';
import { Input } from '@/shared/components/Input';
import { FormSection } from '@/shared/components/FormSection';
import { Typography } from '@/shared/components/Typography';
import type { MemberWizardData } from '@/domains/members/hooks/useMemberWizard';

const EXPANDED_HEIGHT = 212;

interface AppAccessStepProps {
  data: MemberWizardData;
  updateField: (field: keyof MemberWizardData, value: any) => void;
}

export function AppAccessStep({ data, updateField }: AppAccessStepProps) {
  const theme = useTheme();
  const animatedHeight = useRef(
    new Animated.Value(data.appAccessEnabled ? EXPANDED_HEIGHT : 0),
  ).current;

  useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: data.appAccessEnabled ? EXPANDED_HEIGHT : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [data.appAccessEnabled, animatedHeight]);

  const handleToggle = useCallback(
    (value: boolean) => {
      updateField('appAccessEnabled', value);
    },
    [updateField],
  );

  return (
    <View style={styles.container}>
      <FormSection title="App Access & Review">
        <View style={styles.switchRow}>
          <Typography variant="bodySmallBold">
            Give this member access to the mobile app
          </Typography>
          <Switch
            value={data.appAccessEnabled}
            onValueChange={handleToggle}
            trackColor={{ false: theme.muted, true: theme.primary }}
            thumbColor={theme.backgroundElement}
          />
        </View>

        <Animated.View style={[styles.expandable, { height: animatedHeight }]}>
          <View style={styles.fields}>
            <Input
              label="Username *"
              value={data.username}
              onChangeText={(v) => updateField('username', v)}
              placeholder="Enter username"
              autoCapitalize="none"
            />
            <Input
              label="Password *"
              value={data.password}
              onChangeText={(v) => updateField('password', v)}
              placeholder="Enter password"
              secureTextEntry
            />
            <Input
              label="Confirm Password *"
              value={data.confirmPassword}
              onChangeText={(v) => updateField('confirmPassword', v)}
              placeholder="Re-enter password"
              secureTextEntry
            />
          </View>
        </Animated.View>
      </FormSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
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
