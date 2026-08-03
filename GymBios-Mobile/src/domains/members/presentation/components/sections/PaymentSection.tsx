import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { FormSection } from '@/shared/components/FormSection';
import { Typography } from '@/shared/components/Typography';
import type { Member } from '../../../domain/Member';
import { PaymentStatusBadge } from '../PaymentStatusBadge';

interface PaymentSectionProps {
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

export function PaymentSection({ member }: PaymentSectionProps) {
  return (
    <FormSection title="Payment">
      <View style={styles.statusRow}>
        <Typography variant="caption" color="textSecondary">
          Payment Status
        </Typography>
        <PaymentStatusBadge status={member.paymentStatus} />
      </View>
      <DetailRow
        label="Membership Fee"
        value={member.membershipPlanPrice !== undefined ? `$${member.membershipPlanPrice.toLocaleString()}` : '—'}
      />
      <DetailRow label="Outstanding Balance" value="—" />
      <DetailRow label="Last Payment" value="—" />
      <DetailRow label="Next Payment" value="—" />
      <DetailRow label="Discount" value="—" />
    </FormSection>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
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