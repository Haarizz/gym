import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';
import { FormSection } from '@/shared/components/FormSection';
import { Typography } from '@/shared/components/Typography';
import type { Member } from '../../../domain/Member';

interface AppAccessSectionProps {
  member: Member;
  onGrantAccess: () => void;
  onDisableAccess: () => void;
  onResetCredentials: () => void;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Typography variant="caption" color="textSecondary" style={styles.detailLabel}>
        {label}
      </Typography>
      <Typography variant="bodySmall">{value}</Typography>
    </View>
  );
}

export function AppAccessSection({
  member,
  onGrantAccess,
  onDisableAccess,
  onResetCredentials,
}: AppAccessSectionProps) {
  return (
    <FormSection title="App Access">
      <DetailRow label="Username" value={member.appUsername ?? '—'} />
      <DetailRow
        label="Access Status"
        value={member.appAccessEnabled ? 'Enabled' : 'Disabled'}
      />

      <View style={styles.actions}>
        {!member.appAccessEnabled ? (
          <Button label="Grant Access" onPress={onGrantAccess} />
        ) : (
          <Button label="Disable Access" variant="secondary" onPress={onDisableAccess} />
        )}
        <Button label="Reset Credentials" variant="secondary" onPress={onResetCredentials} />
      </View>
    </FormSection>
  );
}

const styles = StyleSheet.create({
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  detailLabel: {
    flex: 1,
  },
  actions: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});