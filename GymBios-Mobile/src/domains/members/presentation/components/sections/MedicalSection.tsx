import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { FormSection } from '@/shared/components/FormSection';
import { Typography } from '@/shared/components/Typography';
import type { Member } from '../../../domain/Member';

interface MedicalSectionProps {
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

export function MedicalSection({ member }: MedicalSectionProps) {
  return (
    <FormSection title="Medical Information">
      <DetailRow label="Blood Group" value="—" />
      <DetailRow label="Height" value="—" />
      <DetailRow label="Weight" value="—" />
      <DetailRow label="Medical Conditions" value="—" />
      <DetailRow label="Chronic Illnesses" value="—" />
      <DetailRow label="Allergies" value="—" />
      <DetailRow label="Current Medications" value="—" />
      <DetailRow label="Health Notes" value="—" />
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