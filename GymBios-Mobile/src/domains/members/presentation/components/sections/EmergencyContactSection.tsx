import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { FormSection } from '@/shared/components/FormSection';
import { Typography } from '@/shared/components/Typography';
import type { Member } from '../../../domain/Member';

interface EmergencyContactSectionProps {
  member: Member;
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

export function EmergencyContactSection({ member }: EmergencyContactSectionProps) {
  return (
    <FormSection title="Emergency Contact">
      <DetailRow label="Contact Name" value="—" />
      <DetailRow label="Contact Phone" value="—" />
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
});