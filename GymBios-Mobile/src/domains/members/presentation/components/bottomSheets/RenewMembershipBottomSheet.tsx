import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import type { Member } from '../../../domain/Member';
import type {
  RenewalRequest,
  MinorRenewalRequest,
  FamilyRenewalRequest,
} from '../../../application/membership/MemberMembershipRepository';

interface RenewMembershipBottomSheetProps {
  visible: boolean;
  member: Member;
  onClose: () => void;
  onRenew: (
    id: number,
    request: RenewalRequest | MinorRenewalRequest | FamilyRenewalRequest,
  ) => Promise<void>;
}

export function RenewMembershipBottomSheet({
  visible,
  member,
  onClose,
  onRenew,
}: RenewMembershipBottomSheetProps) {
  const [planId, setPlanId] = useState('');
  const [durationMonths, setDurationMonths] = useState('');
  const [startDate, setStartDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isFamily = member.membershipType.toUpperCase() === 'FAMILY';
  const isMinor = member.familyRole?.toUpperCase() === 'MINOR';

  const handleSubmit = useCallback(async () => {
    const request: RenewalRequest = {
      planId: planId ? Number(planId) : undefined,
      durationMonths: durationMonths ? Number(durationMonths) : undefined,
      startDate: startDate || undefined,
      paymentMethod: paymentMethod || undefined,
    };

    try {
      setSubmitting(true);
      await onRenew(member.id, request);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }, [planId, durationMonths, startDate, paymentMethod, member.id, onRenew, onClose]);

  const title = isMinor
    ? 'Renew Minor Membership'
    : isFamily
      ? 'Renew Family Membership'
      : 'Renew Membership';

  return (
    <AppBottomSheet
      visible={visible}
      title={title}
      subtitle={member.name}
      onClose={onClose}
    >
      <View style={styles.container}>
        <Input
          label="Plan ID"
          value={planId}
          onChangeText={setPlanId}
          placeholder="e.g. 1"
          keyboardType="number-pad"
        />
        <Input
          label="Duration (months)"
          value={durationMonths}
          onChangeText={setDurationMonths}
          placeholder="e.g. 12"
          keyboardType="number-pad"
        />
        <Input
          label="Start Date"
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
        />
        <Input
          label="Payment Method"
          value={paymentMethod}
          onChangeText={setPaymentMethod}
          placeholder="e.g. CASH, CARD"
        />
        <Button
          label="Renew"
          onPress={handleSubmit}
          loading={submitting}
          size="lg"
        />
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
});