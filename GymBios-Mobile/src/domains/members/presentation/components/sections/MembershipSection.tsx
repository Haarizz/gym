import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { FormSection } from '@/shared/components/FormSection';
import { Typography } from '@/shared/components/Typography';
import type { Member } from '../../../domain/Member';

interface MembershipSectionProps {
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

export function MembershipSection({ member }: MembershipSectionProps) {
  const theme = useTheme();

  return (
    <FormSection title="Membership">
      <DetailRow label="Plan" value={member.membershipPlanName ?? member.membershipType} />
      <DetailRow label="Type" value={member.membershipType} />
      <DetailRow label="Start Date" value={member.startDate} />
      <DetailRow label="Expiry" value={member.endDate ?? '—'} />
      <DetailRow label="Status" value={member.status} />
      {member.isFrozen && (
        <View style={[styles.frozenBox, { backgroundColor: '#fef3c7' }]}>
          <Typography variant="caption" style={styles.frozenText}>
            Frozen {member.freezeStartDate ?? ''} → {member.freezeEndDate ?? ''}
          </Typography>
        </View>
      )}
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
  frozenBox: {
    borderRadius: Radius.sm,
    padding: Spacing.two,
    marginTop: Spacing.one,
  },
  frozenText: {
    color: '#92400e',
    fontWeight: '600',
  },
});