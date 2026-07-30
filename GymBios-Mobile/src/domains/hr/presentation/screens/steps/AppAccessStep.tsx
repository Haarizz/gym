import { Switch, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Spacing } from '@/core/theme';
import { Input } from '@/shared/components/Input';
import { FormSection } from '@/shared/components/FormSection';
import { Typography } from '@/shared/components/Typography';
import type { StaffWizardData } from '../../hooks/useStaffWizard';

interface AppAccessStepProps {
  data: StaffWizardData;
  updateField: <K extends keyof StaffWizardData>(
    field: K,
    value: StaffWizardData[K],
  ) => void;
}

export function AppAccessStep({ data, updateField }: AppAccessStepProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <FormSection title="App Access">
        <View style={styles.switchRow}>
          <Typography variant="bodySmallBold">Enable App Access</Typography>
          <Switch
            value={data.appAccessEnabled}
            onValueChange={(v) => updateField('appAccessEnabled', v)}
            trackColor={{ false: theme.muted, true: theme.primary }}
            thumbColor={theme.backgroundElement}
          />
        </View>
        {data.appAccessEnabled && (
          <>
            <Input
              label="Username"
              value={data.username}
              onChangeText={(v) => updateField('username', v)}
              placeholder="Enter username"
              autoCapitalize="none"
            />
            <Input
              label="Password"
              value={data.password}
              onChangeText={(v) => updateField('password', v)}
              placeholder="Enter password"
              secureTextEntry
            />
          </>
        )}
      </FormSection>

      <FormSection title="Review">
        <View style={styles.reviewRow}>
          <Typography variant="bodySmallBold">Name</Typography>
          <Typography variant="bodySmall" color="textSecondary">
            {data.name || 'Not set'}
          </Typography>
        </View>
        <View style={styles.reviewRow}>
          <Typography variant="bodySmallBold">Email</Typography>
          <Typography variant="bodySmall" color="textSecondary">
            {data.email || 'Not set'}
          </Typography>
        </View>
        <View style={styles.reviewRow}>
          <Typography variant="bodySmallBold">Phone</Typography>
          <Typography variant="bodySmall" color="textSecondary">
            {data.phone || 'Not set'}
          </Typography>
        </View>
        <View style={styles.reviewRow}>
          <Typography variant="bodySmallBold">Role</Typography>
          <Typography variant="bodySmall" color="textSecondary">
            {data.role || 'Not set'}
          </Typography>
        </View>
        <View style={styles.reviewRow}>
          <Typography variant="bodySmallBold">Department</Typography>
          <Typography variant="bodySmall" color="textSecondary">
            {data.department || 'Not set'}
          </Typography>
        </View>
        <View style={styles.reviewRow}>
          <Typography variant="bodySmallBold">Branch</Typography>
          <Typography variant="bodySmall" color="textSecondary">
            {data.branch || 'Not set'}
          </Typography>
        </View>
        <View style={styles.reviewRow}>
          <Typography variant="bodySmallBold">Salary</Typography>
          <Typography variant="bodySmall" color="textSecondary">
            {data.salary ? `$${data.salary}` : 'Not set'}
          </Typography>
        </View>
        <View style={styles.reviewRow}>
          <Typography variant="bodySmallBold">Monthly Target</Typography>
          <Typography variant="bodySmall" color="textSecondary">
            {data.monthlyTarget ? `$${data.monthlyTarget}` : 'Not set'}
          </Typography>
        </View>
      </FormSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});